import { useEffect } from 'react';
import { soundManager, type SoundName } from './soundManager';

/**
 * Play a sound effect. Safe to call anywhere; respects mute.
 */
export function playSound(name: SoundName) {
  soundManager.play(name);
}

/**
 * React hook: play a sound when a dependency changes.
 * Skips the initial render.
 */
export function useSoundEffect(name: SoundName, deps: any[]) {
  useEffect(() => {
    // Skip initial mount
    const timer = setTimeout(() => {
      soundManager.play(name);
    }, 50);
    return () => clearTimeout(timer);
  }, deps);
}

/**
 * React hook to play a sound exactly once triggered by a condition.
 */
export function useSoundOnCondition(name: SoundName, condition: boolean) {
  useEffect(() => {
    if (condition) {
      soundManager.play(name);
    }
  }, [condition]);
}

/**
 * Mute toggle button component.
 */
export function MuteToggle() {
  return (
    <button
      className="mute-toggle"
      onClick={() => soundManager.toggle()}
      aria-label={soundManager.muted ? 'Unmute sound' : 'Mute sound'}
      title={soundManager.muted ? 'Unmute' : 'Mute'}
    >
      {soundManager.muted ? '🔇' : '🔊'}
    </button>
  );
}
