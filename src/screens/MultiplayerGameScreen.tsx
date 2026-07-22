import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import type { RoomSettings, PlayerCharacterSnapshot } from '../types/multiplayer';
import { QuestionCard } from '../components/game/QuestionCard';
import { GameHud } from '../components/game/GameHud';
import { RevealScreen } from '../components/game/RevealScreen';
import { TimerRing } from '../components/ui/TimerRing';
import { Button } from '../components/ui/Button';
import { PodiumScreen } from './PodiumScreen';

interface MultiplayerGameScreenProps {
  playerId: string;
  playerNickname: string;
  playerCharacter: PlayerCharacterSnapshot;
  settings: RoomSettings;
  isHost: boolean;
  roomCode: string;
  onLeave: () => void;
}

export function MultiplayerGameScreen({
  playerId,
  playerNickname,
  playerCharacter,
  settings,
  isHost,
  roomCode,
  onLeave,
}: MultiplayerGameScreenProps) {
  const { state, submitAnswer, startGame, requestRematch, leaveRoom } = useMultiplayerGame({
    playerId,
    playerNickname,
    playerCharacter,
    settings,
    isHost,
    roomCode,
  });

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  if (state.phase === 'lobby' || state.phase === 'waiting') {
    return (
      <div className="screen mp-game mp-game--lobby">
        <div className="mp-game__waiting" role="status" aria-live="polite">
          <div className="mp-game__spinner" aria-hidden="true" />
          {isHost ? (
            <Button onClick={startGame} variant="primary" size="lg">
              Start Game
            </Button>
          ) : (
            <p>Waiting for the host to start the game...</p>
          )}
        </div>
        <Button onClick={handleLeave} variant="ghost" size="md">
          Leave
        </Button>
      </div>
    );
  }

  if (state.phase === 'countdown') {
    return (
      <div className="screen mp-game mp-game--countdown" role="status" aria-live="assertive">
        <div className="mp-game__countdown-number">3</div>
        <p className="mp-game__countdown-label">Game starting...</p>
      </div>
    );
  }

  if (state.phase === 'podium') {
    return (
      <PodiumScreen
        entries={state.podiumEntries}
        players={state.players}
        onRematch={requestRematch}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <div className="screen mp-game" role="main">
      <GameHud
        score={state.players.find((p) => p.id === playerId)?.score || 0}
        lives={state.players.find((p) => p.id === playerId)?.lives || 3}
        maxLives={3}
        streak={0}
      />

      {state.phase === 'question' && state.currentQuestion && !state.hasAnswered && (
        <div className="mp-game__question-area">
          <div className="mp-game__timer-row">
            <TimerRing seconds={state.timeRemaining} total={settings.timerSeconds} />
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
          />
        </div>
      )}

      {state.phase === 'question' && state.hasAnswered && (
        <div className="mp-game__waiting-answer" role="status" aria-live="polite">
          <p>Waiting for other players...</p>
          <TimerRing seconds={state.timeRemaining} total={settings.timerSeconds} />
        </div>
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
          onNext={() => {}}
          isLastQuestion={false}
        />
      )}
    </div>
  );
}
