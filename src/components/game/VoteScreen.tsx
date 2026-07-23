import { useState, useEffect, useRef } from 'react';
import { TimerRing } from '../ui/TimerRing';
import { playSound } from '../../services/useSound';

interface VoteScreenProps {
  options: string[];
  optionNames: string[];
  endsAt: number;
  onVote: (choice: string) => void;
  hasVoted: boolean;
  myChoice: string | null;
  winnerId: string | null;
  winnerName: string | null;
}

export function VoteScreen({
  options,
  optionNames,
  endsAt,
  onVote,
  hasVoted,
  myChoice,
  winnerId,
  winnerName,
}: VoteScreenProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const lastTickRef = useRef(-1);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      const wholeSec = Math.ceil(remaining);
      if (wholeSec <= 3 && wholeSec >= 1 && wholeSec !== lastTickRef.current) {
        lastTickRef.current = wholeSec;
        playSound('tick');
      }
      setTimeRemaining(Math.round(remaining * 10) / 10);
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="screen vote-screen" role="main">
      <div className="sr-only" role="status" aria-live="assertive">
        {!hasVoted && `Vote for the next category! Choose from: ${optionNames.join(', ')}. ${timeRemaining} seconds left.`}
        {hasVoted && winnerId && `Voting complete. Winner: ${winnerName}.`}
        {hasVoted && !winnerId && `You voted for ${optionNames[options.indexOf(myChoice || '')] || myChoice}. Waiting for results...`}
      </div>

      <h2 className="vote-screen__title">Vote for the Next Category</h2>

      <div className="vote-screen__timer">
        <TimerRing seconds={timeRemaining} total={10} size={72} />
      </div>

      {winnerId ? (
        <div className="vote-screen__result" role="alert">
          <h3>Winner: {winnerName}</h3>
        </div>
      ) : (
        <div className="vote-screen__options" role="group" aria-label="Category choices">
          {options.map((id, i) => {
            const name = optionNames[i];
            const isSelected = myChoice === id;
            return (
              <button
                key={id}
                className={`vote-screen__option ${isSelected ? 'vote-screen__option--selected' : ''}`}
                onClick={() => { if (!hasVoted) { playSound('click'); onVote(id); } }}
                disabled={hasVoted}
                aria-label={`${name}${isSelected ? ' (selected)' : ''}`}
                aria-pressed={isSelected}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}