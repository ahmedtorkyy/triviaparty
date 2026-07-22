import { useState } from 'react';
import type { PlayerProfile, PlayerCharacter } from '../types';
import { loadProfile, saveProfile, DEFAULT_CHARACTER } from '../services/storage';
import { Button } from '../components/ui/Button';

interface CharacterMakerProps {
  onComplete: (profile: PlayerProfile) => void;
}

const SKIN_TONES = ['#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#FFDFC4', '#D3B88E'];
const HAIR_STYLES = ['short', 'long', 'curly', 'spiky', 'bald', 'bun'];
const HAIR_COLORS = ['#2c1b0e', '#1a1a1a', '#d4a017', '#8B4513', '#c0c0c0', '#ff4500'];
const EYE_STYLES = ['round', 'almond', 'happy', 'sunglasses', 'none'];
const ACCESSORIES = ['none', 'headphones', 'hat', 'bowtie', 'crown'];
const BG_COLORS = ['#7C5CFF', '#FF6B35', '#3B82F6', '#10B981', '#EC4899', '#F59E0B'];

const LABELS: Record<string, string> = {
  skinTone: 'Skin Tone',
  hairStyle: 'Hair Style',
  hairColor: 'Hair Color',
  eyes: 'Eyes',
  accessory: 'Accessory',
  bgColor: 'Background',
};

export function CharacterMaker({ onComplete }: CharacterMakerProps) {
  const existingProfile = loadProfile();
  const [character, setCharacter] = useState<PlayerCharacter>(
    existingProfile.character || DEFAULT_CHARACTER
  );
  const [nickname, setNickname] = useState(existingProfile.nickname || '');
  const [error, setError] = useState('');

  function cycleOption<T>(current: T, options: T[], direction: 1 | -1): T {
    const idx = options.indexOf(current);
    const next = (idx + direction + options.length) % options.length;
    return options[next];
  }

  function randomizeCharacter() {
    setCharacter({
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      hairStyle: HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      eyes: EYE_STYLES[Math.floor(Math.random() * EYE_STYLES.length)],
      accessory: ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)],
      backgroundColor: BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)],
    });
  }

  function handleStart() {
    const trimmed = nickname.trim();
    if (trimmed.length < 3 || trimmed.length > 15) {
      setError('Nickname must be 3-15 characters');
      return;
    }
    // Bad-word filter placeholder
    if (/fuck|shit|damn/i.test(trimmed)) {
      setError('Please choose a different nickname');
      return;
    }

    const profile: PlayerProfile = {
      ...existingProfile,
      nickname: trimmed,
      character,
    };
    saveProfile(profile);
    onComplete(profile);
  }

  const hairLabel = HAIR_STYLES.includes(character.hairStyle)
    ? character.hairStyle
    : 'custom';
  const eyeLabel = EYE_STYLES.includes(character.eyes) ? character.eyes : 'custom';
  const accessoryLabel = ACCESSORIES.includes(character.accessory)
    ? character.accessory
    : 'none';

  return (
    <div className="screen character-maker">
      <h1 className="character-maker__title">Create Your Character</h1>

      {/* Live preview as SVG */}
      <div className="character-maker__preview" aria-hidden="true">
        <svg viewBox="0 0 120 160" width={120} height={160}>
          <circle cx="60" cy="60" r="58" fill={character.backgroundColor} />
          <ellipse cx="60" cy="55" rx="28" ry="30" fill={character.skinTone} />
          {character.hairStyle !== 'bald' && (
            <path
              d="M32,50 Q32,20 60,18 Q88,20 88,50 Q90,38 80,34 Q70,30 60,30 Q50,30 40,34 Q30,38 32,50Z"
              fill={character.hairColor}
            />
          )}
          {character.eyes === 'sunglasses' ? (
            <>
              <rect x="38" y="44" width="16" height="8" rx="2" fill="#222" />
              <rect x="66" y="44" width="16" height="8" rx="2" fill="#222" />
              <line x1="54" y1="48" x2="66" y2="48" stroke="#222" strokeWidth="2" />
            </>
          ) : character.eyes !== 'none' ? (
            <>
              <circle cx="48" cy="52" r="4" fill="white" />
              <circle cx="72" cy="52" r="4" fill="white" />
              <circle cx="48" cy="52" r="2" fill="#222" />
              <circle cx="72" cy="52" r="2" fill="#222" />
            </>
          ) : null}
          <path d="M48,64 Q60,74 72,64" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" />
          {character.accessory === 'crown' && (
            <polygon points="40,18 45,8 50,16 55,6 60,14 65,6 70,16 75,8 80,18" fill="#F59E0B" />
          )}
          {character.accessory === 'headphones' && (
            <>
              <path d="M32,48 Q30,40 34,34" fill="none" stroke="#555" strokeWidth="4" strokeLinecap="round" />
              <path d="M88,48 Q90,40 86,34" fill="none" stroke="#555" strokeWidth="4" strokeLinecap="round" />
              <rect x="28" y="46" width="10" height="8" rx="3" fill="#555" />
              <rect x="82" y="46" width="10" height="8" rx="3" fill="#555" />
            </>
          )}
          {character.accessory === 'hat' && (
            <path d="M32,38 Q35,18 60,16 Q85,18 88,38 L82,36 Q80,24 60,22 Q40,24 38,36 Z" fill="#333" />
          )}
          {character.accessory === 'bowtie' && (
            <>
              <polygon points="48,80 52,84 48,88" fill="#FF6B35" />
              <polygon points="72,80 68,84 72,88" fill="#FF6B35" />
              <circle cx="60" cy="84" r="3" fill="#FF6B35" />
            </>
          )}
        </svg>
      </div>

      <div className="sr-only" aria-live="polite" role="status">
        {hairLabel} hair, {eyeLabel} eyes, {accessoryLabel}
      </div>

      <div className="character-maker__controls">
        <OptionControl
          label={LABELS.skinTone}
          current={character.skinTone}
          options={SKIN_TONES}
          colorPreview
          onPrev={() => setCharacter({ ...character, skinTone: cycleOption(character.skinTone, SKIN_TONES, -1) })}
          onNext={() => setCharacter({ ...character, skinTone: cycleOption(character.skinTone, SKIN_TONES, 1) })}
        />
        <OptionControl
          label={LABELS.hairStyle}
          current={character.hairStyle}
          options={HAIR_STYLES}
          onPrev={() => setCharacter({ ...character, hairStyle: cycleOption(character.hairStyle, HAIR_STYLES, -1) })}
          onNext={() => setCharacter({ ...character, hairStyle: cycleOption(character.hairStyle, HAIR_STYLES, 1) })}
        />
        <OptionControl
          label={LABELS.hairColor}
          current={character.hairColor}
          options={HAIR_COLORS}
          colorPreview
          onPrev={() => setCharacter({ ...character, hairColor: cycleOption(character.hairColor, HAIR_COLORS, -1) })}
          onNext={() => setCharacter({ ...character, hairColor: cycleOption(character.hairColor, HAIR_COLORS, 1) })}
        />
        <OptionControl
          label={LABELS.eyes}
          current={character.eyes}
          options={EYE_STYLES}
          onPrev={() => setCharacter({ ...character, eyes: cycleOption(character.eyes, EYE_STYLES, -1) })}
          onNext={() => setCharacter({ ...character, eyes: cycleOption(character.eyes, EYE_STYLES, 1) })}
        />
        <OptionControl
          label={LABELS.accessory}
          current={character.accessory}
          options={ACCESSORIES}
          onPrev={() => setCharacter({ ...character, accessory: cycleOption(character.accessory, ACCESSORIES, -1) })}
          onNext={() => setCharacter({ ...character, accessory: cycleOption(character.accessory, ACCESSORIES, 1) })}
        />
        <OptionControl
          label={LABELS.bgColor}
          current={character.backgroundColor}
          options={BG_COLORS}
          colorPreview
          onPrev={() => setCharacter({ ...character, backgroundColor: cycleOption(character.backgroundColor, BG_COLORS, -1) })}
          onNext={() => setCharacter({ ...character, backgroundColor: cycleOption(character.backgroundColor, BG_COLORS, 1) })}
        />
      </div>

      <button className="character-maker__random" onClick={randomizeCharacter} aria-label="Random Character">
        🎲 Random Character
      </button>

      <div className="character-maker__name">
        <label htmlFor="nickname">Nickname</label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setError(''); }}
          placeholder="Enter your nickname"
          maxLength={15}
          minLength={3}
          aria-describedby="nickname-hint"
          autoFocus
        />
        <span id="nickname-hint" className="character-maker__hint">
          3-15 characters, letters and numbers
        </span>
        {error && <span className="character-maker__error" role="alert">{error}</span>}
      </div>

      <Button onClick={handleStart} variant="primary" size="lg" fullWidth disabled={nickname.trim().length < 3}>
        Start Playing!
      </Button>
    </div>
  );
}

interface OptionControlProps {
  label: string;
  current: string;
  options: string[];
  colorPreview?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

function OptionControl({ label, current, options, colorPreview, onPrev, onNext }: OptionControlProps) {
  const currentIndex = options.indexOf(current);
  const currentLabel = currentIndex >= 0 ? current : current;

  return (
    <div className="option-control" role="group" aria-label={label}>
      <span className="option-control__label">{label}</span>
      <div className="option-control__controls">
        <button
          className="option-control__btn"
          onClick={onPrev}
          aria-label={`${label}, previous option`}
        >
          ‹
        </button>
        <span
          className="option-control__value"
          aria-label={`${label}, option ${currentIndex + 1} of ${options.length}: ${currentLabel}`}
        >
          {colorPreview ? (
            <span
              className="option-control__swatch"
              style={{ backgroundColor: current }}
              aria-hidden="true"
            />
          ) : (
            currentLabel
          )}
        </span>
        <button
          className="option-control__btn"
          onClick={onNext}
          aria-label={`${label}, next option`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
