import { useState, useCallback, useRef, useEffect } from 'react';
import type { TriviaQuestion, AnswerRecord, GamePhase } from '../types';
import { fetchQuestions } from '../services/triviaApi';
import { playSound } from '../services/useSound';

const MAX_LIVES = 3;
const QUESTION_TIME = 15; // seconds
const REFETCH_THRESHOLD = 5; // fetch more when this many unplayed remain
const FETCH_BATCH_SIZE = 20;
const MAX_RETRIES = 1;

interface UseSoloGameReturn {
  phase: GamePhase;
  currentQuestion: TriviaQuestion | null;
  currentIndex: number;
  totalQuestions: number;
  score: number;
  lives: number;
  streak: number;
  bestStreak: number;
  timeRemaining: number;
  hasAnswered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  answers: AnswerRecord[];
  loading: boolean;
  error: string | null;
  startGame: (category?: string) => Promise<void>;
  submitAnswer: (answer: string) => void;
  advanceQuestion: () => void;
  resetGame: () => void;
  addTime: (seconds: number) => void;
}

export function useSoloGame(): UseSoloGameReturn {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_fetchingMore, setFetchingMore] = useState(false);
  const [_fetchFailed, setFetchFailed] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const categoryRef = useRef<string | undefined>(undefined);
  const isTabHiddenRef = useRef(false);
  // Track the questions length at the time we entered 'waiting',
  // so the effect can detect when new questions arrive
  const waitingCountRef = useRef(0);
  /** Track which second we last played tick on, to avoid stacking */
  const lastTickSecondRef = useRef<number>(-1);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const addTime = useCallback((seconds: number) => {
    setTimeRemaining((prev) => prev + seconds);
  }, []);

  const startTimer = useCallback((duration: number) => {
    clearTimer();
    setTimeRemaining(duration);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (isTabHiddenRef.current) return prev;
        const next = prev - 0.1;
        if (next <= 0) {
          clearTimer();
          return 0;
        }
        // Tick once per second during last 5 seconds
        const wholeSec = Math.ceil(next);
        if (wholeSec <= 5 && wholeSec >= 2 && wholeSec !== lastTickSecondRef.current) {
          lastTickSecondRef.current = wholeSec;
          playSound('tick');
        }
        // Countdown on final 1 second
        if (Math.ceil(next) === 1 && wholeSec !== lastTickSecondRef.current) {
          lastTickSecondRef.current = 1;
          playSound('countdown');
        }
        return Math.round(next * 10) / 10;
      });
    }, 100);
  }, [clearTimer]);

  // Pause / resume timer on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      isTabHiddenRef.current = document.hidden;
      if (!document.hidden && phase === 'question' && !hasAnswered) {
        const remaining = timeRemaining;
        if (remaining > 0) {
          clearTimer();
          startTimer(remaining);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase, hasAnswered, timeRemaining, clearTimer, startTimer]);

  // Background fetch more questions
  const fetchMore = useCallback(async () => {
    if (_fetchingMore) return;
    setFetchingMore(true);
    setFetchFailed(false);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const newQuestions = await fetchQuestions(FETCH_BATCH_SIZE, categoryRef.current);
        setQuestions((prev) => [...prev, ...newQuestions]);
        setFetchingMore(false);
        setFetchFailed(false);
        return; // success
      } catch (err) {
        console.warn(`Background fetch attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    // All retries exhausted
    setFetchingMore(false);
    setFetchFailed(true);
  }, [_fetchingMore]);

  // Check if we need to fetch more questions
  const checkAndFetchMore = useCallback((currentQ: number, totalQ: number) => {
    const remaining = totalQ - currentQ - 1;
    if (remaining <= REFETCH_THRESHOLD && !_fetchingMore && !_fetchFailed) {
      fetchMore();
    }
  }, [_fetchingMore, _fetchFailed, fetchMore]);

  // Effect: when we're in 'waiting' and questions grow, advance
  useEffect(() => {
    if (phase === 'waiting' && questions.length > waitingCountRef.current) {
      // New questions arrived — advance to the next one
      const nextIndex = currentIndex + 1;
      if (nextIndex < questions.length) {
        setCurrentIndex(nextIndex);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setPhase('question');
        startTimer(QUESTION_TIME);
      }
    }
  }, [phase, questions.length, currentIndex, startTimer]);

  // This separate effect checks if the fetch has conclusively failed while waiting
  useEffect(() => {
    if (phase === 'waiting' && _fetchFailed && !_fetchingMore) {
      // Fetch failed and we're out of questions — end the game
      setPhase('result');
    }
  }, [phase, _fetchFailed, _fetchingMore]);

  const startGame = useCallback(async (category?: string) => {
    setLoading(true);
    setError(null);
    setPhase('idle');
    categoryRef.current = category;

    try {
      const qs = await fetchQuestions(FETCH_BATCH_SIZE, category);
      setQuestions(qs);
      setCurrentIndex(0);
      setScore(0);
      setLives(MAX_LIVES);
      setStreak(0);
      setBestStreak(0);
      setAnswers([]);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setFetchingMore(false);
      setFetchFailed(false);
      isTabHiddenRef.current = false;
      setPhase('question');
      startTimer(QUESTION_TIME);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [startTimer]);

  const submitAnswer = useCallback((answer: string) => {
    if (hasAnswered || phase !== 'question') return;
    clearTimer();

    const q = questions[currentIndex];
    const correct = answer === q.correctAnswer;
    const elapsedMs = Date.now() - startTimeRef.current;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setHasAnswered(true);

    const record: AnswerRecord = {
      questionId: q.id,
      selectedAnswer: answer,
      isCorrect: correct,
      timeMs: elapsedMs,
    };

    setAnswers((prev) => [...prev, record]);

    if (correct) {
      const speedBonus = Math.max(0, Math.floor((1 - elapsedMs / (QUESTION_TIME * 1000)) * 100));
      setScore((prev) => prev + 100 + speedBonus);
      setStreak((prev) => {
        const newStreak = prev + 1;
        setBestStreak((best) => Math.max(best, newStreak));
        return newStreak;
      });
    } else {
      setStreak(0);
      setLives((prev) => prev - 1);
    }

    // Pre-fetch more questions if running low
    checkAndFetchMore(currentIndex, questions.length);

    setTimeout(() => setPhase('reveal'), 1500);
  }, [hasAnswered, phase, questions, currentIndex, clearTimer, checkAndFetchMore]);

  const advanceQuestion = useCallback(() => {
    if (lives <= 0) {
      setPhase('result');
      return;
    }

    const nextIndex = currentIndex + 1;

    // Normal advance — questions available
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setPhase('question');
      startTimer(QUESTION_TIME);
      return;
    }

    // Out of questions — check if a fetch is in flight
    if (_fetchingMore) {
      waitingCountRef.current = questions.length;
      setPhase('waiting');
      return;
    }

    // No fetch running — try a last-resort fetch
    if (!_fetchFailed) {
      waitingCountRef.current = questions.length;
      setPhase('waiting');
      fetchMore();
      return;
    }

    // Fetch already failed — game over
    setPhase('result');
  }, [lives, currentIndex, questions.length, _fetchingMore, _fetchFailed, startTimer, fetchMore]);

  const resetGame = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setBestStreak(0);
    setAnswers([]);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setError(null);
    setFetchingMore(false);
    setFetchFailed(false);
    categoryRef.current = undefined;
  }, [clearTimer]);

  // Handle timer hitting zero (no answer = wrong)
  useEffect(() => {
    if (timeRemaining === 0 && !hasAnswered && phase === 'question') {
      const q = questions[currentIndex];
      if (q) {
        setSelectedAnswer(null);
        setIsCorrect(false);
        setHasAnswered(true);
        setStreak(0);
        setLives((prev) => prev - 1);

        setAnswers((prev) => [
          ...prev,
          {
            questionId: q.id,
            selectedAnswer: null,
            isCorrect: false,
            timeMs: QUESTION_TIME * 1000,
          },
        ]);

        checkAndFetchMore(currentIndex, questions.length);
        setTimeout(() => setPhase('reveal'), 500);
      }
    }
  }, [timeRemaining, hasAnswered, phase, questions, currentIndex, checkAndFetchMore]);

  // Cleanup
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    phase,
    currentQuestion: questions[currentIndex] || null,
    currentIndex,
    totalQuestions: questions.length,
    score,
    lives,
    streak,
    bestStreak,
    timeRemaining,
    hasAnswered,
    selectedAnswer,
    isCorrect,
    answers,
    loading,
    error,
    startGame,
    submitAnswer,
    advanceQuestion,
    resetGame,
    addTime,
  };
}
