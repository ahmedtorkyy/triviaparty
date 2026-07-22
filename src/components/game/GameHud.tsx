interface GameHudProps {
  score: number;
  lives: number;
  maxLives: number;
  streak: number;
}

export function GameHud({ score, lives, maxLives, streak }: GameHudProps) {
  return (
    <div className="game-hud" role="status" aria-live="polite">
      <div className="game-hud__item">
        <span className="game-hud__label">Score</span>
        <span className="game-hud__value game-hud__value--score">{score}</span>
      </div>

      <div className="game-hud__item">
        <span className="game-hud__label">Lives</span>
        <span className="game-hud__value game-hud__value--lives" aria-label={`${lives} of ${maxLives} lives remaining`}>
          {Array.from({ length: maxLives }, (_, i) => (
            <span key={i} className={`heart ${i < lives ? 'heart--active' : 'heart--lost'}`}>
              {i < lives ? '♥' : '♡'}
            </span>
          ))}
        </span>
      </div>

      <div className="game-hud__item">
        <span className="game-hud__label">Streak</span>
        <span className="game-hud__value game-hud__value--streak">{streak}</span>
      </div>
    </div>
  );
}
