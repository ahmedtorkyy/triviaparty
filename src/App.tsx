import { useState, useEffect } from 'react';
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
  const [gameStarted, setGameStarted] = useState(false);
  const [playerCharacterSnapshot, setPlayerCharacterSnapshot] = useState<PlayerCharacterSnapshot | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isConductor, setIsConductor] = useState(false);

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

  // ---- Create Room ----
  const handleCreateRoom = () => {
    setScreen('create_room');
    setJoinError(null);
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
      setIsConductor(true);
      setGameStarted(false);
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
    setJoinError(null);
  };

  const handleRoomJoined = async (code: string) => {
    if (!profile) return;
    setJoinError(null);

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
      const result = await roomService.join(code, {
        id: profile.playerId,
        nickname: profile.nickname,
        character: snapshot,
        isHost: false,
        score: 0,
        lives: 3,
        isEliminated: false,
        hasAnswered: false,
      });

      if (result === 'not_found') {
        setJoinError('Room not found. Check the code and try again.');
        return;
      }
      if (result === 'timeout') {
        setJoinError('Could not connect to the room. Try again.');
        return;
      }

      setRoomCode(code);
      setIsHost(false);
      setRoomSettings(null); // Joiners get settings from game_start broadcast
      setGameStarted(false);
      setRoomPlayers([]); // Populated via presence sync in the hook

      // If this is a reconnect (we already have a profile and the room exists),
      // request state snapshot to restore our position
      // Note: The hook will detect if a game is already running and set isLateJoiner
      setScreen('lobby');
    } catch (err) {
      console.error('Failed to join room:', err);
      setScreen('home');
    }
  };

  // ---- Lobby ----
  const handleStartGame = () => {
    setScreen('mp_game');
    setGameStarted(true);
  };

  const handleLeaveRoom = () => {
    roomService.leave();
    setRoomCode('');
    setRoomSettings(null);
    setRoomPlayers([]);
    setIsHost(false);
    setIsConductor(false);
    setGameStarted(false);
    setScreen('home');
  };

  const handleLeaveGame = () => {
    roomService.leave();
    setRoomCode('');
    setRoomSettings(null);
    setRoomPlayers([]);
    setIsHost(false);
    setIsConductor(false);
    setGameStarted(false);
    setScreen('home');
  };

  // Request state snapshot when rejoining a room with a running game
  useEffect(() => {
    if (screen === 'mp_game' && roomCode && roomService.isConnected) {
      // The hook handles late joiner detection internally
      // But we can also explicitly request snapshot if needed
    }
  }, [screen, roomCode, roomService]);

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
          error={joinError}
        />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          code={roomCode}
          settings={roomSettings}
          players={roomPlayers}
          isHost={isHost}
          isConductor={isConductor}
          gameInProgress={gameStarted}
          onStartGame={handleStartGame}
          onLeave={handleLeaveRoom}
        />
      )}

      {screen === 'mp_game' && playerCharacterSnapshot && (
        <MultiplayerGameScreen
          playerId={profile.playerId}
          playerNickname={profile.nickname}
          playerCharacter={playerCharacterSnapshot}
          settings={roomSettings}
          isHost={isHost}
          isConductor={isConductor}
          roomCode={roomCode}
          onLeave={handleLeaveGame}
          onBackToLobby={() => {
            setGameStarted(false);
            setScreen('lobby');
          }}
          onProfileChange={handleProfileChange}
          profile={profile}
        />
      )}
    </div>
  );
}

export default App;