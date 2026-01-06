import React, { useState, useEffect } from 'react'
import { GameProvider } from './context/GameContext'
import { MultiplayerProvider, useMultiplayer } from './context/MultiplayerContext'
import GameBoard from './components/GameBoard'
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
  const multiplayer = useMultiplayer()

  // Vérifier si on arrive avec un code d'invitation dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode) {
      // Nettoyer l'URL
      window.history.replaceState({}, '', window.location.pathname)
      // Afficher le formulaire de rejoindre avec le code pré-rempli
      setMode(MODES.MENU)
      // On pourrait auto-remplir le code, mais pour l'instant on laisse l'utilisateur le faire
    }
  }, [])

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
  const handleCreateRoom = async (hostName, playerCount) => {
    const code = await multiplayer.createRoom(hostName, playerCount)
    if (code) {
      setMode(MODES.LOBBY)
    }
  }

  // Ajouter un bot dans le lobby
  const handleAddBot = () => {
    multiplayer.addBot()
  }

  // Lancer la partie multijoueur
  const handleStartMultiplayerGame = () => {
    if (multiplayer.startGame()) {
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
      // Pour l'instant, on utilise le même GameBoard mais en mode multijoueur
      // TODO: Implémenter la vraie logique multijoueur avec WebSocket
      return (
        <GameProvider key={`multi-${multiplayer.currentRoom}`}>
          <div className="app">
            <GameBoard
              onBackToMenu={handleBackToMenu}
              isMultiplayer={true}
              roomPlayers={multiplayer.roomPlayers}
            />
          </div>
        </GameProvider>
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

