import type { PodiumEntry, RoomPlayer } from '../types/multiplayer';
import { Button } from '../components/ui/Button';

interface PodiumScreenProps {
  entries: PodiumEntry[];
  players: RoomPlayer[];
  onRematch: () => void;
  onLeave: () => void;
  playerId: string;
  myRank: number;
  totalQuestions: number;
}

export function PodiumScreen({ entries, players, onRematch, onLeave, playerId, myRank, totalQuestions }: PodiumScreenProps) {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  const topThree = sorted.filter((e) => e.rank <= 3);
  const rest = sorted.filter((e) => e.rank > 3);
  const myEntry = entries.find((e) => e.playerId === playerId);

  return (
    <div className="screen podium" role="main">
      {/* SR-only announcement */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        Game over! You placed #{myRank} of {entries.length}.
        {myEntry && ` You answered ${myEntry.correctCount} out of ${totalQuestions} questions correctly.`}
      </div>

      <h1 className="podium__title">Game Over!</h1>

      {/* Top 3 */}
      <div className="podium__places" role="list" aria-label="Final standings">
        {topThree.map((entry) => {
          const player = players.find((p) => p.id === entry.playerId);
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div
              key={entry.playerId}
              className={`podium__entry podium__entry--${entry.rank}${entry.playerId === playerId ? ' podium__entry--me' : ''}`}
              role="listitem"
            >
              <span className="podium__medal" aria-hidden="true">
                {medals[entry.rank - 1]}
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
              <span className="podium__name">
                {entry.nickname}
                {entry.playerId === playerId && <span className="podium__me-badge" aria-label="You"> (You)</span>}
              </span>
              <span className="podium__score">{entry.score} pts</span>
              <span className="podium__rank" aria-label={`Rank ${entry.rank}`}>
                #{entry.rank}
              </span>
              <span className="podium__correct" aria-label={`${entry.correctCount} correct out of ${totalQuestions}`}>
                              {entry.correctCount}/{totalQuestions} correct
                            </span>
            </div>
          );
        })}
      </div>

      {/* Rest */}
      {rest.length > 0 && (
        <div className="podium__rest" role="list" aria-label="Other players">
          {rest.map((entry) => (
            <div key={entry.playerId} className={`podium__entry podium__entry--rest${entry.playerId === playerId ? ' podium__entry--me' : ''}`} role="listitem">
              <span className="podium__name">
                {entry.nickname}
                {entry.playerId === playerId && <span className="podium__me-badge" aria-label="You"> (You)</span>}
              </span>
              <span className="podium__score">{entry.score} pts</span>
              <span className="podium__rank">#{entry.rank}</span>
              <span className="podium__correct">{entry.correctCount}/{totalQuestions} correct</span>
            </div>
          ))}
        </div>
      )}

      {/* Player's own stats */}
      {myEntry && (
        <div className="podium__my-stats" aria-label="Your results">
          <p>You placed #{myEntry.rank} with {myEntry.score} points. {myEntry.correctCount} out of {totalQuestions} correct answers. +{myEntry.correctCount * 100} coins earned!</p>
        </div>
      )}

      {/* Actions */}
      <div className="podium__actions">
        <Button onClick={onRematch} variant="primary" size="lg" fullWidth>
          Play Again
        </Button>
        <Button onClick={onLeave} variant="ghost" size="md" fullWidth>
          Leave Room
        </Button>
      </div>
    </div>
  );
}