import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerRing } from '../ui/TimerRing';
import { playSound } from '../../services/useSound';

interface LuckyBoxChallengeProps {
  endsAt: number;
  seed: number;
  onSubmit: (boxesBanked: number, coinsBanked: number) => void;
  disabled: boolean;
}

// Corrupted box chance grows with each opened box
function getCorruptionChance(boxesOpened: number): number {
  // 10% base, +15% per box opened
  return Math.min(0.95, 0.10 + boxesOpened * 0.15);
}

export function LuckyBoxChallenge({ endsAt, seed, onSubmit, disabled }: LuckyBoxChallengeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [boxesOpened, setBoxesOpened] = useState(0);
  const [coinsBanked, setCoinsBanked] = useState(0);
  const [phase, setPhase] = useState<'choosing' | 'safe' | 'corrupted' | 'banked' | 'ended'>('choosing');
  const submittedRef = useRef(false);
  const rngRef = useRef(seed);

  // Seeded random
  const nextRandom = useCallback(() => {
    rngRef.current = (rngRef.current * 1103515245 + 12345) & 0x7fffffff;
    return rngRef.current / 0x7fffffff;
  }, []);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      setTimeRemaining(Math.round(remaining * 10) / 10);
      if (remaining <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        setPhase('ended');
        onSubmit(boxesOpened, coinsBanked);
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endsAt, onSubmit, boxesOpened, coinsBanked]);

  // Silent submit on unmount
  const boxesOpenedRef = useRef(boxesOpened);
  const coinsBankedRef = useRef(coinsBanked);
  boxesOpenedRef.current = boxesOpened;
  coinsBankedRef.current = coinsBanked;

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && !submittedRef.current && phase !== 'choosing') {
      // Time ran out - bank what you have
      handleBank();
    }
  }, [timeRemaining]);

  const handleOpen = useCallback(() => {
    if (disabled || submittedRef.current || phase !== 'choosing') return;

    const chance = nextRandom();
    const corruptChance = getCorruptionChance(boxesOpened);

    if (chance < corruptChance) {
      // Corrupted!
      setPhase('corrupted');
      playSound('corrupted');
      setTimeout(() => {
        submittedRef.current = true;
        onSubmit(boxesOpenedRef.current, 0);
        setPhase('ended');
      }, 1500);
    } else {
      // Safe box
      setBoxesOpened((prev) => prev + 1);
      setCoinsBanked((prev) => prev + 30);
      setPhase('safe');
      playSound('box_open');
      setTimeout(() => setPhase('choosing'), 800);
    }
  }, [disabled, phase, boxesOpened, nextRandom, onSubmit]);

  const handleBank = useCallback(() => {
    if (disabled || submittedRef.current || (phase !== 'choosing' && phase !== 'safe')) return;
    submittedRef.current = true;
    onSubmit(boxesOpenedRef.current, coinsBankedRef.current);
    setPhase('banked');
  }, [disabled, phase, onSubmit]);

  return (
    <div className="challenge challenge--lucky-box" role="main">
      <div className="sr-only" aria-live="assertive" role="status">
        {phase === 'choosing' && `Lucky Box! ${timeRemaining}s left. Boxes opened: ${boxesOpened}. Coins banked: ${coinsBanked}. Your chance of hitting a corrupted box: ${Math.round(getCorruptionChance(boxesOpened) * 100)}%.`}
        {phase === 'safe' && `Safe! You earned 30 coins. Total: ${coinsBanked} coins.`}
        {phase === 'corrupted' && `Corrupted box! Your unbanked pile is lost!`}
        {phase === 'banked' && `You banked ${boxesOpened} boxes and ${coinsBanked} coins!`}
      </div>

      <h2 className="challenge__title">Lucky Box</h2>
      <p className="challenge__desc">Open boxes, earn coins, but don't hit the corrupted box!</p>

      <div className="challenge__timer-row">
        <TimerRing seconds={timeRemaining} total={20} size={72} />
      </div>

      <div className="challenge__lucky-stats">
        <div className="challenge__stat">
          <span className="challenge__stat-value">{boxesOpened}</span>
          <span className="challenge__stat-label">Boxes</span>
        </div>
        <div className="challenge__stat">
          <span className="challenge__stat-value">🪙{coinsBanked}</span>
          <span className="challenge__stat-label">Coins</span>
        </div>
        <div className="challenge__stat">
          <span className="challenge__stat-value">{Math.round(getCorruptionChance(boxesOpened) * 100)}%</span>
          <span className="challenge__stat-label">Risk</span>
        </div>
      </div>

      {phase === 'corrupted' && (
        <div className="challenge__message challenge__message--bad" role="alert">
          💥 Corrupted! You lost your unbanked coins!
        </div>
      )}

      {phase === 'safe' && (
        <div className="challenge__message challenge__message--good" role="status">
          ✅ Safe! +30 coins
        </div>
      )}

      {phase === 'choosing' && (
        <div className="challenge__actions">
          <button
            className="challenge__action-btn challenge__action-btn--primary"
            onClick={handleOpen}
            disabled={disabled}
            aria-label={`Open another box. ${Math.round(getCorruptionChance(boxesOpened) * 100)}% risk of corruption.`}
          >
            📦 OPEN
          </button>
          <button
            className="challenge__action-btn challenge__action-btn--secondary"
            onClick={handleBank}
            disabled={disabled}
            aria-label={`Bank your ${coinsBanked} coins.`}
          >
            🏦 BANK
          </button>
        </div>
      )}

      {(phase === 'banked' || phase === 'ended') && (
        <p className="challenge__result">Banked: {boxesOpened} boxes, 🪙{coinsBanked} coins</p>
      )}
    </div>
  );
}