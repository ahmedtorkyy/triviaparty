import type { TriviaQuestion } from '../../types';
import { playSound } from '../../services/useSound';

interface QuestionCardProps {
  question: TriviaQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  disabled: boolean;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  showResult: boolean;
  removedAnswers?: string[];
}

const ANSWER_COLORS = ['#FF6B35', '#3B82F6', '#F59E0B', '#10B981'];
const ANSWER_SHAPES = ['▽', '◆', '○', '□'];

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  disabled,
  selectedAnswer,
  correctAnswer,
  showResult,
  removedAnswers,
}: QuestionCardProps) {
  const visibleAnswers = question.allAnswers.filter(
    (a) => !removedAnswers?.includes(a)
  );
  return (
    <div className="question-card" role="region" aria-label={`Question ${questionNumber}`}>
      <div className="question-card__meta">
        <span className="question-card__category">{question.category}</span>
        <span className="question-card__number">
          {questionNumber} / {totalQuestions}
        </span>
      </div>

      <h2 className="question-card__text">{question.question}</h2>

      <div className="question-card__answers" role="group" aria-label="Answer options">
        {visibleAnswers.map((answer, index) => {
          const isSelected = selectedAnswer === answer;
          const isCorrectAnswer = showResult && answer === correctAnswer;
          const isWrongSelected = showResult && isSelected && answer !== correctAnswer;
          const color = ANSWER_COLORS[index];
          const shape = ANSWER_SHAPES[index];

          let className = 'answer-tile';
          if (isCorrectAnswer) className += ' answer-tile--correct';
          if (isWrongSelected) className += ' answer-tile--wrong';
          if (isSelected && !showResult) className += ' answer-tile--selected';
          if (disabled && !isSelected && !showResult) className += ' answer-tile--disabled';

          return (
            <button
              key={index}
              className={className}
              onClick={() => { playSound('tap'); onAnswer(answer); }}
              disabled={disabled}
              style={{ borderColor: color }}
              aria-label={`Answer option ${index + 1}: ${answer}`}
              aria-pressed={isSelected}
            >
              <span className="answer-tile__shape" aria-hidden="true" style={{ color }}>
                {shape}
              </span>
              <span className="answer-tile__text">{answer}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
