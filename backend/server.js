const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const salles = {};

function genererCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function melangerTableau(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function estLoup(joueur) {
  return ['Loup-Garou', 'Loup Blanc', 'Loup Infect'].includes(joueur.role) || joueur.infecte;
}

function joueurPublic(j) {
  return { id: j.id, pseudo: j.pseudo, vivant: j.vivant, hote: j.hote, ensorcele: j.ensorcele, idiotRevele: j.idiotRevele };
}

function distribuerRoles(joueurs) {
  const nb = joueurs.length;
  const roles = [];

  const nbLoups = Math.max(1, Math.floor(nb / 4));
  for (let i = 0; i < nbLoups; i++) roles.push('Loup-Garou');

  const rolesSpeciaux = [];
  if (nb >= 4) rolesSpeciaux.push('Voyante');
  if (nb >= 5) rolesSpeciaux.push('Sorcière');
  if (nb >= 6) rolesSpeciaux.push('Chasseur');
  if (nb >= 7) rolesSpeciaux.push('Cupidon');
  if (nb >= 8) rolesSpeciaux.push('Salvateur');
  if (nb >= 9) rolesSpeciaux.push('Ancien');
  if (nb >= 10) rolesSpeciaux.push('Petite Fille');
  if (nb >= 11) rolesSpeciaux.push('Corbeau');
  if (nb >= 12) rolesSpeciaux.push('Idiot du Village');
  if (nb >= 13) rolesSpeciaux.push('Loup Blanc');
  if (nb >= 14) rolesSpeciaux.push('Loup Infect');
  if (nb >= 15) rolesSpeciaux.push('Joueur de Flûte');
  if (nb >= 16) rolesSpeciaux.push('Ange');

  for (const r of rolesSpeciaux) {
    if (roles.length < nb) roles.push(r);
  }

  while (roles.length < nb) roles.push('Villageois');

  melangerTableau(roles);
  console.log('Rôles distribués:', roles);

  return joueurs.map((joueur, i) => ({
    ...joueur,
    role: roles[i],
    vivant: true,
    ancienSurvie: roles[i] === 'Ancien',
    idiotRevele: false,
    infecte: false,
    ensorcele: false,
    amoureux: null,
  }));
}

function verifierFinPartie(salle) {
  const loupsVivants = salle.joueurs.filter(j => j.vivant && estLoup(j));
  const autresVivants = salle.joueurs.filter(j => j.vivant && !estLoup(j) && j.role !== 'Joueur de Flûte');
  const flutisteVivant = salle.joueurs.find(j => j.vivant && j.role === 'Joueur de Flûte');

  if (flutisteVivant) {
    const vivants = salle.joueurs.filter(j => j.vivant && j.id !== flutisteVivant.id);
    const tousEnsorceles = vivants.length > 0 && vivants.every(j => j.ensorcele);
    if (tousEnsorceles) return { fin: true, gagnant: 'Joueur de Flûte' };
  }
  if (loupsVivants.length === 0 && autresVivants.length === 0) return { fin: true, gagnant: 'Match nul' };
  if (loupsVivants.length === 0) return { fin: true, gagnant: 'Village' };
  if (loupsVivants.length >= autresVivants.length) return { fin: true, gagnant: 'Loups' };
  return { fin: false };
}

function demarrerNuit(salle) {
  salle.phase = 'nuit';
  salle.votesNuit = {};
  salle.loupsDone = false;
  salle.voyanteDone = !salle.joueurs.find(j => j.role === 'Voyante' && j.vivant);
  salle.salvateurDone = !salle.joueurs.find(j => j.role === 'Salvateur' && j.vivant);
  salle.corbeauDone = !salle.joueurs.find(j => j.role === 'Corbeau' && j.vivant);
  salle.flutisteDone = !salle.joueurs.find(j => j.role === 'Joueur de Flûte' && j.vivant);
  salle.protegePar = null;

  const loupsVivants = salle.joueurs.filter(j => estLoup(j) && j.vivant);
  if (loupsVivants.length === 0) salle.loupsDone = true;

  io.to(salle.code).emit('debut_nuit', {
    tour: salle.tour,
    joueurs: salle.joueurs.map(joueurPublic)
  });

  const voyante = salle.joueurs.find(j => j.role === 'Voyante' && j.vivant);
  if (voyante) {
    io.to(voyante.id).emit('action_requise', {
      type: 'voyante',
      message: 'Choisis un joueur pour révéler son rôle.',
      joueurs: salle.joueurs.filter(j => j.id !== voyante.id && j.vivant).map(joueurPublic)
    });
  }

  const salvateur = salle.joueurs.find(j => j.role === 'Salvateur' && j.vivant);
  if (salvateur) {
    io.to(salvateur.id).emit('action_requise', {
      type: 'salvateur',
      message: 'Choisis un joueur à protéger cette nuit.',
      joueurs: salle.joueurs.filter(j => j.vivant).map(joueurPublic)
    });
  }

  const corbeau = salle.joueurs.find(j => j.role === 'Corbeau' && j.vivant);
  if (corbeau) {
    io.to(corbeau.id).emit('action_requise', {
      type: 'corbeau',
      message: 'Choisis un joueur à suspecter — il aura 2 votes contre lui demain.',
      joueurs: salle.joueurs.filter(j => j.id !== corbeau.id && j.vivant).map(joueurPublic)
    });
  }

  const flutiste = salle.joueurs.find(j => j.role === 'Joueur de Flûte' && j.vivant);
  if (flutiste) {
    io.to(flutiste.id).emit('action_requise', {
      type: 'flutiste',
      message: 'Choisis un joueur à ensorceler.',
      joueurs: salle.joueurs.filter(j => j.id !== flutiste.id && j.vivant && !j.ensorcele).map(joueurPublic)
    });
  }

  const loups = salle.joueurs.filter(j => estLoup(j) && j.vivant);
  const ciblesLoups = salle.joueurs.filter(j => !estLoup(j) && j.vivant).map(joueurPublic);
  loups.forEach(loup => {
    io.to(loup.id).emit('action_requise', {
      type: 'loups',
      message: 'Choisissez votre victime cette nuit.',
      joueurs: ciblesLoups,
      autresLoups: loups.filter(l => l.id !== loup.id).map(l => l.pseudo)
    });
  });

  verifierFinNuit(salle);
}

function verifierFinNuit(salle) {
  console.log('verifierFinNuit:', {
    loups: salle.loupsDone,
    voyante: salle.voyanteDone,
    salvateur: salle.salvateurDone,
    corbeau: salle.corbeauDone,
    flutiste: salle.flutisteDone
  });
  if (salle.loupsDone && salle.voyanteDone && salle.salvateurDone && salle.corbeauDone && salle.flutisteDone) {
    traiterNuit(salle);
  }
}

function traiterNuit(salle) {
  console.log('traiterNuit lancé, votes:', salle.votesNuit);

  const comptage = {};
  Object.values(salle.votesNuit).forEach(id => {
    comptage[id] = (comptage[id] || 0) + 1;
  });

  let victime = null;
  if (Object.keys(comptage).length > 0) {
    const cibleId = Object.keys(comptage).reduce((a, b) => comptage[a] > comptage[b] ? a : b);
    const cible = salle.joueurs.find(j => j.id === cibleId);
    if (cible) {
      if (salle.protegePar === cibleId) {
        victime = null;
      } else if (cible.role === 'Ancien' && cible.ancienSurvie) {
        cible.ancienSurvie = false;
        victime = null;
        io.to(salle.code).emit('ancien_survit');
      } else {
        cible.vivant = false;
        victime = cible;
      }
    }
  }

  const sorciere = salle.joueurs.find(j => j.role === 'Sorcière' && j.vivant);
  if (sorciere) {
    salle.phase = 'sorciere';
    if (salle.potionVie === undefined) salle.potionVie = true;
    if (salle.potionMort === undefined) salle.potionMort = true;
    io.to(sorciere.id).emit('action_sorciere', {
      victime: victime ? { id: victime.id, pseudo: victime.pseudo } : null,
      potionVie: salle.potionVie !== false,
      potionMort: salle.potionMort !== false,
      joueurs: salle.joueurs.filter(j => j.vivant && j.id !== sorciere.id).map(joueurPublic)
    });
    salle.victimeNuit = victime;
  } else {
    salle.victimeNuit = victime;
    demarrerJour(salle);
  }
}

function demarrerJour(salle) {
  console.log('demarrerJour lancé');

  if (salle.victimeSorciere) {
    const cible = salle.joueurs.find(j => j.id === salle.victimeSorciere);
    if (cible) cible.vivant = false;
    salle.victimeSorciere = null;
  }

  if (salle.victimeNuitSauvee && salle.victimeNuit) {
    salle.victimeNuit.vivant = true;
    salle.victimeNuitSauvee = false;
  }

  const victimeNuit = salle.victimeNuit;
  salle.victimeNuit = null;
  salle.phase = 'jour';
  salle.votesJour = {};
  salle.tour++;

  if (victimeNuit && victimeNuit.amoureux) {
    const partenaire = salle.joueurs.find(j => j.id === victimeNuit.amoureux);
    if (partenaire && partenaire.vivant) {
      partenaire.vivant = false;
      io.to(salle.code).emit('amoureux_meurent', { joueur1: victimeNuit.pseudo, joueur2: partenaire.pseudo });
    }
  }

  const fin = verifierFinPartie(salle);
  if (fin.fin) {
    io.to(salle.code).emit('fin_partie', { gagnant: fin.gagnant, joueurs: salle.joueurs });
    return;
  }

  if (victimeNuit && victimeNuit.role === 'Chasseur') {
    io.to(salle.code).emit('chasseur_elimine', { pseudo: victimeNuit.pseudo, joueurs: salle.joueurs.map(joueurPublic) });
    io.to(victimeNuit.id).emit('action_requise', {
      type: 'chasseur',
      message: 'Tu as été éliminé ! Choisis quelqu\'un à emporter avec toi.',
      joueurs: salle.joueurs.filter(j => j.vivant && j.id !== victimeNuit.id).map(joueurPublic)
    });
    return;
  }

  io.to(salle.code).emit('debut_jour', {
    victimeNuit: victimeNuit ? { pseudo: victimeNuit.pseudo, role: victimeNuit.role } : null,
    joueurs: salle.joueurs.map(joueurPublic),
    tour: salle.tour
  });
}

io.on('connection', (socket) => {
  console.log('Joueur connecté :', socket.id);

  socket.on('creer_partie', ({ pseudo }) => {
    const code = genererCode();
    salles[code] = {
      code, joueurs: [{ id: socket.id, pseudo, hote: true }],
      statut: 'attente', phase: null, tour: 0,
      votesNuit: {}, votesJour: {},
      potionVie: true, potionMort: true,
      protegePar: null, dernierProtegeId: null,
      amoureux: [], corbeauCible: null,
    };
    socket.join(code);
    socket.emit('partie_creee', { code, salle: salles[code] });
  });

  socket.on('rejoindre_partie', ({ code, pseudo }) => {
    const salle = salles[code];
    if (!salle) { socket.emit('erreur', { message: 'Salle introuvable !' }); return; }
    if (salle.statut !== 'attente') { socket.emit('erreur', { message: 'Partie déjà commencée !' }); return; }
    if (salle.joueurs.find(j => j.id === socket.id)) return;
    salle.joueurs.push({ id: socket.id, pseudo, hote: false });
    socket.join(code);
    io.to(code).emit('salle_mise_a_jour', salle);
  });

  socket.on('lancer_partie', ({ code }) => {
    const salle = salles[code];
    if (!salle || salle.joueurs[0].id !== socket.id) return;
    salle.joueurs = distribuerRoles(salle.joueurs);
    salle.statut = 'en_cours';
    salle.phase = 'cupidon';
    salle.tour = 1;

    salle.joueurs.forEach(joueur => {
      const loups = salle.joueurs.filter(j => estLoup(j)).map(j => ({ id: j.id, pseudo: j.pseudo }));
      io.to(joueur.id).emit('role_attribue', {
        role: joueur.role,
        loups: estLoup(joueur) ? loups : [],
      });
    });

    io.to(code).emit('partie_lancee', {
      joueurs: salle.joueurs.map(joueurPublic)
    });

    const cupidon = salle.joueurs.find(j => j.role === 'Cupidon');
    if (cupidon) {
      io.to(cupidon.id).emit('action_requise', {
        type: 'cupidon',
        message: 'Choisis deux joueurs à lier par l\'amour !',
        joueurs: salle.joueurs.map(joueurPublic)
      });
    } else {
      demarrerNuit(salle);
    }
  });

  socket.on('action_cupidon', ({ code, cible1Id, cible2Id }) => {
    const salle = salles[code];
    if (!salle) return;
    const joueur = salle.joueurs.find(j => j.id === socket.id);
    if (!joueur || joueur.role !== 'Cupidon') return;
    const cible1 = salle.joueurs.find(j => j.id === cible1Id);
    const cible2 = salle.joueurs.find(j => j.id === cible2Id);
    if (!cible1 || !cible2) return;
    cible1.amoureux = cible2Id;
    cible2.amoureux = cible1Id;
    io.to(cible1Id).emit('tu_es_amoureux', { partenaire: cible2.pseudo });
    io.to(cible2Id).emit('tu_es_amoureux', { partenaire: cible1.pseudo });
    demarrerNuit(salle);
  });

  socket.on('action_voyante', ({ code, cibleId }) => {
    const salle = salles[code];
    if (!salle || salle.phase !== 'nuit') return;
    const voyante = salle.joueurs.find(j => j.id === socket.id && j.role === 'Voyante' && j.vivant);
    if (!voyante) return;
    const cible = salle.joueurs.find(j => j.id === cibleId);
    if (!cible) return;
    socket.emit('resultat_voyante', { pseudo: cible.pseudo, role: cible.role, estLoup: estLoup(cible) });
    salle.voyanteDone = true;
    verifierFinNuit(salle);
  });

  socket.on('action_salvateur', ({ code, cibleId }) => {
    const salle = salles[code];
    if (!salle || salle.phase !== 'nuit') return;
    const salvateur = salle.joueurs.find(j => j.id === socket.id && j.role === 'Salvateur' && j.vivant);
    if (!salvateur) return;
    if (salle.dernierProtegeId === cibleId) {
      socket.emit('erreur_action', { message: 'Tu ne peux pas protéger la même personne deux nuits de suite !' });
      return;
    }
    salle.protegePar = cibleId;
    salle.dernierProtegeId = cibleId;
    salle.salvateurDone = true;
    socket.emit('action_confirmee', { message: '🛡️ Joueur protégé cette nuit !' });
    verifierFinNuit(salle);
  });

  socket.on('action_corbeau', ({ code, cibleId }) => {
    const salle = salles[code];
    if (!salle || salle.phase !== 'nuit') return;
    const corbeau = salle.joueurs.find(j => j.id === socket.id && j.role === 'Corbeau' && j.vivant);
    if (!corbeau) return;
    salle.corbeauCible = cibleId;
    salle.corbeauDone = true;
    socket.emit('action_confirmee', { message: '🐦‍⬛ Suspicion placée !' });
    verifierFinNuit(salle);
  });

  socket.on('action_flutiste', ({ code, cibleId }) => {
    const salle = salles[code];
    if (!salle || salle.phase !== 'nuit') return;
    const flutiste = salle.joueurs.find(j => j.id === socket.id && j.role === 'Joueur de Flûte' && j.vivant);
    if (!flutiste) return;
    const cible = salle.joueurs.find(j => j.id === cibleId);
    if (cible && !cible.ensorcele) cible.ensorcele = true;
    salle.flutisteDone = true;
    socket.emit('action_confirmee', { message: '🪈 Joueur ensorcelé !' });
    verifierFinNuit(salle);
  });

  socket.on('vote_loup', ({ code, cibleId }) => {
    const salle = salles[code];
    if (!salle || salle.phase !== 'nuit') return;
    const voteur = salle.joueurs.find(j => j.id === socket.id);
    if (!voteur || !voteur.vivant || !estLoup(voteur)) return;
    console.log('vote_loup reçu de:', voteur.pseudo, '-> cible:', cibleId);
    salle.votesNuit[socket.id] = cibleId;
    const loupsVivants = salle.joueurs.filter(j => estLoup(j) && j.vivant);
    const tousVote = loupsVivants.length > 0 && loupsVivants.every(l => salle.votesNuit[l.id]);
    if (tousVote) {
      salle.loupsDone = true;
      verifierFinNuit(salle);
    }
  });

  socket.on('action_sorciere', ({ code, action, cibleId }) => {
    const salle = salles[code];
    if (!salle || salle.phase !== 'sorciere') return;
    const sorciere = salle.joueurs.find(j => j.id === socket.id && j.role === 'Sorcière' && j.vivant);
    if (!sorciere) return;
    if (action === 'sauver' && salle.potionVie) {
      salle.victimeNuitSauvee = true;
      salle.potionVie = false;
    } else if (action === 'tuer' && salle.potionMort && cibleId) {
      salle.victimeSorciere = cibleId;
      salle.potionMort = false;
    }
    salle.sorciereDone = true;
    demarrerJour(salle);
  });

  socket.on('passer_sorciere', ({ code }) => {
    const salle = salles[code];
    if (!salle) return;
    demarrerJour(salle);
  });

  socket.on('action_chasseur', ({ code, cibleId }) => {
    const salle = salles[code];
    if (!salle) return;
    const cible = salle.joueurs.find(j => j.id === cibleId);
    if (cible) {
      cible.vivant = false;
      io.to(code).emit('chasseur_tire', { pseudo: cible.pseudo, role: cible.role });
    }
    const fin = verifierFinPartie(salle);
    if (fin.fin) {
      io.to(code).emit('fin_partie', { gagnant: fin.gagnant, joueurs: salle.joueurs });
    } else {
      demarrerJour(salle);
    }
  });

  socket.on('vote_jour', ({ code, cibleId }) => {
    const salle = salles[code];
    if (!salle || salle.phase !== 'jour') return;
    const voteur = salle.joueurs.find(j => j.id === socket.id);
    if (!voteur || !voteur.vivant || voteur.idiotRevele) return;
    salle.votesJour[socket.id] = cibleId;

    if (salle.corbeauCible) {
      salle.votesJour['corbeau_1'] = salle.corbeauCible;
      salle.votesJour['corbeau_2'] = salle.corbeauCible;
    }

    const vivants = salle.joueurs.filter(j => j.vivant && !j.idiotRevele);
    const tousVote = vivants.every(j => salle.votesJour[j.id]);

    if (tousVote) {
      const comptage = {};
      Object.values(salle.votesJour).forEach(id => {
        comptage[id] = (comptage[id] || 0) + 1;
      });
      salle.corbeauCible = null;
      salle.votesJour = {};

      const maxVotes = Math.max(...Object.values(comptage));
      const egaux = Object.keys(comptage).filter(id => comptage[id] === maxVotes);

      if (egaux.length > 1) {
        io.to(code).emit('egalite_vote', { joueurs: salle.joueurs.map(joueurPublic) });
        demarrerNuit(salle);
        return;
      }

      const elimine = salle.joueurs.find(j => j.id === egaux[0]);
      if (!elimine) return;

      if (elimine.role === 'Idiot du Village' && !elimine.idiotRevele) {
        elimine.idiotRevele = true;
        io.to(code).emit('idiot_revele', { pseudo: elimine.pseudo, joueurs: salle.joueurs.map(joueurPublic) });
        demarrerNuit(salle);
        return;
      }

      elimine.vivant = false;

      if (elimine.amoureux) {
        const partenaire = salle.joueurs.find(j => j.id === elimine.amoureux);
        if (partenaire && partenaire.vivant) {
          partenaire.vivant = false;
          io.to(code).emit('amoureux_meurent', { joueur1: elimine.pseudo, joueur2: partenaire.pseudo });
        }
      }

      const fin = verifierFinPartie(salle);
      if (fin.fin) {
        io.to(code).emit('fin_partie', { gagnant: fin.gagnant, joueurs: salle.joueurs });
        return;
      }

      if (elimine.role === 'Chasseur') {
        io.to(code).emit('chasseur_elimine', { pseudo: elimine.pseudo, joueurs: salle.joueurs.map(joueurPublic) });
        io.to(elimine.id).emit('action_requise', {
          type: 'chasseur',
          message: 'Tu es éliminé ! Choisis quelqu\'un à emporter avec toi.',
          joueurs: salle.joueurs.filter(j => j.vivant && j.id !== elimine.id).map(joueurPublic)
        });
        return;
      }

      io.to(code).emit('elimine_jour', { pseudo: elimine.pseudo, role: elimine.role, joueurs: salle.joueurs.map(joueurPublic) });
      demarrerNuit(salle);
    }
  });

  socket.on('message_chat', ({ code, pseudo, message }) => {
    const salle = salles[code];
    if (!salle || !message || message.trim() === '') return;
    if (message.length > 200) return;
    const msg = {
      pseudo, message: message.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      id: Date.now()
    };
    io.to(code).emit('nouveau_message', msg);
  });

  socket.on('disconnect', () => {
    for (const code in salles) {
      salles[code].joueurs = salles[code].joueurs.filter(j => j.id !== socket.id);
      if (salles[code].joueurs.length === 0) {
        delete salles[code];
      } else {
        io.to(code).emit('salle_mise_a_jour', salles[code]);
      }
    }
    console.log('Joueur déconnecté :', socket.id);
  });
});

server.listen(4000, () => {
  console.log('Serveur lancé sur http://localhost:4000');
});