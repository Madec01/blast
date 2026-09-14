// Décor « Carrousel cosmique » (contexte validé, remplace le ciel bleu/nuages — étape 1/E1) :
// une nuit étoilée SOLIDAIRE de la rotation du plateau (le ciel est le dôme du planétarium).
// Deux couches de parallaxe tournent avec le plateau à une fraction de son angle (étoiles
// 0,85×, nébuleuses 0,7×) pour donner de la profondeur sans jamais recalculer un dégradé par
// frame : nébuleuses et planète sont des sprites pré-rendus une fois (dégradés radiaux) sur
// canvas hors écran, dessinés en simple drawImage. Les étoiles sont de simples arcs pleins
// (pas de dégradé) modulés en alpha, comme les anciennes scintilles — coût constant, aucune
// allocation par frame. rendu.js garde la boucle rAF active tant que le canvas est visible.
//
// Retour test de fumée (2026-09-14) : premier jet trop discret — étoiles minuscules/transparentes,
// nébuleuses/planète non lisibles. Correctifs : tailles en px CSS ×devicePixelRatio, alpha et
// couleurs franches pour les étoiles ; nébuleuses/planète dimensionnées en fraction de la LARGEUR
// du canvas (pas de la diagonale du champ céleste) et positionnées aux coins/hors plateau ; rayon
// du champ étoilé porté à la diagonale complète du canvas pour ne jamais laisser de coin vide
// pendant la rotation (tourner autour du centre ne change pas la distance au centre).

import { ENCRE } from '../data/couleurs.js';

const N_ETOILES = 200;
// Couleur du ciel et nombre de nébuleuses selon le tiers d'acte (étape 1) : etat.salle.index/total.
const TIERS_CIEL = [
  { haut: '#1a1650', bas: '#2b2270', nNebuleuses: 2 }, // tiers 1 : bleu nuit
  { haut: '#2a1152', bas: '#4a1f78', nNebuleuses: 2 }, // tiers 2 : violet profond
  { haut: '#0d0a24', bas: '#1a1650', nNebuleuses: 3 }, // tiers 3 : bleu-noir, plus de nébuleuses
];
// 3 nébuleuses (violet/rose/cyan), grandes (60-90 % de la largeur du canvas), positionnées aux
// coins du canvas — donc hors du plateau (cadre + champ, ~94 % de la dimension contrainte) —
// pour ne pas gêner la lecture des billes ; seules les `nNebuleuses` premières du tiers courant
// sont dessinées. `fx,fy` = décalage depuis le centre du canvas, en fraction de largeur/hauteur.
const NEBULEUSES = [
  { fx: -0.46, fy: -0.4, variante: 0, tailleFrac: 0.8, rot: 0.4 },  // violette, haut-gauche
  { fx: 0.42, fy: 0.44, variante: 1, tailleFrac: 0.7, rot: -0.6 },  // rose, bas-droite
  { fx: -0.4, fy: 0.42, variante: 2, tailleFrac: 0.75, rot: 1.1 },  // cyan, bas-gauche
];
const COULEURS_NEBULEUSES = ['#b04cff', '#ff5fa2', '#22d3ee'];
const ALPHA_NEBULEUSES = [0.42, 0.46, 0.5]; // alpha au centre, dans 0,35-0,5
// Planète : ~18 % de la largeur du canvas, haut-droite, hors plateau (même logique de coin).
const PLANETE_POS = { fx: 0.34, fy: -0.32 };
const PLANETE_FRAC_LARGEUR = 0.18;
// Étoiles : 3 tailles en px CSS (×devicePixelRatio au dessin), 3 teintes (75 % chaude, 15 %
// bleutée, 10 % dorée), alpha 0,7-1,0 en scintillement lent.
const TAILLES_ETOILES_CSS = [1.5, 2.5, 4];
const COULEURS_ETOILES = ['#fff3c4', '#bfe6ff', '#ffcc1f'];

function hex2rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function creerCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return { canvas: c, ctx: c.getContext('2d') };
}

// tache douce pré-rendue une fois : dégradé radial teinté, alpha `alphaCentre` au centre (0,35-0,5),
// plateau large avant de s'effacer — lisible comme une grande nébuleuse, pas un point chaud minuscule.
function batirNebuleuse(hex, alphaCentre) {
  const T = 300;
  const { canvas, ctx } = creerCanvas(T, T);
  const cx = T / 2, cy = T / 2, r = T / 2;
  const [cr, cg, cb] = hex2rgb(hex);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${alphaCentre})`);
  g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${(alphaCentre * 0.85).toFixed(3)})`);
  g.addColorStop(0.8, `rgba(${cr},${cg},${cb},${(alphaCentre * 0.3).toFixed(3)})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  return canvas;
}

// planète lointaine cartoon avec anneau clair, contour encre — pré-rendue une seule fois
function batirPlanete() {
  const T = 200;
  const { canvas, ctx } = creerCanvas(T, T);
  const cx = T / 2, cy = T / 2, r = T * 0.26;
  // moitié arrière de l'anneau, clair
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.32);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 2.05, r * 0.62, 0, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, r * 0.14); ctx.strokeStyle = ENCRE; ctx.stroke();
  ctx.lineWidth = Math.max(1.5, r * 0.34); ctx.strokeStyle = '#ffe9c2'; ctx.globalAlpha = 0.9; ctx.stroke();
  ctx.restore();
  // sphère cartoon par-dessus (cache le milieu de l'anneau)
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, '#ffe2b8'); g.addColorStop(0.55, '#f6a86a'); g.addColorStop(1, '#c06a34');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.strokeStyle = ENCRE; ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx - r * 0.32, cy - r * 0.36, r * 0.26, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  ctx.restore();
  // arc avant de l'anneau, par-dessus le bas de la sphère
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.32);
  ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 2.05, r * 0.62, 0, 0.12, Math.PI - 0.12);
  ctx.lineWidth = Math.max(1.5, r * 0.32); ctx.strokeStyle = '#fff6e0'; ctx.globalAlpha = 0.95; ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.08); ctx.strokeStyle = ENCRE; ctx.globalAlpha = 1; ctx.stroke();
  ctx.restore();
  return canvas;
}

export function creerDecor() {
  let temps = 0, dpr = 1;
  let cielHaut = TIERS_CIEL[0].haut, cielBas = TIERS_CIEL[0].bas, nNebuleusesActives = TIERS_CIEL[0].nNebuleuses;

  // sprites pré-rendus une fois (résolution intrinsèque fixe — mis à l'échelle au dessin)
  const nebuleuseSprites = COULEURS_NEBULEUSES.map((hex, i) => batirNebuleuse(hex, ALPHA_NEBULEUSES[i]));
  const planeteSprite = batirPlanete();

  // ~200 étoiles, réparties dans un disque via une suite déterministe (angle d'or) : stable d'un
  // rechargement à l'autre, aucune dépendance à Math.random, zéro allocation par frame.
  const starNX = new Float32Array(N_ETOILES), starNY = new Float32Array(N_ETOILES);
  const starClasse = new Uint8Array(N_ETOILES);  // 0 petite (70 %), 1 moyenne (20 %), 2 grande (10 %, + croix)
  const starTeinte = new Uint8Array(N_ETOILES);  // 0 chaude (75 %), 1 bleutée (15 %), 2 dorée (10 %)
  const starVitesse = new Float32Array(N_ETOILES), starPhase = new Float32Array(N_ETOILES);
  for (let i = 0; i < N_ETOILES; i++) {
    const a = (i * 2.399963) % (Math.PI * 2);      // angle (nombre d'or) : répartition homogène
    const rr = Math.sqrt((i * 0.6180339887) % 1);  // rayon en sqrt : densité uniforme sur le disque
    starNX[i] = Math.cos(a) * rr; starNY[i] = Math.sin(a) * rr;
    const c10 = i % 10; starClasse[i] = c10 < 7 ? 0 : c10 < 9 ? 1 : 2;
    const c20 = i % 20; starTeinte[i] = c20 < 3 ? 1 : c20 < 5 ? 2 : 0;
    starVitesse[i] = 0.35 + ((i * 0.137) % 1) * 0.45; // scintillement lent, léger déphasage
    starPhase[i] = (i * 1.913) % (Math.PI * 2);
  }

  // couleur du ciel + nombre de nébuleuses actives selon le tiers d'acte (etat.salle.index/total)
  function definirActe(ratio) {
    const r = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
    const idx = r >= 2 / 3 ? 2 : r >= 1 / 3 ? 1 : 0;
    cielHaut = TIERS_CIEL[idx].haut; cielBas = TIERS_CIEL[idx].bas; nNebuleusesActives = TIERS_CIEL[idx].nNebuleuses;
  }

  function regenerer() { dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1; }

  function maj(dt) { temps += dt; }

  function dessiner(ctx, cw, ch, angleJeu) {
    // ciel en dégradé, teinte selon l'acte, sur tout le canvas
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, cielHaut); g.addColorStop(1, cielBas);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);

    // rayons doux derrière le plateau (conservés), rotation propre lente et indépendante
    ctx.save();
    ctx.translate(cw / 2, ch / 2); ctx.rotate(temps * 0.015);
    ctx.globalAlpha = 0.08; ctx.fillStyle = '#ffffff';
    const rayons = 10, rMax = Math.max(cw, ch) * 0.75;
    for (let i = 0; i < rayons; i++) {
      const a0 = (i / rayons) * Math.PI * 2, a1 = a0 + Math.PI / rayons;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rMax, a0, a1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // nébuleuses : parallaxe à 0,7× l'angle du plateau, taille/position en fraction du canvas
    // (pas de la diagonale du champ étoilé) — grandes, lisibles, aux coins.
    ctx.save();
    ctx.translate(cw / 2, ch / 2); ctx.rotate(angleJeu * 0.7);
    ctx.globalAlpha = 1;
    for (let i = 0; i < nNebuleusesActives; i++) {
      const nb = NEBULEUSES[i], spr = nebuleuseSprites[nb.variante], d = cw * nb.tailleFrac;
      ctx.save(); ctx.translate(nb.fx * cw, nb.fy * ch); ctx.rotate(nb.rot);
      ctx.drawImage(spr, -d / 2, -d / 2, d, d);
      ctx.restore();
    }
    ctx.restore();

    // étoiles + planète lointaine : parallaxe à 0,85× l'angle du plateau. Rayon du champ étoilé
    // = la diagonale du canvas (marge 3 %) : une rotation autour du centre ne change pas la
    // distance au centre, donc un disque de ce rayon reste toujours plein-cadre, à tout angle.
    const champRayon = Math.hypot(cw, ch) * 1.03;
    ctx.save();
    ctx.translate(cw / 2, ch / 2); ctx.rotate(angleJeu * 0.85);
    for (let i = 0; i < N_ETOILES; i++) {
      const px = starNX[i] * champRayon, py = starNY[i] * champRayon;
      const alpha = 0.85 + 0.15 * Math.sin(temps * starVitesse[i] + starPhase[i]); // 0,70 - 1,0
      const r = TAILLES_ETOILES_CSS[starClasse[i]] * dpr;
      ctx.globalAlpha = alpha; ctx.fillStyle = COULEURS_ETOILES[starTeinte[i]];
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      if (starClasse[i] === 2) { // croix de diffraction sur les grandes étoiles (4 traits fins)
        ctx.globalAlpha = alpha * 0.55; ctx.strokeStyle = COULEURS_ETOILES[starTeinte[i]];
        ctx.lineWidth = Math.max(0.6, r * 0.22);
        const L = r * 3.2;
        ctx.beginPath(); ctx.moveTo(px - L, py); ctx.lineTo(px + L, py); ctx.moveTo(px, py - L); ctx.lineTo(px, py + L); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    const pd = cw * PLANETE_FRAC_LARGEUR;
    ctx.save(); ctx.translate(PLANETE_POS.fx * cw, PLANETE_POS.fy * ch);
    ctx.drawImage(planeteSprite, -pd / 2, -pd / 2, pd, pd);
    ctx.restore();
    ctx.restore();
  }

  return { regenerer, definirActe, maj, dessiner };
}
