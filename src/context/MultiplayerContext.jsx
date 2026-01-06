import React, { createContext, useContext, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

// Contexte pour le multijoueur
const MultiplayerContext = createContext(null)

// Générer un code de partie simple (6 caractères)
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Simuler un stockage local des parties (en attendant un vrai backend)
const rooms = new Map()

export function MultiplayerProvider({ children }) {
  const [playerId] = useState(() => localStorage.getItem('playerId') || uuidv4())
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '')
  const [currentRoom, setCurrentRoom] = useState(null)
  const [roomPlayers, setRoomPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState(null)

  // Sauvegarder l'ID du joueur
  React.useEffect(() => {
    localStorage.setItem('playerId', playerId)
  }, [playerId])

  // Sauvegarder le nom du joueur
  const updatePlayerName = useCallback((name) => {
    setPlayerName(name)
    localStorage.setItem('playerName', name)
  }, [])

  // Créer une nouvelle partie
  const createRoom = useCallback((hostName, playerCount) => {
    const roomCode = generateRoomCode()
    const room = {
      code: roomCode,
      hostId: playerId,
      playerCount: playerCount,
      players: [{
        id: playerId,
        name: hostName,
        isHost: true,
        isReady: true
      }],
      status: 'waiting', // waiting, playing, finished
      createdAt: Date.now()
    }

    rooms.set(roomCode, room)
    setCurrentRoom(roomCode)
    setRoomPlayers(room.players)
    setIsHost(true)
    updatePlayerName(hostName)
    setError(null)

    return roomCode
  }, [playerId, updatePlayerName])

  // Rejoindre une partie existante
  const joinRoom = useCallback((roomCode, playerName) => {
    const code = roomCode.toUpperCase().trim()
    const room = rooms.get(code)

    if (!room) {
      setError('Partie introuvable. Vérifiez le code.')
      return false
    }

    if (room.status !== 'waiting') {
      setError('Cette partie a déjà commencé.')
      return false
    }

    if (room.players.length >= room.playerCount) {
      setError('Cette partie est complète.')
      return false
    }

    // Vérifier si le joueur est déjà dans la partie
    const existingPlayer = room.players.find(p => p.id === playerId)
    if (existingPlayer) {
      // Reconnecter
      setCurrentRoom(code)
      setRoomPlayers(room.players)
      setIsHost(existingPlayer.isHost)
      setError(null)
      return true
    }

    // Ajouter le nouveau joueur
    const newPlayer = {
      id: playerId,
      name: playerName,
      isHost: false,
      isReady: false
    }

    room.players.push(newPlayer)
    setCurrentRoom(code)
    setRoomPlayers([...room.players])
    setIsHost(false)
    updatePlayerName(playerName)
    setError(null)

    return true
  }, [playerId, updatePlayerName])

  // Quitter une partie
  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      const room = rooms.get(currentRoom)
      if (room) {
        room.players = room.players.filter(p => p.id !== playerId)
        if (room.players.length === 0) {
          rooms.delete(currentRoom)
        } else if (isHost) {
          // Transférer l'hôte au premier joueur restant
          room.players[0].isHost = true
          room.hostId = room.players[0].id
        }
      }
    }
    setCurrentRoom(null)
    setRoomPlayers([])
    setIsHost(false)
    setError(null)
  }, [currentRoom, playerId, isHost])

  // Marquer le joueur comme prêt
  const setReady = useCallback((ready) => {
    if (currentRoom) {
      const room = rooms.get(currentRoom)
      if (room) {
        const player = room.players.find(p => p.id === playerId)
        if (player) {
          player.isReady = ready
          setRoomPlayers([...room.players])
        }
      }
    }
  }, [currentRoom, playerId])

  // Vérifier si tous les joueurs sont prêts
  const allPlayersReady = useCallback(() => {
    if (!currentRoom) return false
    const room = rooms.get(currentRoom)
    if (!room) return false
    return room.players.length >= 3 && room.players.every(p => p.isReady)
  }, [currentRoom])

  // Démarrer la partie
  const startGame = useCallback(() => {
    if (!currentRoom || !isHost) return false
    const room = rooms.get(currentRoom)
    if (!room || !allPlayersReady()) return false

    room.status = 'playing'
    return true
  }, [currentRoom, isHost, allPlayersReady])

  // Obtenir les infos de la room
  const getRoomInfo = useCallback(() => {
    if (!currentRoom) return null
    return rooms.get(currentRoom)
  }, [currentRoom])

  // Rafraîchir la liste des joueurs (simulation de polling)
  const refreshPlayers = useCallback(() => {
    if (currentRoom) {
      const room = rooms.get(currentRoom)
      if (room) {
        setRoomPlayers([...room.players])
      }
    }
  }, [currentRoom])

  const value = {
    playerId,
    playerName,
    updatePlayerName,
    currentRoom,
    roomPlayers,
    isHost,
    error,
    setError,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    allPlayersReady,
    startGame,
    getRoomInfo,
    refreshPlayers
  }

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  )
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext)
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider')
  }
  return context
}

