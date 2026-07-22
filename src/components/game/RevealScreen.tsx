import type { AnswerRecord } from '../../types';

interface RevealScreenProps {
  isCorrect: boolean | null;
  correctAnswer: string;
  answer: AnswerRecord;
  onNext: () => void;
  isLastQuestion: boolean;
}

export function RevealScreen({
  isCorrect,
  correctAnswer,
  answer,
  onNext,
  isLastQuestion,
}: RevealScreenProps) {
  const speedBonus = answer.isCorrect
    ? Math.max(0, Math.floor((1 - answer.timeMs / (15 * 1000)) * 100))
    : 0;

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

      {isCorrect && speedBonus > 0 && (
        <p className="reveal-screen__bonus">
          Speed bonus: +{speedBonus} pts
        </p>
      )}

      <p className="reveal-screen__points">
        {isCorrect ? `+${100 + speedBonus} points` : '+0 points'}
      </p>

      <button className="tp-button tp-button--primary tp-button--lg reveal-screen__next" onClick={onNext}>
        {isLastQuestion ? 'See Results' : 'Next Question'}
      </button>
    </div>
  );
}
