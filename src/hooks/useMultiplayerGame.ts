import { useState, useEffect, useCallback, useRef } from 'react';
import type { TriviaQuestion } from '../types';
import { playSound } from '../services/useSound';
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
  /** Called when another player uses Extra Time */
  onExtraTimeUsed?: (playerId: string, nickname: string) => void;
}

export type MultiplayerPhase = 'lobby' | 'countdown' | 'question' | 'reveal' | 'podium' | 'waiting' | 'challenge' | 'vote';

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
  /** Whether I am a late joiner / spectator waiting for next game */
  isLateJoiner: boolean;
  /** Current challenge if phase === 'challenge' */
  currentChallenge: import('../types/challenges').ChallengeStartPayload | null;
  /** Challenge reveal results */
  challengeResults: import('../types/challenges').ChallengeResult[] | null;
  /** Current vote options if phase === 'vote' */
  currentVote: import('../types/multiplayer').VoteStartPayload | null;
  /** My vote choice */
  myVote: string | null;
  /** Vote results when announced */
  voteResult: import('../types/multiplayer').VoteResultPayload | null;
  /** Whether I have voted */
  hasVoted: boolean;
}

export function useMultiplayerGame(options: UseMultiplayerGameOptions): {
  state: MultiplayerGameState;
  submitAnswer: (answer: string) => void;
  startGame: () => void;
  requestRematch: () => void;
  leaveRoom: () => void;
  extendDeadline: () => void;
  submitChallengeResult: (score: number, tiebreaker?: number) => void;
  castVote: (choice: string) => void;
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
  const [currentChallenge, setCurrentChallenge] = useState<import('../types/challenges').ChallengeStartPayload | null>(null);
  const [challengeResults, setChallengeResults] = useState<import('../types/challenges').ChallengeResult[] | null>(null);
  const [currentVote, setCurrentVote] = useState<import('../types/multiplayer').VoteStartPayload | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voteResult, setVoteResult] = useState<import('../types/multiplayer').VoteResultPayload | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

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
  /** Room settings — populated either from options or from game_start broadcast or presence */
  const activeSettingsRef = useRef<RoomSettings>(options.settings);
  /** Track local cumulative score to avoid losing it on reveal */
  const localCumulativeScoreRef = useRef<number>(0);
  /** Running correct counts per player — maintained by conductor, NEVER deleted on leave */
  const correctCountsRef = useRef<Map<string, number>>(new Map());
  /** Cumulative scores per player — NEVER deleted on leave, survives conductor changes */
  const cumulativeScoresRef = useRef<Map<string, number>>(new Map());
  /** Did I already request a snapshot on rejoin? */
  const snapshotRequestedRef = useRef<boolean>(false);
  /** Are we a spectator (late joiner) waiting for next game? */
  const isSpectatingRef = useRef<boolean>(false);
  /** Last known reveal payload (for conductor promotion survival) */
  const lastRevealRef = useRef<RevealResult | null>(null);
  /** Track players who used Extra Time and their extended deadlines per question */
  const extendedDeadlinesRef = useRef<Map<string, number>>(new Map());
  /** Challenge slots for this game */
  const challengeSlotsRef = useRef<import('../types/challenges').ChallengeSlot[]>([]);
  /** Collected challenge results (conductor side) */
  const challengeResultCollectorRef = useRef<Map<string, number>>(new Map());
  /** Collected votes (conductor side) */
  const voteCollectorRef = useRef<Map<string, string>>(new Map());
  /** Track which question indices have a vote slot (voting mode) */
  const voteSlotIndicesRef = useRef<number[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lastTickSecondRef = useRef<number>(-1);

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
      // Tick/countdown sounds
      const wholeSec = Math.ceil(remaining);
      if (wholeSec <= 5 && wholeSec >= 2 && wholeSec !== lastTickSecondRef.current) {
        lastTickSecondRef.current = wholeSec;
        playSound('tick');
      }
      if (Math.ceil(remaining) === 1 && wholeSec !== lastTickSecondRef.current) {
        lastTickSecondRef.current = 1;
        playSound('countdown');
      }
      if (remaining <= 0) clearTimer();
    };
    tick();
    timerRef.current = setInterval(tick, 100);
  }, [clearTimer]);

  /** Extend my deadline by 10s (Extra Time power-up) */
  const extendDeadline = useCallback(() => {
    const extra = 10 * 1000;
    endTimestampRef.current += extra;
    setTimeRemaining((prev) => Math.round((prev + 10) * 10) / 10);
    // Broadcast to room so conductor knows
    roomService.broadcastExtraTime(options.playerId);
  }, [roomService, options.playerId]);

  // ---- Submit answer ----
  const submitAnswer = useCallback((answer: string) => {
    if (hasAnswered || phase !== 'question' || isLateJoiner) return;
    setHasAnswered(true);
    setSelectedAnswer(answer);

    const elapsed = activeSettingsRef.current.timerSeconds * 1000 - timeRemaining * 1000;
    setIsCorrect(answer === currentQuestion?.correctAnswer);
    roomService.submitAnswer({ playerId: options.playerId, answer, timeMs: elapsed });
  }, [hasAnswered, phase, timeRemaining, currentQuestion, options.playerId, roomService, isLateJoiner]);

  // ---- Submit challenge result ----
  const submitChallengeResult = useCallback((score: number, tiebreaker?: number) => {
    roomService.submitChallengeResult(options.playerId, score, tiebreaker);
  }, [roomService, options.playerId]);

  // ---- Cast vote ----
  const castVote = useCallback((choice: string) => {
    if (hasVoted || phase !== 'vote') return;
    setMyVote(choice);
    setHasVoted(true);
    roomService.castVote(options.playerId, choice);
  }, [hasVoted, phase, options.playerId, roomService]);

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
    cumulativeScoresRef.current = new Map();
    snapshotRequestedRef.current = false;
    isSpectatingRef.current = false;
    lastRevealRef.current = null;
  }

  // ---- Conductor: start game ----
  const startGame = useCallback(async () => {
    if (!computeIsConductor()) return;

    const count = options.settings.mode === 'normal' ? options.settings.questionCount : 20;
    setTotalQuestions(count);

    try {
      let categoryParam: string | undefined;
      if (options.settings.questionSource === 'categories' && options.settings.selectedCategories.length > 0) {
        categoryParam = options.settings.selectedCategories.join(',');
      } else if (options.settings.questionSource === 'voting') {
        // Voting mode: mixed first batch, voting picks later
        categoryParam = undefined;
      } else {
        categoryParam = undefined;
      }
      const qs = await fetchQuestions(count, categoryParam);
      gameQuestionsRef.current = qs;

      const startAt = Date.now() + 3000;
      setPhase('countdown');
      gameStartedRef.current = true;
      activeSettingsRef.current = options.settings;

      // Broadcast full payload (roomService.startGame also updates conductor presence)
      await roomService.startGame({
        settings: options.settings,
        questions: qs,
        startAt,
      } as GameStartPayload);
      // Conductor updates presence: gameRunning = true, settings
      roomService.updatePresence({ gameRunning: true, settings: options.settings });

      // Generate challenge slots
      if (options.settings.challengesEnabled) {
        const { getChallengeSlots, pickChallengeTypes } = await import('../types/challenges');
        const slots = getChallengeSlots(options.settings.questionCount, Date.now());
        const types = pickChallengeTypes(slots, Date.now() + 1);
        challengeSlotsRef.current = slots.map((slot, i) => ({
          afterQuestionIndex: slot,
          type: types[i],
          seed: Date.now() + i * 1000,
        }));
      } else {
        challengeSlotsRef.current = [];
      }

      // Generate vote slots for voting mode
      voteSlotIndicesRef.current = [];
      if (options.settings.questionSource === 'voting') {
        // Vote before question 1 and after every 3rd question
        for (let i = 0; i <= options.settings.questionCount; i += 3) {
          if (i < options.settings.questionCount) {
            voteSlotIndicesRef.current.push(i);
          }
        }
        // Remove any slot that's also a challenge slot (vote takes priority)
        voteSlotIndicesRef.current = voteSlotIndicesRef.current.filter(
          (slot) => !challengeSlotsRef.current.some((cs) => cs.afterQuestionIndex === slot)
        );
      }
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

    // Timer check: base deadline passed AND extended players' deadlines also passed
    const baseExpired = timeRemaining <= 0;
    let allExtendedExpired = true;
    if (extendedDeadlinesRef.current.size > 0) {
      for (const [_playerId, deadline] of extendedDeadlinesRef.current) {
        if (Date.now() < deadline) {
          allExtendedExpired = false;
          break;
        }
      }
    }
    const timerExpired = baseExpired && allExtendedExpired;

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

      // Compute running cumulative scores from our persistent refs (survives leave/return)
      const cumulativeScores: Record<string, number> = {};
      for (const p of players) {
        const prevScore = cumulativeScoresRef.current.get(p.id) || 0;
        const newScore = prevScore + (pointsEarned[p.id] || 0);
        cumulativeScores[p.id] = newScore;
        cumulativeScoresRef.current.set(p.id, newScore);
      }

      // Also include scores for players who left but might return
      for (const [id, score] of cumulativeScoresRef.current) {
        if (!cumulativeScores[id]) {
          cumulativeScores[id] = score;
        }
      }

      const results: RevealResult = {
        questionId: question.id,
        correctAnswer: question.correctAnswer,
        answerCounts,
        playerAnswers,
        pointsEarned,
        cumulativeScores,
        correctThisQuestion,
        correctCounts: Object.fromEntries(correctCountsRef.current),
      };

      // Store for conductor promotion survival
      lastRevealRef.current = results;

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

  // ========== Conductor: advance challenge when time expires or all submitted ==========
  useEffect(() => {
    if (!computeIsConductor() || phase !== 'challenge') return;

    const allPresent = players.filter((p) => !p.isEliminated);
    const allSubmitted = allPresent.length > 0 && allPresent.every((p) => challengeResultCollectorRef.current.has(p.id));
    const timerExpired = timeRemaining <= 0;

    if ((timerExpired || allSubmitted) && !revealSentRef.current) {
      revealSentRef.current = true;

      // Build results from collected scores
      const scores = allPresent.map((p) => {
        const score = challengeResultCollectorRef.current.get(p.id) || 0;
        return { playerId: p.id, score };
      });

      // Compute rankings inline
      const sorted = [...scores].sort((a, b) => b.score - a.score);
      const PRIZES = [{ points: 200, coins: 100 }, { points: 100, coins: 50 }, { points: 50, coins: 25 }];
      const results = sorted.map((ps, i) => {
        const prize = i < PRIZES.length ? PRIZES[i] : { points: 0, coins: 10 };
        return {
          playerId: ps.playerId,
          rank: i + 1,
          points: prize.points,
          coins: prize.coins,
          score: ps.score,
        };
      });

      // Broadcast reveal
      roomService.broadcastChallengeReveal({ type: currentChallenge?.type || 'tap_frenzy', results });
      setChallengeResults(results);
    }
  }, [phase, timeRemaining, players, computeIsConductor, currentChallenge, roomService]);

  // ========== Conductor: advance vote when time expires or all voted ==========
  useEffect(() => {
    if (!computeIsConductor() || phase !== 'vote') return;

    const allPresent = players.filter((p) => !p.isEliminated);
    const allVoted = allPresent.length > 0 && allPresent.every((p) => voteCollectorRef.current.has(p.id));
    const timerExpired = timeRemaining <= 0;

    if ((timerExpired || allVoted) && !revealSentRef.current && currentVote) {
      revealSentRef.current = true;

      // Tally votes
      const voteCounts: Record<string, number> = {};
      currentVote.options.forEach((opt) => { voteCounts[opt] = 0; });
      for (const [_pid, choice] of voteCollectorRef.current) {
        voteCounts[choice] = (voteCounts[choice] || 0) + 1;
      }

      // Find winner (ties broken randomly)
      let maxVotes = 0;
      let winners: string[] = [];
      for (const [opt, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          winners = [opt];
        } else if (count === maxVotes) {
          winners.push(opt);
        }
      }
      const winnerId = winners[Math.floor(Math.random() * winners.length)];
      const winnerIdx = currentVote.options.indexOf(winnerId);
      const winnerName = currentVote.optionNames[winnerIdx] || winnerId;

      const result: import('../types/multiplayer').VoteResultPayload = { winnerId, winnerName, voteCounts };
      setVoteResult(result);
      setCurrentVote(null);
      roomService.broadcastVoteResult(result);
    }
  }, [phase, timeRemaining, players, computeIsConductor, currentVote, roomService]);

  // ========== Conductor: auto-advance after reveal or challenge reveal or vote result ==========
  useEffect(() => {
    if (!computeIsConductor()) return;

    // Challenge phase: wait for results then advance after 5s
    if (phase === 'challenge' && challengeResults !== null) {
      // already handled below, fall through
    }

    // Vote phase: after result, advance after 3s
    if (phase === 'vote' && voteResult !== null) {
      const timer = setTimeout(async () => {
        const nextIndex = questionIndex + 1;
        if (nextIndex >= totalQuestions) {
          // Broadcast podium
          const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
          const entries: PodiumEntry[] = sorted.map((p, i) => ({
            playerId: p.id,
            nickname: p.nickname,
            score: p.score || 0,
            rank: i + 1,
            correctCount: correctCountsRef.current.get(p.id) || 0,
            totalQuestions,
          }));
          roomService.broadcastPodium(entries);
          roomService.updatePresence({ gameRunning: false });
          return;
        }
        // Fetch next 3 questions from winning category
        if (voteResult.winnerId && options.settings.questionSource === 'voting') {
          try {
            const moreQs = await fetchQuestions(3, voteResult.winnerId);
            gameQuestionsRef.current = [...gameQuestionsRef.current, ...moreQs];
          } catch (e) {
            console.warn('Failed to fetch category questions, continuing with existing', e);
          }
        }
        const q = gameQuestionsRef.current[nextIndex];
        if (!q) return;

        // Check if there's another challenge at this slot (shouldn't happen, safety)
        setCurrentQuestion(q);
        setQuestionIndex(nextIndex);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentResults(null);
        setChallengeResults(null);
        setCurrentChallenge(null);
        setAnsweredPlayerIds([]);
        playerAnswersRef.current = new Map();
        answerTimestampsRef.current = new Map();
        setPhase('question');

        const endTs = Date.now() + activeSettingsRef.current.timerSeconds * 1000;
        startCountdown(endTs);
        roomService.broadcastQuestion(q, endTs, nextIndex, totalQuestions);
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Question reveal phase: wait 3s then advance
    if (phase !== 'reveal') return;

    const timer = setTimeout(async () => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= totalQuestions) {
        const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
        const entries: PodiumEntry[] = sorted.map((p, i) => ({
          playerId: p.id,
          nickname: p.nickname,
          score: p.score || 0,
          rank: i + 1,
          correctCount: correctCountsRef.current.get(p.id) || 0,
          totalQuestions,
        }));
        roomService.broadcastPodium(entries);
        roomService.updatePresence({ gameRunning: false });
        return;
      }

      const q = gameQuestionsRef.current[nextIndex];
      if (!q) return;

      // Check for vote slot (voting mode) — vote takes priority over challenge
      if (voteSlotIndicesRef.current.includes(nextIndex)) {
        const CATEGORIES = [
          { id: 'food_and_drink', name: '🍔 Food & Drink' },
          { id: 'arts_and_literature', name: '🎨 Arts & Literature' },
          { id: 'film_and_tv', name: '🎬 Film & TV' },
          { id: 'history', name: '📜 History' },
          { id: 'music', name: '🎵 Music' },
          { id: 'science', name: '🔬 Science' },
          { id: 'society_and_culture', name: '🌍 Society & Culture' },
          { id: 'sport_and_leisure', name: '⚽ Sport & Leisure' },
          { id: 'geography', name: '🌎 Geography' },
          { id: 'general_knowledge', name: '🧠 General Knowledge' },
        ];
        const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, 4);
        const endTs = Date.now() + 10 * 1000;
        const payload: import('../types/multiplayer').VoteStartPayload = {
          options: picked.map(c => c.id),
          optionNames: picked.map(c => c.name),
          endsAt: endTs,
        };
        voteCollectorRef.current = new Map();
        setPhase('vote');
        setCurrentVote(payload);
        setMyVote(null);
        setHasVoted(false);
        setVoteResult(null);
        startCountdown(endTs);
        roomService.broadcastVoteStart(payload);
        return;
      }

      // Check if there's a challenge at this slot
      const challengeSlot = challengeSlotsRef.current.find((s) => s.afterQuestionIndex === nextIndex);
      if (challengeSlot) {
        const { pickMatchingPairs } = await import('../types/challenges');
        const duration = challengeSlot.type === 'tap_frenzy' ? 5 : challengeSlot.type === 'lucky_box' ? 20 : 20;
        const endTs = Date.now() + duration * 1000;
        const payload: import('../types/challenges').ChallengeStartPayload = {
          type: challengeSlot.type,
          endsAt: endTs,
          seed: challengeSlot.seed,
          duration,
          items: challengeSlot.type === 'matching_pairs' ? pickMatchingPairs(challengeSlot.seed, 6) : undefined,
        };
        challengeResultCollectorRef.current = new Map();
        setPhase('challenge');
        setCurrentChallenge(payload);
        setChallengeResults(null);
        startCountdown(endTs);
        roomService.broadcastChallengeStart(payload);
        return;
      }

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

      const endTs = Date.now() + activeSettingsRef.current.timerSeconds * 1000;
      startCountdown(endTs);
      roomService.broadcastQuestion(q, endTs, nextIndex, totalQuestions);
    }, 3000);

    return () => clearTimeout(timer);
  }, [computeIsConductor, phase, questionIndex, totalQuestions, players, roomService, startCountdown, challengeResults, currentChallenge]);

  // ========== Room service callbacks ==========
  useEffect(() => {
    roomService.setCallbacks({
      onPlayerJoin(player) {
        // Check presence for game_running flag
        const isGameRunning = player.gameRunning === true;
        const settingsFromPresence = player.settings;

        // If we're in lobby and game is running, we're a late joiner
        if ((phase === 'lobby' || phase === 'waiting') && isGameRunning && !gameStartedRef.current) {
          setIsLateJoiner(true);
          isSpectatingRef.current = true;
          // Request state snapshot from conductor
          if (!snapshotRequestedRef.current) {
            snapshotRequestedRef.current = true;
            roomService.requestStateSnapshot();
          }
          // If conductor promoted and we got settings from presence, we can start
          if (computeIsConductor() && settingsFromPresence) {
            activeSettingsRef.current = settingsFromPresence;
          }
        }

        setPlayers((prev) => {
          const existing = prev.findIndex((p) => p.id === player.id);
          if (existing >= 0) {
            // Returning player: PRESERVE their score
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              nickname: player.nickname,
              character: player.character,
              isHost: player.isHost,
              lives: player.lives,
              isEliminated: player.isEliminated,
              hasAnswered: player.hasAnswered,
            };
            return updated;
          }
          // New player joined — play sound
          playSound('join');
          return [...prev, player];
        });
      },

      onPlayerLeave(playerId) {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
        // NOTE: We do NOT delete from cumulativeScoresRef or correctCountsRef
        // These survive player leaves so returning players resume their totals
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
        cumulativeScoresRef.current = new Map();
        extendedDeadlinesRef.current = new Map();

        // Go to first question after countdown, or vote first if voting mode
        setTimeout(() => {
          if (voteSlotIndicesRef.current.includes(0)) {
            // First, show a vote screen before the first question
            const CATEGORIES = [
              { id: 'food_and_drink', name: '🍔 Food & Drink' },
              { id: 'arts_and_literature', name: '🎨 Arts & Literature' },
              { id: 'film_and_tv', name: '🎬 Film & TV' },
              { id: 'history', name: '📜 History' },
              { id: 'music', name: '🎵 Music' },
              { id: 'science', name: '🔬 Science' },
              { id: 'society_and_culture', name: '🌍 Society & Culture' },
              { id: 'sport_and_leisure', name: '⚽ Sport & Leisure' },
              { id: 'geography', name: '🌎 Geography' },
              { id: 'general_knowledge', name: '🧠 General Knowledge' },
            ];
            const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
            const picked = shuffled.slice(0, 4);
            const endTs = Date.now() + 10 * 1000;
            const votePayload: import('../types/multiplayer').VoteStartPayload = {
              options: picked.map(c => c.id),
              optionNames: picked.map(c => c.name),
              endsAt: endTs,
            };
            voteCollectorRef.current = new Map();
            setPhase('vote');
            setCurrentVote(votePayload);
            setMyVote(null);
            setHasVoted(false);
            setVoteResult(null);
            startCountdown(endTs);
            roomService.broadcastVoteStart(votePayload);
            return;
          }
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
            cumulativeScoresRef.current = new Map();
            revealSentRef.current = false;

            const endTs = Date.now() + activeSettingsRef.current.timerSeconds * 1000;
            startCountdown(endTs);
          }
        }, remaining);
      },
      onQuestion(question, endTimestamp, qIndex, total) {
        // SPECTATOR GUARD: ignore question broadcasts while spectating
        if (isSpectatingRef.current) return;

        // Clear extended deadlines from previous question
        extendedDeadlinesRef.current = new Map();

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
        revealSentRef.current = false;
        setPhase('question');
        startCountdown(endTimestamp);
      },

      onReveal(results) {
        // SPECTATOR GUARD: ignore reveal broadcasts while spectating
        if (isSpectatingRef.current) return;

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

        // Store running correct counts from reveal (all clients keep latest copy)
        if (results.correctCounts) {
          for (const [id, count] of Object.entries(results.correctCounts)) {
            correctCountsRef.current.set(id, count);
          }
        }

        // Store cumulative scores from reveal (all clients keep latest copy)
        for (const [id, score] of Object.entries(results.cumulativeScores)) {
          cumulativeScoresRef.current.set(id, score);
        }

        // Store for conductor promotion survival
        lastRevealRef.current = results;

        // Check my answer
        const myResult = results.playerAnswers.find((a) => a.playerId === options.playerId);
        if (myResult) {
          setSelectedAnswer(myResult.answer);
          setIsCorrect(myResult.answer === results.correctAnswer);
        }
        setHasAnswered(true);

        // Update player scores from reveal (for UI)
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            score: results.cumulativeScores[p.id] ?? p.score,
          }))
        );
      },

      onExtraTime(playerId) {
        // Track this player's extended deadline (conductor uses this)
        const extendedDeadline = endTimestampRef.current + 10 * 1000;
        extendedDeadlinesRef.current.set(playerId, extendedDeadline);
        // Update the local timer display if we're the one who extended
        if (playerId === options.playerId) {
          setTimeRemaining((prev) => Math.round((prev + 10) * 10) / 10);
        }
        // Notify UI about who used Extra Time (skip self, handled locally)
        if (playerId !== options.playerId) {
          const playerData = players.find((p) => p.id === playerId);
          if (playerData && options.onExtraTimeUsed) {
            options.onExtraTimeUsed(playerId, playerData.nickname);
          }
        }
      },

      onChallengeStart(payload) {
        // SPECTATOR GUARD: ignore challenge while spectating
        if (isSpectatingRef.current) return;
        clearTimer();
        setPhase('challenge');
        setCurrentChallenge(payload);
        setChallengeResults(null);
        setHasAnswered(false);
        startCountdown(payload.endsAt);
      },

      onChallengeReveal(payload) {
        if (isSpectatingRef.current) return;
        clearTimer();
        setChallengeResults(payload.results);
        setCurrentChallenge(null);
        // Award points to scores
        const myResult = payload.results.find((r: import('../types/challenges').ChallengeResult) => r.playerId === options.playerId);
        if (myResult) {
          setCumulativeScore((prev: number) => prev + myResult.points);
        }
      },

      onChallengeResult(playerId, score, _tiebreaker) {
        // Conductor collects results
        if (computeIsConductor()) {
          challengeResultCollectorRef.current.set(playerId, score);
        }
      },

      onVoteStart(payload) {
        if (isSpectatingRef.current) return;
        clearTimer();
        setPhase('vote');
        setCurrentVote(payload);
        setMyVote(null);
        setHasVoted(false);
        setVoteResult(null);
        startCountdown(payload.endsAt);
      },

      onVoteCast(playerId, choice) {
        // Conductor collects vote
        if (computeIsConductor()) {
          voteCollectorRef.current.set(playerId, choice);
        }
      },

      onVoteResult(payload) {
        if (isSpectatingRef.current) return;
        clearTimer();
        setVoteResult(payload);
        setCurrentVote(null);
      },

      onPodium(entries) {
        clearTimer();
        setPhase('podium');
        setPodiumEntries(entries);
        const myEntry = entries.find((e) => e.playerId === options.playerId);
        setMyPodiumRank(myEntry?.rank || 0);
        // Spectator flag clears on podium
        setIsLateJoiner(false);
        isSpectatingRef.current = false;
        snapshotRequestedRef.current = false;
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
        cumulativeScoresRef.current = new Map();
        gameQuestionsRef.current = [];
        revealSentRef.current = false;
        gameStartedRef.current = false;
        localCumulativeScoreRef.current = 0;
        snapshotRequestedRef.current = false;
        isSpectatingRef.current = false;
        lastRevealRef.current = null;
        // Keep players — they stay in the room
        // Conductor updates presence: gameRunning = false
        roomService.updatePresence({ gameRunning: false });
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

        // Build cumulative scores and correct counts from our persistent refs
        // (includes players who may have left but could return)
        for (const [id, score] of cumulativeScoresRef.current) {
          snapshot.cumulativeScores[id] = score;
        }
        for (const [id, count] of correctCountsRef.current) {
          snapshot.correctCounts[id] = count;
        }

        roomService.sendStateSnapshot(snapshot);
      },

      onStateSnapshot(payload) {
        // Restore score
        setCumulativeScore(payload.cumulativeScores[options.playerId] || 0);
        localCumulativeScoreRef.current = payload.cumulativeScores[options.playerId] || 0;

        // Update all player scores for UI
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            score: payload.cumulativeScores[p.id] ?? p.score,
          }))
        );

        // Restore correct counts (for conductor promotion survival)
        for (const [id, count] of Object.entries(payload.correctCounts)) {
          correctCountsRef.current.set(id, count);
        }

        // Restore cumulative scores (for conductor promotion survival)
        for (const [id, score] of Object.entries(payload.cumulativeScores)) {
          cumulativeScoresRef.current.set(id, score);
        }

        // Restore questions and settings
        gameQuestionsRef.current = payload.questions || [];
        activeSettingsRef.current = payload.settings;
        if (payload.questions && payload.questions.length > 0) {
          setTotalQuestions(payload.questions.length);
        }

        // If we were a late joiner and now have state, check if we are a returning player
        // Only clear spectating flags if payload.cumulativeScores contains my playerId
        if (payload.cumulativeScores[options.playerId] !== undefined) {
          setIsLateJoiner(false);
          isSpectatingRef.current = false;
          snapshotRequestedRef.current = false;
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
              correctCounts: payload.correctCounts || {},
            };
            setCurrentResults(reconstructed);
          }
          setPhase('reveal');
        }
      },

      onError(error) {
        console.error('Room error:', error);
      },
    });
  }, [roomService, options, startCountdown, clearTimer, computeIsConductor, phase, questionIndex, currentResults, players, isLateJoiner]);

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

  // ========== Conductor promotion ==========
  useEffect(() => {
    if (computeIsConductor()) {
      // If we just became conductor, update presence with gameRunning and settings
      // This ensures a promoted host in the lobby has settings, and a promoted conductor mid-game has gameRunning
      const isGameRunning = phase === 'question' || phase === 'reveal';
      const settings = activeSettingsRef.current;
      roomService.updatePresence({ gameRunning: isGameRunning, settings });
    }
  }, [computeIsConductor, phase, roomService]);

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
      currentChallenge,
      challengeResults,
      currentVote,
      myVote,
      voteResult,
      hasVoted,
    },
    submitAnswer,
    startGame,
    requestRematch,
    leaveRoom,
    extendDeadline,
    submitChallengeResult,
    castVote,
  };
}