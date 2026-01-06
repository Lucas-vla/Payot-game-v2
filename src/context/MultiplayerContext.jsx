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
  const pollingRef = useRef(null)

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
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Poll immédiatement puis toutes les 2 secondes
    poll()
    pollingRef.current = setInterval(poll, 2000)
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
  const createRoom = useCallback(async (hostName, playerCount) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName,
          playerCount,
          hostId: playerId
        })
      })

      const data = await response.json()

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

    try {
      const code = roomCode.toUpperCase().trim()
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

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la connexion')
      }

      setCurrentRoom(code)
      setRoomData(data.room)
      setRoomPlayers(data.room.players)
      setIsHost(data.room.hostId === playerId)
      updatePlayerName(playerName)
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
      const response = await fetch(`${API_BASE}?action=start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom,
          playerId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return false
      }

      if (data.success && data.room) {
        setRoomData(data.room)
        stopPolling()
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
    setError,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    addBot,
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

