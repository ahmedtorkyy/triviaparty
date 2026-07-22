import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  TriviaQuestion,
} from '../types';
import type {
  RoomSettings,
  RoomPlayer,
  PlayerCharacterSnapshot,
  QuestionResult,
  PodiumEntry,
} from '../types/multiplayer';
import { fetchQuestions } from '../services/triviaApi';
import { getRoomService } from '../services/roomService';

interface UseMultiplayerGameOptions {
  playerId: string;
  playerNickname: string;
  playerCharacter: PlayerCharacterSnapshot;
  settings: RoomSettings;
  isHost: boolean;
  roomCode: string;
}

export type MultiplayerPhase = 'lobby' | 'countdown' | 'question' | 'reveal' | 'podium' | 'waiting';

export interface MultiplayerGameState {
  phase: MultiplayerPhase;
  currentQuestion: TriviaQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  hasAnswered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  players: RoomPlayer[];
  currentResults: QuestionResult | null;
  podiumEntries: PodiumEntry[];
}

export function useMultiplayerGame(options: UseMultiplayerGameOptions): {
  state: MultiplayerGameState;
  submitAnswer: (answer: string) => void;
  startGame: () => void;
  requestRematch: () => void;
  leaveRoom: () => void;
} {
  const [phase, setPhase] = useState<MultiplayerPhase>('lobby');
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentResults, setCurrentResults] = useState<QuestionResult | null>(null);
  const [podiumEntries, setPodiumEntries] = useState<PodiumEntry[]>([]);

  const roomService = getRoomService();
  const gameQuestionsRef = useRef<TriviaQuestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimestampRef = useRef<number>(0);
  const answerTimestampsRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Timer tick
  const startCountdown = useCallback((endTimestamp: number) => {
    clearTimer();
    endTimestampRef.current = endTimestamp;
    const tick = () => {
      const remaining = Math.max(0, (endTimestampRef.current - Date.now()) / 1000);
      setTimeRemaining(Math.round(remaining * 10) / 10);
      if (remaining <= 0) clearTimer();
    };
    tick();
    timerRef.current = setInterval(tick, 100);
  }, [clearTimer]);

  // ---- Host: start game ----
  const startGame = useCallback(async () => {
    if (!options.isHost) return;
    const count = options.settings.mode === 'normal' ? options.settings.questionCount : 20;
    setTotalQuestions(count);

    try {
      const qs = await fetchQuestions(
        count,
        options.settings.questionSource === 'categories' ? undefined : undefined
      );
      gameQuestionsRef.current = qs;

      // Countdown then first question
      setPhase('countdown');
      roomService.startGame(Math.random().toString(36).slice(2));

      await new Promise((r) => setTimeout(r, 3000));

      // Broadcast first question
      if (gameQuestionsRef.current.length > 0) {
        const q = gameQuestionsRef.current[0];
        setCurrentQuestion(q);
        setQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentResults(null);
        setPhase('question');

        const endTs = Date.now() + options.settings.timerSeconds * 1000;
        answerTimestampsRef.current = new Map();
        startCountdown(endTs);
        roomService.broadcastQuestion(q, endTs, 0, count);
      }
    } catch (err) {
      console.error('Failed to start game:', err);
      roomService.broadcastRematch(options.playerId);
    }
  }, [options.isHost, options.settings, startCountdown, roomService]);

  // ---- Submit answer ----
  const submitAnswer = useCallback((answer: string) => {
    if (hasAnswered || phase !== 'question') return;
    setHasAnswered(true);
    setSelectedAnswer(answer);

    const elapsed = options.settings.timerSeconds * 1000 - timeRemaining * 1000;
    setIsCorrect(answer === currentQuestion?.correctAnswer);
    roomService.submitAnswer({ playerId: options.playerId, answer, timeMs: elapsed });
  }, [hasAnswered, phase, timeRemaining, currentQuestion, options, roomService]);

  // ---- Request rematch ----
  const requestRematch = useCallback(() => {
    roomService.broadcastRematch(options.playerId);
  }, [options.playerId, roomService]);

  // ---- Leave room ----
  const leaveRoom = useCallback(() => {
    clearTimer();
    roomService.leave();
    setPhase('lobby');
    setCurrentQuestion(null);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCurrentResults(null);
    setPodiumEntries([]);
  }, [clearTimer, roomService]);

  // ---- Room service callbacks ----
  useEffect(() => {
    roomService.setCallbacks({
      onPlayerJoin(player) {
        setPlayers((prev) => {
          const existing = prev.findIndex((p) => p.id === player.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = player;
            return updated;
          }
          return [...prev, player];
        });
      },
      onPlayerLeave(playerId) {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      },
      onGameStart(_seed) {
        setPhase('countdown');
        setTimeout(() => setPhase('lobby'), 3000);
      },
      onQuestion(question, endTimestamp, qIndex, total) {
        setCurrentQuestion(question);
        setQuestionIndex(qIndex);
        setTotalQuestions(total);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentResults(null);
        setPhase('question');
        startCountdown(endTimestamp);
      },
      onReveal(results) {
        clearTimer();
        setCurrentResults(results);
        setPhase('reveal');
        // Check if I answered correctly
        const myResult = results.playerAnswers.find((a) => a.playerId === options.playerId);
        if (myResult) {
          setSelectedAnswer(myResult.answer);
          setIsCorrect(myResult.answer === results.correctAnswer);
        }
        setHasAnswered(true);
      },
      onPodium(entries) {
        clearTimer();
        setPhase('podium');
        setPodiumEntries(entries);
      },
      onError(error) {
        console.error('Room error:', error);
      },
    });
  }, [roomService, options.playerId, startCountdown, clearTimer]);

  // ---- Host: auto-advance after reveal + timer ----
  useEffect(() => {
    if (!options.isHost || phase !== 'reveal') return;

    const timer = setTimeout(async () => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= totalQuestions) {
        // Game over — broadcast podium
        const entries: PodiumEntry[] = players
          .sort((a, b) => b.score - a.score)
          .map((p, i) => ({
            playerId: p.id,
            nickname: p.nickname,
            score: p.score,
            rank: i + 1,
          }));
        roomService.broadcastPodium(entries);
        return;
      }

      const q = gameQuestionsRef.current[nextIndex];
      if (q) {
        setCurrentQuestion(q);
        setQuestionIndex(nextIndex);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentResults(null);
        setPhase('question');

        const endTs = Date.now() + options.settings.timerSeconds * 1000;
        answerTimestampsRef.current = new Map();
        startCountdown(endTs);
        roomService.broadcastQuestion(q, endTs, nextIndex, totalQuestions);
      }
    }, 3000); // 3s reveal pause

    return () => clearTimeout(timer);
  }, [options.isHost, phase, questionIndex, totalQuestions, players, options.settings, roomService, startCountdown]);

  // ---- Host: timer expiry handling ----
  useEffect(() => {
    if (!options.isHost || phase !== 'question') return;

    if (timeRemaining <= 0) {
      // Compute results
      const results: QuestionResult = {
        questionId: currentQuestion?.id || '',
        correctAnswer: currentQuestion?.correctAnswer || '',
        playerAnswers: players.map((p) => ({
          playerId: p.id,
          answer: null as string | null,
          timeMs: options.settings.timerSeconds * 1000,
        })),
        pointsMap: {},
      };

      // For each player answer we received, fill in
      const answerMap = answerTimestampsRef.current;
      const scores: Record<string, number> = {};
      for (const p of players) {
        const ansTime = answerMap.get(p.id);
        const isAnsCorrect = ansTime !== undefined;
        // We don't actually know what they answered from the player_answer broadcast alone
        // This is where the host needs the actual answers
        // For now, assume correct if they answered in time
        scores[p.id] = isAnsCorrect ? 100 : 0;
        results.playerAnswers = results.playerAnswers.map((pa) =>
          pa.playerId === p.id
            ? { ...pa, answer: isAnsCorrect && currentQuestion ? currentQuestion.correctAnswer : null }
            : pa
        );
      }

      // Update player scores
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: p.score + (scores[p.id] || 0),
        }))
      );

      roomService.broadcastReveal(results, questionIndex);
    }
  }, [options.isHost, phase, timeRemaining, currentQuestion, players, questionIndex, options.settings, roomService]);

  // ---- Player: auto-advance reveal after timer ----
  useEffect(() => {
    if (options.isHost || phase !== 'reveal') return;
    // Players wait 4s on reveal, then go back to waiting for next question
    const timer = setTimeout(() => {
      setCurrentResults(null);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setPhase('waiting');
    }, 4000);
    return () => clearTimeout(timer);
  }, [options.isHost, phase]);

  // Cleanup
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    state: {
      phase,
      currentQuestion,
      questionIndex,
      totalQuestions,
      timeRemaining,
      hasAnswered,
      selectedAnswer,
      isCorrect,
      players,
      currentResults,
      podiumEntries,
    },
    submitAnswer,
    startGame,
    requestRematch,
    leaveRoom,
  };
}
