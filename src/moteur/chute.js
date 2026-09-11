// Chute, remplissage et marée : tout est calculé le long de G (gravite.js).
import { colonnes, vecteur } from './gravite.js';
import { tombe, coord } from './grille.js';

function pos(g, i) { const [x, y] = coord(g, i); return { x, y }; }

/**
 * Compacte chaque colonne vers le bas (G). Les cellules fixes (ballon) et les cases
 * hors forme servent de sol. Renvoie les déplacements {id, de, vers}.
 */
export function appliquerGravite(g, gravite) {
  const deplacements = [];
  for (const col of colonnes(g.w, g.h, gravite)) {
    let dest = col.length - 1;
    for (let i = col.length - 1; i >= 0; i--) {
      const k = col[i];
      if (g.forme[k] !== 1) { dest = i - 1; continue; }
      const c = g.cellules[k];
      if (c === null) continue;
      if (!tombe(c)) { dest = i - 1; continue; }
      if (dest !== i) {
        g.cellules[col[dest]] = c; g.cellules[k] = null;
        deplacements.push({ id: c.id, de: pos(g, k), vers: pos(g, col[dest]) });
      }
      dest--;
    }
  }
  return deplacements;
}

/**
 * Remplit les vides du segment supérieur de chaque colonne (celui qui touche le haut visuel).
 * `tirer()` fournit chaque nouvelle cellule. Les billes entrent en pile depuis l'extérieur.
 */
export function remplir(g, gravite, tirer) {
  const entrees = [];
  const [gx, gy] = vecteur(gravite);
  for (const col of colonnes(g.w, g.h, gravite)) {
    if (g.forme[col[0]] !== 1) continue; // pas d'entrée si le bord est un mur
    let n = 0;
    while (n < col.length && g.forme[col[n]] === 1 && g.cellules[col[n]] === null) n++;
    const haut = pos(g, col[0]);
    let k = 0;
    for (let i = n - 1; i >= 0; i--) {
      const c = tirer(); k++;
      g.cellules[col[i]] = c;
      const p = pos(g, col[i]);
      entrees.push({ id: c.id, x: p.x, y: p.y, couleur: c.couleur, type: c.type, speciale: c.speciale,
        depuis: { x: haut.x - gx * k, y: haut.y - gy * k } });
    }
  }
  return entrees;
}

/**
 * Renfort : `n` billes entrent par le haut visuel dans des colonnes tirées au hasard (avec remise) et
 * se posent directement sur la pile (la grille doit être compactée). Colonnes pleines ignorées.
 * Renvoie les entrées au même format que remplir().
 */
export function renforcer(g, gravite, n, rng, tirer) {
  const entrees = [];
  const [gx, gy] = vecteur(gravite);
  const cols = colonnes(g.w, g.h, gravite).filter((col) => g.forme[col[0]] === 1 && g.cellules[col[0]] === null);
  const empiles = new Map(); // colonne → nombre de billes déjà entrées dans cette salve (pour l'animation en pile)
  for (let k = 0; k < n && cols.length; k++) {
    const ci = rng.entier(cols.length), col = cols[ci];
    let i = 0;
    while (i < col.length && g.forme[col[i]] === 1 && g.cellules[col[i]] === null) i++;
    const cible = col[i - 1];
    const c = tirer();
    g.cellules[cible] = c;
    const nb = (empiles.get(col) ?? 0) + 1; empiles.set(col, nb);
    const p = pos(g, cible), haut = pos(g, col[0]);
    entrees.push({ id: c.id, x: p.x, y: p.y, couleur: c.couleur, type: c.type, speciale: c.speciale,
      depuis: { x: haut.x - gx * nb, y: haut.y - gy * nb } });
    if (g.cellules[col[0]] !== null) cols.splice(ci, 1); // colonne pleine
  }
  return entrees;
}

/**
 * Marée : une ligne entre par le bas (côté G) et pousse toute la colonne d'une case vers le haut.
 * La cellule du haut sort du plateau. Renvoie {deplacements, entrees, sorties}.
 */
export function maree(g, gravite, tirer) {
  const deplacements = [], entrees = [], sorties = [];
  const [gx, gy] = vecteur(gravite);
  for (const col of colonnes(g.w, g.h, gravite)) {
    const haut = g.cellules[col[0]];
    if (haut) { const p = pos(g, col[0]); sorties.push({ id: haut.id, x: p.x, y: p.y, cellule: haut }); }
    for (let i = 0; i < col.length - 1; i++) {
      const c = g.cellules[col[i + 1]];
      g.cellules[col[i]] = c;
      if (c) deplacements.push({ id: c.id, de: pos(g, col[i + 1]), vers: pos(g, col[i]) });
    }
    const bas = col[col.length - 1];
    const c = tirer();
    g.cellules[bas] = c;
    const p = pos(g, bas);
    entrees.push({ id: c.id, x: p.x, y: p.y, couleur: c.couleur, type: c.type, speciale: c.speciale,
      depuis: { x: p.x + gx, y: p.y + gy } });
  }
  return { deplacements, entrees, sorties };
}
