import type { AnswerRecord } from '../../types';

interface RevealScreenProps {
  isCorrect: boolean | null;
  correctAnswer: string;
  answer: AnswerRecord;
  pointsEarned?: number;
  cumulativeScore?: number;
  onNext: () => void;
  isLastQuestion: boolean;
}

export function RevealScreen({
  isCorrect,
  correctAnswer,
  answer,
  pointsEarned,
  cumulativeScore,
  onNext,
  isLastQuestion,
}: RevealScreenProps) {
  const speedBonus = answer.isCorrect
    ? Math.max(0, Math.floor((1 - answer.timeMs / (15 * 1000)) * 100))
    : 0;

  const totalEarned = pointsEarned ?? (isCorrect ? 100 + speedBonus : 0);

  return (
    <div className="reveal-screen">
      <div className={`reveal-screen__banner ${isCorrect ? 'reveal-screen__banner--correct' : 'reveal-screen__banner--wrong'}`}>
        <span className="reveal-screen__icon" aria-hidden="true">
          {isCorrect ? '✓' : '✗'}
        </span>
        <span className="reveal-screen__verdict">
          {isCorrect ? 'Correct!' : 'Wrong'}
        </span>
      </div>

      <p className="reveal-screen__answer">
        <strong>The correct answer:</strong> {correctAnswer}
      </p>

      <p className="reveal-screen__points">
        +{totalEarned} points this question
      </p>

      {cumulativeScore !== undefined && (
        <p className="reveal-screen__cumulative">
          Total: {cumulativeScore} points
        </p>
      )}

      {isCorrect && speedBonus > 0 && (
        <p className="reveal-screen__bonus">
          Speed bonus: +{speedBonus} pts
        </p>
      )}

      <button className="tp-button tp-button--primary tp-button--lg reveal-screen__next" onClick={onNext}>
        {isLastQuestion ? 'See Results' : 'Next Question'}
      </button>
    </div>
  );
}
