import { useState, useEffect } from 'react';
import type { PlayerProfile } from './types';
import type { RoomSettings } from './types/multiplayer';
import { loadProfile, saveProfile } from './services/storage';
import { CharacterMaker } from './screens/CharacterMaker';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { JoinRoomScreen } from './screens/JoinRoomScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { isSupabaseConfigured } from './services/supabase';

type AppScreen =
  | 'loading'
  | 'character'
  | 'home'
  | 'game_solo'
  | 'create_room'
  | 'join_room'
  | 'lobby';

function App() {
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);

  // Load profile on mount
  useEffect(() => {
    const existing = loadProfile();
    setProfile(existing);

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

  // Multiplayer handlers
  const handleCreateRoom = () => {
    if (!isSupabaseConfigured()) {
      // For now, skip to lobby with a fake code for UI testing
      // Will need Supabase credentials for real multiplayer
      setRoomCode('TEST');
      setRoomSettings(null);
      setScreen('lobby');
      return;
    }
    setScreen('create_room');
  };

  const handleRoomCreated = (code: string, settings: RoomSettings) => {
    setRoomCode(code);
    setRoomSettings(settings);
    setScreen('lobby');
  };

  const handleJoinRoom = () => {
    setScreen('join_room');
  };

  const handleRoomJoined = (code: string) => {
    setRoomCode(code);
    setScreen('lobby');
  };

  const handleLeaveRoom = () => {
    setRoomCode('');
    setRoomSettings(null);
    setScreen('home');
  };

  const handleStartGame = () => {
    // Phase 2: Start multiplayer game
    // For now, back to home
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
          onPlaySolo={() => setScreen('game_solo')}
          onShowCharacterMaker={() => setScreen('character')}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {screen === 'game_solo' && (
        <GameScreen
          profile={profile}
          onProfileChange={handleProfileChange}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'create_room' && (
        <CreateRoomScreen
          onRoomCreated={handleRoomCreated}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'join_room' && (
        <JoinRoomScreen
          onJoin={handleRoomJoined}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          code={roomCode}
          settings={roomSettings || { mode: 'normal', questionLanguage: 'en', questionSource: 'categories', questionCount: 10, timerSeconds: 15, challengesEnabled: true }}
          players={[
            {
              id: profile.playerId,
              nickname: profile.nickname,
              character: profile.character,
              isHost: true,
              score: 0,
              lives: 3,
              isEliminated: false,
              hasAnswered: false,
            },
          ]}
          isHost={true}
          gameInProgress={false}
          onStartGame={handleStartGame}
          onLeave={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
