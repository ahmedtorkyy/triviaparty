-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  playerId TEXT NOT NULL,
  nickname TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0,
  correctAnswers INTEGER NOT NULL DEFAULT 0,
  gamesPlayed INTEGER NOT NULL DEFAULT 0,
  weekId TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster weekly leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekId ON leaderboard(weekId);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekId_coins ON leaderboard(weekId, coins DESC);

-- Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  character JSONB NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'en',
  stats JSONB NOT NULL,
  lastDailyBonus TEXT,
  lastChallengeClaim TEXT,
  unlockedAvatars TEXT[] NOT NULL DEFAULT ARRAY['default'],
  currentAvatar TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);