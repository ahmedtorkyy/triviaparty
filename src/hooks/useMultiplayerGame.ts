import { useState, useEffect, useCallback, useRef } from 'react';
import type { TriviaQuestion } from '../types';
import type {
  RoomSettings,
  RoomPlayer,
  PlayerCharacterSnapshot,
  RevealResult,
  PodiumEntry,
  GameStartPayload,
  StateSnapshotPayload,
} from '../types/multiplayer';
import { computeConductorId } from '../types/multiplayer';
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
  isConductor: boolean;
  players: RoomPlayer[];
  answeredPlayerIds: string[];
  currentResults: RevealResult | null;
  /** Points earned this question by me (from reveal) */
  pointsEarnedThisQuestion: number;
  /** My cumulative score after this question (from reveal) */
  cumulativeScore: number;
  podiumEntries: PodiumEntry[];
  /** My rank from podium — used for a11y announcement */
  myPodiumRank: number;
  /** Whether I am a late joiner waiting for next game */
  isLateJoiner: boolean;
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
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState<string[]>([]);
  const [currentResults, setCurrentResults] = useState<RevealResult | null>(null);
  const [pointsEarnedThisQuestion, setPointsEarnedThisQuestion] = useState(0);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [podiumEntries, setPodiumEntries] = useState<PodiumEntry[]>([]);
  const [myPodiumRank, setMyPodiumRank] = useState(0);
  const [isLateJoiner, setIsLateJoiner] = useState(false);

  const roomService = getRoomService();
  const gameQuestionsRef = useRef<TriviaQuestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimestampRef = useRef<number>(0);
  const answerTimestampsRef = useRef<Map<string, number>>(new Map());
  const playerAnswersRef = useRef<Map<string, string | null>>(new Map());
  /** Guard: prevent broadcasting reveal more than once per question */
  const revealSentRef = useRef<boolean>(false);
  /** Has the game_start been received? (for joiners) */
  const gameStartedRef = useRef<boolean>(false);
  /** Room settings — populated either from options or from game_start broadcast */
  const activeSettingsRef = useRef<RoomSettings>(options.settings);
  /** Track local cumulative score to avoid losing it on reveal */
  const localCumulativeScoreRef = useRef<number>(0);
  /** Running correct counts per player — maintained by conductor */
  const correctCountsRef = useRef<Map<string, number>>(new Map());
  /** Did I already request a snapshot on rejoin? */
  const snapshotRequestedRef = useRef<boolean>(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ---- Conductor: the player who advances the game ----
  const computeIsConductor = useCallback(() => {
    const conductorId = computeConductorId(players);
    return conductorId === options.playerId;
  }, [players, options.playerId]);

  // ---- Timer tick ----
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

  // ---- Submit answer ----
  const submitAnswer = useCallback((answer: string) => {
    if (hasAnswered || phase !== 'question' || isLateJoiner) return;
    setHasAnswered(true);
    setSelectedAnswer(answer);

    const elapsed = activeSettingsRef.current.timerSeconds * 1000 - timeRemaining * 1000;
    setIsCorrect(answer === currentQuestion?.correctAnswer);
    roomService.submitAnswer({ playerId: options.playerId, answer, timeMs: elapsed });
  }, [hasAnswered, phase, timeRemaining, currentQuestion, options.playerId, roomService, isLateJoiner]);

  // ---- Request rematch ----
  const requestRematch = useCallback(() => {
    roomService.broadcastRematch(options.playerId);
  }, [options.playerId, roomService]);

  // ---- Leave room ----
  const leaveRoom = useCallback(() => {
    clearTimer();
    roomService.leave();
    resetAllState();
  }, [clearTimer, roomService]);

  function resetAllState() {
    setPhase('lobby');
    setCurrentQuestion(null);
    setQuestionIndex(0);
    setTotalQuestions(10);
    setTimeRemaining(0);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setPlayers([]);
    setAnsweredPlayerIds([]);
    setCurrentResults(null);
    setPointsEarnedThisQuestion(0);
    setCumulativeScore(0);
    setPodiumEntries([]);
    setMyPodiumRank(0);
    setIsLateJoiner(false);
    gameQuestionsRef.current = [];
    revealSentRef.current = false;
    gameStartedRef.current = false;
    localCumulativeScoreRef.current = 0;
    correctCountsRef.current = new Map();
    snapshotRequestedRef.current = false;
  }

  // ---- Conductor: start game ----
  const startGame = useCallback(async () => {
    if (!computeIsConductor()) return;

    const count = options.settings.mode === 'normal' ? options.settings.questionCount : 20;
    setTotalQuestions(count);

    try {
      const qs = await fetchQuestions(
        count,
        options.settings.questionSource === 'categories' ? undefined : undefined
      );
      gameQuestionsRef.current = qs;

      const startAt = Date.now() + 3000;
      setPhase('countdown');
      gameStartedRef.current = true;
      activeSettingsRef.current = options.settings;

      // Broadcast full payload
      roomService.startGame({
        settings: options.settings,
        questions: qs,
        startAt,
      } as GameStartPayload);
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  }, [computeIsConductor, options.settings, roomService]);

  // ========== Conductor: timer expiry / all answered ==========
  useEffect(() => {
    if (!computeIsConductor()) return;
    if (phase !== 'question') return;

    const allPresent = players.filter((p) => !p.isEliminated);
    const allAnswered = allPresent.length > 0 && allPresent.every((p) => answeredPlayerIds.includes(p.id));
    const timerExpired = timeRemaining <= 0;

    if ((timerExpired || allAnswered) && !revealSentRef.current) {
      revealSentRef.current = true;

      const question = currentQuestion;
      if (!question) return;

      const ansRef = playerAnswersRef.current;
      const timeRef = answerTimestampsRef.current;

      // Build answer counts per option
      const answerCounts: Record<string, number> = {};
      for (const ans of question.allAnswers) {
        answerCounts[ans] = 0;
      }
      for (const [_id, ans] of ansRef) {
        if (ans && answerCounts[ans] !== undefined) answerCounts[ans]++;
      }

      // Compute points
      const pointsEarned: Record<string, number> = {};
      const correctThisQuestion: Record<string, number> = {};
      const playerAnswers: { playerId: string; answer: string | null; timeMs: number }[] = [];

      for (const p of allPresent) {
        const playerAnswer = ansRef.get(p.id) || null;
        const ansTime = timeRef.get(p.id) || activeSettingsRef.current.timerSeconds * 1000;
        const isCorrectAns = playerAnswer === question.correctAnswer;
        const basePoints = isCorrectAns ? 100 : 0;
        const speedBonus = isCorrectAns
          ? Math.max(0, Math.floor((1 - ansTime / (activeSettingsRef.current.timerSeconds * 1000)) * 100))
          : 0;
        pointsEarned[p.id] = basePoints + speedBonus;
        correctThisQuestion[p.id] = isCorrectAns ? 1 : 0;
        playerAnswers.push({ playerId: p.id, answer: playerAnswer, timeMs: ansTime });

        // Update running correct count
        const prevCorrect = correctCountsRef.current.get(p.id) || 0;
        correctCountsRef.current.set(p.id, prevCorrect + (isCorrectAns ? 1 : 0));
      }

      // Compute running cumulative scores
      const cumulativeScores: Record<string, number> = {};
      for (const p of players) {
        cumulativeScores[p.id] = (p.score || 0) + (pointsEarned[p.id] || 0);
      }

      const results: RevealResult = {
        questionId: question.id,
        correctAnswer: question.correctAnswer,
        answerCounts,
        playerAnswers,
        pointsEarned,
        cumulativeScores,
        correctThisQuestion,
      };

      roomService.broadcastReveal(results, questionIndex);

      // Apply locally too
      setCurrentResults(results);
      setPhase('reveal');
      clearTimer();

      // Update local score from reveal
      const myPoints = pointsEarned[options.playerId] || 0;
      setPointsEarnedThisQuestion(myPoints);
      const myCumulative = cumulativeScores[options.playerId] || 0;
      setCumulativeScore(myCumulative);
      localCumulativeScoreRef.current = myCumulative;

      // Check my answer
      const myResult = playerAnswers.find((a) => a.playerId === options.playerId);
      if (myResult) {
        setSelectedAnswer(myResult.answer);
        setIsCorrect(myResult.answer === question.correctAnswer);
      }
    }
  }, [phase, timeRemaining, players, answeredPlayerIds, computeIsConductor, currentQuestion, questionIndex, options.playerId, clearTimer, roomService]);

  // Reset revealSentRef when entering a new question phase
  useEffect(() => {
    if (phase === 'question') {
      revealSentRef.current = false;
    }
  }, [phase]);

  // ========== Conductor: auto-advance after reveal ==========
  useEffect(() => {
    if (!computeIsConductor() || phase !== 'reveal') return;

    const timer = setTimeout(async () => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= totalQuestions) {
        // Broadcast podium with TRUE correct counts
        const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
        const entries: PodiumEntry[] = sorted.map((p, i) => {
          const correctCount = correctCountsRef.current.get(p.id) || 0;
          return {
            playerId: p.id,
            nickname: p.nickname,
            score: p.score || 0,
            rank: i + 1,
            correctCount,
          };
        });
        roomService.broadcastPodium(entries);
        return;
      }

      const q = gameQuestionsRef.current[nextIndex];
      if (!q) return;

      setCurrentQuestion(q);
      setQuestionIndex(nextIndex);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setCurrentResults(null);
      setAnsweredPlayerIds([]);
      playerAnswersRef.current = new Map();
      answerTimestampsRef.current = new Map();
      setPhase('question');

      // Broadcast next question
      const endTs = Date.now() + activeSettingsRef.current.timerSeconds * 1000;
      startCountdown(endTs);
      roomService.broadcastQuestion(q, endTs, nextIndex, totalQuestions);
    }, 3000);

    return () => clearTimeout(timer);
  }, [computeIsConductor, phase, questionIndex, totalQuestions, players, roomService, startCountdown]);

  // ========== Room service callbacks ==========
  useEffect(() => {
    roomService.setCallbacks({
      onPlayerJoin(player) {
        setPlayers((prev) => {
          const existing = prev.findIndex((p) => p.id === player.id);
          if (existing >= 0) {
            // Returning player: PRESERVE their score, update other fields
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              nickname: player.nickname,
              character: player.character,
              isHost: player.isHost,
              lives: player.lives,
              isEliminated: player.isEliminated,
              hasAnswered: player.hasAnswered,
              // score: DO NOT overwrite — keep the known score
            };
            return updated;
          }
          return [...prev, player];
        });
      },

      onPlayerLeave(playerId) {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      },

      onPlayerAnswer(playerId, answer, timeMs) {
        answerTimestampsRef.current.set(playerId, timeMs);
        playerAnswersRef.current.set(playerId, answer);
        setAnsweredPlayerIds((prev) => {
          if (prev.includes(playerId)) return prev;
          return [...prev, playerId];
        });
      },

      onGameStart(payload) {
        gameStartedRef.current = true;
        activeSettingsRef.current = payload.settings;
        gameQuestionsRef.current = payload.questions;
        setTotalQuestions(payload.questions.length);

        // Compute countdown end from startAt
        const countdownEnd = payload.startAt;
        const now = Date.now();
        const remaining = Math.max(0, countdownEnd - now);

        setPhase('countdown');
        setCurrentQuestion(null);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentResults(null);
        setAnsweredPlayerIds([]);
        revealSentRef.current = false;
        playerAnswersRef.current = new Map();
        answerTimestampsRef.current = new Map();
        correctCountsRef.current = new Map();

        // Go to first question after countdown
        setTimeout(() => {
          if (gameQuestionsRef.current.length > 0) {
            const q = gameQuestionsRef.current[0];
            setCurrentQuestion(q);
            setQuestionIndex(0);
            setHasAnswered(false);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setCurrentResults(null);
            setAnsweredPlayerIds([]);
            setPhase('question');
            playerAnswersRef.current = new Map();
            answerTimestampsRef.current = new Map();
            correctCountsRef.current = new Map();
            revealSentRef.current = false;

            const endTs = Date.now() + activeSettingsRef.current.timerSeconds * 1000;
            startCountdown(endTs);
          }
        }, remaining);
      },

      onQuestion(question, endTimestamp, qIndex, total) {
        // Clear any countdown timer from game_start
        setCurrentQuestion(question);
        setQuestionIndex(qIndex);
        setTotalQuestions(total);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentResults(null);
        setAnsweredPlayerIds([]);
        playerAnswersRef.current = new Map();
        answerTimestampsRef.current = new Map();
        correctCountsRef.current = new Map();
        revealSentRef.current = false;
        setPhase('question');
        startCountdown(endTimestamp);
      },

      onReveal(results) {
        clearTimer();
        revealSentRef.current = true;
        setCurrentResults(results);
        setPhase('reveal');

        // Apply scores from reveal (SINGLE source of truth)
        const myPoints = results.pointsEarned[options.playerId] || 0;
        setPointsEarnedThisQuestion(myPoints);
        const myCumulative = results.cumulativeScores[options.playerId] || 0;
        setCumulativeScore(myCumulative);
        localCumulativeScoreRef.current = myCumulative;

        // Check my answer
        const myResult = results.playerAnswers.find((a) => a.playerId === options.playerId);
        if (myResult) {
          setSelectedAnswer(myResult.answer);
          setIsCorrect(myResult.answer === results.correctAnswer);
        }
        setHasAnswered(true);

        // Update player scores from reveal
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            score: results.cumulativeScores[p.id] ?? p.score,
          }))
        );
      },

      onPodium(entries) {
        clearTimer();
        setPhase('podium');
        setPodiumEntries(entries);
        const myEntry = entries.find((e) => e.playerId === options.playerId);
        setMyPodiumRank(myEntry?.rank || 0);
      },

      onRematch(_playerId) {
        // Reset everything to lobby phase with same room
        setPhase('lobby');
        setCurrentQuestion(null);
        setQuestionIndex(0);
        setTotalQuestions(10);
        setTimeRemaining(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentResults(null);
        setPointsEarnedThisQuestion(0);
        setCumulativeScore(0);
        setPodiumEntries([]);
        setMyPodiumRank(0);
        setAnsweredPlayerIds([]);
        setIsLateJoiner(false);
        playerAnswersRef.current = new Map();
        answerTimestampsRef.current = new Map();
        correctCountsRef.current = new Map();
        gameQuestionsRef.current = [];
        revealSentRef.current = false;
        gameStartedRef.current = false;
        localCumulativeScoreRef.current = 0;
        snapshotRequestedRef.current = false;
        // Keep players — they stay in the room
      },

      onStateRequest(_requestingPlayerId) {
        // Only the conductor responds
        if (!computeIsConductor()) return;

        const isQuestionPhase = phase === 'question';
        const snapshot: StateSnapshotPayload = {
          currentIndex: questionIndex,
          endsAt: endTimestampRef.current,
          phase: isQuestionPhase ? 'question' : 'reveal',
          cumulativeScores: {},
          correctCounts: {},
          questions: gameQuestionsRef.current,
          settings: activeSettingsRef.current,
        };

        // If in reveal phase, include current reveal data
        if (!isQuestionPhase && currentResults) {
          snapshot.correctAnswer = currentResults.correctAnswer;
          snapshot.answerCounts = currentResults.answerCounts;
          snapshot.playerAnswers = currentResults.playerAnswers;
          snapshot.pointsEarned = currentResults.pointsEarned;
        }

        // Build cumulative scores and correct counts from current state
        for (const p of players) {
          snapshot.cumulativeScores[p.id] = p.score || 0;
          snapshot.correctCounts[p.id] = correctCountsRef.current.get(p.id) || 0;
        }

        roomService.sendStateSnapshot(snapshot);
      },

      onStateSnapshot(payload) {
        // Restore score
        setCumulativeScore(payload.cumulativeScores[options.playerId] || 0);
        localCumulativeScoreRef.current = payload.cumulativeScores[options.playerId] || 0;

        // Update all player scores
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            score: payload.cumulativeScores[p.id] ?? p.score,
          }))
        );

        // Restore correct counts
        for (const [id, count] of Object.entries(payload.correctCounts)) {
          correctCountsRef.current.set(id, count);
        }

        // Restore questions and settings
        gameQuestionsRef.current = payload.questions || [];
        activeSettingsRef.current = payload.settings;
        if (payload.questions && payload.questions.length > 0) {
          setTotalQuestions(payload.questions.length);
        }

        // Set phase
        if (payload.phase === 'question') {
          setPhase('question');
          startCountdown(payload.endsAt);
        } else {
          // Reveal phase — reconstruct from snapshot
          if (payload.correctAnswer) {
            const reconstructed: RevealResult = {
              questionId: '',
              correctAnswer: payload.correctAnswer,
              answerCounts: payload.answerCounts || {},
              playerAnswers: payload.playerAnswers || [],
              pointsEarned: payload.pointsEarned || {},
              cumulativeScores: payload.cumulativeScores,
              correctThisQuestion: {},
            };
            setCurrentResults(reconstructed);
          }
          setPhase('reveal');
        }

        // If we were a late joiner and now have state, we're caught up
        setIsLateJoiner(false);
        snapshotRequestedRef.current = false;
      },

      onError(error) {
        console.error('Room error:', error);
      },
    });
  }, [roomService, options.playerId, startCountdown, clearTimer, computeIsConductor, phase, questionIndex, currentResults, players]);

  // ========== Late joiner detection & reconnect ==========
  // If game_start has been received (gameStartedRef) but we're still in lobby/waiting,
  // we're a late joiner. Request state snapshot from conductor.
  useEffect(() => {
    if (phase !== 'lobby' && phase !== 'waiting') {
      // We're already in a game phase, nothing to do
      snapshotRequestedRef.current = false;
      return;
    }

    // If we have a game running flag from the conductor's presence, or
    // if we received game_start but didn't transition (race), we need to catch up
    const isRunning = gameStartedRef.current && phase === 'lobby';

    if (isRunning && !snapshotRequestedRef.current) {
      snapshotRequestedRef.current = true;
      setIsLateJoiner(true);
      // Request current state from conductor
      roomService.requestStateSnapshot();
    }
  }, [phase, roomService]);

  // Also check conductor's presence for "game_running" flag
  useEffect(() => {
    if (phase !== 'lobby' && phase !== 'waiting') return;

    // We could check presence for a game_running flag, but the game_start broadcast
    // is the more reliable signal. The conductor should track this in presence.
  }, [phase, players]);

  // ========== Player: auto-clear reveal after display ==========
  useEffect(() => {
    if (computeIsConductor() || phase !== 'reveal') return;

    const timer = setTimeout(() => {
      setCurrentResults(null);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setPhase('waiting');
    }, 4000);
    return () => clearTimeout(timer);
  }, [computeIsConductor, phase]);

  // Cleanup
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const isConductor = computeIsConductor();

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
      isConductor,
      players,
      answeredPlayerIds,
      currentResults,
      pointsEarnedThisQuestion,
      cumulativeScore,
      podiumEntries,
      myPodiumRank,
      isLateJoiner,
    },
    submitAnswer,
    startGame,
    requestRematch,
    leaveRoom,
  };
}