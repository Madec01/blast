// Un tour de jeu : tap ou rotation → destructions → chute → remplissage → règles de salle → niveau → objectif.
import { idx, coord, groupe, estTapable, existeCoup, nouvelleBille, nouvellePierre, nouvelElement, compter } from './grille.js';
import { tourner as tournerGravite, colonnes, vecteur } from './gravite.js';
import { appliquerGravite, remplir, maree, renforcer } from './chute.js';
import { resoudre } from './speciales.js';
import { monteeBallons } from './elements.js';
import { SEUILS, ORDRE_SPECIALES } from '../data/speciales.js';
import { RECHARGE_JAUGE, MODES_GRAVITE, ROTATION_HORS_JAUGE, RENFORT, BONUS_ELAN } from '../data/salles.js';
import { SEUILS_NIVEAU, NIVEAU_MAX, proposerEffets, attenteNiveau, expirerEffets } from './progression.js';

/** File des prochaines entrées : couleurs pré-tirées (visibles avec Prévoyance et dans l'aperçu de rotation). */
export function remplirFile(ctx) {
  const f = ctx.etat.prochainesEntrees;
  while (f.length < 24) f.push(ctx.rng.entier(ctx.etat.couleurs));
  return f;
}
export function tirerEntree(ctx) {
  return nouvelleBille(ctx.grille, remplirFile(ctx).shift());
}

function emettreCoups(ctx) { ctx.emettre({ t: 'coups', coups: ctx.etat.coups, jauge: ctx.etat.jauge }); }

/**
 * Chute puis remplissage, selon le mode de gravité de la salle (MODES_GRAVITE, D12).
 * `rotation` : le tour est une rotation — tout retombe et se remplit quel que soit le mode.
 * Utilisée par le tour et par les effets qui trouent la grille.
 */
export function retomber(ctx, { rotation = false } = {}) {
  const g = ctx.grille, gr = ctx.etat.gravite;
  const mode = MODES_GRAVITE[ctx.etat.modeGravite] ?? MODES_GRAVITE.continue;
  if (rotation || mode.chuteAuTap) {
    const dep = appliquerGravite(g, gr);
    if (dep.length) ctx.emettre({ t: 'chute', deplacements: dep });
    ctx.bus.emettre('apresChute', ctx, { deplacements: dep });
  }
  if ((rotation && mode.remplissageRotation !== false) || mode.remplissageAuTap) {
    const entrees = remplir(g, gr, () => tirerEntree(ctx));
    if (entrees.length) { ctx.emettre({ t: 'remplissage', cellules: entrees }); ctx.bus.emettre('remplissage', ctx, { cellules: entrees }); }
  }
}

/** Une rotation (n'importe laquelle) ferait-elle apparaître un groupe tapable ? Simulé sur une copie. */
export function rotationUtile(ctx) {
  const g = ctx.grille;
  for (const sens of [1, -1, 2]) {
    const copie = { w: g.w, h: g.h, forme: g.forme, cellules: g.cellules.slice(), prochainId: g.prochainId };
    appliquerGravite(copie, tournerGravite(ctx.etat.gravite, sens));
    if (existeCoup(copie)) return true;
  }
  return false;
}

export function detruire(ctx, indices, cause = 'effet') {
  resoudre(ctx, { cellules: indices, cause, origine: null, profondeur: 0 });
}

/** Rotation du plateau. Renvoie false si refusée. options : {gratuit, auto}. */
export function jouerRotation(ctx, sens, options = {}) {
  const e = ctx.etat;
  const cout = options.gratuit || options.auto ? 0 : ctx.bus.reduire('coutRotation', 1, ctx, { sens });
  let enCoups = 0;
  if (cout > e.jauge) {
    // Jauge vide : la rotation se paie en coups (D13), pour ne jamais bloquer le joueur en gravité collante.
    if (ROTATION_HORS_JAUGE !== 'coup' || e.coups < cout) return false;
    enCoups = cout;
  }
  ctx.bus.emettre('avantRotation', ctx, { sens, auto: !!options.auto });
  const de = e.gravite;
  e.gravite = tournerGravite(e.gravite, sens);
  ctx.emettre({ t: 'rotation', de, vers: e.gravite, sens, auto: !!options.auto, enCoups });
  if (!options.auto && !options.gratuit) e.stats.rotations++;
  if (enCoups) { e.coups -= enCoups; emettreCoups(ctx); ctx.emettre({ t: 'message', texte: 'Jauge vide : la rotation coûte un coup' }); }
  else if (cout) { e.jauge -= cout; emettreCoups(ctx); }
  monteeBallons(ctx);
  if (!options.auto) e.elan = true; // le prochain tap profite de l'élan
  ctx.bus.emettre('apresRotation', ctx, { sens, auto: !!options.auto });
  return true;
}

function typeSpecialePour(ctx, taille) {
  const seuils = ctx.bus.reduire('seuils', { ...SEUILS }, ctx, { taille });
  const te = ctx.bus.reduire('tailleGroupe', taille, ctx, { taille });
  for (const t of ORDRE_SPECIALES) if (te >= seuils[t]) return t;
  return null;
}

/** Tap du joueur en (x,y). Renvoie false si refusé. */
export function jouerTap(ctx, x, y) {
  const e = ctx.etat, g = ctx.grille;
  if (e.enAttente || e.coups <= 0) return false;
  const i = idx(g, x, y);
  if (!estTapable(g, i)) return false;
  const c = g.cellules[i];
  ctx.bus.emettre('avantTap', ctx, { i, x, y, couleur: c.couleur });
  const gr = groupe(g, i), taille = gr.length;
  e.stats.taps++; if (taille > e.stats.plusGrosGroupe) e.stats.plusGrosGroupe = taille;
  ctx.emettre({ t: 'tap', x, y, taille, couleur: c.couleur, elan: !!e.elan });
  let type = c.speciale ? null : typeSpecialePour(ctx, taille);
  if (type) type = ctx.bus.reduire('typeSpeciale', type, ctx, { taille });
  resoudre(ctx, { cellules: type ? gr.filter((k) => k !== i) : gr, cause: 'groupe', origine: { x, y }, profondeur: 0, couleur: c.couleur, tapee: type ? i : undefined });
  if (type) {
    c.speciale = type; c.rayon = 1;
    e.stats.speciales[type] = (e.stats.speciales[type] ?? 0) + 1;
    ctx.emettre({ t: 'speciale', x, y, id: c.id, type });
    ctx.bus.emettre('specialeCreee', ctx, { i, type, taille });
  }
  if (e.elan) { e.elan = false; ctx.emettre({ t: 'message', texte: 'Élan : +20 % d’XP' }); }
  if (taille >= RECHARGE_JAUGE && e.jauge < e.jaugeMax) { e.jauge++; ctx.emettre({ t: 'message', texte: 'Gros groupe : +1 rotation' }); }
  e.coups--;
  emettreCoups(ctx);
  finDeTour(ctx);
  return true;
}

export function jouerRotationJoueur(ctx, sens) {
  if (ctx.etat.enAttente) return false;
  if (!jouerRotation(ctx, sens)) return false;
  finDeTour(ctx, { rotation: true });
  return true;
}

// ---- Règles de salle en fin de tour ----

function appliquerMaree(ctx) {
  const regle = ctx.etat.salle.regles.maree;
  if (!regle || ctx.etat.tour % regle.periode !== 0) return;
  const g = ctx.grille, gr = ctx.etat.gravite;
  const n = colonnes(g.w, g.h, gr).length;
  const pierres = new Set(ctx.rng.melanger([...Array(n).keys()]).slice(0, regle.pierres));
  let k = 0;
  const r = maree(g, gr, () => (pierres.has(k++) ? nouvellePierre(g) : tirerEntree(ctx)));
  for (const s of r.sorties) {
    if (s.cellule.type === 'element' && s.cellule.element.type === 'ballon' && ctx.etat.objectif.type === 'ballons') ctx.etat.objectif.progres++;
  }
  ctx.emettre({ t: 'maree', deplacements: r.deplacements, entrees: r.entrees, sorties: r.sorties.map(({ id, x, y }) => ({ id, x, y })) });
  retomber(ctx);
}

function prochaineAnnonce(ctx) {
  const mode = ctx.etat.salle.regles.rotationAuto;
  if (!mode) return null;
  if (mode === 'tempete') return { sens: ctx.rng.choix([-1, 1, 2]) };
  if (mode === 'pendule') return { sens: [1, 1, -1, -1][ctx.etat.tour % 4] };
  return null;
}

function appliquerRotationAuto(ctx) {
  const a = ctx.etat.annonce;
  if (!a) return;
  jouerRotation(ctx, a.sens, { auto: true });
  retomber(ctx, { rotation: true });
}

function reapprovisionnerBallons(ctx) {
  const regle = ctx.etat.salle.regles.ballons;
  if (!regle) return;
  const g = ctx.grille;
  if (compter(g, (c) => c.type === 'element' && c.element.type === 'ballon') >= regle.min) return;
  // Une bille ordinaire de la moitié basse (côté G) devient un ballon.
  const cand = [];
  for (const col of colonnes(g.w, g.h, ctx.etat.gravite)) for (let i = (col.length / 2) | 0; i < col.length; i++) {
    const c = g.cellules[col[i]]; if (c && c.type === 'bille' && !c.speciale) cand.push(col[i]);
  }
  if (!cand.length) return;
  const i = ctx.rng.choix(cand), b = nouvelElement(g, 'ballon');
  g.cellules[i] = b;
  const [x, y] = coord(g, i);
  ctx.emettre({ t: 'apparition', cellules: [{ x, y, id: b.id, couleur: null, type: 'element', speciale: null, element: { type: 'ballon' } }] });
}

/** Niveau : une montée à la fois ; pose enAttente si un choix est nécessaire. */
export function majSeuilsXp(e) {
  e.xpNiveau = SEUILS_NIVEAU[e.niveau - 1] ?? 0;
  e.xpProchain = e.niveau < NIVEAU_MAX ? SEUILS_NIVEAU[e.niveau] : null;
}

export function verifierNiveau(ctx) {
  const e = ctx.etat;
  majSeuilsXp(e);
  if (e.enAttente) return;
  if (e.niveau < NIVEAU_MAX && e.xpSalle >= SEUILS_NIVEAU[e.niveau]) {
    e.niveau++;
    majSeuilsXp(e);
    const propositions = proposerEffets(ctx, e.niveau);
    if (!propositions.length) { ctx.emettre({ t: 'message', texte: 'Niveau ' + e.niveau + ' : plus rien à proposer' }); return; } // filet : jamais de run figé
    e.enAttente = attenteNiveau(ctx, e.niveau, propositions);
    ctx.emettre({ t: 'niveau', niveau: e.niveau, propositions });
  }
}

export function finirSalle(ctx, victoire, raison) {
  const e = ctx.etat, o = e.objectif;
  e.stats.salles.push({ id: e.salle.id, nom: e.salle.nom, xp: e.xpSalle, niveau: e.niveau, victoire, raison });
  // Quasi-victoire : l'écran d'échec peut dire « à N billes de l'objectif ».
  e.enAttente = { type: 'finSalle', victoire, raison, xpSalle: e.xpSalle, niveau: e.niveau, coups: e.coups, objectif: { type: o.type, progres: Math.min(o.progres, o.cible), cible: o.cible, manque: Math.max(0, o.cible - o.progres) } };
  ctx.emettre({ t: 'finSalle', victoire, raison });
  ctx.bus.emettre('finSalle', ctx, { victoire, raison });
}

/** Objectif, coups, blocage. Ne fait rien si un choix est en attente. */
export function verifierFin(ctx) {
  const e = ctx.etat, o = e.objectif;
  if (e.enAttente && e.enAttente.type !== 'niveau') return;
  if (o.type === 'score') o.progres = e.xpSalle;
  const atteint = o.progres >= o.cible;
  ctx.emettre({ t: 'objectif', progres: o.progres, cible: o.cible, atteint });
  if (atteint) { finirSalle(ctx, true, 'objectif'); return; }
  if (e.enAttente) return; // un effet de niveau peut encore changer la donne (+2 coups…)
  if (e.coups <= 0) {
    ctx.bus.emettre('coupsEpuises', ctx, {});
    if (e.coups <= 0) { finirSalle(ctx, false, 'coups'); return; }
  }
  if (!existeCoup(ctx.grille)) {
    const peutTourner = e.jauge > 0 || (ROTATION_HORS_JAUGE === 'coup' && e.coups > 0);
    const mode = MODES_GRAVITE[e.modeGravite] ?? MODES_GRAVITE.continue;
    if (!compter(ctx.grille, (c) => c.type === 'bille')) finirSalle(ctx, false, 'vide');
    // Sans remplissage, tourner ne sert que si la chute recrée un groupe : sinon la salle est perdue.
    else if (peutTourner && (mode.remplissageRotation !== false || rotationUtile(ctx))) ctx.emettre({ t: 'message', texte: 'Plus aucun groupe : tourne le plateau' });
    else finirSalle(ctx, false, 'bloque');
  }
}

/** Renfort : sous le seuil de billes, chaque tap fait tomber min..max billes au hasard dans la grille. */
function appliquerRenfort(ctx) {
  const e = ctx.etat, g = ctx.grille;
  const regle = e.salle.regles.renfort === undefined ? RENFORT : e.salle.regles.renfort;
  if (!regle) return;
  const cases = g.forme.reduce((n, f) => n + f, 0);
  if (compter(g, (c) => c.type === 'bille') >= Math.round(regle.seuil * cases)) return;
  const n = regle.min + ctx.rng.entier(regle.max - regle.min + 1);
  const entrees = renforcer(g, e.gravite, n, ctx.rng, () => tirerEntree(ctx));
  if (!entrees.length) return;
  if (!ctx.memo['renfort:' + e.salleIndex]) { ctx.memo['renfort:' + e.salleIndex] = 1; ctx.emettre({ t: 'message', texte: 'Renfort : des billes arrivent' }); }
  ctx.emettre({ t: 'remplissage', cellules: entrees, renfort: true });
  ctx.bus.emettre('remplissage', ctx, { cellules: entrees, renfort: true });
}

export function finDeTour(ctx, { rotation = false } = {}) {
  const e = ctx.etat;
  retomber(ctx, { rotation });
  if (!rotation) appliquerRenfort(ctx);
  e.tour++;
  appliquerMaree(ctx);
  appliquerRotationAuto(ctx);
  e.annonce = prochaineAnnonce(ctx);
  reapprovisionnerBallons(ctx);
  expirerEffets(ctx);
  ctx.bus.emettre('finTour', ctx, { tour: e.tour });
  ctx.activesCeTour.clear();
  verifierNiveau(ctx);
  verifierFin(ctx);
}
