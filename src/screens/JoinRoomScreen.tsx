import { useState } from 'react';
import { Button } from '../components/ui/Button';

interface JoinRoomScreenProps {
  onJoin: (code: string) => void;
  onBack: () => void;
}

export function JoinRoomScreen({ onJoin, onBack }: JoinRoomScreenProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 4 || !/^[A-Z]+$/.test(trimmed)) {
      setError('Enter a 4-letter room code');
      return;
    }
    onJoin(trimmed);
  };

  return (
    <div className="screen join-room">
      <h1 className="join-room__title">Join Room</h1>

      <div className="join-room__input-group">
        <label htmlFor="room-code" className="join-room__label">
          Room Code
        </label>
        <input
          id="room-code"
          type="text"
          className="join-room__input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError('');
          }}
          placeholder="e.g. ABCD"
          maxLength={4}
          autoFocus
          aria-describedby={error ? 'room-error' : undefined}
        />
        {error && (
          <span id="room-error" className="join-room__error" role="alert">
            {error}
          </span>
        )}
        <span className="join-room__hint">
          Ask the host for the 4-letter room code
        </span>
      </div>

      <div className="join-room__actions">
        <Button
          onClick={handleJoin}
          variant="primary"
          size="lg"
          fullWidth
          disabled={code.trim().length !== 4}
        >
          Join
        </Button>
        <Button onClick={onBack} variant="ghost" size="md" fullWidth>
          Back
        </Button>
      </div>
    </div>
  );
}
