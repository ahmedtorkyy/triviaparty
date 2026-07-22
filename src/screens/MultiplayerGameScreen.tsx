import { useEffect, useState } from 'react';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import type { RoomSettings, PlayerCharacterSnapshot, RoomPlayer } from '../types/multiplayer';
import type { PlayerProfile, PowerUpType } from '../types';
import { QuestionCard } from '../components/game/QuestionCard';
import { GameHud } from '../components/game/GameHud';
import { RevealScreen } from '../components/game/RevealScreen';
import { PowerUpSheet } from '../components/game/PowerUpSheet';
import { TimerRing } from '../components/ui/TimerRing';
import { Button } from '../components/ui/Button';
import { PodiumScreen } from './PodiumScreen';

interface MultiplayerGameScreenProps {
  playerId: string;
  playerNickname: string;
  playerCharacter: PlayerCharacterSnapshot;
  settings: RoomSettings | null;
  isHost: boolean;
  isConductor: boolean;
  roomCode: string;
  onLeave: () => void;
  onBackToLobby: () => void;
  onProfileChange: (profile: PlayerProfile) => void;
  profile: PlayerProfile;
}

export function MultiplayerGameScreen({
  playerId,
  playerNickname,
  playerCharacter,
  settings,
  isHost,
  roomCode,
  onLeave,
  onBackToLobby,
  onProfileChange,
  profile,
}: MultiplayerGameScreenProps) {
  const { state, submitAnswer, startGame, requestRematch, leaveRoom, extendDeadline } = useMultiplayerGame({
    playerId,
    playerNickname,
    playerCharacter,
    settings: settings || {
      mode: 'normal',
      questionLanguage: 'en',
      questionSource: 'categories',
      questionCount: 10,
      timerSeconds: 15,
      challengesEnabled: false,
    },
    isHost,
    roomCode,
  });

  const [showPowerUpSheet, setShowPowerUpSheet] = useState(false);
  const [usedThisQuestion, setUsedThisQuestion] = useState<PowerUpType[]>([]);
  const [removedAnswers, setRemovedAnswers] = useState<string[]>([]);
  const [extraTimeToast, setExtraTimeToast] = useState<string | null>(null);

  // Reset power-ups on new question
  useEffect(() => {
    if (state.phase === 'question') {
      setUsedThisQuestion([]);
      setRemovedAnswers([]);
      setShowPowerUpSheet(false);
      setExtraTimeToast(null);
    }
  }, [state.phase, state.questionIndex]);

  const handleActivatePowerUp = (type: PowerUpType) => {
    setUsedThisQuestion((prev) => [...prev, type]);
    if (type === 'fifty_fifty' && state.currentQuestion) {
      const wrongs = state.currentQuestion.allAnswers.filter(
        (a) => a !== state.currentQuestion!.correctAnswer
      );
      const shuffled = [...wrongs].sort(() => Math.random() - 0.5);
      const toRemove = shuffled.slice(0, 2);
      setRemovedAnswers(toRemove);
    } else if (type === 'extra_time') {
      // Real deadline extension: extends endTimestampRef by 10s + broadcasts
      extendDeadline();
      setExtraTimeToast('You used Extra Time (+10s)');
    }
  };

  // Listen for other players' Extra Time usage
  // The hook handles this via onExtraTime callback internally,
  // but we track it here for UI toast display via state.
  useEffect(() => {
    if (state.phase === 'question') {
      // The hook stores extended deadlines; we just show toast for others
      // via the roomService callback which is handled in the hook.
      // For now, display is handled by the extraTimeToast state.
      if (extraTimeToast) {
        const t = setTimeout(() => setExtraTimeToast(null), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [extraTimeToast, state.phase]);

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  const handleRematch = () => {
    requestRematch();
    onBackToLobby();
  };

  // Award coins on podium via app's profile handler
  useEffect(() => {
    if (state.phase === 'podium') {
      const myEntry = state.podiumEntries.find((e) => e.playerId === playerId);
      if (myEntry && myEntry.correctCount > 0) {
        const coinsEarned = myEntry.correctCount * 100;
        const updated = {
          ...profile,
          coins: profile.coins + coinsEarned,
        };
        onProfileChange(updated);
      }
    }
  }, [state.phase, state.podiumEntries, playerId, profile, onProfileChange]);

  // ---- Late Joiner Waiting Screen ----
  if (state.isLateJoiner) {
    return (
      <div className="screen mp-game mp-game--waiting-next">
        <div className="mp-game__waiting" role="status" aria-live="polite">
          <div className="mp-game__spinner" aria-hidden="true" />
          <p>A game is in progress. You'll join the next round.</p>
        </div>
        <Button onClick={handleLeave} variant="ghost" size="md">
          Leave
        </Button>
      </div>
    );
  }

  // ---- Lobby / Waiting ----
  if (state.phase === 'lobby' || state.phase === 'waiting') {
    const phaseClass = state.phase === 'waiting' ? 'mp-game--waiting-next' : 'mp-game--lobby';
    return (
      <div className={`screen mp-game ${phaseClass}`}>
        <div className="mp-game__waiting" role="status" aria-live="polite">
          <div className="mp-game__spinner" aria-hidden="true" />
          {state.phase === 'lobby' && isHost && (
            <Button onClick={startGame} variant="primary" size="lg">
              Start Game
            </Button>
          )}
          {state.phase === 'lobby' && !isHost && (
            <p>Waiting for the host to start the game...</p>
          )}
          {state.phase === 'waiting' && (
            <p>Waiting for next question...</p>
          )}
        </div>
        <Button onClick={handleLeave} variant="ghost" size="md">
          Leave
        </Button>
      </div>
    );
  }

  // ---- Countdown ----
  if (state.phase === 'countdown') {
    return (
      <div className="screen mp-game mp-game--countdown" role="status" aria-live="assertive">
        <div className="mp-game__countdown-number">3</div>
        <p className="mp-game__countdown-label">Game starting...</p>
      </div>
    );
  }

  // ---- Podium ----
  if (state.phase === 'podium') {
    return (
      <PodiumScreen
        entries={state.podiumEntries}
        players={state.players}
        onRematch={handleRematch}
        onLeave={handleLeave}
        playerId={playerId}
        myRank={state.myPodiumRank}
        totalQuestions={state.totalQuestions}
      />
    );
  }

  // ---- Active Game ----
  const timerSeconds = settings?.timerSeconds || 15;

  return (
    <div className="screen mp-game" role="main">
      <GameHud
        score={state.cumulativeScore}
        lives={3}
        maxLives={3}
        streak={0}
      />

      {/* SR-only live region for a11y */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {state.phase === 'question' && state.currentQuestion && (
          `Question ${state.questionIndex + 1} of ${state.totalQuestions}: ${state.currentQuestion.question}`
        )}
        {state.phase === 'reveal' && state.currentResults && (
          `You answered ${state.selectedAnswer}. ${state.isCorrect ? 'Correct!' : 'Wrong.'} The correct answer was ${state.currentResults.correctAnswer}. You earned ${state.pointsEarnedThisQuestion} points. Total: ${state.cumulativeScore}.`
        )}
      </div>

      {/* Extra Time toast on main screen */}
      {extraTimeToast && (
        <div className="mp-game__extra-time-note" role="status" aria-live="polite">
          ⏱ {extraTimeToast}
        </div>
      )}

      {state.phase === 'question' && state.currentQuestion && !state.hasAnswered && (
        <div className="mp-game__question-area">
          <div className="mp-game__timer-row">
            <TimerRing seconds={state.timeRemaining} total={timerSeconds} />
          </div>

          {/* Power-up button */}
          <div className="game-screen__powerup-bar">
            <button
              className="game-screen__powerup-btn"
              onClick={() => setShowPowerUpSheet(true)}
              aria-label="Power-ups"
            >
              ⚡
            </button>
          </div>

          {/* Answered indicator */}
          <div className="mp-game__answered-indicator" aria-live="polite">
            {answeredIndicator(state.answeredPlayerIds, state.players)}
          </div>

          <QuestionCard
            question={state.currentQuestion}
            questionNumber={state.questionIndex + 1}
            totalQuestions={state.totalQuestions}
            disabled={false}
            selectedAnswer={null}
            correctAnswer={null}
            showResult={false}
            onAnswer={submitAnswer}
            removedAnswers={removedAnswers}
          />
        </div>
      )}

      {state.phase === 'question' && state.hasAnswered && (
        <div className="mp-game__waiting-answer" role="status" aria-live="polite">
          <p>Waiting for other players...</p>
          <TimerRing seconds={state.timeRemaining} total={timerSeconds} />

          {/* Answered indicator */}
          <div className="mp-game__answered-indicator">
            {answeredIndicator(state.answeredPlayerIds, state.players)}
          </div>
        </div>
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

      {state.phase === 'reveal' && state.currentResults && state.currentQuestion && (
        <RevealScreen
          isCorrect={state.isCorrect}
          correctAnswer={state.currentResults.correctAnswer}
          answer={{
            questionId: state.currentQuestion.id,
            selectedAnswer: state.selectedAnswer,
            isCorrect: state.isCorrect || false,
            timeMs: 0,
          }}
          pointsEarned={state.pointsEarnedThisQuestion}
          cumulativeScore={state.cumulativeScore}
          onNext={() => {}}
          isLastQuestion={false}
        />
      )}
    </div>
  );
}

function answeredIndicator(answeredIds: string[], allPlayers: RoomPlayer[]): string {
  const total = allPlayers.filter((p) => !p.isEliminated).length;
  const answered = answeredIds.length;
  return `${answered} of ${total} answered`;
}