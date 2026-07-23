import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerRing } from '../ui/TimerRing';

interface MatchingPairsChallengeProps {
  endsAt: number;
  items: string[];
  onSubmit: (pairsMatched: number, totalPairs: number) => void;
  disabled: boolean;
}

interface Card {
  id: number;
  item: string;
  flipped: boolean;
  matched: boolean;
}

export function MatchingPairsChallenge({ endsAt, items, onSubmit, disabled }: MatchingPairsChallengeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const submittedRef = useRef(false);
  const lastAnnouncementRef = useRef('');

  // Initialize the shuffled card grid
  useEffect(() => {
    // Each item appears twice
    const cardItems: { item: string; pairId: number }[] = [];
    items.forEach((item, i) => {
      cardItems.push({ item, pairId: i * 2 });
      cardItems.push({ item, pairId: i * 2 + 1 });
    });
    // Shuffle
    const copy = [...cardItems];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setCards(copy.map((c, idx) => ({
      id: idx,
      item: c.item,
      flipped: false,
      matched: false,
    })));
  }, []); // only on mount

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      setTimeRemaining(Math.round(remaining * 10) / 10);
      if (remaining <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        onSubmit(matchedCountRef.current, items.length);
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endsAt, onSubmit, items.length]);

  const matchedCountRef = useRef(matchedCount);
  matchedCountRef.current = matchedCount;

  const handleFlip = useCallback((cardId: number) => {
    if (disabled || locked || submittedRef.current) return;
    const card = cards[cardId];
    if (!card || card.flipped || card.matched) return;

    const newCards = [...cards];
    newCards[cardId] = { ...card, flipped: true };

    if (flippedIds.length === 0) {
      // First card flipped
      setCards(newCards);
      setFlippedIds([cardId]);
      setAnnouncement(`Card ${cardId + 1}: ${card.item}`);
    } else if (flippedIds.length === 1) {
      // Second card flipped
      const firstId = flippedIds[0];
      const firstCard = cards[firstId];
      setCards(newCards);
      setLocked(true);

      if (firstCard.item === card.item && firstId !== cardId) {
        // Match!
        setTimeout(() => {
          const updated = [...newCards];
          updated[firstId] = { ...updated[firstId], matched: true };
          updated[cardId] = { ...updated[cardId], matched: true };
          setCards(updated);
          setFlippedIds([]);
          setLocked(false);
          const newCount = matchedCountRef.current + 1;
          setMatchedCount(newCount);
          matchedCountRef.current = newCount;
          setAnnouncement(`Match! ${card.item}. ${newCount} of ${items.length} pairs found.`);

          // All matched!
          if (newCount >= items.length) {
            submittedRef.current = true;
            onSubmit(items.length, items.length);
          }
        }, 600);
      } else {
        // No match
        setAnnouncement(`No match. ${card.item}`);
        setTimeout(() => {
          const updated = [...newCards];
          updated[firstId] = { ...updated[firstId], flipped: false };
          updated[cardId] = { ...updated[cardId], flipped: false };
          setCards(updated);
          setFlippedIds([]);
          setLocked(false);
        }, 800);
      }
    }
  }, [cards, flippedIds, locked, disabled, items.length, onSubmit]);

  const gridCols = items.length <= 4 ? 4 : 4;
  const totalPairs = items.length;

  return (
    <div className="challenge challenge--matching-pairs" role="main">
      <div className="sr-only" aria-live="assertive" role="status">
        {!submittedRef.current && `Matching Pairs! ${timeRemaining}s left. ${matchedCount} of ${totalPairs} pairs matched.`}
        {submittedRef.current && `Challenge over! You matched ${matchedCount} of ${totalPairs} pairs.`}
        {announcement && !submittedRef.current && announcement !== lastAnnouncementRef.current && (() => { lastAnnouncementRef.current = announcement; return ''; })()}
      </div>

      <h2 className="challenge__title">Matching Pairs</h2>
      <p className="challenge__desc">Find matching pairs before time runs out!</p>

      <div className="challenge__timer-row">
        <TimerRing seconds={timeRemaining} total={20} size={72} />
      </div>

      <div className="challenge__score">
        <span className="challenge__score-value">{matchedCount}</span>
        <span className="challenge__score-label">/ {totalPairs} pairs</span>
      </div>

      {announcement && (
        <div className="challenge__announcement" role="status" aria-live="polite">
          {announcement}
        </div>
      )}

      <div
        className="challenge__grid"
        style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        role="group"
        aria-label="Memory cards"
      >
        {cards.map((card) => (
          <button
            key={card.id}
            className={`challenge__card ${card.flipped ? 'challenge__card--flipped' : ''} ${card.matched ? 'challenge__card--matched' : ''}`}
            onClick={() => handleFlip(card.id)}
            disabled={disabled || locked || card.matched || card.flipped || submittedRef.current}
            aria-label={
              card.matched
                ? `Card ${card.id + 1}: ${card.item} (matched)`
                : card.flipped
                  ? `Card ${card.id + 1}: ${card.item}`
                  : `Card ${card.id + 1}: face down`
            }
          >
            {card.flipped || card.matched ? card.item : '❓'}
          </button>
        ))}
      </div>
    </div>
  );
}