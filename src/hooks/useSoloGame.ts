import { useState, useCallback, useRef, useEffect } from 'react';
import type { TriviaQuestion, AnswerRecord, GamePhase } from '../types';
import { fetchQuestions } from '../services/triviaApi';

const MAX_LIVES = 3;
const QUESTION_TIME = 15; // seconds

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

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
        const next = prev - 0.1;
        if (next <= 0) {
          clearTimer();
          return 0;
        }
        return Math.round(next * 10) / 10;
      });
    }, 100);
  }, [clearTimer]);

  const startGame = useCallback(async (category?: string) => {
    setLoading(true);
    setError(null);
    setPhase('idle');

    try {
      const qs = await fetchQuestions(20, category); // Fetch 20 for survival
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

    // Auto-advance to reveal after a short pause
    setTimeout(() => setPhase('reveal'), 1500);
  }, [hasAnswered, phase, questions, currentIndex, clearTimer]);

  const advanceQuestion = useCallback(() => {
    // Check if game over (0 lives)
    if (lives <= 0) {
      setPhase('result');
      return;
    }

    const nextIndex = currentIndex + 1;

    // If we're out of questions, fetch more
    if (nextIndex >= questions.length) {
      setPhase('result');
      return;
    }

    setCurrentIndex(nextIndex);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setPhase('question');
    startTimer(QUESTION_TIME);
  }, [lives, currentIndex, questions.length, startTimer]);

  const resetGame = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setAnswers([]);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setError(null);
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

        setTimeout(() => setPhase('reveal'), 500);
      }
    }
  }, [timeRemaining, hasAnswered, phase, questions, currentIndex]);

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
