import { useState } from 'react';
import type { RoomSettings } from '../types/multiplayer';
import {
  DEFAULT_ROOM_SETTINGS,
  NORMAL_QUESTION_COUNTS,
  VOTING_QUESTION_COUNTS,
  TIMER_OPTIONS,
} from '../types/multiplayer';
import { generateRoomCode } from '../services/roomUtils';
import { Button } from '../components/ui/Button';

interface CreateRoomScreenProps {
  onRoomCreated: (code: string, settings: RoomSettings) => void;
  onBack: () => void;
}

export function CreateRoomScreen({ onRoomCreated, onBack }: CreateRoomScreenProps) {
  const [settings, setSettings] = useState<RoomSettings>({ ...DEFAULT_ROOM_SETTINGS });

  const handleCreate = () => {
    const code = generateRoomCode();
    onRoomCreated(code, settings);
  };

  const questionCounts =
    settings.questionSource === 'voting'
      ? VOTING_QUESTION_COUNTS
      : NORMAL_QUESTION_COUNTS;

  return (
    <div className="screen create-room">
      <h1 className="create-room__title">Create Room</h1>

      {/* Mode */}
      <div className="settings-group">
        <label className="settings-label">Mode</label>
        <div className="settings-toggle" role="radiogroup" aria-label="Game mode">
          <button
            className={`settings-option ${settings.mode === 'normal' ? 'settings-option--active' : ''}`}
            onClick={() => setSettings({ ...settings, mode: 'normal' })}
            role="radio"
            aria-checked={settings.mode === 'normal'}
          >
            Normal
          </button>
          <button
            className={`settings-option ${settings.mode === 'survival' ? 'settings-option--active' : ''}`}
            onClick={() => setSettings({ ...settings, mode: 'survival' })}
            role="radio"
            aria-checked={settings.mode === 'survival'}
          >
            Survival
          </button>
        </div>
      </div>

      {/* Question language */}
      <div className="settings-group">
        <label className="settings-label">Question Language</label>
        <div className="settings-toggle" role="radiogroup" aria-label="Question language">
          <button
            className={`settings-option ${settings.questionLanguage === 'en' ? 'settings-option--active' : ''}`}
            onClick={() => setSettings({ ...settings, questionLanguage: 'en' })}
            role="radio"
            aria-checked={settings.questionLanguage === 'en'}
          >
            English
          </button>
          <button
            className={`settings-option ${settings.questionLanguage === 'ar' ? 'settings-option--active' : ''}`}
            onClick={() => setSettings({ ...settings, questionLanguage: 'ar' })}
            role="radio"
            aria-checked={settings.questionLanguage === 'ar'}
          >
            العربية
          </button>
        </div>
      </div>

      {/* Question source */}
      <div className="settings-group">
        <label className="settings-label" htmlFor="source-select">Question Source</label>
        <select
          id="source-select"
          className="settings-select"
          value={settings.questionSource}
          onChange={(e) =>
            setSettings({
              ...settings,
              questionSource: e.target.value as 'categories' | 'voting' | 'ai',
            })
          }
        >
          <option value="categories">Categories</option>
          <option value="voting">Voting Mode</option>
          <option value="ai">AI Mode</option>
        </select>
      </div>

      {/* Question count (normal mode only) */}
      {settings.mode === 'normal' && (
        <div className="settings-group">
          <label className="settings-label" htmlFor="count-select">Number of Questions</label>
          <select
            id="count-select"
            className="settings-select"
            value={settings.questionCount}
            onChange={(e) =>
              setSettings({ ...settings, questionCount: Number(e.target.value) })
            }
          >
            {questionCounts.map((n) => (
              <option key={n} value={n}>
                {n} questions
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Timer */}
      <div className="settings-group">
        <label className="settings-label" htmlFor="timer-select">Timer per Question</label>
        <select
          id="timer-select"
          className="settings-select"
          value={settings.timerSeconds}
          onChange={(e) =>
            setSettings({ ...settings, timerSeconds: Number(e.target.value) })
          }
        >
          {TIMER_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t} seconds
            </option>
          ))}
        </select>
      </div>

      {/* Challenges */}
      <div className="settings-group">
        <label className="settings-label">Challenges</label>
        <div className="settings-toggle" role="radiogroup" aria-label="Challenges">
          <button
            className={`settings-option ${settings.challengesEnabled ? 'settings-option--active' : ''}`}
            onClick={() => setSettings({ ...settings, challengesEnabled: true })}
            role="radio"
            aria-checked={settings.challengesEnabled}
          >
            On
          </button>
          <button
            className={`settings-option ${!settings.challengesEnabled ? 'settings-option--active' : ''}`}
            onClick={() => setSettings({ ...settings, challengesEnabled: false })}
            role="radio"
            aria-checked={!settings.challengesEnabled}
          >
            Off
          </button>
        </div>
      </div>

      <div className="create-room__actions">
        <Button onClick={handleCreate} variant="primary" size="lg" fullWidth>
          Create Room
        </Button>
        <Button onClick={onBack} variant="ghost" size="md" fullWidth>
          Back
        </Button>
      </div>
    </div>
  );
}
