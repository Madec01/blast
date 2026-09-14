// Effets de niveau en salle (§6.1). Lot D (2026-09-14, validé par Martin) : plus de cartes, plus d'enjeu.
// Format de chaque effet (docs/CONTRATS.md, moteur/progression.js) :
//   { id, palier:1|2|3, rarete:'commun'|'rare'|'epique', risque?:true, famille?, nom, desc, duree:null|'salle'|n, parTap?:true (la durée ne s'use qu'aux taps),
//     condition?(ctx)=>bool /* faux = la carte n'est pas proposée */, synergies?:[idsCompetences], appliquer(ctx, options) }
// `famille` est une étiquette de classement (coups/rotation/teinte/speciales/renfort/elements/xp) qui sert
// à l'équilibrage et aux recettes d'évolution (EVOLUTIONS, dans effets2.js) ; le moteur ne la lit pas.
// Tout hook/réducteur posé par un effet utilise `{ source: 'effet:' + id }` pour pouvoir être retiré proprement
// (ctx.retirerEffet, ou automatiquement à la sortie de la salle — moteur/run.js `entrerSalle`).
// Fichier scindé en deux (>400 lignes à plat) : les 13 effets d'origine et les fonctions partagées vivent ici ;
// le catalogue Lot D (25 nouveaux effets + 6 évolutions) est dans effets2.js, fusionné dans `EFFETS` ci-dessous.
import { coord, voisins } from '../moteur/grille.js';
import { colonnes } from '../moteur/gravite.js';
import { avancerElements } from '../moteur/speciales.js';
import { EFFETS_NOUVEAUX, EVOLUTIONS } from './effets2.js';

export const src = (id) => ({ source: 'effet:' + id });

/** Indices des billes ordinaires (sans spéciale) vérifiant pred. */
export function billes(ctx, pred = () => true) {
  const r = [];
  ctx.grille.cellules.forEach((c, i) => { if (c && c.type === 'bille' && !c.speciale && pred(c, i)) r.push(i); });
  return r;
}

export function couleurDominante(ctx) {
  const n = new Array(6).fill(0);
  for (const c of ctx.grille.cellules) if (c && c.type === 'bille') n[c.couleur]++;
  return n.indexOf(Math.max(...n));
}

/** Couleur encore présente la moins fréquente ; -1 si la grille ne contient plus aucune bille. */
export function couleurRare(ctx) {
  const n = new Array(6).fill(0);
  for (const c of ctx.grille.cellules) if (c && c.type === 'bille') n[c.couleur]++;
  let min = -1;
  for (let k = 0; k < n.length; k++) if (n[k] > 0 && (min === -1 || n[k] < n[min])) min = k;
  return min;
}

export function convertir(ctx, indices, couleur) {
  const cellules = [];
  for (const i of indices) {
    const c = ctx.grille.cellules[i];
    if (!c || c.type !== 'bille' || c.couleur === couleur) continue;
    c.couleur = couleur;
    const [x, y] = coord(ctx.grille, i);
    cellules.push({ x, y, id: c.id, couleur });
  }
  if (cellules.length) ctx.emettre({ t: 'conversion', cellules });
  return cellules.length;
}

function colonneLaPlusUnie(ctx) {
  let meilleure = null, score = -1, couleur = 0;
  for (const col of colonnes(ctx.grille.w, ctx.grille.h, ctx.etat.gravite)) {
    const n = new Array(6).fill(0);
    for (const i of col) { const c = ctx.grille.cellules[i]; if (c && c.type === 'bille') n[c.couleur]++; }
    const m = Math.max(...n);
    if (m > score) { score = m; meilleure = col; couleur = n.indexOf(m); }
  }
  return { col: meilleure, couleur };
}

const EFFETS_BASE = [
  // ---- Palier 1 (niveaux 2-3) ----
  { id: 'coups_2', palier: 1, rarete: 'commun', famille: 'coups', nom: 'Second souffle', desc: '+2 coups.', duree: null,
    appliquer(ctx) { ctx.etat.coups += 2; ctx.emettre({ t: 'coups', coups: ctx.etat.coups, jauge: ctx.etat.jauge }); } },
  { id: 'prochaine_bombe', palier: 1, rarete: 'commun', famille: 'speciales', nom: 'Amorce', desc: 'Le prochain groupe de 3 ou plus crée une bombe.', duree: 'salle',
    synergies: ['seuil_abaisse'],
    appliquer(ctx) {
      ctx.bus.on('seuils', (v) => ({ ...v, bombe: Math.min(v.bombe, 3) }), src('prochaine_bombe'));
      ctx.bus.on('specialeCreee', (c) => c.retirerEffet('prochaine_bombe'), src('prochaine_bombe'));
    } },
  { id: 'dominante_3', palier: 1, rarete: 'commun', famille: 'teinte', nom: 'Teinture rapide', desc: '3 billes prennent la couleur dominante.', duree: null,
    appliquer(ctx) { const d = couleurDominante(ctx); convertir(ctx, ctx.rng.melanger(billes(ctx, (c) => c.couleur !== d)).slice(0, 3), d); } },
  { id: 'rotation_gratuite', palier: 1, rarete: 'commun', famille: 'rotation', nom: 'Pivot libre', desc: 'La prochaine rotation est gratuite.', duree: 'salle',
    synergies: ['vertige'],
    appliquer(ctx) {
      ctx.bus.on('coutRotation', () => 0, src('rotation_gratuite'));
      ctx.bus.on('apresRotation', (c, e) => { if (!e.auto) c.retirerEffet('rotation_gratuite'); }, src('rotation_gratuite'));
    } },
  { id: 'nettoyage_bas', palier: 1, rarete: 'rare', famille: 'coups', nom: 'Coup de balai', desc: 'La ligne du bas est nettoyée.', duree: null,
    appliquer(ctx) {
      const bas = colonnes(ctx.grille.w, ctx.grille.h, ctx.etat.gravite).map((col) => col[col.length - 1]);
      ctx.detruire(bas, 'effet'); ctx.retomber();
    } },
  { id: 'elements_avances', palier: 1, rarete: 'commun', famille: 'elements', nom: 'Coup de pouce', desc: '+1 activation sur tous les éléments présents.', duree: null,
    condition: (ctx) => ctx.grille.cellules.some((c) => c && c.type === 'element'),
    appliquer(ctx) { avancerElements(ctx); ctx.retomber(); } },

  // ---- Palier 2 (niveaux 4-6) ----
  { id: 'trois_vaut_quatre', palier: 2, rarete: 'commun', famille: 'xp', nom: 'Petits groupes', desc: 'Les groupes de 3 comptent comme 4 pendant 3 tours.', duree: 3,
    appliquer(ctx) { ctx.bus.on('tailleGroupe', (v) => (v === 3 ? 4 : v), src('trois_vaut_quatre')); } },
  { id: 'chaines_double', palier: 2, rarete: 'rare', famille: 'xp', nom: 'Résonance', desc: 'Les chaînes de spéciales valent double XP jusqu’à la fin de la salle.', duree: 'salle',
    appliquer(ctx) { ctx.bus.on('xpGain', (v, c, s) => (s.profondeur > 0 ? v * 2 : v), src('chaines_double')); } },
  { id: 'colonne_monochrome', palier: 2, rarete: 'rare', famille: 'teinte', nom: 'Coulée', desc: 'La colonne la plus unie devient entièrement de sa couleur.', duree: null,
    appliquer(ctx) { const { col, couleur } = colonneLaPlusUnie(ctx); if (col) convertir(ctx, col, couleur); } },
  { id: 'rayon_plus', palier: 2, rarete: 'rare', famille: 'speciales', nom: 'Surcharge', desc: 'Les spéciales présentes gagnent +1 de rayon.', duree: null,
    condition: (ctx) => ctx.grille.cellules.some((c) => c && c.speciale),
    synergies: ['seuil_abaisse'],
    appliquer(ctx) {
      ctx.grille.cellules.forEach((c, i) => {
        if (!c || !c.speciale) return;
        c.rayon = (c.rayon ?? 1) + 1;
        const [x, y] = coord(ctx.grille, i);
        ctx.emettre({ t: 'speciale', x, y, id: c.id, type: c.speciale });
      });
    } },
  { id: 'pierres_fondent', palier: 2, rarete: 'commun', famille: 'elements', nom: 'Dégel', desc: 'La pierre la plus basse de chaque colonne fond.', duree: null,
    condition: (ctx) => ctx.grille.cellules.some((c) => c && c.type === 'pierre'),
    synergies: ['fossoyeur'],
    appliquer(ctx) {
      const cibles = [];
      for (const col of colonnes(ctx.grille.w, ctx.grille.h, ctx.etat.gravite)) {
        for (let i = col.length - 1; i >= 0; i--) { const c = ctx.grille.cellules[col[i]]; if (c && c.type === 'pierre') { cibles.push(col[i]); break; } }
      }
      if (cibles.length) { ctx.detruire(cibles, 'effet'); ctx.retomber(); }
      else ctx.emettre({ t: 'message', texte: 'Aucune pierre à faire fondre' });
    } },
  { id: 'demi_tour', palier: 2, rarete: 'rare', famille: 'rotation', nom: 'Volte-face', desc: 'Rotation 180° gratuite immédiate.', duree: null,
    appliquer(ctx) { ctx.tourner(2, { gratuit: true }); ctx.retomber({ rotation: true }); } },
  { id: 'teinte_prochaine', palier: 2, rarete: 'commun', famille: 'teinte', nom: 'Pinceau', desc: 'Le prochain tap teinte ses voisines de sa couleur avant d’exploser.', duree: 'salle',
    synergies: ['propagation_vert'],
    appliquer(ctx) {
      ctx.bus.on('avantTap', (c, e) => {
        convertir(c, voisins(c.grille, e.i).filter((v) => { const cv = c.grille.cellules[v]; return cv && cv.type === 'bille' && !cv.speciale; }), e.couleur);
        c.retirerEffet('teinte_prochaine');
      }, src('teinte_prochaine'));
    } },
];

// Catalogue Lot D : 25 nouveaux effets (palier 1 → 3) + 6 évolutions, définis dans effets2.js
// pour garder ce fichier sous ~400 lignes. Fusionnés dans le même tableau public `EFFETS`
// (progression.js n'importe que `../data/effets.js`).
export const EFFETS = [...EFFETS_BASE, ...EFFETS_NOUVEAUX];
export { EVOLUTIONS };
