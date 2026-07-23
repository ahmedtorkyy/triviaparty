import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerRing } from '../ui/TimerRing';

interface TapFrenzyChallengeProps {
  endsAt: number;
  onSubmit: (tapCount: number) => void;
  disabled: boolean;
}

export function TapFrenzyChallenge({ endsAt, onSubmit, disabled }: TapFrenzyChallengeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [started, setStarted] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      setTimeRemaining(Math.round(remaining * 10) / 10);
      if (remaining <= 0) {
        if (!submittedRef.current) {
          submittedRef.current = true;
          onSubmit(tapCountRef.current);
        }
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    setStarted(true);
    return () => clearInterval(interval);
  }, [endsAt, onSubmit]);

  const tapCountRef = useRef(0);

  const handleTap = useCallback(() => {
    if (disabled || submittedRef.current) return;
    const newCount = tapCount + 1;
    setTapCount(newCount);
    tapCountRef.current = newCount;
  }, [tapCount, disabled]);

  const duration = Math.round((endsAt - Date.now() - timeRemaining * 1000) / 1000) + Math.round(timeRemaining);

  return (
    <div className="challenge challenge--tap-frenzy" role="main">
      <div className="sr-only" aria-live="assertive" role="status">
        {started && !submittedRef.current && `Tap Frenzy! ${timeRemaining} seconds left. You have tapped ${tapCount} times.`}
        {submittedRef.current && `Challenge over! You tapped ${tapCount} times.`}
      </div>

      <h2 className="challenge__title">Tap Frenzy!</h2>
      <p className="challenge__desc">Tap the button as fast as you can!</p>

      <div className="challenge__timer-row">
        <TimerRing seconds={timeRemaining} total={duration || 5} size={72} />
      </div>

      <div className="challenge__score">
        <span className="challenge__score-value">{tapCount}</span>
        <span className="challenge__score-label">taps</span>
      </div>

      <button
        className="challenge__tap-button"
        onClick={handleTap}
        disabled={disabled || submittedRef.current}
        aria-label={`Tap! Current count: ${tapCount}`}
      >
        TAP!
      </button>
    </div>
  );
}