import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

// Contexte pour le multijoueur
const MultiplayerContext = createContext(null)

// URL de base pour l'API
const API_BASE = '/api/room'

export function MultiplayerProvider({ children }) {
  const [playerId] = useState(() => localStorage.getItem('playerId') || uuidv4())
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '')
  const [currentRoom, setCurrentRoom] = useState(null)
  const [roomPlayers, setRoomPlayers] = useState([])
  const [roomData, setRoomData] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const pollingRef = useRef(null)
  const gameStartedRef = useRef(false)  // Ref pour éviter les closures stale

  // Synchroniser la ref avec l'état
  useEffect(() => {
    gameStartedRef.current = gameStarted
  }, [gameStarted])

  // Sauvegarder l'ID du joueur
  useEffect(() => {
    localStorage.setItem('playerId', playerId)
  }, [playerId])

  // Sauvegarder le nom du joueur
  const updatePlayerName = useCallback((name) => {
    setPlayerName(name)
    localStorage.setItem('playerName', name)
  }, [])

  // Polling pour récupérer les mises à jour de la room
  const startPolling = useCallback((roomCode) => {
    console.log('Starting polling for room:', roomCode)

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}?action=get&roomCode=${roomCode}`)
        const data = await response.json()

        if (data.success && data.room) {
          setRoomData(data.room)
          setRoomPlayers(data.room.players)
          setIsHost(data.room.hostId === playerId)

          // Détecter si la partie a démarré
          console.log('Room status:', data.room.status, 'gameStartedRef:', gameStartedRef.current)
          if (data.room.status === 'playing' && !gameStartedRef.current) {
            console.log('🎮 Game started detected! Setting gameStarted to true')
            gameStartedRef.current = true
            setGameStarted(true)
          }

          // Réinitialiser gameStartedRef quand la room repasse à waiting (retour au lobby)
          if (data.room.status === 'waiting' && gameStartedRef.current) {
            console.log('🔄 Room back to waiting, resetting gameStarted')
            gameStartedRef.current = false
            setGameStarted(false)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Poll immédiatement puis toutes les 1.5 secondes
    poll()
    pollingRef.current = setInterval(poll, 1500)
  }, [playerId])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Nettoyer le polling quand on quitte
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // Créer une nouvelle partie
  const createRoom = useCallback(async (hostName, playerCount, maxRounds = 5) => {
    setIsLoading(true)
    setError(null)

    // Réinitialiser l'état de démarrage
    gameStartedRef.current = false
    setGameStarted(false)

    try {
      console.log('Creating room as host:', playerId)
      const response = await fetch(`${API_BASE}?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName,
          playerCount,
          hostId: playerId,
          maxRounds
        })
      })

      const data = await response.json()
      console.log('Create room response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setCurrentRoom(data.room.code)
      setRoomData(data.room)
      setRoomPlayers(data.room.players)
      setIsHost(true)
      updatePlayerName(hostName)
      startPolling(data.room.code)

      return data.room.code
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [playerId, updatePlayerName, startPolling])

  // Rejoindre une partie existante
  const joinRoom = useCallback(async (roomCode, playerName) => {
    setIsLoading(true)
    setError(null)

    // Réinitialiser l'état de démarrage
    gameStartedRef.current = false
    setGameStarted(false)

    try {
      const code = roomCode.toUpperCase().trim()
      console.log('Joining room:', code, 'as player:', playerId)

      const response = await fetch(`${API_BASE}?action=join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: code,
          playerName,
          playerId
        })
      })

      const data = await response.json()
      console.log('Join response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la connexion')
      }

      setCurrentRoom(code)
      setRoomData(data.room)
      setRoomPlayers(data.room.players)
      setIsHost(data.room.hostId === playerId)
      updatePlayerName(playerName)

      console.log('Starting polling after join...')
      startPolling(code)

      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [playerId, updatePlayerName, startPolling])

  // Quitter une partie
  const leaveRoom = useCallback(async () => {
    stopPolling()

    if (currentRoom) {
      try {
        await fetch(`${API_BASE}?action=leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: currentRoom,
            playerId
          })
        })
      } catch (err) {
        console.error('Leave error:', err)
      }
    }

    setCurrentRoom(null)
    setRoomData(null)
    setRoomPlayers([])
    setIsHost(false)
    setError(null)
    gameStartedRef.current = false
    setGameStarted(false)
  }, [currentRoom, playerId, stopPolling])

  // Marquer le joueur comme prêt
  const setReady = useCallback(async (ready) => {
    if (!currentRoom) return

    try {
      const response = await fetch(`${API_BASE}?action=ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom,
          playerId,
          ready
        })
      })

      const data = await response.json()
      if (data.success && data.room) {
        setRoomData(data.room)
        setRoomPlayers(data.room.players)
      }
    } catch (err) {
      console.error('Ready error:', err)
    }
  }, [currentRoom, playerId])

  // Ajouter un bot
  const addBot = useCallback(async () => {
    if (!currentRoom || !isHost) return

    try {
      const response = await fetch(`${API_BASE}?action=addBot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom,
          playerId
        })
      })

      const data = await response.json()
      if (data.success && data.room) {
        setRoomData(data.room)
        setRoomPlayers(data.room.players)
      }
    } catch (err) {
      console.error('Add bot error:', err)
    }
  }, [currentRoom, playerId, isHost])

  // Vérifier si tous les joueurs sont prêts
  const allPlayersReady = useCallback(() => {
    if (!roomData) return false
    return roomData.players.length >= 3 && roomData.players.every(p => p.isReady)
  }, [roomData])

  // Démarrer la partie
  const startGame = useCallback(async () => {
    if (!currentRoom || !isHost) return false

    try {
      console.log('Starting game for room:', currentRoom)
      const response = await fetch(`${API_BASE}?action=start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom,
          playerId
        })
      })

      const data = await response.json()
      console.log('Start game response:', data)

      if (!response.ok) {
        setError(data.error)
        return false
      }

      if (data.success && data.room) {
        setRoomData(data.room)
        // Ne pas stopper le polling ici - laisser les autres joueurs détecter le changement
        // Le polling sera stoppé par l'appelant
        return true
      }

      return false
    } catch (err) {
      console.error('Start error:', err)
      setError(err.message)
      return false
    }
  }, [currentRoom, playerId, isHost, stopPolling])

  // Obtenir les infos de la room
  const getRoomInfo = useCallback(() => {
    return roomData
  }, [roomData])

  // Rafraîchir manuellement
  const refreshPlayers = useCallback(async () => {
    if (!currentRoom) return

    try {
      const response = await fetch(`${API_BASE}?action=get&roomCode=${currentRoom}`)
      const data = await response.json()

      if (data.success && data.room) {
        setRoomData(data.room)
        setRoomPlayers(data.room.players)
      }
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }, [currentRoom])

  // Réinitialiser l'état gameStarted (appelé après avoir traité le démarrage)
  const resetGameStarted = useCallback(() => {
    gameStartedRef.current = false
    setGameStarted(false)
  }, [])

  const value = {
    playerId,
    playerName,
    updatePlayerName,
    currentRoom,
    roomPlayers,
    roomData,
    isHost,
    error,
    isLoading,
    gameStarted,  // Nouvel état
    setError,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    addBot,
    allPlayersReady,
    startGame,
    getRoomInfo,
    refreshPlayers,
    resetGameStarted,  // Nouvelle fonction
    stopPolling  // Exposer pour arrêter le polling après démarrage
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

