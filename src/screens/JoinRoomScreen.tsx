import { useState } from 'react';
import { Button } from '../components/ui/Button';

interface JoinRoomScreenProps {
  onJoin: (code: string) => void;
  onBack: () => void;
  error?: string | null;
}

export function JoinRoomScreen({ onJoin, onBack, error }: JoinRoomScreenProps) {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    if (code.trim().length >= 4) {
      onJoin(code.trim().toUpperCase());
    }
  };

  return (
    <div className="screen join-room">
      <h1 className="join-room__title">Join Room</h1>

      <div className="join-room__form">
        <label htmlFor="room-code" className="join-room__label">
          Enter Room Code
        </label>
        <input
          id="room-code"
          type="text"
          className="join-room__input"
          placeholder="e.g. ABCD"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
          maxLength={4}
          autoComplete="off"
          autoFocus
          aria-describedby={error ? 'join-error' : undefined}
        />

        {error && (
          <p id="join-error" className="join-room__error" role="alert">
            {error}
          </p>
        )}

        <div className="join-room__actions">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={code.trim().length < 4}
            onClick={handleSubmit}
          >
            Join
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onBack}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}