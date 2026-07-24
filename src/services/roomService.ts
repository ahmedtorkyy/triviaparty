import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { generateRoomCode } from './roomUtils';
import type {
  RoomSettings,
  RoomPlayer,
  PlayerAnswer,
  RevealResult,
  PodiumEntry,
  GameStartPayload,
  StateSnapshotPayload,
} from '../types/multiplayer';
import type { TriviaQuestion } from '../types';

// ====== Types ======

export interface RoomEventCallbacks {
  onPlayerJoin?: (player: RoomPlayer) => void;
  onPlayerLeave?: (playerId: string) => void;
  /** Called on every presence sync with the FULL updated players array */
  onPlayersSync?: (players: RoomPlayer[]) => void;
  onHostChange?: (newHostId: string) => void;
  onPlayerAnswer?: (playerId: string, answer: string | null, timeMs: number) => void;
  onGameStart?: (payload: GameStartPayload) => void;
  onQuestion?: (question: TriviaQuestion, endTimestamp: number, questionIndex: number, totalQuestions: number) => void;
  onReveal?: (results: RevealResult, questionIndex: number) => void;
  onPodium?: (entries: PodiumEntry[]) => void;
  onRematch?: (playerId: string) => void;
  onStateRequest?: (playerId: string) => void;
  onStateSnapshot?: (payload: StateSnapshotPayload) => void;
  onError?: (error: string) => void;
  onExtraTime?: (playerId: string) => void;
  onChallengeStart?: (payload: import('../types/challenges').ChallengeStartPayload) => void;
  onChallengeReveal?: (payload: import('../types/challenges').ChallengeRevealPayload) => void;
  onChallengeResult?: (playerId: string, score: number, tiebreaker?: number) => void;
  onVoteStart?: (payload: import('../types/multiplayer').VoteStartPayload) => void;
  onVoteCast?: (playerId: string, choice: string) => void;
  onVoteResult?: (payload: import('../types/multiplayer').VoteResultPayload) => void;
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
  async create(_settings: RoomSettings, player: RoomPlayer): Promise<string> {
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
          gameRunning: false,
          settings: _settings,
        });
      }
    });

    // Wait for subscription confirmation
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (this._connected) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 5000);
    });

    return this.code;
  }

  // ---- Join a room ----
  async join(code: string, player: RoomPlayer): Promise<'ok' | 'not_found' | 'timeout'> {
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
      let hostSeen = false;
      let presenceCheck: ReturnType<typeof setInterval> | null = null;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (presenceCheck) clearInterval(presenceCheck);
          this.leave();
          resolve(hostSeen ? 'timeout' : 'not_found');
        }
      }, 4000); // 2s for host check + 2s buffer

      // Poll for host presence (fires every 200ms)
      presenceCheck = setInterval(() => {
        if (!this.channel) return;
        const state = this.channel.presenceState();
        for (const [_id, presences] of Object.entries(state)) {
          const p = (presences as any[])[0];
          if (p?.isHost) {
            hostSeen = true;
            if (presenceCheck) clearInterval(presenceCheck);
            break;
          }
        }
      }, 200);

      this._setupChannel(player, false);
      this.channel!.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel!.track({
            ...player,
            isHost: false,
            score: 0,
            lives: 3,
            isEliminated: false,
            hasAnswered: false,
            gameRunning: false,
          });

          // Wait briefly for presence sync to show a host
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              if (presenceCheck) clearInterval(presenceCheck);
              if (!hostSeen) {
                this.leave();
                resolve('not_found');
              } else {
                this._connected = true;
                resolve('ok');
              }
            }
          }, 2000);
        }
        if (status === 'CHANNEL_ERROR') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            if (presenceCheck) clearInterval(presenceCheck);
            resolve('not_found');
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

  // ---- Broadcaster check ----
  private _ensureChannel() {
    if (!this.channel) throw new Error('Not connected to a room');
  }

  // ---- Host / Conductor broadcasts ----

  /** Broadcast game_start with full payload: settings, questions, startAt */
  async startGame(payload: GameStartPayload) {
    this._ensureChannel();
    // Conductor updates their presence: gameRunning = true, carry settings
    await this.channel!.track({
      gameRunning: true,
      settings: payload.settings,
    });
    await this.channel!.send({
      type: 'broadcast',
      event: 'game_start',
      payload,
    });
  }

  async broadcastQuestion(
    question: TriviaQuestion,
    endTimestamp: number,
    questionIndex: number,
    totalQuestions: number
  ) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'question',
      payload: { question, endTimestamp, questionIndex, totalQuestions },
    });
  }

  async broadcastReveal(results: RevealResult, questionIndex: number) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'reveal',
      payload: { results, questionIndex },
    });
  }

  async broadcastPodium(entries: PodiumEntry[]) {
    this._ensureChannel();
    // Game ends - conductor clears gameRunning
    await this.channel!.track({
      gameRunning: false,
    });
    await this.channel!.send({
      type: 'broadcast',
      event: 'podium',
      payload: { entries },
    });
  }

  async broadcastRematch(playerId: string) {
    this._ensureChannel();
    // Game resets - conductor clears gameRunning
    await this.channel!.track({
      gameRunning: false,
    });
    await this.channel!.send({
      type: 'broadcast',
      event: 'rematch',
      payload: { playerId },
    });
  }

  /** Conductor sends state_snapshot in reply to a state_request */
  async sendStateSnapshot(payload: StateSnapshotPayload) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'state_snapshot',
      payload,
    });
  }

  /** Reconnecting player requests current state */
  async requestStateSnapshot() {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'state_request',
      payload: { playerId: this.playerId },
    });
  }

  /** Player used Extra Time power-up */
  async broadcastExtraTime(playerId: string) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'powerup_extratime',
      payload: { playerId },
    });
  }

  /** Conductor broadcasts challenge start */
  async broadcastChallengeStart(payload: import('../types/challenges').ChallengeStartPayload) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'challenge_start',
      payload,
    });
  }

  /** Conductor broadcasts challenge results */
  async broadcastChallengeReveal(payload: import('../types/challenges').ChallengeRevealPayload) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'challenge_reveal',
      payload,
    });
  }

  /** Player submits challenge result */
  async submitChallengeResult(playerId: string, score: number, tiebreaker?: number) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'challenge_result',
      payload: { playerId, score, tiebreaker },
    });
  }

  /** Conductor broadcasts vote start */
  async broadcastVoteStart(payload: import('../types/multiplayer').VoteStartPayload) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'vote_start',
      payload,
    });
  }

  /** Player casts vote */
  async castVote(playerId: string, choice: string) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'vote_cast',
      payload: { playerId, choice },
    });
  }

  /** Conductor broadcasts vote result */
  async broadcastVoteResult(payload: import('../types/multiplayer').VoteResultPayload) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'vote_result',
      payload,
    });
  }

  // ---- Player submits answer ----
  async submitAnswer(answer: PlayerAnswer) {
    this._ensureChannel();
    await this.channel!.send({
      type: 'broadcast',
      event: 'player_answer',
      payload: { playerId: this.playerId, answer: answer.answer, timeMs: answer.timeMs },
    });
  }

  // ---- Update player presence ----
  async updatePresence(updates: Partial<RoomPlayer>) {
    this._ensureChannel();
    const currentPresence = this.channel!.presenceState();
    const myState = currentPresence[this.playerId];
    if (myState && myState.length > 0) {
      await this.channel!.track({ ...myState[0], ...updates });
    }
  }

  // ---- Internal channel setup ----
  private _setupChannel(_player: RoomPlayer, _isHost: boolean) {
    if (!this.channel) return;

    // Presence sync handler — rebuild the FULL players array on every sync
    this.channel.on('presence', { event: 'sync' }, () => {
      this._connected = true;
      const state = this.channel!.presenceState();
      const players: RoomPlayer[] = [];
      for (const [id, presences] of Object.entries(state)) {
        const p = (presences as any[])[0];
        if (p && p.nickname) {
          players.push({
            id,
            nickname: p.nickname,
            character: p.character,
            isHost: p.isHost === true,
            score: p.score || 0,
            lives: p.lives ?? 3,
            isEliminated: p.isEliminated === true,
            hasAnswered: p.hasAnswered === true,
            gameRunning: p.gameRunning === true,
            settings: p.settings || undefined,
          });
        }
      }
      // Always include self if not in presence state yet
      if (this.playerId && !players.find((p) => p.id === this.playerId)) {
        players.push({
          id: this.playerId,
          nickname: 'Player',
          character: {} as any,
          isHost: false,
          score: 0,
          lives: 3,
          isEliminated: false,
          hasAnswered: false,
        });
      }
      this.callbacks.onPlayersSync?.(players);
    });

    // Presence leave handler
    this.channel.on('presence', { event: 'leave' }, ({ key }) => {
      this.callbacks.onPlayerLeave?.(key);
    });

    // ---- Broadcast handlers ----

    this.channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
      this.callbacks.onGameStart?.(payload as GameStartPayload);
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

    this.channel.on('broadcast', { event: 'state_request' }, ({ payload }) => {
      this.callbacks.onStateRequest?.(payload.playerId);
    });

    this.channel.on('broadcast', { event: 'state_snapshot' }, ({ payload }) => {
      this.callbacks.onStateSnapshot?.(payload);
    });

    this.channel.on('broadcast', { event: 'player_answer' }, ({ payload }) => {
      this.callbacks.onPlayerAnswer?.(payload.playerId, payload.answer, payload.timeMs);
    });

    this.channel.on('broadcast', { event: 'powerup_extratime' }, ({ payload }) => {
      this.callbacks.onExtraTime?.(payload.playerId);
    });

    this.channel.on('broadcast', { event: 'challenge_start' }, ({ payload }) => {
      this.callbacks.onChallengeStart?.(payload);
    });

    this.channel.on('broadcast', { event: 'challenge_reveal' }, ({ payload }) => {
      this.callbacks.onChallengeReveal?.(payload);
    });

    this.channel.on('broadcast', { event: 'challenge_result' }, ({ payload }) => {
      this.callbacks.onChallengeResult?.(payload.playerId, payload.score, payload.tiebreaker);
    });

    this.channel.on('broadcast', { event: 'vote_start' }, ({ payload }) => {
      this.callbacks.onVoteStart?.(payload);
    });

    this.channel.on('broadcast', { event: 'vote_cast' }, ({ payload }) => {
      this.callbacks.onVoteCast?.(payload.playerId, payload.choice);
    });

    this.channel.on('broadcast', { event: 'vote_result' }, ({ payload }) => {
      this.callbacks.onVoteResult?.(payload);
    });
  }
}

// Singleton
let _instance: RoomService | null = null;
export function getRoomService(): RoomService {
  if (!_instance) _instance = new RoomService();
  return _instance;
}