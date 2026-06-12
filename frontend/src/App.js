import React, { useState } from 'react';
import Lobby from './Lobby';
import './App.css';

function App() {
  const [pseudo, setPseudo] = useState('');
  const [code, setCode] = useState('');
  const [enPartie, setEnPartie] = useState(false);
  const [modeJoin, setModeJoin] = useState(false);
  const [erreurLocal, setErreurLocal] = useState('');

  if (enPartie) {
    return <Lobby pseudo={pseudo} codePartie={modeJoin ? code : null} />;
  }

  const handleCreer = () => {
    if (!pseudo.trim()) { setErreurLocal('Entre ton pseudo !'); return; }
    setModeJoin(false);
    setEnPartie(true);
  };

  const handleRejoindre = () => {
    if (!pseudo.trim()) { setErreurLocal('Entre ton pseudo !'); return; }
    if (!code.trim()) { setErreurLocal('Entre le code de la partie !'); return; }
    setModeJoin(true);
    setEnPartie(true);
  };

  return (
    <div className="app-bg">
      <div className="stars" />
      <div className="moon" />
      <div className="fog" />

      <div className="main-card">
        <div className="wolf-icon">🐺</div>
        <h1 className="title-main">Loup<span className="title-garou">Garou</span></h1>
        <p className="subtitle">Le village tremble... Es-tu prêt ?</p>

        {erreurLocal && <p className="erreur-msg">⚠️ {erreurLocal}</p>}

        <input
          className="input-style"
          placeholder="Ton pseudo..."
          value={pseudo}
          onChange={e => { setPseudo(e.target.value); setErreurLocal(''); }}
          maxLength={20}
        />

        <input
          className="input-style"
          placeholder="Code de partie (laisser vide pour créer)"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setErreurLocal(''); }}
          maxLength={6}
        />

        <div className="btn-group">
          <button className="btn-primary" onClick={handleCreer}>
            ⚔️ Créer une partie
          </button>
          <button className="btn-secondary" onClick={handleRejoindre}>
            🚪 Rejoindre
          </button>
        </div>

        <p className="footer-text">4 à 20 joueurs • Rôles officiels • Temps réel</p>
      </div>
    </div>
  );
}

export default App;