// Décor « Carrousel cosmique » (contexte validé, remplace le ciel bleu/nuages — étape 1/E1) :
// une nuit étoilée SOLIDAIRE de la rotation du plateau (le ciel est le dôme du planétarium).
// Deux couches de parallaxe tournent avec le plateau à une fraction de son angle (étoiles
// 0,85×, nébuleuses 0,7×) pour donner de la profondeur sans jamais recalculer un dégradé par
// frame : nébuleuses et planète sont des sprites pré-rendus une fois (dégradés radiaux) sur
// canvas hors écran, dessinés en simple drawImage. Les étoiles sont de simples arcs pleins
// (pas de dégradé) modulés en alpha, comme les anciennes scintilles — coût constant, aucune
// allocation par frame. rendu.js garde la boucle rAF active tant que le canvas est visible.
//
// Retour test de fumée #1 (2026-09-14) : premier jet trop discret — étoiles minuscules/transparentes,
// nébuleuses/planète non lisibles. Correctifs : tailles en px CSS ×devicePixelRatio, alpha et
// couleurs franches pour les étoiles ; nébuleuses/planète dimensionnées en fraction de la LARGEUR
// du canvas et positionnées aux coins/hors plateau ; rayon du champ étoilé porté à la diagonale
// complète du canvas pour ne jamais laisser de coin vide pendant la rotation.
//
// Retour test de fumée #2 : toujours trop clairsemé (5-10 étoiles visibles) et planète invisible
// (cachée sous le plateau, qui remplit ~94 % du canvas). Correctifs : 1200 étoiles PRÉ-RENDUES
// une fois dans une texture carrée (côté = diagonale ×1,03), dessinée en un seul drawImage tourné
// par frame — coût constant quel que soit le nombre d'étoiles ; le scintillement est simulé par
// une seconde texture (sous-ensemble d'étoiles « brillantes ») dont seule l'alpha oscille (pas de
// recalcul par étoile par frame). La planète est positionnée dans la marge RÉELLEMENT visible
// (au-dessus du plateau, ou latérale) déduite de la taille du plateau rendu, passée par rendu.js.

import { ENCRE } from '../data/couleurs.js';

const N_ETOILES = 1200;
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
// Planète : ~18 % de la largeur du canvas, contour encre, orange/pêche, anneau clair. Sa position
// est calculée au dessin depuis la marge réellement visible autour du plateau rendu (étape 2).
const PLANETE_FRAC_LARGEUR = 0.18;
// Étoiles : 3 tailles en px CSS (×devicePixelRatio, cuites dans la texture), 3 teintes (75 %
// chaude, 15 % bleutée, 10 % dorée). 1/7 des étoiles sont « brillantes » (texture de scintillement).
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

// mulberry32 : PRNG seedé minimal, déterministe (motif stable d'un rechargement à l'autre) mais
// sans la structure visible d'une suite à faible période (retour test de fumée #3 : les positions
// en angle régulier × rayon quantifié dessinaient des « chapelets » de perles en arcs de cercle).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ALPHA_ETOILES = [0.8, 0.85, 0.95]; // par classe (petite/moyenne/grande) — toutes ≥ 0,6 (petites : pas ternes)

// texture carrée pré-rendue une fois (étape 1) : toutes les étoiles (ou seulement les
// « brillantes ») pour un côté donné, positions lues depuis les fractions [0,1] ci-dessous
// (distribution uniforme en x,y — pas de placement polaire). `brillantesSeulement` omet la
// croix de diffraction (déjà dans la texture de base, sur 5 % des grandes seulement).
function batirTextureEtoiles(cote, dpr, fx, fy, classe, teinte, brillante, croix, brillantesSeulement) {
  const { canvas, ctx } = creerCanvas(cote, cote);
  for (let i = 0; i < N_ETOILES; i++) {
    if (brillantesSeulement && !brillante[i]) continue;
    const px = fx[i] * cote, py = fy[i] * cote, r = TAILLES_ETOILES_CSS[classe[i]] * dpr;
    ctx.globalAlpha = brillantesSeulement ? 1 : ALPHA_ETOILES[classe[i]]; ctx.fillStyle = COULEURS_ETOILES[teinte[i]];
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    if (!brillantesSeulement && croix[i]) { // croix de diffraction : 5 % des grandes seulement
      ctx.globalAlpha = 0.5; ctx.strokeStyle = COULEURS_ETOILES[teinte[i]]; ctx.lineWidth = Math.max(0.6, r * 0.22);
      const L = r * 3.2;
      ctx.beginPath(); ctx.moveTo(px - L, py); ctx.lineTo(px + L, py); ctx.moveTo(px, py - L); ctx.lineTo(px, py + L); ctx.stroke();
    }
  }
  return canvas;
}

export function creerDecor() {
  let temps = 0, dpr = 1;
  let cielHaut = TIERS_CIEL[0].haut, cielBas = TIERS_CIEL[0].bas, nNebuleusesActives = TIERS_CIEL[0].nNebuleuses;

  // sprites pré-rendus une fois (résolution intrinsèque fixe — mis à l'échelle au dessin)
  const nebuleuseSprites = COULEURS_NEBULEUSES.map((hex, i) => batirNebuleuse(hex, ALPHA_NEBULEUSES[i]));
  const planeteSprite = batirPlanete();

  // 1200 étoiles, position ET attributs tirés indépendamment d'un mulberry32 seedé (fixe : motif
  // stable d'un rechargement à l'autre) — deux tirages par étoile pour x,y, uniforme sur le carré,
  // sans aucun lien avec l'index i (c'est ce lien, via modulo, qui créait des « chapelets » en arcs).
  const rng = mulberry32(1337);
  const starFX = new Float32Array(N_ETOILES), starFY = new Float32Array(N_ETOILES); // fractions [0,1] du côté
  const starClasse = new Uint8Array(N_ETOILES);    // 0 petite (70 %), 1 moyenne (22 %), 2 grande (8 %)
  const starTeinte = new Uint8Array(N_ETOILES);    // 0 chaude (75 %), 1 bleutée (15 %), 2 dorée (10 %)
  const starBrillante = new Uint8Array(N_ETOILES); // ~1/7 : dans la texture de scintillement
  const starCroix = new Uint8Array(N_ETOILES);     // croix de diffraction : 5 % des grandes seulement
  for (let i = 0; i < N_ETOILES; i++) {
    starFX[i] = rng(); starFY[i] = rng(); // deux tirages indépendants : x = rng()*côté, y = rng()*côté
    const rc = rng(); starClasse[i] = rc < 0.7 ? 0 : rc < 0.92 ? 1 : 2;
    const rt = rng(); starTeinte[i] = rt < 0.75 ? 0 : rt < 0.9 ? 1 : 2;
    starBrillante[i] = rng() < 1 / 7 ? 1 : 0;
    starCroix[i] = starClasse[i] === 2 && rng() < 0.05 ? 1 : 0;
  }
  // texture carrée pré-rendue (étape 1) : une seule pour toutes les étoiles + une pour les
  // brillantes, reconstruites uniquement quand le canvas change de taille (jamais par frame).
  let texEtoiles = null, texBrillantes = null, texCote = 0;
  function regenererTextureEtoiles(cw, ch) {
    const cote = Math.max(2, Math.round(Math.hypot(cw, ch) * 1.03)); // ≥ diagonale du canvas (étape 4)
    const coteTex = Math.min(cote, 2048); // plafond mémoire (≈ 16 Mo par texture) : dessinée à l'échelle si le canvas est plus grand
    if (cote === texCote) return;
    texCote = cote;
    const dprTex = dpr * (coteTex / cote);
    texEtoiles = batirTextureEtoiles(coteTex, dprTex, starFX, starFY, starClasse, starTeinte, starBrillante, starCroix, false);
    texBrillantes = batirTextureEtoiles(coteTex, dprTex, starFX, starFY, starClasse, starTeinte, starBrillante, starCroix, true);
  }

  // couleur du ciel + nombre de nébuleuses actives selon le tiers d'acte (etat.salle.index/total)
  function definirActe(ratio) {
    const r = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
    const idx = r >= 2 / 3 ? 2 : r >= 1 / 3 ? 1 : 0;
    cielHaut = TIERS_CIEL[idx].haut; cielBas = TIERS_CIEL[idx].bas; nNebuleusesActives = TIERS_CIEL[idx].nNebuleuses;
  }

  function regenerer(cellPix, cw, ch) {
    dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    if (cw && ch) regenererTextureEtoiles(cw, ch);
  }

  function maj(dt) { temps += dt; }

  // Place la planète dans la marge RÉELLEMENT visible autour du plateau rendu (étape 2) :
  // bande au-dessus s'il y a la place, sinon marge latérale, sinon repli au coin du canvas.
  function positionPlanete(cw, ch, pd, plateauW, plateauH) {
    const demiL = (plateauW || 0) / 2, demiH = (plateauH || 0) / 2;
    const margeHaut = ch / 2 - demiH, margeCote = cw / 2 - demiL;
    if (margeHaut > pd * 0.7) return { x: cw * 0.16, y: -(demiH + margeHaut * 0.5) };
    if (margeCote > pd * 0.7) return { x: demiL + margeCote * 0.5, y: -ch * 0.18 };
    return { x: cw / 2 - pd * 0.6, y: -(ch / 2 - pd * 0.6) }; // repli : coin haut-droit du canvas
  }

  function dessiner(ctx, cw, ch, angleJeu, plateauW, plateauH) {
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

    // nébuleuses : parallaxe à 0,7× l'angle du plateau, taille/position en fraction du canvas —
    // grandes, lisibles, aux coins (hors plateau).
    ctx.save();
    ctx.translate(cw / 2, ch / 2); ctx.rotate(angleJeu * 0.7);
    for (let i = 0; i < nNebuleusesActives; i++) {
      const nb = NEBULEUSES[i], spr = nebuleuseSprites[nb.variante], d = cw * nb.tailleFrac;
      ctx.save(); ctx.translate(nb.fx * cw, nb.fy * ch); ctx.rotate(nb.rot);
      ctx.drawImage(spr, -d / 2, -d / 2, d, d);
      ctx.restore();
    }
    ctx.restore();

    // étoiles : parallaxe à 0,85× l'angle du plateau — texture unique tournée, coût constant
    // quel que soit le nombre d'étoiles (2 drawImage/frame). Scintillement : la texture des
    // étoiles brillantes est superposée à une alpha qui oscille (pas de recalcul par étoile).
    ctx.save();
    ctx.translate(cw / 2, ch / 2); ctx.rotate(angleJeu * 0.85);
    if (texEtoiles) ctx.drawImage(texEtoiles, -texCote / 2, -texCote / 2, texCote, texCote);
    if (texBrillantes) {
      ctx.globalAlpha = Math.max(0, 0.4 + 0.5 * Math.sin(temps * 0.7));
      ctx.drawImage(texBrillantes, -texCote / 2, -texCote / 2, texCote, texCote);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // planète lointaine : dans la marge visible autour du plateau (pas dans la couche parallaxe
    // des étoiles — elle doit rester lisible au repos, quitte à sortir du champ en rotation).
    const pd = cw * PLANETE_FRAC_LARGEUR, pos = positionPlanete(cw, ch, pd, plateauW, plateauH);
    ctx.save();
    ctx.translate(cw / 2 + pos.x, ch / 2 + pos.y);
    ctx.drawImage(planeteSprite, -pd / 2, -pd / 2, pd, pd);
    ctx.restore();
  }

  return { regenerer, definirActe, maj, dessiner };
}
