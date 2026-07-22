import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { generateRoomCode } from './roomUtils';
import type {
  RoomSettings,
  RoomPlayer,
  PlayerAnswer,
  QuestionResult,
  PodiumEntry,
} from '../types/multiplayer';
import type { TriviaQuestion } from '../types';

// ====== Types ======

export interface RoomEventCallbacks {
  onPlayerJoin?: (player: RoomPlayer) => void;
  onPlayerLeave?: (playerId: string) => void;
  onHostChange?: (newHostId: string) => void;
  onPlayerAnswer?: (playerId: string, answer: string | null, timeMs: number) => void;
  onGameStart?: (seed: string) => void;
  onQuestion?: (question: TriviaQuestion, endTimestamp: number, questionIndex: number, totalQuestions: number) => void;
  onReveal?: (results: QuestionResult, questionIndex: number) => void;
  onPodium?: (entries: PodiumEntry[]) => void;
  onRematch?: (playerId: string) => void;
  onError?: (error: string) => void;
}

// ====== Room Service ======

const CHANNEL_PREFIX = 'room:';

export class RoomService {
  private channel: RealtimeChannel | null = null;
  private playerId: string = '';
  private code: string = '';
  private callbacks: RoomEventCallbacks = {};
  private _connected: boolean = false;

  get isConnected(): boolean {
    return this._connected;
  }
  get roomCode(): string {
    return this.code;
  }

  setCallbacks(cbs: RoomEventCallbacks) {
    this.callbacks = cbs;
  }

  // ---- Create a room ----
  async create(settings: RoomSettings, player: RoomPlayer): Promise<string> {
    this.playerId = player.id;
    this.code = generateRoomCode();

    this.channel = supabase.channel(`${CHANNEL_PREFIX}${this.code}`, {
      config: {
        broadcast: { self: true },
        presence: { key: player.id },
      },
    });

    this._setupChannel(player, true);
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel!.track({
          ...player,
          isHost: true,
          score: 0,
          lives: 3,
          isEliminated: false,
          hasAnswered: false,
        });
      }
    });

    // Store settings in channel metadata by broadcasting once
    await new Promise<void>((resolve) => {
      const checkSub = setInterval(() => {
        if (this._connected) {
          clearInterval(checkSub);
          // Broadcast settings so joining players get them
          this.channel!.send({
            type: 'broadcast',
            event: 'room_settings',
            payload: { settings },
          });
          resolve();
        }
      }, 100);
      // Timeout after 5s
      setTimeout(() => { clearInterval(checkSub); resolve(); }, 5000);
    });

    return this.code;
  }

  // ---- Join a room ----
  async join(code: string, player: RoomPlayer): Promise<boolean> {
    this.playerId = player.id;
    this.code = code.toUpperCase();

    this.channel = supabase.channel(`${CHANNEL_PREFIX}${this.code}`, {
      config: {
        broadcast: { self: true },
        presence: { key: player.id },
      },
    });

    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.leave();
          resolve(false);
        }
      }, 5000);

      this._setupChannel(player, false);
      this.channel!.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Try to fetch current settings
          await this.channel!.track({
            ...player,
            isHost: false,
            score: 0,
            lives: 3,
            isEliminated: false,
            hasAnswered: false,
          });
          // The host should see us join via presence and send us the settings
          // We'll receive them in the broadcast handler
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            this._connected = true;
            resolve(true);
          }
        }
        if (status === 'CHANNEL_ERROR') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        }
      });
    });
  }

  // ---- Leave ----
  leave() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this._connected = false;
    this.code = '';
  }

  // ---- Host broadcasts ----

  async startGame(seed: string) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { seed },
    });
  }

  async broadcastQuestion(
    question: TriviaQuestion,
    endTimestamp: number,
    questionIndex: number,
    totalQuestions: number
  ) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'question',
      payload: { question, endTimestamp, questionIndex, totalQuestions },
    });
  }

  async broadcastReveal(results: QuestionResult, questionIndex: number) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'reveal',
      payload: { results, questionIndex },
    });
  }

  async broadcastPodium(entries: PodiumEntry[]) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'podium',
      payload: { entries },
    });
  }

  async broadcastRematch(playerId: string) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'rematch',
      payload: { playerId },
    });
  }

  // ---- Player submits answer ----
  async submitAnswer(answer: PlayerAnswer) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'player_answer',
      payload: { playerId: this.playerId, answer: answer.answer, timeMs: answer.timeMs },
    });
  }

  // ---- Update player presence (e.g. score changed) ----
  async updatePresence(updates: Partial<RoomPlayer>) {
    if (!this.channel) return;
    const currentPresence = this.channel.presenceState();
    const myState = currentPresence[this.playerId];
    if (myState && myState.length > 0) {
      await this.channel.track({ ...myState[0], ...updates });
    }
  }

  // ---- Fetch room settings (broadcast to all in channel) ----
  async broadcastSettings(settings: RoomSettings) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'room_settings',
      payload: { settings },
    });
  }

  // ---- Internal channel setup ----
  private _setupChannel(player: RoomPlayer, _isHost: boolean) {
    if (!this.channel) return;

    this.channel.on('presence', { event: 'sync' }, () => {
      this._connected = true;
      const state = this.channel!.presenceState();
      // Convert presence state to player list
      const players: RoomPlayer[] = [];
      let foundHost = false;
      for (const [id, presences] of Object.entries(state)) {
        if (presences.length > 0) {
          const p = presences[0] as any;
          players.push({
            id,
            nickname: p.nickname,
            character: p.character,
            isHost: p.isHost || (!foundHost && id === this.playerId),
            score: p.score || 0,
            lives: p.lives || 3,
            isEliminated: p.isEliminated || false,
            hasAnswered: p.hasAnswered || false,
          });
          if (p.isHost) foundHost = true;
        }
      }
      // If no host found and we're the only player, we become host
      if (!foundHost && players.length === 1 && players[0].id === this.playerId) {
        players[0].isHost = true;
        this.channel!.track({ ...player, isHost: true });
      }
      this.callbacks.onPlayerJoin?.(players[players.length - 1]);
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (key !== this.playerId && newPresences.length > 0) {
        const p = newPresences[0] as any;
        this.callbacks.onPlayerJoin?.({
          id: key,
          nickname: p.nickname,
          character: p.character,
          isHost: p.isHost || false,
          score: p.score || 0,
          lives: p.lives || 3,
          isEliminated: p.isEliminated || false,
          hasAnswered: p.hasAnswered || false,
        });
      }
    });

    this.channel.on('presence', { event: 'leave' }, ({ key }) => {
      this.callbacks.onPlayerLeave?.(key);
    });

    // Broadcast handlers
    this.channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
      this.callbacks.onGameStart?.(payload.seed);
    });

    this.channel.on('broadcast', { event: 'question' }, ({ payload }) => {
      this.callbacks.onQuestion?.(
        payload.question,
        payload.endTimestamp,
        payload.questionIndex,
        payload.totalQuestions
      );
    });

    this.channel.on('broadcast', { event: 'reveal' }, ({ payload }) => {
      this.callbacks.onReveal?.(payload.results, payload.questionIndex);
    });

    this.channel.on('broadcast', { event: 'podium' }, ({ payload }) => {
      this.callbacks.onPodium?.(payload.entries);
    });

    this.channel.on('broadcast', { event: 'rematch' }, ({ payload }) => {
      this.callbacks.onRematch?.(payload.playerId);
    });

    this.channel.on('broadcast', { event: 'room_settings' }, (_payload) => {
      // Settings broadcast is used internally
    });

    this.channel.on('broadcast', { event: 'player_answer' }, ({ payload }) => {
      this.callbacks.onPlayerAnswer?.(payload.playerId, payload.answer, payload.timeMs);
    });
  }
}

// Singleton
let _instance: RoomService | null = null;
export function getRoomService(): RoomService {
  if (!_instance) _instance = new RoomService();
  return _instance;
}
