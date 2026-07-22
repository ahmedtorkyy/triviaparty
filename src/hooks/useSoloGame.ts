import { useState, useCallback, useRef, useEffect } from 'react';
import type { TriviaQuestion, AnswerRecord, GamePhase } from '../types';
import { fetchQuestions } from '../services/triviaApi';

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const categoryRef = useRef<string | undefined>(undefined);
  const isTabHiddenRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    clearTimer();
    setTimeRemaining(duration);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (isTabHiddenRef.current) return prev; // don't count down while tab hidden
        const next = prev - 0.1;
        if (next <= 0) {
          clearTimer();
          return 0;
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
        // Resume countdown — recalculate from the original end-time
        // We just restart the timer from current timeRemaining
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

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const newQuestions = await fetchQuestions(FETCH_BATCH_SIZE, categoryRef.current);
        setQuestions((prev) => [...prev, ...newQuestions]);
        setFetchingMore(false);
        return; // success
      } catch (err) {
        console.warn(`Background fetch attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_RETRIES) {
          // Wait briefly before retry
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    // All retries exhausted — set a flag but don't end game yet
    // The player can continue answering remaining questions
    setFetchingMore(false);
  }, [_fetchingMore]);

  // Check if we need to fetch more questions after currentIndex advances
  const checkAndFetchMore = useCallback((currentQ: number, totalQ: number) => {
    const remaining = totalQ - currentQ - 1; // unplayed questions after current one
    if (remaining <= REFETCH_THRESHOLD && !_fetchingMore) {
      fetchMore();
    }
  }, [_fetchingMore, fetchMore]);

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

    // Check if we need more questions for endless survival
    checkAndFetchMore(currentIndex, questions.length);

    // Auto-advance to reveal
    setTimeout(() => setPhase('reveal'), 1500);
  }, [hasAnswered, phase, questions, currentIndex, clearTimer, checkAndFetchMore]);

  const advanceQuestion = useCallback(() => {
    // Only end game when lives reach 0
    if (lives <= 0) {
      setPhase('result');
      return;
    }

    const nextIndex = currentIndex + 1;

    // Endless survival: if no more questions, check if we have a fetch in flight
    if (nextIndex >= questions.length) {
      if (_fetchingMore) {
        // Wait for fetch — retry a bit
        // For simplicity, try to advance again in a moment
        setTimeout(() => {
          setCurrentIndex((prev) => {
            if (prev < questions.length - 1) return prev + 1;
            // Still no questions — end game if no more can be loaded
            setPhase('result');
            return prev;
          });
        }, 2000);
        return;
      }
      // No more questions and not fetching — end game
      setPhase('result');
      return;
    }

    setCurrentIndex(nextIndex);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setPhase('question');
    startTimer(QUESTION_TIME);
  }, [lives, currentIndex, questions.length, _fetchingMore, startTimer]);

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

        // Check if we need more questions
        checkAndFetchMore(currentIndex, questions.length);

        setTimeout(() => setPhase('reveal'), 500);
      }
    }
  }, [timeRemaining, hasAnswered, phase, questions, currentIndex, checkAndFetchMore]);

  // Cleanup timer on unmount
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
  };
}
