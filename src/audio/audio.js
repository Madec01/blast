// Moteur audio de VERTIGE (docs/CONTRATS.md §6) — Web Audio, synthèse en couches.
// Ambiance « jouet en bois et billes de verre sur papier » : aucun son 8-bit/chiptune.
// Tout est généré (oscillateurs désaccordés, bruit blanc filtré, réverb à convolution
// avec réponse impulsionnelle synthétisée) : aucun fichier, aucune bibliothèque, aucun réseau.
//
// Graphe audio :
//   voix -> busSec ------------------------\
//   voix -> busReverbSend -> convolver -----+--> compresseur -> gainVolume -> gainMuet -> destination
//
// Chaque son est une « voix » temporaire (voir synth.js) : ses noeuds sont déconnectés
// dès la fin de son enveloppe, et la polyphonie est plafonnée à 24 voix simultanées
// (la plus ancienne est coupée proprement — fondu de 20 ms — quand la limite est atteinte).

import * as synth from './synth.js';

const POLYPHONIE_MAX = 24;

let contexte = null;        // AudioContext, créé au premier appel de init()
let busSec = null;          // GainNode : chemin direct (sans réverb)
let busReverbSend = null;   // GainNode : départ vers la réverb (~20 % du mix)
let convolver = null;       // ConvolverNode : réponse impulsionnelle générée
let compresseur = null;     // DynamicsCompressorNode sur le bus master
let gainVolume = null;      // GainNode : volume utilisateur (0..1)
let gainMuet = null;        // GainNode : 0 si muet, 1 sinon

let volumeCourant = 0.8;
let estMuetCourant = false;
const reglages = { effets: true, musique: false, vibrations: true };
let enPause = false;
let minuteurMusique = null;
let pasMusique = 0;
let derniereVibration = 0;
let voixActives = [];       // voix en cours, de la plus ancienne à la plus récente

// --- Cycle de vie du contexte ------------------------------------------------

// Crée l'AudioContext au premier geste utilisateur. Idempotent : un second appel
// se contente de reprendre le contexte s'il est suspendu (politique d'autoplay).
function estCache() {
  return typeof document !== 'undefined' && document.hidden;
}

function init() {
  if (!contexte) {
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try {
      contexte = new AC();
      construireGraphe();
    } catch (_) { contexte = null; return; }
  }
  if (enPause || estCache()) return;
  if (contexte.state === 'suspended') {
    try {
      Promise.resolve(contexte.resume()).then(() => {
        if (enPause || estCache()) suspendre();
        else synchroniserMusique();
      }).catch(() => {});
    } catch (_) { /* navigateur ne permettant pas encore la reprise */ }
  } else synchroniserMusique();
}

function configurer(options = {}) {
  for (const cle of Object.keys(reglages)) {
    if (typeof options[cle] === 'boolean') reglages[cle] = options[cle];
  }
  if (!reglages.effets) voixActives.filter(v => v.canal === 'effets').forEach(couperVoix);
  if (!reglages.vibrations) vibrer(0);
  synchroniserMusique();
  return { ...reglages };
}

function vibrer(motif) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(motif);
  } catch (_) { /* retour haptique facultatif */ }
}

function retourHaptique(nom, params) {
  if (!reglages.vibrations || enPause || estCache()) return;
  const motifs = { speciale: 18, victoire: [20, 55, 30], bonAngle: 12, competence: 20 };
  const motif = motifs[nom] || (nom === 'detruit' && (params.taille >= 8 || params.cause === 'bombe') ? 15 : 0);
  const maintenant = Date.now();
  if (motif && maintenant - derniereVibration > 100) {
    derniereVibration = maintenant;
    vibrer(motif);
  }
}

// Une phrase originale, lente et pentatonique. Deux notes peuvent se recouvrir ;
// aucune piste distante, aucun chargement, aucun minuteur en arrière-plan.
function jouerPasMusique() {
  if (!contexte || contexte.state !== 'running' || enPause || estCache() || !reglages.musique || estMuetCourant) return;
  const notes = [0, 7, 12, 4, 9, 7, 4, 2, 0, 7, 14, 12, 9, 4, 7, 2];
  const t = contexte.currentTime;
  const sortie = contexte.createGain();
  sortie.gain.setValueAtTime(0.0001, t);
  sortie.gain.exponentialRampToValueAtTime(0.035, t + 0.22);
  sortie.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
  const note = contexte.createOscillator();
  note.type = 'sine';
  note.frequency.value = 220 * Math.pow(2, notes[pasMusique++ % notes.length] / 12);
  note.connect(sortie);
  note.start(t);
  note.stop(t + 2.9);
  jouerVoix({ sortie, noeuds: [note, sortie], duree: 3 }, 'musique');
  minuteurMusique = setTimeout(() => {
    minuteurMusique = null;
    jouerPasMusique();
  }, 1800);
}

function synchroniserMusique() {
  const active = contexte && contexte.state === 'running' && reglages.musique && !enPause && !estCache() && !estMuetCourant;
  if (!active) {
    clearTimeout(minuteurMusique);
    minuteurMusique = null;
    voixActives.filter(v => v.canal === 'musique').forEach(couperVoix);
  } else if (minuteurMusique === null) jouerPasMusique();
}

function suspendre() {
  clearTimeout(minuteurMusique);
  minuteurMusique = null;
  // Nettoyage immédiat : un contexte suspendu ne fait plus avancer les enveloppes.
  for (const voix of [...voixActives]) {
    clearTimeout(voix.minuteur);
    voix.actif = false;
    nettoyerVoix(voix);
  }
  vibrer(0);
  if (contexte && contexte.state === 'running') {
    try { Promise.resolve(contexte.suspend()).catch(() => {}); } catch (_) {}
  }
}

function pause() { enPause = true; suspendre(); }
function reprendre() { enPause = false; if (contexte) init(); }

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (estCache()) suspendre();
    else if (!enPause && contexte) init();
  });
}

// Construit le bus master une seule fois : deux départs (sec / réverb), un
// convolveur avec réponse impulsionnelle synthétisée, un compresseur, puis le
// volume utilisateur et le mute.
function construireGraphe() {
  busSec = contexte.createGain();
  busSec.gain.value = 1;

  busReverbSend = contexte.createGain();
  busReverbSend.gain.value = 0.2; // réverb mixée à ~20 %

  convolver = contexte.createConvolver();
  convolver.buffer = synth.creerReponseImpulsionnelle(contexte, 1.2, 3.2);
  convolver.normalize = true;

  compresseur = contexte.createDynamicsCompressor();
  compresseur.threshold.value = -18;
  compresseur.knee.value = 20;
  compresseur.ratio.value = 3;
  compresseur.attack.value = 0.003;
  compresseur.release.value = 0.25;

  gainVolume = contexte.createGain();
  gainVolume.gain.value = volumeCourant;

  gainMuet = contexte.createGain();
  gainMuet.gain.value = estMuetCourant ? 0 : 1;

  busSec.connect(compresseur);
  busReverbSend.connect(convolver);
  convolver.connect(compresseur);
  compresseur.connect(gainVolume);
  gainVolume.connect(gainMuet);
  gainMuet.connect(contexte.destination);
}

// --- Réglages -----------------------------------------------------------------

// Volume général, 0..1.
function volume(v) {
  if (!Number.isFinite(v)) return;
  volumeCourant = Math.min(1, Math.max(0, v));
  if (gainVolume) gainVolume.gain.setTargetAtTime(volumeCourant, contexte.currentTime, 0.01);
}

// Coupe ou rétablit le son (le volume réglé est conservé).
function muet(b) {
  estMuetCourant = !!b;
  if (gainMuet) gainMuet.gain.setTargetAtTime(estMuetCourant ? 0 : 1, contexte.currentTime, 0.01);
  synchroniserMusique();
}

function estMuet() { return estMuetCourant; }

// --- Gestion des voix (polyphonie ≤ 24, nettoyage sans fuite) ----------------

// Connecte la voix au bus master et l'enregistre ; coupe la plus ancienne voix si
// la polyphonie maximale est atteinte, puis programme son propre nettoyage.
function jouerVoix({ sortie, noeuds, duree }, canal = 'effets') {
  if (voixActives.length >= POLYPHONIE_MAX) {
    couperVoix(voixActives.shift());
  }
  sortie.connect(busSec);
  sortie.connect(busReverbSend);
  const voix = { sortie, noeuds, canal, actif: true, minuteur: null };
  voix.minuteur = setTimeout(() => terminerVoix(voix), Math.ceil(duree * 1000) + 80);
  voixActives.push(voix);
}

// Coupe une voix immédiatement (fondu de 20 ms pour éviter tout clic), puis nettoie.
function couperVoix(voix) {
  if (!voix || !voix.actif) return;
  voix.actif = false;
  clearTimeout(voix.minuteur);
  try {
    const maintenant = contexte.currentTime;
    voix.sortie.gain.cancelScheduledValues(maintenant);
    voix.sortie.gain.setValueAtTime(voix.sortie.gain.value, maintenant);
    voix.sortie.gain.linearRampToValueAtTime(0, maintenant + 0.02);
  } catch (e) { /* contexte déjà fermé : rien à faire */ }
  setTimeout(() => nettoyerVoix(voix), 40);
}

// Fin naturelle de l'enveloppe : la voix est déjà silencieuse, il suffit de nettoyer.
function terminerVoix(voix) {
  if (!voix.actif) return;
  voix.actif = false;
  nettoyerVoix(voix);
}

// Déconnecte tous les noeuds de la voix (aucune fuite) et la retire de la liste.
function nettoyerVoix(voix) {
  voix.noeuds.forEach((n) => {
    try { if (typeof n.stop === 'function') n.stop(); } catch (e) { /* déjà arrêté */ }
    try { n.disconnect(); } catch (e) { /* déjà déconnecté */ }
  });
  const i = voixActives.indexOf(voix);
  if (i !== -1) voixActives.splice(i, 1);
}

// --- Répertoire des sons --------------------------------------------------

const FABRIQUES = {
  tap: synth.construireTap,
  detruit: synth.construireDetruit,
  speciale: synth.construireSpeciale,
  bonAngle: synth.construireBonAngle, // F09 : rotation productive
  rotation: synth.construireRotation,
  chute: synth.construireChute,
  rebond: synth.construireRebond,
  element: synth.construireElement,
  niveau: synth.construireNiveau,
  competence: synth.construireCompetence,
  victoire: synth.construireVictoire,
  echec: synth.construireEchec,
  ui: synth.construireUi,
  erreur: synth.construireErreur,
};

// Joue un son par son nom. Ne fait rien (sans erreur) si init() n'a pas encore
// été appelé, si le nom est inconnu, ou si la synthèse échoue pour une raison
// quelconque — un son ne doit jamais interrompre le jeu.
function jouer(nom, params = {}) {
  if (enPause || estCache()) return;
  retourHaptique(nom, params);
  if (!contexte || contexte.state !== 'running' || !reglages.effets || estMuetCourant) return;
  const fabrique = FABRIQUES[nom];
  if (!fabrique) return;
  let construction;
  try {
    construction = fabrique(contexte, params);
  } catch (e) {
    return;
  }
  if (construction) jouerVoix(construction);
}

export const audio = { init, jouer, volume, muet, estMuet, configurer, pause, reprendre };
