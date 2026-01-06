import React, { useState } from 'react'
import './Rules.css'

function Rules({ onClose }) {
  const [activeSection, setActiveSection] = useState('objectif')

  const sections = [
    { id: 'objectif', title: '🎯 Objectif', icon: '🎯' },
    { id: 'cartes', title: '🃏 Les Cartes', icon: '🃏' },
    { id: 'distribution', title: '🎴 Distribution', icon: '🎴' },
    { id: 'papayoo', title: '🎲 Le Papayoo', icon: '🎲' },
    { id: 'deroulement', title: '▶️ Déroulement', icon: '▶️' },
    { id: 'points', title: '⭐ Points', icon: '⭐' },
    { id: 'strategie', title: '💡 Stratégie', icon: '💡' },
  ]

  return (
    <div className="rules-overlay">
      <div className="rules-modal">
        <button className="rules-close" onClick={onClose}>✕</button>

        <div className="rules-header">
          <h2>📖 Règles du Papayoo</h2>
          <p className="rules-subtitle">Apprenez à jouer en quelques minutes !</p>
        </div>

        <div className="rules-content">
          <nav className="rules-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`rules-nav-btn ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-text">{section.title.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </nav>

          <div className="rules-body">
            {activeSection === 'objectif' && (
              <div className="rules-section">
                <h3>🎯 Objectif du jeu</h3>
                <div className="rules-text">
                  <p>
                    Le Papayoo est un jeu de cartes où le but est d'<strong>éviter de marquer des points</strong>.
                    À la fin de la partie, le joueur avec le <strong>moins de points gagne</strong> !
                  </p>
                  <div className="rules-highlight">
                    <span className="highlight-icon">💡</span>
                    <p>Contrairement à la plupart des jeux de cartes, ici les points sont <strong>négatifs</strong>.
                    Vous devez fuir les cartes qui rapportent des points !</p>
                  </div>
                  <p>
                    La partie se déroule en plusieurs manches. À chaque manche, les joueurs essaient
                    de ne pas ramasser les cartes Payoo et surtout pas le terrible <strong>Papayoo</strong>
                    qui vaut 40 points à lui seul !
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'cartes' && (
              <div className="rules-section">
                <h3>🃏 Les Cartes</h3>
                <div className="rules-text">
                  <p>Le jeu est composé de <strong>60 cartes</strong> réparties en 5 couleurs :</p>

                  <div className="cards-grid">
                    <div className="card-type">
                      <span className="card-symbol" style={{color: '#e74c3c'}}>♥</span>
                      <span>Cœur</span>
                      <span className="card-range">1 à 10</span>
                    </div>
                    <div className="card-type">
                      <span className="card-symbol" style={{color: '#2c3e50'}}>♠</span>
                      <span>Pique</span>
                      <span className="card-range">1 à 10</span>
                    </div>
                    <div className="card-type">
                      <span className="card-symbol" style={{color: '#27ae60'}}>♣</span>
                      <span>Trèfle</span>
                      <span className="card-range">1 à 10</span>
                    </div>
                    <div className="card-type">
                      <span className="card-symbol" style={{color: '#f39c12'}}>♦</span>
                      <span>Carreau</span>
                      <span className="card-range">1 à 10</span>
                    </div>
                    <div className="card-type payoo-type">
                      <span className="card-symbol" style={{color: '#9b59b6'}}>★</span>
                      <span>Payoo</span>
                      <span className="card-range">1 à 20</span>
                    </div>
                  </div>

                  <div className="rules-highlight warning">
                    <span className="highlight-icon">⚠️</span>
                    <p>Les cartes <strong>Payoo (★)</strong> sont spéciales : elles valent leur valeur en points
                    (un Payoo 15 = 15 points). Ce sont les cartes les plus dangereuses !</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'distribution' && (
              <div className="rules-section">
                <h3>🎴 Distribution des cartes</h3>
                <div className="rules-text">
                  <p>Au début de chaque manche :</p>
                  <ol>
                    <li>Les cartes sont mélangées et distribuées équitablement à tous les joueurs</li>
                    <li>Chaque joueur doit <strong>donner des cartes</strong> à un adversaire</li>
                  </ol>

                  <div className="distribution-table">
                    <h4>Nombre de cartes à passer :</h4>
                    <div className="table-grid">
                      <div className="table-row">
                        <span className="table-label">3 joueurs</span>
                        <span className="table-value">5 cartes</span>
                      </div>
                      <div className="table-row">
                        <span className="table-label">4 joueurs</span>
                        <span className="table-value">5 cartes</span>
                      </div>
                      <div className="table-row">
                        <span className="table-label">5 joueurs</span>
                        <span className="table-value">4 cartes</span>
                      </div>
                      <div className="table-row">
                        <span className="table-label">6 joueurs</span>
                        <span className="table-value">3 cartes</span>
                      </div>
                      <div className="table-row">
                        <span className="table-label">7-8 joueurs</span>
                        <span className="table-value">3 cartes</span>
                      </div>
                    </div>
                  </div>

                  <div className="rules-highlight">
                    <span className="highlight-icon">💡</span>
                    <p>C'est le moment de vous débarrasser de vos cartes dangereuses !
                    Passez vos gros Payoo et vos 7 de couleur à vos adversaires.</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'papayoo' && (
              <div className="rules-section">
                <h3>🎲 Le Dé et le Papayoo</h3>
                <div className="rules-text">
                  <p>
                    Après la distribution des cartes, un <strong>dé spécial</strong> est lancé.
                    Ce dé détermine quelle couleur devient le <strong>Papayoo</strong> pour cette manche.
                  </p>

                  <div className="dice-example">
                    <div className="dice-faces">
                      <span className="dice-face" style={{color: '#e74c3c'}}>♥</span>
                      <span className="dice-face" style={{color: '#2c3e50'}}>♠</span>
                      <span className="dice-face" style={{color: '#27ae60'}}>♣</span>
                      <span className="dice-face" style={{color: '#f39c12'}}>♦</span>
                    </div>
                    <p>Le dé a 4 faces (une par couleur classique)</p>
                  </div>

                  <div className="rules-highlight danger">
                    <span className="highlight-icon">🔥</span>
                    <div>
                      <p><strong>Le 7 de la couleur Papayoo vaut 40 POINTS !</strong></p>
                      <p>C'est la carte la plus dangereuse du jeu. Si le dé indique ♥,
                      alors le 7♥ devient le Papayoo et vaut 40 points.</p>
                    </div>
                  </div>

                  <p>
                    Le dé est lancé <strong>après</strong> que les joueurs ont choisi leurs cartes à passer,
                    ce qui ajoute du suspense et de l'incertitude !
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'deroulement' && (
              <div className="rules-section">
                <h3>▶️ Déroulement d'un pli</h3>
                <div className="rules-text">
                  <ol className="rules-steps">
                    <li>
                      <strong>Le premier joueur</strong> pose une carte de son choix
                    </li>
                    <li>
                      <strong>Les autres joueurs</strong> doivent suivre la couleur demandée s'ils le peuvent
                    </li>
                    <li>
                      Si un joueur <strong>n'a pas la couleur</strong>, il peut jouer n'importe quelle carte
                      (c'est l'occasion de se défausser des Payoo !)
                    </li>
                    <li>
                      Le joueur qui a posé la <strong>carte la plus forte</strong> de la couleur demandée
                      remporte le pli
                    </li>
                    <li>
                      Le gagnant du pli <strong>ramasse toutes les cartes</strong> et commence le pli suivant
                    </li>
                  </ol>

                  <div className="rules-highlight">
                    <span className="highlight-icon">📌</span>
                    <p>
                      <strong>Important :</strong> Seule la couleur demandée compte !
                      Si quelqu'un joue un Payoo 20 alors que la couleur demandée est ♥,
                      un simple 1♥ peut quand même gagner le pli.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'points' && (
              <div className="rules-section">
                <h3>⭐ Comptage des points</h3>
                <div className="rules-text">
                  <p>À la fin de chaque manche, comptez les points des cartes que vous avez ramassées :</p>

                  <div className="points-table">
                    <div className="points-row">
                      <span className="points-card">Cartes normales (♥♠♣♦)</span>
                      <span className="points-value zero">0 point</span>
                    </div>
                    <div className="points-row">
                      <span className="points-card">Payoo (★) 1 à 20</span>
                      <span className="points-value bad">= leur valeur</span>
                    </div>
                    <div className="points-row papayoo-row">
                      <span className="points-card">7 de la couleur Papayoo</span>
                      <span className="points-value terrible">40 points !</span>
                    </div>
                  </div>

                  <h4>Exemple de calcul :</h4>
                  <div className="example-box">
                    <p>Vous avez ramassé :</p>
                    <ul>
                      <li>3♥, 8♠, 10♣ → <strong>0 point</strong></li>
                      <li>Payoo 5 → <strong>5 points</strong></li>
                      <li>Payoo 12 → <strong>12 points</strong></li>
                      <li>7♦ (si ♦ est le Papayoo) → <strong>40 points</strong></li>
                    </ul>
                    <p className="total">Total : <strong>57 points</strong> 😱</p>
                  </div>

                  <div className="rules-highlight">
                    <span className="highlight-icon">🏆</span>
                    <p>La partie se termine après le nombre de manches choisi.
                    Le joueur avec le <strong>moins de points</strong> gagne !</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'strategie' && (
              <div className="rules-section">
                <h3>💡 Conseils stratégiques</h3>
                <div className="rules-text">
                  <div className="tips-list">
                    <div className="tip">
                      <span className="tip-number">1</span>
                      <div>
                        <strong>Passez vos cartes dangereuses</strong>
                        <p>Donnez vos gros Payoo (15-20) et vos 7 de couleur à vos adversaires.
                        Les cartes hautes (8, 9, 10) sont aussi risquées.</p>
                      </div>
                    </div>

                    <div className="tip">
                      <span className="tip-number">2</span>
                      <div>
                        <strong>Gardez vos petites cartes</strong>
                        <p>Les cartes basses vous permettent de suivre sans gagner le pli.
                        C'est idéal pour éviter de ramasser des points.</p>
                      </div>
                    </div>

                    <div className="tip">
                      <span className="tip-number">3</span>
                      <div>
                        <strong>Videz-vous d'une couleur</strong>
                        <p>Si vous n'avez plus de cartes d'une couleur, vous pouvez vous
                        défausser de vos Payoo quand cette couleur est demandée !</p>
                      </div>
                    </div>

                    <div className="tip">
                      <span className="tip-number">4</span>
                      <div>
                        <strong>Jouez vos grosses cartes tôt</strong>
                        <p>En début de manche, il y a moins de Payoo en jeu.
                        C'est le bon moment pour jouer vos cartes hautes.</p>
                      </div>
                    </div>

                    <div className="tip">
                      <span className="tip-number">5</span>
                      <div>
                        <strong>Mémorisez les défausses</strong>
                        <p>Si un joueur ne suit pas une couleur, il n'en a plus.
                        Évitez de jouer cette couleur si vous risquez de gagner le pli.</p>
                      </div>
                    </div>

                    <div className="tip">
                      <span className="tip-number">6</span>
                      <div>
                        <strong>Protégez le Papayoo</strong>
                        <p>Si vous avez le 7 de la couleur Papayoo, gardez d'autres cartes
                        de cette couleur pour éviter d'être forcé de le jouer.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Rules

