
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Howl, Howler } from 'howler';
import { jouerAmbiance, jouerSon, stopperTout, narrer } from './sounds';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
const socket = io(BACKEND_URL);

const ROLE_INFOS = {
  'Loup-Garou': { emoji: '🐺', couleur: '#c0392b', couleurBg: 'linear-gradient(135deg, #7b0000, #c0392b)', camp: 'Loups', description: 'Chaque nuit, vous vous réveillez avec vos alliés et choisissez une victime à dévorer.', hints: ['🎭 Bluffez pendant le jour — accusez subtilement d\'autres joueurs', '🤝 Coordonnez-vous avec vos alliés loups la nuit', '🎯 Éliminez en priorité la Voyante et la Sorcière', '⚠️ Si accusé, semez le doute sur quelqu\'un d\'autre'] },
  'Villageois': { emoji: '🧑‍🌾', couleur: '#27ae60', couleurBg: 'linear-gradient(135deg, #1a5e35, #27ae60)', camp: 'Village', description: 'Pas de pouvoir spécial. Votre arme : l\'observation et la persuasion.', hints: ['👀 Observez les comportements suspects', '🗣️ Participez activement aux débats', '🤔 Méfiez-vous des trop silencieux ou trop accusateurs', '🗳️ N\'analysez jamais au hasard'] },
  'Voyante': { emoji: '🔮', couleur: '#8e44ad', couleurBg: 'linear-gradient(135deg, #4a1a6e, #8e44ad)', camp: 'Village', description: 'Chaque nuit, regardez la carte d\'un joueur et découvrez s\'il est Loup-Garou.', hints: ['🤫 Ne révélez pas votre rôle trop tôt — vous êtes cible prioritaire', '🎯 Inspectez d\'abord les plus suspects', '💬 Guidez le village subtilement', '⚡ En danger, révélez-vous et partagez vos infos'] },
  'Sorcière': { emoji: '🧪', couleur: '#16a085', couleurBg: 'linear-gradient(135deg, #0a4a3a, #16a085)', camp: 'Village', description: 'Deux potions : une pour sauver la victime des loups, une pour tuer n\'importe qui.', hints: ['💊 Gardez votre potion de vie pour les joueurs clés', '☠️ Potion de mort sur un loup confirmé seulement', '🎲 Une seule utilisation chacune — choisissez bien', '🌙 Vous voyez qui a été tué avant de décider'] },
  'Chasseur': { emoji: '🏹', couleur: '#e67e22', couleurBg: 'linear-gradient(135deg, #7a3500, #e67e22)', camp: 'Village', description: 'Quand vous mourez, éliminez immédiatement un autre joueur.', hints: ['💀 Votre mort est une arme — utilisez-la bien', '🎯 En mourant, éliminez un loup confirmé', '🛡️ Les loups évitent souvent de vous tuer', '🤫 Gardez votre rôle secret le plus longtemps'] },
  'Cupidon': { emoji: '💘', couleur: '#e91e63', couleurBg: 'linear-gradient(135deg, #880033, #e91e63)', camp: 'Village', description: 'Liez deux joueurs. Si l\'un meurt, l\'autre meurt aussi d\'amour.', hints: ['💡 Liez deux villageois pour créer une alliance', '⚠️ Évitez de lier un loup avec un villageois', '🎯 Vous pouvez vous lier vous-même avec quelqu\'un', '🏆 Les deux amoureux survivants gagnent ensemble !'] },
  'Salvateur': { emoji: '🛡️', couleur: '#2980b9', couleurBg: 'linear-gradient(135deg, #0a3a6e, #2980b9)', camp: 'Village', description: 'Chaque nuit, protégez un joueur. Pas deux nuits de suite la même personne.', hints: ['🔄 Variez vos protections', '🎯 Protégez la Voyante ou la Sorcière en priorité', '🤫 Ne révélez jamais votre rôle', '💡 Vous pouvez vous protéger vous-même'] },
  'Ancien': { emoji: '👴', couleur: '#795548', couleurBg: 'linear-gradient(135deg, #3e2723, #795548)', camp: 'Village', description: 'Survivez à la première attaque. Mais si le village vous élimine, tous perdent leurs pouvoirs.', hints: ['💪 Votre première mort par les loups ne vous tue pas', '⚠️ Si le village vous élimine, tous les pouvoirs sont perdus', '🤫 Gardez votre rôle secret', '🎯 Révélez-vous si accusé — la menace peut vous sauver'] },
  'Petite Fille': { emoji: '👧', couleur: '#ff69b4', couleurBg: 'linear-gradient(135deg, #880055, #ff69b4)', camp: 'Village', description: 'Pendant la phase des loups, vous pouvez espionner en ouvrant légèrement les yeux.', hints: ['👁️ Essayez discrètement de voir qui se réveille', '⚠️ Si un loup vous voit, vous devenez cible prioritaire', '🤫 Ne partagez vos infos qu\'avec des joueurs de confiance', '🎲 Risqué mais précieux'] },
  'Corbeau': { emoji: '🐦‍⬛', couleur: '#37474f', couleurBg: 'linear-gradient(135deg, #1a2a2e, #37474f)', camp: 'Village', description: 'Chaque nuit, désignez un joueur qui aura 2 votes supplémentaires contre lui.', hints: ['🎯 Utilisez sur un joueur suspect', '🤫 Personne ne sait qui est le Corbeau', '⚖️ Les 2 bonus peuvent faire pencher la balance', '💡 Vous pouvez bluffer sur votre identité'] },
  'Idiot du Village': { emoji: '🤪', couleur: '#ff9800', couleurBg: 'linear-gradient(135deg, #7a4000, #ff9800)', camp: 'Village', description: 'Si le village vote pour vous éliminer, vous survivez mais perdez votre droit de vote.', hints: ['😅 Être éliminé par le village ne vous tue pas', '🗳️ Après révélation, vous ne pouvez plus voter', '🎭 Jouez la confusion pour désorienter', '👀 Même sans vote, influencez les débats'] },
  'Loup Blanc': { emoji: '🤍', couleur: '#607d8b', couleurBg: 'linear-gradient(135deg, #263238, #607d8b)', camp: 'Loups', description: 'Une nuit sur deux, éliminez un autre loup pour gagner seul.', hints: ['🎭 Faites semblant d\'être un loup ordinaire', '⏰ Une nuit sur deux, tuez un autre loup', '🏆 Vous gagnez uniquement seul survivant', '⚠️ Les autres loups ne savent pas'] },
  'Loup Infect': { emoji: '🤢', couleur: '#8b0000', couleurBg: 'linear-gradient(135deg, #4a0000, #8b0000)', camp: 'Loups', description: 'Une fois, infectez votre victime pour en faire un loup plutôt que de la tuer.', hints: ['🦠 Infectez un joueur puissant (Voyante, Chasseur)', '🤫 La victime infectée ne sait pas qui l\'a infectée', '⚡ Une seule fois — utilisez au bon moment', '🎯 Choisissez un joueur clé du village'] },
  'Joueur de Flûte': { emoji: '🪈', couleur: '#9c27b0', couleurBg: 'linear-gradient(135deg, #4a0070, #9c27b0)', camp: 'Solitaire', description: 'Ensorcèlez un joueur chaque nuit. Si tous les survivants sont ensorcelés, vous gagnez seul.', hints: ['🎵 Ensorcèlez discrètement chaque nuit', '🏆 Vous gagnez seul — ni loups ni village', '🤫 Révélez-vous = mort immédiate', '⚡ Accélérez en fin de partie'] },
  'Ange': { emoji: '😇', couleur: '#ffd700', couleurBg: 'linear-gradient(135deg, #7a6500, #ffd700)', camp: 'Solitaire', description: 'Gagnez seul si vous êtes éliminé lors du premier vote du village.', hints: ['🎯 Objectif : vous faire éliminer au 1er vote', '🎭 Comportez-vous de façon suspecte', '⚠️ Si vous survivez, jouez comme Villageois', '💡 Haut risque, très satisfaisant si réussi'] },
};

function Chat({ code, pseudo, joueurs }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const [nonLus, setNonLus] = useState(0);
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    socket.on('nouveau_message', (msg) => {
      setMessages(p => [...p, msg]);
      if (!ouvert) setNonLus(p => p + 1);
    });
    return () => socket.off('nouveau_message');
  }, [ouvert]);

  useEffect(() => {
    if (ouvert) {
      setNonLus(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ouvert, messages]);

  const envoyer = () => {
    if (!texte.trim()) return;
    socket.emit('message_chat', { code, pseudo, message: texte });
    setTexte('');
  };

  return (
    <>
      <button onClick={() => setOuvert(!ouvert)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100,
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #c0392b, #8b0000)',
        border: 'none', cursor: 'pointer', fontSize: 22,
        boxShadow: '0 4px 20px rgba(192,57,43,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'fixed'
      }}>
        💬
        {nonLus > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#f39c12', color: 'black',
            borderRadius: '50%', width: 20, height: 20,
            fontSize: 11, fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{nonLus}</span>
        )}
      </button>

      {ouvert && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 100,
          width: 320, height: 420,
          background: 'rgba(5,10,15,0.97)',
          border: '1px solid rgba(180,120,40,0.3)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 2, color: '#e8d5b0' }}>💬 VILLAGE</span>
            <span style={{ fontSize: 12, color: 'rgba(232,213,176,0.4)' }}>{joueurs?.filter(j => j.vivant).length || 0} vivants</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <p style={{ color: 'rgba(232,213,176,0.3)', fontSize: 13, textAlign: 'center', fontStyle: 'italic', marginTop: 20 }}>
                Le village est silencieux...
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} style={{
                background: m.pseudo === pseudo ? 'rgba(192,57,43,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${m.pseudo === pseudo ? 'rgba(192,57,43,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10, padding: '8px 12px',
                alignSelf: m.pseudo === pseudo ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 'bold', color: m.pseudo === pseudo ? '#e74c3c' : '#f39c12' }}>{m.pseudo}</span>
                  <span style={{ fontSize: 11, color: 'rgba(232,213,176,0.3)' }}>{m.timestamp}</span>
                </div>
                <p style={{ fontSize: 14, color: '#e8d5b0', margin: 0, lineHeight: 1.4 }}>{m.message}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
            <input
              value={texte}
              onChange={e => setTexte(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && envoyer()}
              placeholder="Ton message..."
              maxLength={200}
              style={{
                flex: 1, padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(180,120,40,0.2)',
                borderRadius: 8, color: '#e8d5b0',
                fontFamily: 'Crimson Text, serif', fontSize: 14, outline: 'none'
              }}
            />
            <button onClick={envoyer} style={{
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #c0392b, #8b0000)',
              border: 'none', borderRadius: 8, color: 'white',
              cursor: 'pointer', fontSize: 16
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

function CarteRole({ role, amoureux, onContinue }) {
  const [visible, setVisible] = useState(false);
  const [hintsVus, setHintsVus] = useState(false);
  const info = ROLE_INFOS[role] || { emoji: '❓', couleur: '#666', couleurBg: '#333', camp: '?', description: '?', hints: [] };

  return (
    <div className="game-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="stars" /><div className="moon" /><div className="fog" />
      <h2 className="phase-title nuit" style={{ marginBottom: 6 }}>🌙 Ta carte secrète</h2>
      <p style={{ color: 'rgba(232,213,176,0.4)', fontSize: 13, marginBottom: 20, fontStyle: 'italic' }}>Assure-toi que personne ne regarde</p>
      {amoureux && (
        <div className="amour-banner">💘 Tu es amoureux(se) de <strong>{amoureux}</strong> — si l'un de vous meurt, l'autre aussi.</div>
      )}
      <div className="role-card-wrapper" onClick={() => setVisible(!visible)}>
        <div className="role-card" style={{ background: visible ? info.couleurBg : 'linear-gradient(135deg, #1a0a2e, #0a1a0a)', minWidth: 260 }}>
          {visible ? (
            <>
              <div className="role-emoji">{info.emoji}</div>
              <div className="role-name">{role}</div>
              <div className="role-camp-badge">{info.camp}</div>
              <p className="role-description">{info.description}</p>
            </>
          ) : (
            <>
              <div className="role-emoji">🂠</div>
              <div className="role-name" style={{ color: 'rgba(232,213,176,0.5)', fontSize: 16 }}>Appuie pour révéler</div>
              <p style={{ color: 'rgba(232,213,176,0.3)', fontSize: 13, marginTop: 8 }}>Garde ton écran caché</p>
            </>
          )}
        </div>
      </div>
      {visible && (
        <div style={{ width: '100%', maxWidth: 440, padding: '0 16px' }}>
          <button onClick={() => setHintsVus(!hintsVus)} style={{
            width: '100%', padding: '10px', marginBottom: 10,
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${info.couleur}40`,
            borderRadius: 10, color: info.couleur, cursor: 'pointer',
            fontFamily: 'Crimson Text, serif', fontSize: 15
          }}>
            {hintsVus ? '▲ Masquer les conseils' : '💡 Voir les conseils de jeu'}
          </button>
          {hintsVus && (
            <div className="hints-container">
              {info.hints.map((h, i) => <p key={i} className="hint-item">{h}</p>)}
            </div>
          )}
          <button className="btn-confirm" style={{ background: info.couleurBg, marginTop: 14 }} onClick={onContinue}>
            J'ai compris mon rôle ✓
          </button>
        </div>
      )}
    </div>
  );
}

function ActionPanel({ action, onAction }) {
  const [sel, setSel] = useState(null);
  const [sel2, setSel2] = useState(null);

  return (
    <div className="game-card" style={{ border: '1px solid rgba(192,57,43,0.3)', background: 'rgba(50,0,0,0.3)' }}>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 2, color: 'rgba(232,213,176,0.5)', marginBottom: 12, textTransform: 'uppercase' }}>Action secrète</p>
      <p style={{ color: '#e8d5b0', fontSize: 16, marginBottom: 16, lineHeight: 1.5 }}>🌙 {action.message}</p>
      {action.autresLoups?.length > 0 && (
        <div className="alert-box rouge" style={{ marginBottom: 12, fontSize: 13 }}>
          🐺 Tes alliés : <strong>{action.autresLoups.join(', ')}</strong>
        </div>
      )}
      {action.joueurs?.map((j, i) => (
        <button key={i} className={`player-btn ${sel === j.id ? 'selected' : ''} ${sel2 === j.id ? 'selected-love' : ''}`}
          onClick={() => {
            if (action.type === 'cupidon') {
              if (!sel) setSel(j.id);
              else if (j.id !== sel) setSel2(j.id);
            } else setSel(j.id);
          }}>
          <span style={{ fontSize: 20 }}>👤</span> {j.pseudo}
          {sel === j.id && <span style={{ marginLeft: 'auto' }}>{action.type === 'cupidon' ? '❤️' : '✓'}</span>}
          {sel2 === j.id && <span style={{ marginLeft: 'auto' }}>💕</span>}
        </button>
      ))}
      {action.type === 'cupidon' && (
        <p style={{ fontSize: 13, color: 'rgba(232,213,176,0.4)', marginTop: 8, fontStyle: 'italic' }}>
          {!sel ? '1er amoureux...' : !sel2 ? '2ème amoureux...' : '✓ Prêt à confirmer'}
        </p>
      )}
      <button className="btn-confirm"
        disabled={action.type === 'cupidon' ? (!sel || !sel2) : !sel}
        onClick={() => {
          if (action.type === 'cupidon') onAction({ cible1Id: sel, cible2Id: sel2 });
          else onAction({ cibleId: sel });
        }}>
        Confirmer mon choix
      </button>
    </div>
  );
}

function SorcierePanel({ data, onAction }) {
  const [choix, setChoix] = useState(null);
  const [cibleMort, setCibleMort] = useState(null);

  return (
    <div className="sorciere-card">
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 2, color: 'rgba(22,160,133,0.7)', marginBottom: 12, textTransform: 'uppercase' }}>🧪 Tour de la Sorcière</p>
      {data.victime
        ? <div className="alert-box rouge" style={{ marginBottom: 12 }}>Cette nuit, <strong>{data.victime.pseudo}</strong> a été attaqué(e) par les loups.</div>
        : <div className="alert-box vert" style={{ marginBottom: 12 }}>Les loups n'ont tué personne cette nuit.</div>
      }
      {data.potionVie && data.victime && (
        <button className={`player-btn ${choix === 'sauver' ? 'selected' : ''}`} onClick={() => setChoix(choix === 'sauver' ? null : 'sauver')}>
          💊 Sauver <strong>{data.victime.pseudo}</strong> (potion de vie)
        </button>
      )}
      {data.potionMort && (
        <>
          <p style={{ fontSize: 13, color: 'rgba(232,213,176,0.4)', margin: '12px 0 6px', fontStyle: 'italic' }}>☠️ Utiliser la potion de mort :</p>
          {data.joueurs?.map((j, i) => (
            <button key={i} className={`player-btn ${cibleMort === j.id ? 'selected' : ''}`}
              onClick={() => { setChoix('tuer'); setCibleMort(cibleMort === j.id ? null : j.id); }}>
              <span>👤</span> {j.pseudo} {cibleMort === j.id && <span style={{ marginLeft: 'auto' }}>☠️</span>}
            </button>
          ))}
        </>
      )}
      <button className="player-btn" style={{ marginTop: 8, opacity: 0.6 }} onClick={() => onAction({ action: 'passer' })}>
        Passer mon tour
      </button>
      {choix && (
        <button className="btn-confirm" onClick={() => onAction({ action: choix, cibleId: cibleMort })}>
          Confirmer
        </button>
      )}
    </div>
  );
}

function RecapPhase({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="recap-phase">
      <p className="recap-phase-title">📜 Récap de la nuit</p>
      {events.map((e, i) => (
        <div key={i} className={`alert-box ${e.type}`} style={{ marginBottom: 6, textAlign: 'left', fontSize: 14 }}>{e.texte}</div>
      ))}
    </div>
  );
}

export default function Lobby({ pseudo, codePartie }) {
  const [salle, setSalle] = useState(null);
  const [code, setCode] = useState(codePartie || '');
  const [erreur, setErreur] = useState('');
  const [monRole, setMonRole] = useState(null);
  const [phase, setPhase] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [victimeNuit, setVictimeNuit] = useState(null);
  const [monVote, setMonVote] = useState(null);
  const [finPartie, setFinPartie] = useState(null);
  const [tour, setTour] = useState(1);
  const [actionRequise, setActionRequise] = useState(null);
  const [sorciereData, setSorciereData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [amoureux, setAmoureux] = useState(null);
  const [recapEvents, setRecapEvents] = useState([]);

  const addMsg = (texte, type = 'or') => setMessages(p => [...p, { texte, type }]);

  useEffect(() => {
    if (!codePartie) socket.emit('creer_partie', { pseudo });
    else socket.emit('rejoindre_partie', { code: codePartie, pseudo });

    socket.on('partie_creee', ({ code, salle }) => { setCode(code); setSalle(salle); });
    socket.on('salle_mise_a_jour', setSalle);
    socket.on('role_attribue', ({ role }) => setMonRole(role));

    socket.on('partie_lancee', ({ joueurs }) => {
      setJoueurs(joueurs);
      setPhase('role');
      jouerSon('loup');
    });

    socket.on('tu_es_amoureux', ({ partenaire }) => setAmoureux(partenaire));

    socket.on('action_requise', (data) => {
      if (data.type === 'sorciere') { setSorciereData(data); setPhase('sorciere'); }
      else setActionRequise(data);
    });

    socket.on('resultat_voyante', ({ pseudo, role, estLoup }) => {
      addMsg(`🔮 ${pseudo} est ${estLoup ? '🐺 un Loup-Garou !' : `✅ innocent(e) (${role})`}`, estLoup ? 'rouge' : 'vert');
      setActionRequise(null);
      jouerSon('voyante');
    });
    socket.on('indice_petite_fille', ({ lettre }) => {
  addMsg(`👁️ Tu espionnes dans la nuit... Tu aperçois un loup dont le prénom commence par la lettre "${lettre}"`, 'violet');
});

    socket.on('action_confirmee', ({ message }) => { addMsg(message, 'vert'); setActionRequise(null); });
    socket.on('erreur_action', ({ message }) => addMsg(message, 'rouge'));

    socket.on('debut_nuit', ({ tour, joueurs }) => {
      setTour(tour);
      setJoueurs(joueurs);
      setMonVote(null);
      setMessages([]);
      setRecapEvents([]);
      setPhase(prev => prev === 'role' ? 'role' : 'nuit');
      jouerAmbiance('nuit');
    });

    socket.on('debut_jour', ({ victimeNuit, joueurs, tour }) => {
      const events = [];
      if (victimeNuit) {
        events.push({ texte: `🌙 ${victimeNuit.pseudo} (${victimeNuit.role}) a été dévoré(e) par les loups.`, type: 'rouge' });
        jouerSon('mort');
      } else {
        events.push({ texte: '🛡️ Personne n\'a été tué cette nuit — quelqu\'un était protégé !', type: 'vert' });
      }
      setRecapEvents(events);
      setVictimeNuit(victimeNuit);
      setJoueurs(joueurs);
      setTour(tour);
      setPhase('jour');
      setMonVote(null);
      setMessages([]);
      setActionRequise(null);
      jouerAmbiance('jour');
    });

    socket.on('ancien_survit', () => addMsg('👴 L\'Ancien a survécu à l\'attaque des loups !', 'or'));

    socket.on('chasseur_elimine', ({ pseudo, joueurs }) => {
      setJoueurs(joueurs);
      addMsg(`🏹 ${pseudo} (Chasseur) est éliminé et va tirer !`, 'or');
      jouerSon('mort');
    });

    socket.on('chasseur_tire', ({ pseudo, role }) => {
      addMsg(`🏹 Le Chasseur emporte ${pseudo} (${role}) dans la mort !`, 'rouge');
      jouerSon('mort');
    });

    socket.on('amoureux_meurent', ({ joueur1, joueur2 }) => {
      addMsg(`💔 ${joueur1} et ${joueur2} étaient amoureux — ils meurent ensemble.`, 'violet');
      jouerSon('mort');
    });

    socket.on('idiot_revele', ({ pseudo, joueurs }) => {
      setJoueurs(joueurs);
      addMsg(`🤪 ${pseudo} est l'Idiot du Village ! Il survit mais perd son vote.`, 'or');
    });

    socket.on('egalite_vote', ({ joueurs }) => {
      setJoueurs(joueurs);
      addMsg('⚖️ Égalité des votes — personne n\'est éliminé !', 'bleu');
    });

    socket.on('tu_es_ensorcele', () => {
      addMsg('🪈 Tu as été ensorcelé(e) par le Joueur de Flûte...', 'violet');
      jouerSon('voyante');
    });

    socket.on('elimine_jour', ({ pseudo, role, joueurs }) => {
      setJoueurs(joueurs);
      addMsg(`☀️ ${pseudo} (${role}) a été éliminé par le village.`, 'rouge');
      jouerSon('mort');
    });

    socket.on('fin_partie', ({ gagnant, joueurs }) => {
      setJoueurs(joueurs);
      setFinPartie({ gagnant });
      setPhase('fin');
      stopperTout();
      if (gagnant === 'Village') jouerSon('victoire');
      else jouerSon('defaite');
    });
    socket.on('partie_lancee', ({ joueurs }) => {
  setJoueurs(joueurs);
  setPhase('role');
  jouerSon('loup');
  narrer('La nuit est tombée sur le village... Les loups rôdent. Découvrez votre destin.');
});

socket.on('debut_nuit', ({ tour, joueurs }) => {
  setTour(tour);
  setJoueurs(joueurs);
  setMonVote(null);
  setMessages([]);
  setRecapEvents([]);
  setPhase(prev => prev === 'role' ? 'role' : 'nuit');
  jouerAmbiance('nuit');
  narrer(`Nuit numéro ${tour}... Le village s'endort... Les loups se réveillent... Qui sera leur prochaine victime ?`);
});

socket.on('debut_jour', ({ victimeNuit, joueurs, tour }) => {
  const events = [];
  if (victimeNuit) {
    events.push({ texte: `🌙 ${victimeNuit.pseudo} (${victimeNuit.role}) a été dévoré(e) par les loups.`, type: 'rouge' });
    jouerSon('mort');
    narrer(`L'aube se lève... et révèle l'horreur. ${victimeNuit.pseudo} a été dévoré cette nuit. Le village pleure... et cherche le coupable.`);
  } else {
    events.push({ texte: '🛡️ Personne n\'a été tué cette nuit !', type: 'vert' });
    narrer('L\'aube se lève... Par miracle, personne n\'a péri cette nuit. Mais les loups attendent leur heure.');
  }
  setRecapEvents(events);
  setVictimeNuit(victimeNuit);
  setJoueurs(joueurs);
  setTour(tour);
  setPhase('jour');
  setMonVote(null);
  setMessages([]);
  setActionRequise(null);
  jouerAmbiance('jour');
});

socket.on('elimine_jour', ({ pseudo, role, joueurs }) => {
  setJoueurs(joueurs);
  addMsg(`☀️ ${pseudo} (${role}) a été éliminé par le village.`, 'rouge');
  jouerSon('mort');
  narrer(`Le village a tranché... ${pseudo} est éliminé. Son rôle était... ${role}.`);
});

socket.on('fin_partie', ({ gagnant, joueurs }) => {
  setJoueurs(joueurs);
  setFinPartie({ gagnant });
  setPhase('fin');
  stopperTout();
  if (gagnant === 'Village') {
    jouerSon('victoire');
    narrer('Le dernier loup est tombé... Le village est sauvé. La paix revient... pour l\'instant.');
  } else if (gagnant === 'Loups') {
    jouerSon('defaite');
    narrer('Les loups ont gagné... Le village est à genoux. L\'obscurité règne désormais sur Thiercelieux.');
  } else {
    narrer('Personne n\'a survécu... Le village est maudit pour l\'éternité.');
  }
});

socket.on('amoureux_meurent', ({ joueur1, joueur2 }) => {
  addMsg(`💔 ${joueur1} et ${joueur2} étaient amoureux — ils meurent ensemble.`, 'violet');
  jouerSon('mort');
  narrer(`${joueur1} et ${joueur2} s'aimaient... et ensemble ils tombent dans l'éternité.`);
});

socket.on('chasseur_elimine', ({ pseudo, joueurs }) => {
  setJoueurs(joueurs);
  addMsg(`🏹 ${pseudo} (Chasseur) est éliminé et va tirer !`, 'or');
  jouerSon('mort');
  narrer(`${pseudo} tombe... mais le Chasseur ne meurt pas seul. Il va emporter quelqu'un avec lui.`);
});

socket.on('indice_petite_fille', ({ lettre }) => {
  addMsg(`👁️ Tu espionnes dans la nuit... Tu aperçois un loup dont le prénom commence par la lettre "${lettre}"`, 'violet');
});

    socket.on('erreur', ({ message }) => setErreur(message));

    return () => {
      ['partie_creee','salle_mise_a_jour','role_attribue','partie_lancee','tu_es_amoureux',
       'action_requise','resultat_voyante','action_confirmee','erreur_action','debut_nuit',
       'debut_jour','ancien_survit','chasseur_elimine','chasseur_tire','amoureux_meurent','indice_petite_fille',
       'idiot_revele','egalite_vote','tu_es_ensorcele','elimine_jour','fin_partie','erreur'
      ].forEach(e => socket.off(e));
      stopperTout();
    };
  }, []);

  const handleAction = (data) => {
    if (!actionRequise) return;
    const events = { cupidon: 'action_cupidon', voyante: 'action_voyante', salvateur: 'action_salvateur', loups: 'vote_loup', chasseur: 'action_chasseur', corbeau: 'action_corbeau', flutiste: 'action_flutiste' };
    socket.emit(events[actionRequise.type], { code, ...data });
    setActionRequise(null);
  };

  const handleSorciere = ({ action, cibleId }) => {
    if (action === 'passer') socket.emit('passer_sorciere', { code });
    else socket.emit('action_sorciere', { code, action, cibleId });
    setSorciereData(null); setPhase('nuit');
  };

  if (erreur) return (
    <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stars" />
      <button onClick={() => { Howler.mute(!Howler.masterMute); }} 
  style={{
    position: 'fixed', top: 16, right: 16, zIndex: 200,
    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
    fontSize: 20, color: 'white'
  }}>
  🔊
</button>
      <div className="game-card" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 48 }}>❌</p>
        <p style={{ color: '#e74c3c', fontSize: 18 }}>{erreur}</p>
      </div>
    </div>

  );

  if (!salle && !phase) return (
    <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stars" />
      <p style={{ color: 'rgba(232,213,176,0.5)', fontStyle: 'italic' }}>Connexion au village...</p>
    </div>
  );

  // Fin de partie
  if (phase === 'fin') {
    const configs = {
      Village: { emoji: '🎉', label: 'Le Village a gagné !', cls: 'village' },
      Loups: { emoji: '🐺', label: 'Les Loups ont gagné !', cls: 'loups' },
      'Joueur de Flûte': { emoji: '🪈', label: 'Le Joueur de Flûte a gagné seul !', cls: 'special' },
      'Match nul': { emoji: '🤝', label: 'Match nul !', cls: 'special' }
    };
    const cfg = configs[finPartie.gagnant] || configs['Match nul'];
    return (
      <div className="game-container">
        <div className="stars" /><div className="moon" /><div className="fog" />
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 80 }}>{cfg.emoji}</div>
          <h2 className={`fin-winner ${cfg.cls}`}>{cfg.label}</h2>
          <div className="game-card" style={{ marginTop: 24 }}>
            <p className="section-title">Récap des rôles</p>
            {joueurs.map((j, i) => (
              <div key={i} className={`recap-item ${j.vivant ? 'vivant' : 'mort'}`}>
                {j.vivant ? '✅' : '💀'} <strong>{j.pseudo}</strong>
                <span style={{ opacity: 0.7, fontSize: 14, marginLeft: 6 }}>— {j.role || '?'}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 20, width: '100%', maxWidth: 300 }} onClick={() => window.location.reload()}>
            🔄 Rejouer
          </button>
        </div>
        <Chat code={code} pseudo={pseudo} joueurs={joueurs} />
      </div>
    );
  }

  // Révélation rôle
  if (phase === 'role') return <CarteRole role={monRole} amoureux={amoureux} onContinue={() => setPhase('nuit')} />;

  // Sorcière
  if (phase === 'sorciere') return (
    <div className="game-container">
      <div className="stars" /><div className="moon" />
      <div style={{ maxWidth: 500, margin: '0 auto', paddingTop: 40 }}>
        <div className="game-header"><h1 className="phase-title nuit">🌙 Nuit — Tour {tour}</h1></div>
        {messages.map((m, i) => <div key={i} className={`alert-box ${m.type}`}>{m.texte}</div>)}
        <SorcierePanel data={sorciereData} onAction={handleSorciere} />
      </div>
      <Chat code={code} pseudo={pseudo} joueurs={joueurs} />
    </div>
  );

  // Nuit
  if (phase === 'nuit') {
    const moi = joueurs.find(j => j.id === socket.id);
    return (
      <div className="game-container">
        <div className="stars" /><div className="moon" /><div className="fog" />
        <div style={{ maxWidth: 500, margin: '0 auto', paddingTop: 20 }}>
          <div className="game-header">
            <h1 className="phase-title nuit">🌙 Nuit</h1>
            <div className="tour-badge">TOUR {tour}</div>
          </div>
          {messages.map((m, i) => <div key={i} className={`alert-box ${m.type}`} style={{ margin: '6px 0' }}>{m.texte}</div>)}
          {actionRequise
            ? <ActionPanel action={actionRequise} onAction={handleAction} />
            : (
              <div className="sleep-screen">
                {moi?.vivant !== false
                  ? <><div className="sleep-emoji">😴</div><p style={{ color: 'rgba(232,213,176,0.5)', marginTop: 16, fontStyle: 'italic' }}>Tu dors... La forêt retient son souffle.</p></>
                  : <><div className="sleep-emoji">💀</div><p style={{ color: 'rgba(232,213,176,0.4)', marginTop: 16 }}>Tu observes depuis l'au-delà...</p></>
                }
              </div>
            )
          }
        </div>
        <Chat code={code} pseudo={pseudo} joueurs={joueurs} />
      </div>
    );
  }

  // Jour
  if (phase === 'jour') {
    const moi = joueurs.find(j => j.id === socket.id);
    const peutVoter = moi?.vivant && !moi?.idiotRevele && !monVote;
    const vivants = joueurs.filter(j => j.vivant && j.id !== socket.id);

    return (
      <div className="game-container">
        <div className="stars" /><div className="fog" />
        <div style={{ maxWidth: 500, margin: '0 auto', paddingTop: 20 }}>
          <div className="game-header">
            <h1 className="phase-title jour">☀️ Jour</h1>
            <div className="tour-badge">TOUR {tour}</div>
          </div>
          <RecapPhase events={recapEvents} />
          {messages.map((m, i) => <div key={i} className={`alert-box ${m.type}`} style={{ margin: '6px 0' }}>{m.texte}</div>)}
          {actionRequise && <ActionPanel action={actionRequise} onAction={handleAction} />}
          {!actionRequise && (
            <div className="game-card">
              {peutVoter ? (
                <>
                  <p className="section-title">🗳️ Vote pour éliminer un suspect</p>
                  {vivants.map((j, i) => (
                    <button key={i} className="player-btn"
                      onClick={() => { setMonVote(j.id); socket.emit('vote_jour', { code, cibleId: j.id }); }}>
                      <span style={{ fontSize: 18 }}>👤</span> {j.pseudo}
                    </button>
                  ))}
                </>
              ) : monVote ? (
                <div className="sleep-screen">
                  <p style={{ fontSize: 32 }}>🗳️</p>
                  <p style={{ color: 'rgba(232,213,176,0.5)', marginTop: 12, fontStyle: 'italic' }}>Vote envoyé — en attente du village...</p>
                </div>
              ) : (
                <div className="sleep-screen">
                  {!moi?.vivant
                    ? <><p style={{ fontSize: 40 }}>💀</p><p style={{ color: 'rgba(232,213,176,0.4)', marginTop: 12 }}>Tu observes depuis l'au-delà...</p></>
                    : <><p style={{ fontSize: 40 }}>🤪</p><p style={{ color: '#ff9800', marginTop: 12 }}>Idiot du Village révélé — tu ne votes plus.</p></>
                  }
                </div>
              )}
            </div>
          )}
          <div className="game-card" style={{ marginTop: 12 }}>
            <p className="section-title">Joueurs ({joueurs.filter(j => j.vivant).length} vivants)</p>
            {joueurs.map((j, i) => (
              <div key={i} className="player-list-item" style={{ opacity: j.vivant ? 1 : 0.4 }}>
                {j.vivant ? '🟢' : '💀'} {j.pseudo}
                {j.id === socket.id && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(232,213,176,0.4)' }}>toi</span>}
              </div>
            ))}
          </div>
        </div>
        <Chat code={code} pseudo={pseudo} joueurs={joueurs} />
      </div>
    );
  }

  // Lobby
  return (
    <div className="game-container">
      <div className="stars" /><div className="moon" /><div className="fog" />
      <div style={{ maxWidth: 500, margin: '0 auto', paddingTop: 40, textAlign: 'center' }}>
        <div className="wolf-icon" style={{ fontSize: 56 }}>🐺</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: '#e8d5b0', letterSpacing: 3, marginBottom: 4 }}>LOBBY</h1>
        <div className="code-display">
          <p className="code-label">Code de la partie</p>
          <div className="code-value">{code}</div>
          <p className="code-hint">Envoie ce code à tes potes !</p>
        </div>
        <p className="section-title">Joueurs ({salle?.joueurs.length})</p>
        {salle?.joueurs.map((j, i) => (
          <div key={i} className="player-list-item">
            {j.hote ? '👑' : '🐺'} {j.pseudo}
            {j.id === socket.id && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(232,213,176,0.4)' }}>toi</span>}
          </div>
        ))}
        {salle?.joueurs[0]?.id === socket.id ? (
          <div style={{ marginTop: 20 }}>
            {salle.joueurs.length < 4
              ? <div className="alert-box bleu">En attente de {4 - salle.joueurs.length} joueur(s) supplémentaire(s)...</div>
              : <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16 }} onClick={() => socket.emit('lancer_partie', { code })}>
                  ⚔️ Lancer la partie ({salle.joueurs.length} joueurs)
                </button>
            }
          </div>
        ) : (
          <div className="alert-box bleu" style={{ marginTop: 16 }}>En attente que l'hôte lance la partie...</div>
        )}
      </div>
      <Chat code={code} pseudo={pseudo} joueurs={joueurs} />
    </div>
  );
}