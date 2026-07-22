import type { PodiumEntry, RoomPlayer } from '../types/multiplayer';
import { Button } from '../components/ui/Button';

interface PodiumScreenProps {
  entries: PodiumEntry[];
  players: RoomPlayer[];
  onRematch: () => void;
  onLeave: () => void;
}

export function PodiumScreen({ entries, players, onRematch, onLeave }: PodiumScreenProps) {
  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="screen podium" role="main">
      <h1 className="podium__title">Game Over!</h1>

      {/* Podium places */}
      <div className="podium__places" role="list" aria-label="Final standings">
        {topThree.map((entry, i) => {
          const player = players.find((p) => p.id === entry.playerId);
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div
              key={entry.playerId}
              className={`podium__entry podium__entry--${i + 1}`}
              role="listitem"
            >
              <span className="podium__medal" aria-hidden="true">
                {medals[i]}
              </span>
              <div className="podium__avatar" aria-hidden="true">
                {player && (
                  <svg viewBox="0 0 120 160" width={40} height={53}>
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
                )}
              </div>
              <span className="podium__name">{entry.nickname}</span>
              <span className="podium__score">{entry.score} pts</span>
              <span className="podium__rank" aria-label={`Rank ${entry.rank}`}>
                #{entry.rank}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rest of players */}
      {rest.length > 0 && (
        <div className="podium__rest" role="list" aria-label="Other players">
          {rest.map((entry) => (
            <div key={entry.playerId} className="podium__entry podium__entry--rest" role="listitem">
              <span className="podium__name">{entry.nickname}</span>
              <span className="podium__score">{entry.score} pts</span>
              <span className="podium__rank">#{entry.rank}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="podium__actions">
        <Button onClick={onRematch} variant="primary" size="lg" fullWidth>
          🔄 Play Again
        </Button>
        <Button onClick={onLeave} variant="ghost" size="md" fullWidth>
          Leave Room
        </Button>
      </div>
    </div>
  );
}
