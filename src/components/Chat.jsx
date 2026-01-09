import React, { useState, useEffect, useRef, useCallback } from 'react'
import './Chat.css'

const CHAT_API = '/api/chat'

function Chat({ roomCode, playerId, playerName, isMinimized = false, onToggle }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isOpen, setIsOpen] = useState(!isMinimized)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)
  const lastTimestampRef = useRef(0)
  const pollingRef = useRef(null)

  // Scroll vers le bas quand de nouveaux messages arrivent
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Récupérer les messages
  const fetchMessages = useCallback(async () => {
    if (!roomCode) return

    try {
      const response = await fetch(
        `${CHAT_API}?action=get&roomCode=${roomCode}&since=${lastTimestampRef.current}`
      )
      const data = await response.json()

      if (data.success && data.messages.length > 0) {
        setMessages(prev => {
          // Éviter les doublons
          const existingIds = new Set(prev.map(m => m.id))
          const newMsgs = data.messages.filter(m => !existingIds.has(m.id))
          if (newMsgs.length > 0) {
            // Incrémenter le compteur de non-lus si le chat est fermé
            if (!isOpen) {
              setUnreadCount(c => c + newMsgs.length)
            }
            return [...prev, ...newMsgs]
          }
          return prev
        })
        lastTimestampRef.current = data.lastTimestamp
      }
    } catch (err) {
      console.error('Chat fetch error:', err)
    }
  }, [roomCode, isOpen])

  // Démarrer le polling
  useEffect(() => {
    if (!roomCode) return

    fetchMessages()
    pollingRef.current = setInterval(fetchMessages, 2000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [roomCode, fetchMessages])

  // Scroll quand de nouveaux messages arrivent
  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  // Réinitialiser les non-lus quand on ouvre le chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  // Envoyer un message
  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !roomCode) return

    try {
      const response = await fetch(`${CHAT_API}?action=send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId,
          playerName,
          message: newMessage.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        setNewMessage('')
        // Ajouter le message localement pour une réponse immédiate
        setMessages(prev => {
          if (!prev.find(m => m.id === data.message.id)) {
            return [...prev, data.message]
          }
          return prev
        })
        lastTimestampRef.current = data.message.timestamp
      }
    } catch (err) {
      console.error('Send message error:', err)
    }
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
    if (onToggle) onToggle(!isOpen)
  }

  // Formater l'heure
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`chat-container ${isOpen ? 'open' : 'minimized'}`}>
      {/* Header du chat */}
      <div className="chat-header" onClick={toggleChat}>
        <span className="chat-title">
          💬 Chat
          {!isOpen && unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </span>
        <button className="chat-toggle">
          {isOpen ? '▼' : '▲'}
        </button>
      </div>

      {/* Corps du chat */}
      {isOpen && (
        <>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p>💬 Aucun message</p>
                <p className="chat-empty-hint">Soyez le premier à écrire!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.playerId === playerId ? 'own' : ''}`}
                >
                  <div className="message-header">
                    <span className="message-author">
                      {msg.playerId === playerId ? 'Vous' : msg.playerName}
                    </span>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" disabled={!newMessage.trim()}>
              ➤
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default Chat

