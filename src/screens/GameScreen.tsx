import { useEffect, useState, useRef, useCallback } from 'react';
import { useSoloGame } from '../hooks/useSoloGame';
import type { PlayerProfile, PowerUpType } from '../types';
import { updateStats } from '../services/storage';
import { playSound } from '../services/useSound';
import { CATEGORIES, CATEGORY_ANY } from '../services/triviaApi';
import { TimerRing } from '../components/ui/TimerRing';
import { QuestionCard } from '../components/game/QuestionCard';
import { GameHud } from '../components/game/GameHud';
import { RevealScreen } from '../components/game/RevealScreen';
import { PowerUpSheet } from '../components/game/PowerUpSheet';
import { Button } from '../components/ui/Button';

interface GameScreenProps {
  profile: PlayerProfile;
  onProfileChange: (profile: PlayerProfile) => void;
  onBack: () => void;
}

export function GameScreen({ profile, onProfileChange, onBack }: GameScreenProps) {
  const game = useSoloGame();
  const [showReveal, setShowReveal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('any');
  const [newBestStreak, setNewBestStreak] = useState(false);
  const [showPowerUpSheet, setShowPowerUpSheet] = useState(false);
  const [usedThisQuestion, setUsedThisQuestion] = useState<PowerUpType[]>([]);
  const [removedAnswers, setRemovedAnswers] = useState<string[]>([]);
  const prevPhaseRef = useRef(game.phase);
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track phase changes for accessibility and reveal
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;

    if (game.phase === 'question' && prev !== 'question') {
      setShowReveal(false);
      setShowResult(false);
      setUsedThisQuestion([]);
      setRemovedAnswers([]);
      if (game.currentQuestion) {
        setAnnouncement(`Question ${game.currentIndex + 1}. ${game.currentQuestion.question}`);
      }
    }

    if (game.phase === 'reveal') {
      setShowReveal(true);
      if (game.isCorrect) {
        setAnnouncement('Correct!');
        playSound('correct');
      } else if (game.currentQuestion) {
        setAnnouncement(`Wrong. The correct answer is: ${game.currentQuestion.correctAnswer}`);
        playSound('wrong');
      }
    }

    if (game.phase === 'result') {
      setShowResult(true);
      const oldBest = profile.stats.bestSurvivalStreak;
      setNewBestStreak(game.bestStreak > oldBest);

      const updated = updateStats(
        profile,
        game.answers.filter((a) => a.isCorrect).length,
        game.answers.filter((a) => !a.isCorrect).length,
        game.bestStreak
      );
      onProfileChange(updated);
      setAnnouncement(`Game over! You scored ${game.score} points. Best streak: ${game.bestStreak}.`);
    }
  }, [game.phase]);

  // Clear stale announcements
  useEffect(() => {
    if (announcement) {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      announcementTimeoutRef.current = setTimeout(() => setAnnouncement(''), 5000);
    }
    return () => {
      if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
    };
  }, [announcement]);

  const handleStart = useCallback(() => {
    game.startGame(selectedCategory === 'any' ? undefined : selectedCategory);
  }, [game, selectedCategory]);

  const handleNext = useCallback(() => {
    game.advanceQuestion();
  }, [game]);

  const handleActivatePowerUp = useCallback((type: PowerUpType) => {
    setUsedThisQuestion((prev) => [...prev, type]);
    if (type === 'fifty_fifty' && game.currentQuestion) {
      // Remove two random wrong answers
      const wrongs = game.currentQuestion.allAnswers.filter(
        (a) => a !== game.currentQuestion!.correctAnswer
      );
      const shuffled = [...wrongs].sort(() => Math.random() - 0.5);
      const toRemove = shuffled.slice(0, 2);
      setRemovedAnswers(toRemove);
    } else if (type === 'extra_time') {
      game.addTime(10);
    }
  }, [game]);

  // Loading state
  if (game.loading) {
    return (
      <div className="screen game-screen game-screen--loading">
        <div className="game-screen__loading" role="status" aria-live="polite">
          <div className="game-screen__spinner" aria-hidden="true" />
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (game.error) {
    return (
      <div className="screen game-screen">
        <div className="game-screen__error" role="alert">
          <p>{game.error}</p>
          <Button onClick={handleStart} variant="primary" size="lg">
            Retry
          </Button>
          <Button onClick={onBack} variant="ghost" size="md">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Idle state (before game starts) — show category picker
  if (game.phase === 'idle') {
    return (
      <div className="screen game-screen game-screen--ready">
        <div className="game-screen__ready">
          <div className="game-ready__icon" aria-hidden="true">🎯</div>
          <h2 className="game-ready__title">Solo Survival</h2>
          <p className="game-ready__desc">
            Answer questions until you get <strong>3 wrong</strong>.
            <br />Survive as long as you can!
          </p>

          <div className="game-ready__rules">
            <div className="game-ready__rule">
              <span aria-hidden="true">⚡</span> Speed bonus up to +100 points
            </div>
            <div className="game-ready__rule">
              <span aria-hidden="true">🔥</span> Build your streak for bragging rights
            </div>
            <div className="game-ready__rule">
              <span aria-hidden="true">🪙</span> Earn 50 coins per correct answer
            </div>
          </div>

          {/* Category selector */}
          <div className="game-ready__category">
            <label htmlFor="category-select" className="game-ready__category-label">
              Question Category
            </label>
            <select
              id="category-select"
              className="game-ready__category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value={CATEGORY_ANY.id}>{CATEGORY_ANY.name}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleStart} variant="primary" size="lg" fullWidth>
            Start Game
          </Button>
          <Button onClick={onBack} variant="ghost" size="md" fullWidth>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Result screen
  if (showResult) {
    const correctCount = game.answers.filter((a) => a.isCorrect).length;
    const wrongCount = game.answers.filter((a) => !a.isCorrect).length;

    return (
      <div className="screen game-screen game-screen--result" role="alert" aria-live="assertive">
        <div className="result-screen">
          <h2 className="result-screen__title">Game Over!</h2>

          <div className="result-screen__avatar" aria-hidden="true">
            <svg viewBox="0 0 120 160" width={60} height={80}>
              <circle cx="60" cy="60" r="58" fill={profile.character.backgroundColor} />
              <ellipse cx="60" cy="55" rx="28" ry="30" fill={profile.character.skinTone} />
              {profile.character.hairStyle !== 'bald' && (
                <path d="M32,50 Q32,20 60,18 Q88,20 88,50 Q90,38 80,34 Q70,30 60,30 Q50,30 40,34 Q30,38 32,50Z" fill={profile.character.hairColor} />
              )}
              <circle cx="48" cy="52" r="3" fill="white" /><circle cx="72" cy="52" r="3" fill="white" />
              <circle cx="48" cy="52" r="1.5" fill="#222" /><circle cx="72" cy="52" r="1.5" fill="#222" />
              <path d="M48,66 Q60,58 72,66" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <p className="result-screen__survived">
            You survived <strong>{game.answers.length}</strong> questions!
          </p>

          <div className="result-screen__stats">
            <div className="result-screen__stat">
              <span className="result-screen__stat-value">{game.score}</span>
              <span className="result-screen__stat-label">Score</span>
            </div>
            <div className="result-screen__stat">
              <span className="result-screen__stat-value">{correctCount}</span>
              <span className="result-screen__stat-label">Correct</span>
            </div>
            <div className="result-screen__stat">
              <span className="result-screen__stat-value">{wrongCount}</span>
              <span className="result-screen__stat-label">Wrong</span>
            </div>
          </div>

          <div className="result-screen__streak">
            <span className="result-screen__streak-label">Best Streak</span>
            <span className="result-screen__streak-value">
              {game.bestStreak}
              {newBestStreak ? ' 🔥' : ''}
            </span>
          </div>

          <div className="result-screen__actions">
            <Button onClick={handleStart} variant="primary" size="lg" fullWidth>
              Play Again
            </Button>
            <Button onClick={onBack} variant="ghost" size="md" fullWidth>
              Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active game
  const currentQuestion = game.currentQuestion;
  if (!currentQuestion) return null;

  // Waiting for more questions (endless survival)
  if (game.phase === 'waiting') {
    return (
      <div className="screen game-screen game-screen--loading">
        <div className="game-screen__loading" role="status" aria-live="polite">
          <div className="game-screen__spinner" aria-hidden="true" />
          <p>Loading next question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen game-screen" role="main">
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      <GameHud
        score={game.score}
        lives={game.lives}
        maxLives={3}
        streak={game.streak}
      />

      <div className="game-screen__timer-area">
        <TimerRing
          seconds={game.timeRemaining}
          total={15}
          size={72}
        />
      </div>

      {showReveal ? (
        <RevealScreen
          isCorrect={game.isCorrect}
          correctAnswer={currentQuestion.correctAnswer}
          answer={game.answers[game.answers.length - 1]}
          onNext={handleNext}
          isLastQuestion={game.lives <= 0 || game.currentIndex >= game.totalQuestions - 1}
        />
      ) : (
        <>
          <div className="game-screen__powerup-bar">
            <button
              className="game-screen__powerup-btn"
              onClick={() => setShowPowerUpSheet(true)}
              disabled={game.hasAnswered}
              aria-label="Power-ups"
            >
              ⚡
            </button>
          </div>
          <QuestionCard
            question={currentQuestion}
            questionNumber={game.currentIndex + 1}
            totalQuestions={game.totalQuestions}
            onAnswer={game.submitAnswer}
            disabled={game.hasAnswered}
            selectedAnswer={game.selectedAnswer}
            correctAnswer={game.isCorrect ? currentQuestion.correctAnswer : null}
            showResult={false}
            removedAnswers={removedAnswers}
          />
        </>
      )}

      {showPowerUpSheet && (
        <PowerUpSheet
          profile={profile}
          onProfileChange={onProfileChange}
          onActivate={handleActivatePowerUp}
          onClose={() => setShowPowerUpSheet(false)}
          usedThisQuestion={usedThisQuestion}
        />
      )}
    </div>
  );
}
