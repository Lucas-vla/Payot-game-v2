import React, { useState, useEffect } from 'react'
import { GameProvider } from './context/GameContext'
import { MultiplayerProvider, useMultiplayer } from './context/MultiplayerContext'
import GameBoard from './components/GameBoard'
import MultiplayerGame from './components/MultiplayerGame'
import MainMenu from './components/MainMenu'
import CreateRoom from './components/CreateRoom'
import Lobby from './components/Lobby'
import './App.css'

// Modes de jeu
const MODES = {
  MENU: 'menu',
  SOLO: 'solo',
  CREATE_ROOM: 'create_room',
  LOBBY: 'lobby',
  MULTIPLAYER: 'multiplayer'
}

function AppContent() {
  const [mode, setMode] = useState(MODES.MENU)
  const [soloGameKey, setSoloGameKey] = useState(0)
  const [inviteCode, setInviteCode] = useState(null)  // Code d'invitation depuis l'URL
  const multiplayer = useMultiplayer()

  // Vérifier si on arrive avec un code d'invitation dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode && joinCode.length === 6) {
      // Sauvegarder le code pour le pré-remplir dans le formulaire
      setInviteCode(joinCode.toUpperCase())
      // Nettoyer l'URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Détecter quand la partie démarre (pour les joueurs non-hôtes)
  useEffect(() => {
    console.log('Effect check - gameStarted:', multiplayer.gameStarted, 'mode:', mode)

    if (multiplayer.gameStarted && mode === MODES.LOBBY) {
      console.log('🎮 Switching to multiplayer mode!')
      // La partie a démarré, basculer vers le mode multijoueur
      // Important: d'abord changer le mode, puis reset
      setMode(MODES.MULTIPLAYER)

      // Utiliser setTimeout pour éviter les conflits de state
      setTimeout(() => {
        multiplayer.stopPolling()
        multiplayer.resetGameStarted()
      }, 100)
    }
  }, [multiplayer.gameStarted, mode])

  // Détecter quand la room repasse à waiting (retour au lobby depuis le jeu)
  useEffect(() => {
    if (mode === MODES.MULTIPLAYER && multiplayer.roomData?.status === 'waiting') {
      console.log('🔄 Room is waiting, switching back to lobby!')
      setMode(MODES.LOBBY)
    }
  }, [mode, multiplayer.roomData?.status])

  // Gérer le retour au menu
  const handleBackToMenu = () => {
    if (multiplayer.currentRoom) {
      multiplayer.leaveRoom()
    }
    setMode(MODES.MENU)
  }

  // Jouer contre les bots
  const handlePlayVsBot = () => {
    setSoloGameKey(prev => prev + 1)
    setMode(MODES.SOLO)
  }

  // Créer une partie multijoueur
  const handleCreateMultiplayer = () => {
    setMode(MODES.CREATE_ROOM)
  }

  // Rejoindre une partie
  const handleJoinMultiplayer = async (roomCode, playerName) => {
    const success = await multiplayer.joinRoom(roomCode, playerName)
    if (success) {
      setMode(MODES.LOBBY)
    }
  }

  // Créer la room
  const handleCreateRoom = async (hostName, playerCount, maxRounds) => {
    const code = await multiplayer.createRoom(hostName, playerCount, maxRounds)
    if (code) {
      setMode(MODES.LOBBY)
    }
  }

  // Ajouter un bot dans le lobby
  const handleAddBot = () => {
    multiplayer.addBot()
  }

  // Lancer la partie multijoueur
  const handleStartMultiplayerGame = async () => {
    const success = await multiplayer.startGame()
    if (success) {
      multiplayer.stopPolling()
      setMode(MODES.MULTIPLAYER)
    }
  }

  // Toggle ready
  const handleToggleReady = (ready) => {
    multiplayer.setReady(ready)
  }

  // Rendu selon le mode
  switch (mode) {
    case MODES.MENU:
      return (
        <MainMenu
          onPlayVsBot={handlePlayVsBot}
          onCreateMultiplayer={handleCreateMultiplayer}
          onJoinMultiplayer={handleJoinMultiplayer}
          apiError={multiplayer.error}
          isLoading={multiplayer.isLoading}
          inviteCode={inviteCode}
          onClearInviteCode={() => setInviteCode(null)}
        />
      )

    case MODES.SOLO:
      return (
        <GameProvider key={soloGameKey}>
          <div className="app">
            <GameBoard onBackToMenu={handleBackToMenu} />
          </div>
        </GameProvider>
      )

    case MODES.CREATE_ROOM:
      return (
        <CreateRoom
          onCreateRoom={handleCreateRoom}
          onBack={handleBackToMenu}
          playerName={multiplayer.playerName}
        />
      )

    case MODES.LOBBY:
      const roomInfo = multiplayer.getRoomInfo()
      return (
        <Lobby
          roomCode={multiplayer.currentRoom}
          players={multiplayer.roomPlayers}
          isHost={multiplayer.isHost}
          playerCount={roomInfo?.playerCount || 4}
          currentPlayerId={multiplayer.playerId}
          onLeave={handleBackToMenu}
          onStartGame={handleStartMultiplayerGame}
          onToggleReady={handleToggleReady}
          onAddBot={handleAddBot}
          error={multiplayer.error}
        />
      )

    case MODES.MULTIPLAYER:
      // Fonction pour retourner au lobby après une partie
      const handleBackToLobby = () => {
        // Redémarrer le polling pour le lobby
        multiplayer.startPolling(multiplayer.currentRoom)
        setMode(MODES.LOBBY)
      }

      return (
        <div className="app">
          <MultiplayerGame
            onBackToMenu={handleBackToMenu}
            onBackToLobby={handleBackToLobby}
          />
        </div>
      )

    default:
      return null
  }
}

function App() {
  return (
    <MultiplayerProvider>
      <AppContent />
    </MultiplayerProvider>
  )
}

export default App

