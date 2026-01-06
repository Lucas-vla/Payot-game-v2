import React, { createContext, useContext, useReducer } from 'react'
import {
  dealCards,
  rollPapayooDie,
  sortHand,
  getCardsToPass,
  SUITS,
  SUIT_DISPLAY
} from '../utils/deck'
import {
  calculateTrickPoints,
  determineTrickWinner,
  canPlayCard
} from '../utils/scoring'
import { selectCardsToPass, analyzeVoidSuits, analyzeCurrentTrickVoids } from '../utils/ai'
import { saveGameToHistory } from '../utils/history'

// Phases du jeu
export const GAME_PHASES = {
  SETUP: 'setup',           // Configuration (nombre de joueurs)
  DEALING: 'dealing',       // Distribution des cartes
  PASSING: 'passing',       // Passage des cartes
  ROLLING_DIE: 'rolling',   // Lancer du dé Papayoo
  PLAYING: 'playing',       // Phase de jeu (plis)
  ROUND_END: 'round_end',   // Fin de manche
  GAME_END: 'game_end'      // Fin de partie
}

const initialState = {
  phase: GAME_PHASES.SETUP,
  playerCount: 4,
  maxRounds: 5,             // Nombre max de manches (5, 10 ou 'infinite')
  players: [],              // {id, name, hand, collectedCards, score, isHuman, selectedCards}
  currentPlayer: 0,
  papayooSuit: null,        // Couleur Papayoo déterminée par le dé
  currentTrick: [],         // Cartes jouées dans le pli actuel
  leadSuit: null,           // Couleur demandée
  trickCount: 0,            // Nombre de plis joués
  trickHistory: [],         // Historique des plis de la manche (pour analyser les défausses)
  voidSuits: {},            // Couleurs vides connues par joueur { playerId: Set<suit> }
  roundNumber: 1,
  targetScore: 250,         // Score à atteindre pour terminer la partie (mode infini)
  message: '',
  passDirection: 'left',    // Direction de passage des cartes
}

// Actions
const ACTIONS = {
  SET_PLAYER_COUNT: 'SET_PLAYER_COUNT',
  SET_MAX_ROUNDS: 'SET_MAX_ROUNDS',
  START_GAME: 'START_GAME',
  SELECT_CARD_TO_PASS: 'SELECT_CARD_TO_PASS',
  CONFIRM_PASS: 'CONFIRM_PASS',
  ROLL_DIE: 'ROLL_DIE',
  PLAY_CARD: 'PLAY_CARD',
  AI_PLAY: 'AI_PLAY',
  COLLECT_TRICK: 'COLLECT_TRICK',
  END_ROUND: 'END_ROUND',
  NEW_ROUND: 'NEW_ROUND',
  RESET_GAME: 'RESET_GAME',
}

function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PLAYER_COUNT:
      return { ...state, playerCount: action.payload }

    case ACTIONS.SET_MAX_ROUNDS:
      return { ...state, maxRounds: action.payload }

    case ACTIONS.START_GAME: {
      const hands = dealCards(state.playerCount)
      const players = hands.map((hand, index) => ({
        id: index,
        name: index === 0 ? 'Vous' : `Joueur ${index + 1}`,
        hand: sortHand(hand),
        collectedCards: [],
        score: 0,
        isHuman: index === 0,
        selectedCards: []
      }))

      return {
        ...state,
        phase: GAME_PHASES.PASSING,
        players,
        currentPlayer: 0,
        message: `Sélectionnez ${getCardsToPass(state.playerCount)} cartes à passer`
      }
    }

    case ACTIONS.SELECT_CARD_TO_PASS: {
      const { playerId, cardId } = action.payload
      const players = state.players.map(player => {
        if (player.id !== playerId) return player

        const isSelected = player.selectedCards.includes(cardId)
        const cardsToPass = getCardsToPass(state.playerCount)

        let newSelected
        if (isSelected) {
          newSelected = player.selectedCards.filter(id => id !== cardId)
        } else if (player.selectedCards.length < cardsToPass) {
          newSelected = [...player.selectedCards, cardId]
        } else {
          newSelected = player.selectedCards
        }

        return { ...player, selectedCards: newSelected }
      })

      return { ...state, players }
    }

    case ACTIONS.CONFIRM_PASS: {
      const cardsToPass = getCardsToPass(state.playerCount)

      // Vérifier que le joueur humain a sélectionné assez de cartes
      const humanPlayer = state.players.find(p => p.isHuman)
      if (humanPlayer.selectedCards.length !== cardsToPass) {
        return { ...state, message: `Sélectionnez exactement ${cardsToPass} cartes` }
      }

      // L'IA sélectionne ses cartes avec une stratégie intelligente
      let players = state.players.map(player => {
        if (player.isHuman) return player

        // Utiliser l'IA pour sélectionner les cartes à passer
        const selected = selectCardsToPass(player.hand, cardsToPass)
        return { ...player, selectedCards: selected }
      })

      // Effectuer le passage (vers la gauche)
      const passedCards = players.map(p =>
        p.hand.filter(c => p.selectedCards.includes(c.id))
      )

      players = players.map((player, index) => {
        const receiveFrom = (index + 1) % state.playerCount
        const cardsToKeep = player.hand.filter(c => !player.selectedCards.includes(c.id))
        const receivedCards = passedCards[receiveFrom]

        return {
          ...player,
          hand: sortHand([...cardsToKeep, ...receivedCards]),
          selectedCards: []
        }
      })

      return {
        ...state,
        players,
        phase: GAME_PHASES.ROLLING_DIE,
        message: 'Cliquez pour lancer le dé Papayoo!'
      }
    }

    case ACTIONS.ROLL_DIE: {
      const papayooSuit = rollPapayooDie()
      const suitInfo = SUIT_DISPLAY[papayooSuit]
      return {
        ...state,
        papayooSuit,
        phase: GAME_PHASES.PLAYING,
        message: `Le Papayoo est ${suitInfo.name} ${suitInfo.symbol}! Le 7${suitInfo.symbol} vaut 40 points!`
      }
    }

    case ACTIONS.PLAY_CARD: {
      const { playerId, cardId } = action.payload
      const player = state.players.find(p => p.id === playerId)
      const card = player.hand.find(c => c.id === cardId)

      if (!card) return state

      // Vérifier si la carte peut être jouée
      if (!canPlayCard(card, player.hand, state.leadSuit)) {
        return { ...state, message: 'Vous devez jouer la couleur demandée!' }
      }

      // Retirer la carte de la main
      const newPlayers = state.players.map(p => {
        if (p.id !== playerId) return p
        return {
          ...p,
          hand: p.hand.filter(c => c.id !== cardId)
        }
      })

      // Ajouter la carte au pli
      const newTrick = [...state.currentTrick, { playerId, card }]
      const newLeadSuit = state.leadSuit || card.suit

      // Vérifier si le pli est complet
      if (newTrick.length === state.playerCount) {
        return {
          ...state,
          players: newPlayers,
          currentTrick: newTrick,
          leadSuit: newLeadSuit,
          phase: GAME_PHASES.PLAYING,
          message: 'Pli terminé!'
        }
      }

      // Passer au joueur suivant
      const nextPlayer = (playerId + 1) % state.playerCount

      return {
        ...state,
        players: newPlayers,
        currentTrick: newTrick,
        leadSuit: newLeadSuit,
        currentPlayer: nextPlayer,
        message: state.players[nextPlayer].isHuman
          ? 'À vous de jouer!'
          : `${state.players[nextPlayer].name} réfléchit...`
      }
    }

    case ACTIONS.COLLECT_TRICK: {
      const winnerId = determineTrickWinner(state.currentTrick, state.leadSuit)
      const trickCards = state.currentTrick.map(t => t.card)
      const points = calculateTrickPoints(trickCards, state.papayooSuit)

      // Sauvegarder le pli dans l'historique et analyser les défausses
      const newTrickHistory = [...state.trickHistory, [...state.currentTrick]]
      const newVoidSuits = analyzeVoidSuits(newTrickHistory, state.playerCount)

      const newPlayers = state.players.map(p => {
        if (p.id !== winnerId) return p
        return {
          ...p,
          collectedCards: [...p.collectedCards, ...trickCards]
        }
      })

      // Vérifier si la manche est terminée
      const allHandsEmpty = newPlayers.every(p => p.hand.length === 0)

      if (allHandsEmpty) {
        // Calculer les scores de la manche
        const finalPlayers = newPlayers.map(p => ({
          ...p,
          score: p.score + calculateTrickPoints(p.collectedCards, state.papayooSuit)
        }))

        // Déterminer si la partie est terminée
        let gameOver = false
        if (state.maxRounds === 'infinite') {
          // Mode infini: on continue jusqu'à atteindre le score cible
          gameOver = finalPlayers.some(p => p.score >= state.targetScore)
        } else {
          // Mode limité: on s'arrête après le nombre de manches défini
          gameOver = state.roundNumber >= state.maxRounds
        }

        // Sauvegarder dans l'historique si la partie est terminée
        if (gameOver) {
          saveGameToHistory({
            playerCount: state.playerCount,
            roundNumber: state.roundNumber,
            maxRounds: state.maxRounds,
            players: finalPlayers
          })
        }

        return {
          ...state,
          players: finalPlayers,
          currentTrick: [],
          leadSuit: null,
          currentPlayer: winnerId,
          trickCount: state.trickCount + 1,
          trickHistory: [],
          voidSuits: {},
          phase: gameOver ? GAME_PHASES.GAME_END : GAME_PHASES.ROUND_END,
          message: gameOver ? 'Partie terminée!' : 'Manche terminée!'
        }
      }

      return {
        ...state,
        players: newPlayers,
        currentTrick: [],
        leadSuit: null,
        currentPlayer: winnerId,
        trickHistory: newTrickHistory,
        voidSuits: newVoidSuits,
        trickCount: state.trickCount + 1,
        message: `${state.players[winnerId].name} remporte le pli (+${points} pts)`
      }
    }

    case ACTIONS.NEW_ROUND: {
      const hands = dealCards(state.playerCount)
      const players = state.players.map((player, index) => ({
        ...player,
        hand: sortHand(hands[index]),
        collectedCards: [],
        selectedCards: []
      }))

      return {
        ...state,
        phase: GAME_PHASES.PASSING,
        players,
        currentTrick: [],
        leadSuit: null,
        papayooSuit: null,
        trickCount: 0,
        trickHistory: [],
        voidSuits: {},
        roundNumber: state.roundNumber + 1,
        currentPlayer: 0,
        message: `Manche ${state.roundNumber + 1} - Sélectionnez ${getCardsToPass(state.playerCount)} cartes à passer`
      }
    }

    case ACTIONS.RESET_GAME:
      return initialState

    default:
      return state
  }
}

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  const actions = {
    setPlayerCount: (count) => dispatch({ type: ACTIONS.SET_PLAYER_COUNT, payload: count }),
    setMaxRounds: (rounds) => dispatch({ type: ACTIONS.SET_MAX_ROUNDS, payload: rounds }),
    startGame: () => dispatch({ type: ACTIONS.START_GAME }),
    selectCardToPass: (playerId, cardId) =>
      dispatch({ type: ACTIONS.SELECT_CARD_TO_PASS, payload: { playerId, cardId } }),
    confirmPass: () => dispatch({ type: ACTIONS.CONFIRM_PASS }),
    rollDie: () => dispatch({ type: ACTIONS.ROLL_DIE }),
    playCard: (playerId, cardId) =>
      dispatch({ type: ACTIONS.PLAY_CARD, payload: { playerId, cardId } }),
    collectTrick: () => dispatch({ type: ACTIONS.COLLECT_TRICK }),
    newRound: () => dispatch({ type: ACTIONS.NEW_ROUND }),
    resetGame: () => dispatch({ type: ACTIONS.RESET_GAME }),
  }

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

