// Aperçu d'une rotation sans toucher à l'état (télégraphe, pilier 1) : où chaque bille retombera,
// quelles cases se rempliront. Travaille sur une copie superficielle de la grille et ne tire jamais
// dans le rng : les couleurs des entrées ne sont connues que si la file `prochainesEntrees` les contient.
import { tourner } from './gravite.js';
import { appliquerGravite, remplir } from './chute.js';
import { coord } from './grille.js';
import { deplacerBallons } from './elements.js';
import { MODES_GRAVITE } from '../data/salles.js';

/**
 * @returns {{ sens, gravite, deplacements:[{id,de,vers}], entrees:[{x,y,couleur|null,depuis}], eclatent:[{id,x,y}] }}
 */
export function apercuRotation(etat, sens) {
  const g = etat.grille;
  const copie = { w: g.w, h: g.h, forme: g.forme, cellules: g.cellules.slice(), prochainId: g.prochainId };
  const gravite = tourner(etat.gravite, sens);
  const deplacements = [], eclatent = [];
  for (const m of deplacerBallons(copie, gravite)) {
    const [x, y] = coord(g, m.de);
    if (m.vers === null) { eclatent.push({ id: m.c.id, x, y }); continue; }
    const [nx, ny] = coord(g, m.vers);
    deplacements.push({ id: m.c.id, de: { x, y }, vers: { x: nx, y: ny } });
    if (m.echange) deplacements.push({ id: m.echange.id, de: { x: nx, y: ny }, vers: { x, y } });
  }
  deplacements.push(...appliquerGravite(copie, gravite));
  const file = etat.competences?.includes('prevoyance') ? etat.prochainesEntrees ?? [] : [];
  let k = 0;
  const mode = MODES_GRAVITE[etat.modeGravite];
  const entrees = mode && mode.remplissageRotation === false ? [] // rien n'entre jamais
    : remplir(copie, gravite, () => ({ id: 0, type: 'bille', couleur: file[k++] ?? null, speciale: null }))
      .map(({ x, y, couleur, depuis }) => ({ x, y, couleur, depuis }));
  return { sens, gravite, deplacements, entrees, eclatent };
}
