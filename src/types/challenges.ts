// ====== Challenge Types (for Phase 4) ======
export type ChallengeType = 'tap_frenzy' | 'shake_it' | 'blow_up' | 'lucky_box';

export interface ChallengeResult {
  type: ChallengeType;
  score: number;
  rank: number;
}

export interface ChallengeConfig {
  type: ChallengeType;
  duration: number; // seconds
  titleKey: string;
  descriptionKey: string;
}
