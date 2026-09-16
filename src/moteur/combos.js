// Combinaisons volontaires : une seule paire, choisie dans un ordre stable.
import { voisins, coord, dans } from './grille.js';
import { ligneAxe, lignePerp } from './gravite.js';
import { resoudre } from './speciales.js';

function recette(a, b) {
  const types = [a, b].sort().join('+');
  if (types === 'ligne+ligne') return ['double_ligne', 'Croix stellaire'];
  if (types === 'bombe+ligne') return ['bombe_ligne', 'Balayage orbital'];
  if (types === 'couleur+ligne') return ['couleur_ligne', 'Constellation de fusées'];
  return null;
}

/** Prévision sans mutation : indices = paire ; cellules = zone directe prévue.
 * Les spéciales supplémentaires peuvent encore étendre la chaîne.
 */
export function apercuCombo(ctx, i) {
  const g = ctx.grille, a = g.cellules[i];
  if (!a || a.type !== 'bille' || !a.speciale) return null;
  for (const j of voisins(g, i).sort((a, b) => a - b)) {
    const b = g.cellules[j];
    if (!b || b.type !== 'bille') continue;
    const r = recette(a.speciale, b.speciale);
    if (!r) continue;
    const [type, nom] = r, [x, y] = coord(g, i), gr = ctx.etat.gravite;
    const zone = new Set([i, j]), conversions = [];
    const ajouter = (indices) => { for (const k of indices) if (g.forme[k] === 1) zone.add(k); };
    let couleur;
    if (type === 'double_ligne') {
      ajouter(ligneAxe(g.w, g.h, gr, x, y));
      ajouter(lignePerp(g.w, g.h, gr, x, y));
    } else if (type === 'bombe_ligne') {
      for (let d = -1; d <= 1; d++) {
        const px = x + (gr % 2 === 0 ? d : 0), py = y + (gr % 2 === 1 ? d : 0);
        if (dans(g, px, py)) ajouter(ligneAxe(g.w, g.h, gr, px, py));
      }
    } else {
      couleur = (a.speciale === 'ligne' ? a : b).couleur;
      for (let k = 0; k < g.cellules.length; k++) {
        const c = g.cellules[k];
        if (k !== i && k !== j && c?.type === 'bille' && !c.speciale && c.couleur === couleur) {
          conversions.push(k);
          const [cx, cy] = coord(g, k);
          ajouter(ligneAxe(g.w, g.h, gr, cx, cy));
        }
      }
    }
    return { type, nom, indices: [i, j], cellules: [...zone].sort((a, b) => a - b), conversions, couleur, x, y };
  }
  return null;
}

/** Consomme la paire une seule fois via le résolveur commun (XP/objectifs/chaînes). */
export function declencherCombo(ctx, i) {
  const info = apercuCombo(ctx, i);
  if (!info) return false;
  const ignoreSpeciales = info.indices.map((k) => ctx.grille.cellules[k].id);
  for (const k of info.conversions) {
    const c = ctx.grille.cellules[k], [x, y] = coord(ctx.grille, k);
    c.speciale = 'ligne'; c.rayon = 1;
    ctx.emettre({ t: 'speciale', x, y, id: c.id, type: 'ligne' });
  }
  ctx.emettre({ t: 'combo', ...info });
  // La résonance est gagnée avant la résolution, et reste indépendante de l'XP.
  ctx.bus.emettre('combo', ctx, info);
  resoudre(ctx, {
    cellules: info.type === 'couleur_ligne' ? [...info.indices, ...info.conversions] : info.cellules,
    cause: info.type === 'double_ligne' ? 'croix' : 'ligne',
    origine: { x: info.x, y: info.y }, profondeur: 0, ignoreSpeciales,
  });
  return true;
}
