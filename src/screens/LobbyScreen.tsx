import type { RoomSettings, RoomPlayer } from '../types/multiplayer';
import { Button } from '../components/ui/Button';

interface LobbyScreenProps {
  code: string;
  settings: RoomSettings | null;
  players: RoomPlayer[];
  isHost: boolean;
  isConductor: boolean;
  gameInProgress: boolean;
  onStartGame: () => void;
  onLeave: () => void;
}

export function LobbyScreen({
  code,
  settings,
  players,
  isConductor,
  gameInProgress,
  onStartGame,
  onLeave,
}: LobbyScreenProps) {
  // Show Start button if this player is the conductor (current host or promoted host)
  const showStartButton = isConductor && settings;
  const showCrown = isConductor;

  return (
    <div className="screen lobby">
      <div className="lobby__header">
        <h1 className="lobby__title">Room</h1>
        <div className="lobby__code" aria-label={`Room code: ${code}`}>
          <span className="lobby__code-label">Code</span>
          <span className="lobby__code-value">{code}</span>
        </div>
      </div>

      {/* Settings summary — only shown to conductor (joiners get settings from game_start) */}
      {settings && (
        <div className="lobby__settings" aria-label="Room settings">
          <div className="lobby__setting">
            <span className="lobby__setting-label">Mode</span>
            <span className="lobby__setting-value">{settings.mode === 'normal' ? 'Normal' : 'Survival'}</span>
          </div>
          <div className="lobby__setting">
            <span className="lobby__setting-label">Questions</span>
            <span className="lobby__setting-value">
              {settings.mode === 'normal' ? settings.questionCount : '∞'}
            </span>
          </div>
          <div className="lobby__setting">
            <span className="lobby__setting-label">Timer</span>
            <span className="lobby__setting-value">{settings.timerSeconds}s</span>
          </div>
          <div className="lobby__setting">
            <span className="lobby__setting-label">Language</span>
            <span className="lobby__setting-value">
              {settings.questionLanguage === 'en' ? 'English' : 'العربية'}
            </span>
          </div>
        </div>
      )}
      {!settings && (
        <p className="lobby__waiting-settings" role="status" aria-live="polite">
          Waiting for room settings...
        </p>
      )}

      {/* Player list */}
      <div className="lobby__players" role="list" aria-label="Players in room">
        <h2 className="lobby__players-title">
          Players ({players.length})
        </h2>
        {players.map((player) => (
          <div key={player.id} className="lobby__player" role="listitem">
            <div className="lobby__player-avatar" aria-hidden="true">
              <svg viewBox="0 0 120 160" width={32} height={42}>
                <circle cx="60" cy="60" r="58" fill={player.character.backgroundColor} />
                <ellipse cx="60" cy="55" rx="28" ry="30" fill={player.character.skinTone} />
                {player.character.hairStyle !== 'bald' && (
                  <path d="M32,50 Q32,20 60,18 Q88,20 88,50" fill={player.character.hairColor} />
                )}
                <circle cx="48" cy="52" r="3" fill="white" />
                <circle cx="72" cy="52" r="3" fill="white" />
                <circle cx="48" cy="52" r="1.5" fill="#222" />
                <circle cx="72" cy="52" r="1.5" fill="#222" />
                <path d="M48,64 Q60,74 72,64" fill="none" stroke="#222" strokeWidth="2" />
              </svg>
            </div>
            <span className="lobby__player-name">
              {player.nickname}
              {showCrown && player.id === players.find(p => p.isHost)?.id && (
                <span className="lobby__host-badge" aria-label="Host">👑</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="lobby__actions">
        {showStartButton && (
          <Button
            onClick={onStartGame}
            variant="primary"
            size="lg"
            fullWidth
            disabled={players.length < 2 && gameInProgress === false}
          >
            {gameInProgress ? 'Join Game' : 'Start Game'}
          </Button>
        )}
        {isConductor && !settings && (
          <p className="lobby__waiting" role="status" aria-live="polite">
            Configuring room...
          </p>
        )}
        {!isConductor && (
          <p className="lobby__waiting" role="status" aria-live="polite">
            Waiting for the host to start the game...
          </p>
        )}
        <Button onClick={onLeave} variant="ghost" size="md" fullWidth>
          Leave Room
        </Button>
      </div>
    </div>
  );
}