import { Howl, Howler } from 'howler';

Howler.volume(0.7);

const sons = {
  nuit: new Howl({ src: ['/sounds/nuit.mp3'], loop: true, volume: 0.4 }),
  jour: new Howl({ src: ['/sounds/jour.mp3'], loop: true, volume: 0.4 }),
  loup: new Howl({ src: ['/sounds/loup.mp3'], volume: 0.8 }),
  mort: new Howl({ src: ['/sounds/mort.mp3'], volume: 0.9 }),
  vote: new Howl({ src: ['/sounds/vote.mp3'], volume: 0.7 }),
  voyante: new Howl({ src: ['/sounds/voyante.mp3'], volume: 0.8 }),
  victoire: new Howl({ src: ['/sounds/victoire.mp3'], volume: 0.9 }),
  defaite: new Howl({ src: ['/sounds/defaite.mp3'], volume: 0.9 }),
};

let ambianceCourante = null;

export function jouerAmbiance(type) {
  // Arrête l'ambiance en cours
  if (ambianceCourante) {
    sons[ambianceCourante].fade(0.4, 0, 1500);
    setTimeout(() => sons[ambianceCourante]?.stop(), 1500);
  }
  ambianceCourante = type;
  sons[type].play();
  sons[type].fade(0, 0.4, 1500);
}

export function jouerSon(type) {
  if (sons[type]) sons[type].play();
}

export function stopperTout() {
  Object.values(sons).forEach(s => s.stop());
  ambianceCourante = null;
}
export function narrer(texte) {
  if (!window.speechSynthesis) return;
  
  // Annule la narration en cours
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(texte);
  
  // Paramètres pour une voix glauque
  utterance.lang = 'fr-FR';
  utterance.rate = 0.75;   // Lent et pesant
  utterance.pitch = 0.3;   // Très grave
  utterance.volume = 0.9;

  // Choisit la voix la plus grave disponible
  const voix = window.speechSynthesis.getVoices();
  const voixFR = voix.filter(v => v.lang.startsWith('fr'));
  if (voixFR.length > 0) {
    utterance.voice = voixFR[voixFR.length - 1];
  }

  window.speechSynthesis.speak(utterance);
}