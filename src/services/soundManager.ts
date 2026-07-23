// ====== Sound Manager ======

const SOUND_FILES = [
  'tap', 'click', 'correct', 'wrong', 'tick', 'countdown',
  'coin', 'victory', 'join', 'challenge', 'box_open', 'corrupted',
] as const;

export type SoundName = (typeof SOUND_FILES)[number];

const MUTE_KEY = 'triviaparty_muted';

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private _muted: boolean = false;

  constructor() {
    this._muted = localStorage.getItem(MUTE_KEY) === 'true';
    this.preload();
  }

  private preload() {
    for (const name of SOUND_FILES) {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(val: boolean) {
    this._muted = val;
    localStorage.setItem(MUTE_KEY, val ? 'true' : 'false');
  }

  toggle(): boolean {
    this.muted = !this._muted;
    return this._muted;
  }

  play(name: SoundName) {
    if (this._muted) return;
    const audio = this.sounds.get(name);
    if (!audio) return;
    // Clone so overlapping plays work
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = name === 'tick' || name === 'countdown' ? 0.3 : 0.5;
    clone.play().catch(() => {}); // Ignore autoplay-blocked errors
  }
}

export const soundManager = new SoundManager();
