import { useState, useEffect, useCallback } from 'react';
import type { PlayerProfile } from './types';
import type { RoomSettings, RoomPlayer, PlayerCharacterSnapshot } from './types/multiplayer';
import { loadProfile, saveProfile } from './services/storage';
import { getRoomService } from './services/roomService';
import { CharacterMaker } from './screens/CharacterMaker';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { JoinRoomScreen } from './screens/JoinRoomScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { MultiplayerGameScreen } from './screens/MultiplayerGameScreen';

type AppScreen =
  | 'loading'
  | 'character'
  | 'home'
  | 'game_solo'
  | 'create_room'
  | 'join_room'
  | 'lobby'
  | 'mp_game';

function App() {
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [playerCharacterSnapshot, setPlayerCharacterSnapshot] = useState<PlayerCharacterSnapshot | null>(null);

  const roomService = getRoomService();

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

  // Refresh player list from presence
  const refreshPlayers = useCallback(() => {
    if (!roomService.isConnected) return;
    const state = (roomService as any).channel?.presenceState();
    if (!state) return;
    const players: RoomPlayer[] = [];
    let foundHost = false;
    for (const [id, presences] of Object.entries(state)) {
      if ((presences as any[]).length > 0) {
        const p = (presences as any[])[0];
        const isPlayerHost = p.isHost || (!foundHost && id === profile?.playerId);
        players.push({
          id,
          nickname: p.nickname,
          character: p.character,
          isHost: isPlayerHost,
          score: p.score || 0,
          lives: p.lives || 3,
          isEliminated: p.isEliminated || false,
          hasAnswered: p.hasAnswered || false,
        });
        if (isPlayerHost) foundHost = true;
      }
    }
    setRoomPlayers(players);
  }, [roomService, profile?.playerId]);

  // ---- Create Room ----
  const handleCreateRoom = () => {
    setScreen('create_room');
  };

  const handleRoomCreated = async (settings: RoomSettings) => {
    if (!profile) return;
    const snapshot: PlayerCharacterSnapshot = {
      skinTone: profile.character.skinTone,
      hairStyle: profile.character.hairStyle,
      hairColor: profile.character.hairColor,
      eyes: profile.character.eyes,
      accessory: profile.character.accessory,
      backgroundColor: profile.character.backgroundColor,
    };
    setPlayerCharacterSnapshot(snapshot);

    try {
      const code = await roomService.create(settings, {
        id: profile.playerId,
        nickname: profile.nickname,
        character: snapshot,
        isHost: true,
        score: 0,
        lives: 3,
        isEliminated: false,
        hasAnswered: false,
      });
      setRoomCode(code);
      setRoomSettings(settings);
      setIsHost(true);
      setRoomPlayers([
        {
          id: profile.playerId,
          nickname: profile.nickname,
          character: snapshot,
          isHost: true,
          score: 0,
          lives: 3,
          isEliminated: false,
          hasAnswered: false,
        },
      ]);
      setScreen('lobby');
    } catch (err) {
      console.error('Failed to create room:', err);
      setScreen('home');
    }
  };

  // ---- Join Room ----
  const handleJoinRoom = () => {
    setScreen('join_room');
  };

  const handleRoomJoined = async (code: string) => {
    if (!profile) return;
    const snapshot: PlayerCharacterSnapshot = {
      skinTone: profile.character.skinTone,
      hairStyle: profile.character.hairStyle,
      hairColor: profile.character.hairColor,
      eyes: profile.character.eyes,
      accessory: profile.character.accessory,
      backgroundColor: profile.character.backgroundColor,
    };
    setPlayerCharacterSnapshot(snapshot);

    try {
      const joined = await roomService.join(code, {
        id: profile.playerId,
        nickname: profile.nickname,
        character: snapshot,
        isHost: false,
        score: 0,
        lives: 3,
        isEliminated: false,
        hasAnswered: false,
      });
      if (!joined) {
        console.error('Room not found');
        return;
      }
      setRoomCode(code);
      setIsHost(false);
      // Players will populate via presence sync
      setScreen('lobby');

      // Set a timer to refresh players after joining (presence sync takes a moment)
      setTimeout(refreshPlayers, 1500);
    } catch (err) {
      console.error('Failed to join room:', err);
      setScreen('home');
    }
  };

  // ---- Lobby ----
  useEffect(() => {
    if (screen === 'lobby') {
      // Poll for presence sync
      const interval = setInterval(refreshPlayers, 2000);
      return () => clearInterval(interval);
    }
  }, [screen, refreshPlayers]);

  const handleStartGame = () => {
    setScreen('mp_game');
  };

  const handleLeaveRoom = () => {
    roomService.leave();
    setRoomCode('');
    setRoomSettings(null);
    setRoomPlayers([]);
    setIsHost(false);
    setScreen('home');
  };

  const handleLeaveGame = () => {
    roomService.leave();
    setRoomCode('');
    setRoomSettings(null);
    setRoomPlayers([]);
    setIsHost(false);
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
          onRoomCreated={(_code, settings) => {
            handleRoomCreated(settings);
          }}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'join_room' && (
        <JoinRoomScreen
          onJoin={handleRoomJoined}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'lobby' && roomSettings && (
        <LobbyScreen
          code={roomCode}
          settings={roomSettings}
          players={roomPlayers}
          isHost={isHost}
          gameInProgress={false}
          onStartGame={handleStartGame}
          onLeave={handleLeaveRoom}
        />
      )}

      {screen === 'mp_game' && roomSettings && playerCharacterSnapshot && (
        <MultiplayerGameScreen
          playerId={profile.playerId}
          playerNickname={profile.nickname}
          playerCharacter={playerCharacterSnapshot}
          settings={roomSettings}
          isHost={isHost}
          roomCode={roomCode}
          onLeave={handleLeaveGame}
        />
      )}
    </div>
  );
}

export default App;
