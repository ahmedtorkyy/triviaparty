import { useState, useEffect } from 'react';
import type { PlayerProfile } from './types';
import { loadProfile, saveProfile } from './services/storage';
import { CharacterMaker } from './screens/CharacterMaker';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';

type AppScreen = 'loading' | 'character' | 'home' | 'game_solo';

function App() {
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  // Load profile on mount
  useEffect(() => {
    const existing = loadProfile();
    setProfile(existing);

    // If profile has a nickname and character, go to home
    if (existing.nickname && existing.nickname !== 'Player') {
      setScreen('home');
    } else {
      setScreen('character');
    }
  }, []);

  const handleProfileChange = (updated: PlayerProfile) => {
    setProfile(updated);
    saveProfile(updated);
  };

  const handleCharacterComplete = (updated: PlayerProfile) => {
    setProfile(updated);
    setScreen('home');
  };

  const handlePlaySolo = () => {
    setScreen('game_solo');
  };

  const handleGameBack = () => {
    setScreen('home');
  };

  // Loading state
  if (screen === 'loading' || !profile) {
    return (
      <div className="app app--loading">
        <div className="app__loader" role="status" aria-live="polite">
          <div className="app__spinner" aria-hidden="true" />
          <p>Loading TriviaParty...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {screen === 'character' && (
        <CharacterMaker onComplete={handleCharacterComplete} />
      )}

      {screen === 'home' && (
        <HomeScreen
          profile={profile}
          onProfileChange={handleProfileChange}
          onPlaySolo={handlePlaySolo}
          onShowCharacterMaker={() => setScreen('character')}
        />
      )}

      {screen === 'game_solo' && (
        <GameScreen
          profile={profile}
          onProfileChange={handleProfileChange}
          onBack={handleGameBack}
        />
      )}
    </div>
  );
}

export default App;
