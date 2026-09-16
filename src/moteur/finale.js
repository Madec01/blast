// F07 (feuille de Martin, étape 4) — finale de salle façon Sugar Crush : à l'objectif atteint, ce qui
// reste au joueur est converti en destructions et en XP au lieu d'être coupé. Consommation
// **virtuelle** : `etat.coups` et `etat.jauge` ne bougent pas (l'écran de fin de salle et le simulateur
// les lisent tels quels) ; seuls la grille, l'XP et les stats changent. Déterministe (rng du run).
//   1. les spéciales restantes explosent, une par une (chaînes et voisines comprises) ;
//   2. chaque coup restant fait exploser une bille au hasard (+XP_FINALE_COUP en plus de la bille,
//      des pierres voisines et des éléments activés) ; tous les ⌈coups / (jauge + 1)⌉ coups, un point
//      de jauge déclenche une rotation gratuite qui fait retomber le reste ;
//   3. les rotations non encore jouées (peu de coups, grille vide) se jouent à la suite.
// Aucun hook de compétence sur ces rotations (ce n'est pas une décision du joueur) ; les hooks
// d'explosion et d'XP s'appliquent aux salves, comme pour toute explosion. La finale tire ses hasards
// dans un rng **à part** (seed du run + salle) : elle ne change ni la grille de la salle suivante ni les
// cartes proposées — les chiffres du simulateur restent comparables à la baseline, finale ou non.
import { coord } from './grille.js';
import { tourner as tournerGravite } from './gravite.js';
import { monteeBallons } from './elements.js';
import { resoudre } from './speciales.js';
import { creerRng, seedDepuis } from './rng.js';

/** XP ajoutée à chaque coup restant converti (en plus de la bille détruite : 10 + 25 ≈ un tap de 3). */
export const XP_FINALE_COUP = 25;
/** Plafond de coups convertis (une salle en donne 30 au plus : jamais atteint, filet pour les compétences). */
export const FINALE_MAX_COUPS = 30;
const SENS_FINALE = 1; // le carrousel tourne toujours dans le même sens : lisible, jamais un balancement

function indicesBilles(g) {
  const l = [];
  for (let i = 0; i < g.cellules.length; i++) { const c = g.cellules[i]; if (c && c.type === 'bille') l.push(i); }
  return l;
}

function rotationFinale(ctx) {
  const e = ctx.etat, de = e.gravite;
  e.gravite = tournerGravite(e.gravite, SENS_FINALE);
  ctx.emettre({ t: 'rotation', de, vers: e.gravite, sens: SENS_FINALE, auto: true, enCoups: 0, finale: true });
  monteeBallons(ctx);
  ctx.retomber({ rotation: true });
}

function exploser(ctx, i, bonus) {
  const [x, y] = coord(ctx.grille, i);
  resoudre(ctx, { cellules: [i], cause: 'finale', origine: { x, y }, profondeur: 0, finale: true, ...(bonus ? { bonus } : {}) });
}

/**
 * Joue la finale d'une salle gagnée. Renvoie le bilan { coups, rotations, speciales, billes, xp }
 * (posé sur `enAttente.finSalle.finale`) ; n'émet rien s'il n'y a rien à convertir.
 */
export function jouerFinale(ctx) {
  const e = ctx.etat, g = ctx.grille;
  const coups = Math.min(FINALE_MAX_COUPS, Math.max(0, e.coups)), rotations = Math.max(0, e.jauge);
  const speciales = [];
  for (let i = 0; i < g.cellules.length; i++) { const c = g.cellules[i]; if (c && c.speciale) speciales.push(c.id); }
  const bilan = { coups, rotations, speciales: speciales.length, billes: 0, xp: 0 };
  if (!coups && !rotations && !speciales.length) return bilan;
  const xpAvant = e.xpSalle, billesAvant = e.stats.billesDetruites, chaineMax = e.stats.chaineMax;
  const rngJeu = ctx.rng;
  ctx.rng = creerRng(seedDepuis(e.seed + ':finale:' + e.salleIndex + ':' + e.tour));
  ctx.finale=true;
  try { jouerSequence(ctx, coups, rotations, speciales); } finally { ctx.rng = rngJeu; ctx.finale=false; }
  bilan.billes = e.stats.billesDetruites - billesAvant;
  bilan.xp = e.xpSalle - xpAvant;
  e.objectif.progres = Math.min(e.objectif.progres, e.objectif.cible); // l'objectif est atteint, pas dépassé (HUD : « 60 / 60 »)
  e.stats.chaineMax = chaineMax; // la chaîne la plus longue du run reste celle du joueur
  e.stats.xpFinale = (e.stats.xpFinale ?? 0) + bilan.xp;
  return bilan;
}

function jouerSequence(ctx, coups, rotations, speciales) {
  const e = ctx.etat, g = ctx.grille;
  ctx.emettre({ t: 'finale', coups, jauge: rotations, speciales: speciales.length });
  // 1. les spéciales restantes, une par une (une spéciale déjà soufflée par la précédente est passée)
  for (const id of speciales) {
    const i = g.cellules.findIndex((c) => c && c.id === id);
    if (i >= 0) exploser(ctx, i, 0);
  }
  // 2. les coups, entrecoupés des rotations
  const pas = rotations > 0 ? Math.ceil(coups / (rotations + 1)) : Infinity;
  let tournees = 0, joues = 0;
  for (let k = 0; k < coups; k++) {
    if (tournees < rotations && k > 0 && k % pas === 0) { rotationFinale(ctx); tournees++; }
    const cand = indicesBilles(g);
    if (!cand.length) break;
    exploser(ctx, cand[ctx.rng.entier(cand.length)], XP_FINALE_COUP);
    joues++;
  }
  // grille vide avant la fin : les coups restants valent quand même leur bonus
  if (joues < coups) {
    const gain = Math.round(ctx.bus.reduire('xpGain', (coups - joues) * XP_FINALE_COUP, ctx, { cause: 'finale', finale: true }));
    if (gain > 0) { e.xpSalle += gain; e.xpTotale += gain; ctx.emettre({ t: 'xp', gain, xpSalle: e.xpSalle, niveau: e.niveau, profondeur: 0, finale: true }); }
  }
  // 3. les rotations qui restent
  while (tournees < rotations) { rotationFinale(ctx); tournees++; }
}
