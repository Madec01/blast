// Le run : enchaînement des salles, compétences, sérialisation. API publique : docs/CONTRATS.md §3.
import { creerRng, seedDepuis } from './rng.js';
import { creerBus } from './hooks.js';
import { creerGrille, groupe, estTapable, existeCoup, nouvelleBille, nouvellePierre, nouvelElement, idx, coord } from './grille.js';
import { retomber, detruire, jouerRotation, jouerTap, jouerRotationJoueur, verifierNiveau, verifierFin, majSeuilsXp, remplirFile } from './tour.js';
import { appliquerEffet, retirerEffet, relancer, SEUILS_NIVEAU, NIVEAU_MAX } from './progression.js';
import { SALLES, ORDRE_PHASE1, MODES_GRAVITE, MODE_GRAVITE_DEFAUT, ROTATION_HORS_JAUGE } from '../data/salles.js';
import { apercuRotation } from './apercu.js';
import { COMPETENCES, POIDS_RARETE } from '../data/competences.js';

const VERSION = 2; // 2 : mode de gravité (D12), la rotation à jauge vide coûte un coup (D13)

function creerCtx(etat, rng) {
  const bus = creerBus();
  const ctx = {
    etat, rng, bus, evenements: [], activesCeTour: new Set(),
    get grille() { return etat.grille; },
    get memo() { return etat.memo; },
    emettre(evt) { ctx.evenements.push(evt); },
    nb(id) { return etat.competences.filter((c) => c === id).length; },
    retomber(options) { retomber(ctx, options); },
    detruire(indices, cause) { detruire(ctx, indices, cause); },
    tourner(sens, options) { return jouerRotation(ctx, sens, options); },
    retirerEffet(id) { retirerEffet(ctx, id); },
  };
  return ctx;
}

function installerCompetences(ctx) {
  for (const id of new Set(ctx.etat.competences)) {
    const c = COMPETENCES.find((x) => x.id === id);
    if (c) c.installer(ctx);
  }
}

/** Grille de départ : billes aléatoires, éléments et pierres placés au hasard, au moins un groupe tapable. */
function genererGrille(ctx, def) {
  const e = ctx.etat;
  for (let essai = 0; essai < 20; essai++) {
    const g = creerGrille(def.grille.w, def.grille.h);
    for (let i = 0; i < g.cellules.length; i++) g.cellules[i] = nouvelleBille(g, ctx.rng.entier(e.couleurs));
    const libres = ctx.rng.melanger([...Array(g.cellules.length).keys()]);
    for (const el of def.elements ?? []) {
      for (let k = 0; k < el.n && libres.length; k++) {
        const i = libres.pop();
        if (el.type === 'pierre') g.cellules[i] = nouvellePierre(g);
        else if (el.type === 'bulle') g.cellules[i] = nouvelElement(g, 'bulle', { contenu: nouvelleBille(g, ctx.rng.entier(e.couleurs)) });
        else g.cellules[i] = nouvelElement(g, el.type);
      }
    }
    if (existeCoup(g)) return g;
  }
  return creerGrille(def.grille.w, def.grille.h);
}

function entrerSalle(ctx, index) {
  const e = ctx.etat;
  const def = SALLES.find((s) => s.id === e.ordre[index]);
  // Les effets de la salle précédente sont retirés ; les compétences restent.
  for (const a of e.effetsActifs) ctx.bus.off('effet:' + a.id);
  e.effetsActifs = []; e.effetsVus = [];
  e.salleIndex = index;
  e.salle = { id: def.id, nom: def.nom, type: def.type, desc: def.desc, index, total: e.ordre.length, regles: def.regles ?? {} };
  e.couleurs = e.options.couleurs ?? def.couleurs;
  const mode = e.options.gravite ?? def.regles?.gravite ?? MODE_GRAVITE_DEFAUT;
  e.modeGravite = MODES_GRAVITE[mode] ? mode : MODE_GRAVITE_DEFAUT;
  e.gravite = 0; e.tour = 0; e.xpSalle = 0; e.niveau = 1; majSeuilsXp(e);
  e.memo.sansFilet = false; // « Mise en jeu » ne dure qu'une salle
  e.relanceGratuite = true; // D19 : une relance de cartes gratuite par salle
  e.coupsMax = ctx.bus.reduire('coupsInitiaux', Math.max(5, Math.round(def.coups / e.difficulte)), ctx, { salle: def });
  if (e.memo.dette) { e.coupsMax = Math.max(1, e.coupsMax - e.memo.dette); e.memo.dette = 0; } // « Dette » : payée ici, même après rechargement
  e.coups = e.coupsMax;
  e.jaugeMax = ctx.bus.reduire('jaugeInitiale', e.options.jauge ?? def.jauge ?? 3, ctx, { salle: def });
  e.jauge = e.jaugeMax;
  e.objectif = { type: def.objectif.type, cible: Math.round(def.objectif.cible * e.difficulte), progres: 0 };
  if (def.objectif.type === 'couleur') e.objectif.couleur = ctx.rng.entier(e.couleurs);
  e.prochainesEntrees = [];
  e.grille = genererGrille(ctx, def);
  remplirFile(ctx); // la file est connue dès l'entrée (Prévoyance, aperçu de rotation)
  e.annonce = def.regles?.rotationAuto ? (def.regles.rotationAuto === 'pendule' ? { sens: 1 } : { sens: ctx.rng.choix([-1, 1, 2]) }) : null;
  e.enAttente = null;
  ctx.activesCeTour.clear();
  ctx.emettre({ t: 'salle', index, nom: def.nom });
  if (index === 0 && e.modeGravite === 'collante') ctx.emettre({ t: 'message', texte: 'Les trous restent : tourne le plateau pour tout faire retomber' });
  if (index === 0 && e.modeGravite === 'vide') ctx.emettre({ t: 'message', texte: 'Tourne pour regrouper les gemmes et déclencher des cascades' });
  ctx.emettre({ t: 'coups', coups: e.coups, jauge: e.jauge });
  ctx.emettre({ t: 'objectif', progres: 0, cible: e.objectif.cible, atteint: false });
  ctx.bus.emettre('debutSalle', ctx, { salle: def });
}

function proposerCompetences(ctx, n = 3) {
  const e = ctx.etat;
  const pool = COMPETENCES.filter((c) => {
    const nb = ctx.nb(c.id);
    if (!nb) return true;
    if (c.stackable === true) return true;
    if (typeof c.stackable === 'number') return nb < c.stackable;
    return false;
  });
  const choisies = [];
  while (choisies.length < n && pool.length) {
    const total = pool.reduce((s, c) => s + POIDS_RARETE[c.rarete], 0);
    let r = ctx.rng.suivant() * total, k = 0;
    while (k < pool.length - 1 && (r -= POIDS_RARETE[pool[k].rarete]) > 0) k++;
    choisies.push(pool.splice(k, 1)[0]);
  }
  return choisies.map((c) => ({ id: c.id, nom: c.nom, desc: c.desc, rarete: c.rarete }));
}

function finirRun(ctx, victoire) {
  const e = ctx.etat;
  const monnaieMeta = Math.floor((e.xpTotale / 100) * (victoire ? 1.5 : 1));
  e.stats.fin = Date.now();
  e.enAttente = { type: 'finRun', victoire, xpTotale: e.xpTotale, monnaieMeta, salleIndex: e.salleIndex, stats: e.stats, competences: e.competences.slice(), totalSalles: e.ordre.length };
  ctx.emettre({ t: 'finRun', victoire });
}

function choisir(ctx, id) {
  const e = ctx.etat, att = e.enAttente;
  if (!att) return false;
  switch (att.type) {
    case 'niveau': {
      if (!att.propositions.some((p) => p.id === id)) return false;
      e.enAttente = null;
      e.stats.effets.push(id);
      appliquerEffet(ctx, id);
      verifierNiveau(ctx);
      verifierFin(ctx);
      return true;
    }
    case 'competence': {
      if (id !== null && !att.propositions.some((p) => p.id === id)) return false;
      e.enAttente = null;
      if (id) {
        e.competences.push(id);
        const c = COMPETENCES.find((x) => x.id === id);
        if (ctx.nb(id) === 1) c.installer(ctx);
        ctx.emettre({ t: 'competence', id, nom: c.nom });
      }
      entrerSalle(ctx, e.salleIndex + 1);
      return true;
    }
    case 'finSalle': {
      e.enAttente = null;
      if (!att.victoire) { finirRun(ctx, false); return true; }
      if (e.salleIndex + 1 >= e.ordre.length) { finirRun(ctx, true); return true; }
      e.enAttente = { type: 'competence', propositions: proposerCompetences(ctx) };
      return true;
    }
    default: return false;
  }
}

function envelopper(ctx) {
  const e = ctx.etat;
  const collecter = (fn) => { ctx.evenements = []; fn(); const ev = ctx.evenements; ctx.evenements = []; e.rngEtat = ctx.rng.etat; return ev; };
  const run = {
    get etat() { return e; },
    tap(x, y) { return collecter(() => jouerTap(ctx, x, y)); },
    tourner(sens) { return collecter(() => jouerRotationJoueur(ctx, sens)); },
    choisir(id) { return collecter(() => choisir(ctx, id)); },
    relancer() { return collecter(() => relancer(ctx)); },
    groupeA(x, y) {
      const g = e.grille, i = idx(g, x, y);
      if (x < 0 || x >= g.w || y < 0 || y >= g.h || !estTapable(g, i)) return [];
      return groupe(g, i).map((k) => { const [cx, cy] = coord(g, k); return { x: cx, y: cy }; });
    },
    peutTaper(x, y) { return !e.enAttente && e.coups > 0 && x >= 0 && x < e.grille.w && y >= 0 && y < e.grille.h && estTapable(e.grille, idx(e.grille, x, y)); },
    peutTourner(sens = 1) {
      if (e.enAttente || ![1, -1, 2].includes(sens)) return false;
      const cout = ctx.bus.reduire('coutRotation', 1, ctx, { sens });
      return cout <= e.jauge || (ROTATION_HORS_JAUGE === 'coup' && e.coups >= cout);
    },
    /** Aperçu d'une rotation sans jouer : { sens, gravite, deplacements, entrees, eclatent } ou null. */
    apercuRotation(sens) { return e.enAttente ? null : apercuRotation(e, sens); },
    serialiser() { e.rngEtat = ctx.rng.etat; return JSON.stringify({ version: VERSION, etat: e }); },
    /** Événements de démarrage (salle initiale) à jouer une fois par l'appelant. */
    evenementsInitiaux: [],
    ctx,
  };
  return run;
}

/**
 * Crée un run. options : { couleurs, jauge, gravite } pour le mode Test (gravite : clé de MODES_GRAVITE).
 * salles : liste d'ids (défaut : ORDRE_PHASE1).
 */
export function creerRun({ seed = Date.now(), salles = null, competences = [], difficulte = 1, options = {} } = {}) {
  if (!Array.isArray(salles ?? ORDRE_PHASE1) || !(salles ?? ORDRE_PHASE1).length || (salles ?? ORDRE_PHASE1).some((id) => !SALLES.some((s) => s.id === id))) throw new Error('Liste de salles invalide');
  if (!Number.isFinite(difficulte) || difficulte <= 0 || difficulte > 5) throw new Error('Difficulté invalide');
  if (!options || typeof options !== 'object' || (options.couleurs != null && (!Number.isInteger(options.couleurs) || options.couleurs < 2 || options.couleurs > 6))) throw new Error('Options invalides');
  if (!Array.isArray(competences) || competences.some((id) => !COMPETENCES.some((c) => c.id === id))) throw new Error('Compétences invalides');
  if (options.jauge != null && (!Number.isInteger(options.jauge) || options.jauge < 0 || options.jauge > 100)) throw new Error('Jauge invalide');
  if (options.cascadeMin != null && (!Number.isInteger(options.cascadeMin) || options.cascadeMin < 2 || options.cascadeMin > 80)) throw new Error('Seuil de cascade invalide');
  options = { cascades: 'rotation', cascadeMin: 6, secours: true, ...options };
  const s = seedDepuis(seed);
  const rng = creerRng(s);
  const etat = {
    version: VERSION, seed: s, rngEtat: s, ordre: salles ?? ORDRE_PHASE1.slice(), difficulte, options,
    salleIndex: 0, salle: null, grille: null, gravite: 0,
    coups: 0, coupsMax: 0, jauge: 0, jaugeMax: 0, tour: 0,
    xpSalle: 0, niveau: 1, xpTotale: 0, couleurs: 5, modeGravite: MODE_GRAVITE_DEFAUT,
    objectif: null, competences: competences.slice(), effetsActifs: [], effetsVus: [],
    prochainesEntrees: [], annonce: null, enAttente: null, memo: {}, elan: false, pitie: 0, relanceGratuite: true,
    stats: { debut: Date.now(), taps: 0, rotations: 0, rotationsProductives: 0, chaineMax: 0, plusGrosGroupe: 0, billesDetruites: 0, etoilesLiberees: 0, xpFinale: 0, speciales: { bombe: 0, ligne: 0, croix: 0, couleur: 0 }, effets: [], salles: [] },
  };
  const ctx = creerCtx(etat, rng);
  installerCompetences(ctx);
  ctx.evenements = [];
  entrerSalle(ctx, 0);
  const run = envelopper(ctx);
  run.evenementsInitiaux = ctx.evenements.slice();
  ctx.evenements = [];
  return run;
}

/** Rejeter une sauvegarde tronquée avant d'installer des hooks ou d'afficher le plateau. */
function sauvegardeValide(e) {
  if (!e || !Array.isArray(e.ordre) || !e.ordre.length || e.ordre.some((id) => !SALLES.some((s) => s.id === id))) return false;
  if (!Number.isInteger(e.salleIndex) || e.salleIndex < 0 || e.salleIndex >= e.ordre.length || e.salle?.id !== e.ordre[e.salleIndex]) return false;
  const g = e.grille;
  if (!g || !Number.isInteger(g.w) || !Number.isInteger(g.h) || g.w < 1 || g.h < 1 || g.w > 30 || g.h > 30) return false;
  if (!Array.isArray(g.cellules) || g.cellules.length !== g.w * g.h || !Array.isArray(g.forme) || g.forme.length !== g.cellules.length || g.forme.some((v) => v !== 0 && v !== 1)) return false;
  const ids = new Set();
  const celluleValide = (c) => {
    if (c === null) return true;
    if (!c || !Number.isInteger(c.id) || c.id < 1 || ids.has(c.id) || !['bille', 'pierre', 'element'].includes(c.type)) return false;
    ids.add(c.id);
    if (c.type === 'bille' && (!Number.isInteger(c.couleur) || c.couleur < 0 || c.couleur > 5 || ![null, undefined, 'bombe', 'ligne', 'croix', 'couleur', 'magnet'].includes(c.speciale))) return false;
    if (c.type === 'element' && (!c.element || !['bulle', 'ballon', 'fusee'].includes(c.element.type))) return false;
    return !c.element?.contenu || celluleValide(c.element.contenu);
  };
  if (!g.cellules.every(celluleValide) || !Number.isInteger(g.prochainId) || [...ids].some((id) => id >= g.prochainId)) return false;
  if (!['seed', 'rngEtat', 'coups', 'coupsMax', 'jauge', 'jaugeMax', 'tour', 'xpSalle', 'xpTotale', 'niveau', 'couleurs'].every((k) => Number.isFinite(e[k]) && e[k] >= 0)) return false;
  if (!Number.isInteger(e.gravite) || e.gravite < 0 || e.gravite > 3 || !MODES_GRAVITE[e.modeGravite]) return false;
  if (!e.objectif || !Number.isFinite(e.objectif.cible) || !Number.isFinite(e.objectif.progres) || !e.memo || !e.options) return false;
  if (!Array.isArray(e.competences) || e.competences.some((id) => !COMPETENCES.some((c) => c.id === id)) || !Array.isArray(e.effetsActifs) || !Array.isArray(e.effetsVus) || !Array.isArray(e.prochainesEntrees)) return false;
  if (e.enAttente && (!['niveau', 'competence', 'finSalle', 'finRun'].includes(e.enAttente.type) || (['niveau', 'competence'].includes(e.enAttente.type) && !Array.isArray(e.enAttente.propositions)))) return false;
  return !e.stats || (e.stats.speciales && Array.isArray(e.stats.effets) && Array.isArray(e.stats.salles));
}

export function chargerRun(json) {
  let data;
  try { data = JSON.parse(typeof json === 'string' ? json : JSON.stringify(json)); } catch { return null; }
  if (!data || data.version !== VERSION) return null;
  try {
  if (!sauvegardeValide(data.etat)) return null;
  const etat = data.etat;
  // Les anciennes parties conservent leurs règles jusqu'au prochain run.
  etat.options = { cascades: false, secours: false, ...etat.options };
  etat.relanceGratuite ??= true; // sauvegardes antérieures à D19
  etat.stats ??= { debut: Date.now(), taps: 0, rotations: 0, chaineMax: 0, plusGrosGroupe: 0, billesDetruites: 0, etoilesLiberees: 0, speciales: { bombe: 0, ligne: 0, croix: 0, couleur: 0 }, effets: [], salles: [] };
  etat.stats.rotationsProductives ??= 0; // sauvegardes antérieures à F09
  etat.stats.xpFinale ??= 0; // sauvegardes antérieures à F07
  const rng = creerRng(etat.seed); rng.etat = etat.rngEtat;
  const ctx = creerCtx(etat, rng);
  installerCompetences(ctx);
  for (const a of etat.effetsActifs) appliquerEffet(ctx, a.id, { reprise: true, restant: a.restant });
  ctx.evenements = [];
  return envelopper(ctx);
  } catch { return null; } // hooks impossibles à restaurer : sauvegarde inutilisable
}

export { SEUILS_NIVEAU, NIVEAU_MAX };
