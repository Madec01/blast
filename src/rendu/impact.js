// Impact (a2, docs/CONTRATS.md — étape 3) : à chaque salve `detruit`, un flash radial blanc
// bref au barycentre du groupe, puis un halo doux qui grandit et s'efface, dessiné SOUS les
// confettis (rendu.js appelle dessiner() avant particules.dessiner()). Le halo est un sprite
// dégradé radial pré-rendu une fois par couleur sur canvas hors écran — jamais de `filter` ni
// de dégradé recalculé par frame (§5). `lighter` n'est utilisé que pour le flash, 90 ms.

import { COULEURS } from '../data/couleurs.js';

const MAX = 8;                 // impacts simultanés (pool fixe, zéro allocation par frame)
const DUREE_FLASH = 0.09;      // 90 ms — flash blanc alpha 0,6 → 0
const DUREE_HALO = 0.15;       // 150 ms — halo teinté échelle x1,5 → x2,5, alpha 1 → 0
const TAILLE_SPRITE = 96;      // résolution intrinsèque du sprite de halo (mise à l'échelle au dessin)

function hex2rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function creerCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { canvas: c, ctx: c.getContext('2d') };
}

// halo pré-rendu une seule fois : dégradé radial teinté, du plein centre vers transparent
function batirHalo(hex) {
  const { canvas, ctx } = creerCanvas(TAILLE_SPRITE, TAILLE_SPRITE);
  const cx = TAILLE_SPRITE / 2, cy = TAILLE_SPRITE / 2, r = TAILLE_SPRITE / 2;
  const [cr, cg, cb] = hex2rgb(hex);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},0.85)`);
  g.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.35)`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  return canvas;
}

export function creerImpact() {
  // halos pré-rendus : un par couleur logique (0..5) + un neutre (pierre/spéciale sans couleur)
  const halos = COULEURS.map((c) => batirHalo(c.hex));
  const haloNeutre = batirHalo('#fff6e0');

  const ix = new Float32Array(MAX), iy = new Float32Array(MAX), it = new Float32Array(MAX);
  const icouleur = new Int8Array(MAX); // -1 = neutre
  let n = 0;

  // au barycentre écran du groupe détruit ; couleurIndex = couleur dominante ou null
  function emettreImpact(x, y, couleurIndex) {
    const i = n < MAX ? n++ : 0; // à saturation, recycle le plus ancien slot (rare, pool large)
    ix[i] = x; iy[i] = y; it[i] = 0; icouleur[i] = couleurIndex == null ? -1 : couleurIndex;
  }

  function maj(dt) {
    for (let i = 0; i < n; i++) {
      it[i] += dt;
      if (it[i] >= DUREE_HALO) {
        const last = n - 1;
        ix[i] = ix[last]; iy[i] = iy[last]; it[i] = it[last]; icouleur[i] = icouleur[last];
        n--; i--;
      }
    }
  }

  function dessiner(ctx, cellPix) {
    for (let i = 0; i < n; i++) {
      const t = it[i];
      if (t < DUREE_FLASH) { // flash radial blanc, additif, uniquement pendant ces 90 ms (§ étape 3)
        const p = t / DUREE_FLASH;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 * (1 - p);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ix[i], iy[i], cellPix * (0.5 + 0.4 * p), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      if (t < DUREE_HALO) { // halo doux teinté, sous les confettis, en 'source-over' normal
        const p = t / DUREE_HALO;
        const spr = icouleur[i] < 0 ? haloNeutre : halos[icouleur[i]];
        const d = cellPix * (1.5 + (2.5 - 1.5) * p);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.drawImage(spr, ix[i] - d / 2, iy[i] - d / 2, d, d);
        ctx.restore();
      }
    }
  }

  return {
    emettreImpact, maj, dessiner,
    get enCours() { return n > 0; },
    vider() { n = 0; },
  };
}
