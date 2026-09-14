// Lot B — activations visuelles différenciées des spéciales (docs/RECHERCHE_VFX.md §4, items
// 4/5/6/7/11) : bombe, ligne, bombe de couleur, fusée (élément), réaction en chaîne (ralenti +
// zoom), combo de spéciales, vent de rotation. Opère en coordonnées ÉCRAN (après projection par
// `env.ecran`, comme juice/impact/particules) : aucune matrice à gérer ici. Pools fixes typés,
// zéro allocation par frame (§5) pour tout ce qui est mis à jour à chaque frame ; les fonctions
// `jouer*` (une par salve `detruit`, rares) orchestrent l'attente avec `await` comme rendu.js.
//
// `env` (fourni par rendu.js, lecture des closures courantes — jamais de valeur figée) :
//   billes (Map id->billeVis), particules, impact, juice, sprites, couleurHex,
//   ecran(x,y)->{x,y}, cellPix()->px, w()->n, h()->n, G()->{x,y}, audio()->audio|null,
//   shake(intensite), glisser(bv,de,vers,duree,retirerApres) (= demarrerGlisse de rendu.js)

import { FEEL, palierGroupe } from '../data/paliers.js';

const attend = (ms) => new Promise((res) => setTimeout(res, ms));
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
function jouerSon(env, nom, params) { const a = env.audio(); if (a) a.jouer(nom, params); }
// mot forcé du combo de spéciales (item 6) — thème « Carrousel cosmique », cohérent avec juice.js
const MOT_COMBO_FORCE = 'BIG BANG !';

const MAX_RAYONS = 16, MAX_TRAIL = 4, MAX_FUSEE = 3, MAX_RECUL = 32, MAX_VENT = 14;
const CAUSES_EXPLOSION = new Set(['bombe', 'ligne', 'croix', 'couleur', 'fusee']); // anneau d'onde de choc (§2)

export function creerSpecialesFx() {
  // --- rayons (couleur, phase 1, item 3) : traits fins qui s'allongent vers les cibles en 120 ms
  const rox = new Float32Array(MAX_RAYONS), roy = new Float32Array(MAX_RAYONS);
  const rtx = new Float32Array(MAX_RAYONS), rty = new Float32Array(MAX_RAYONS);
  const rt = new Float32Array(MAX_RAYONS), rd = new Float32Array(MAX_RAYONS);
  let nRayons = 0;
  function emettreRayon(ox, oy, tx, ty, duree) {
    if (nRayons >= MAX_RAYONS) return;
    const i = nRayons++; rox[i] = ox; roy[i] = oy; rtx[i] = tx; rty[i] = ty; rt[i] = 0; rd[i] = duree;
  }
  function majRayons(dt) {
    for (let i = 0; i < nRayons; i++) {
      rt[i] += dt;
      if (rt[i] >= rd[i]) { const l = nRayons - 1; rox[i]=rox[l]; roy[i]=roy[l]; rtx[i]=rtx[l]; rty[i]=rty[l]; rt[i]=rt[l]; rd[i]=rd[l]; nRayons--; i--; }
    }
  }
  function dessinerRayons(ctx, cellPix) {
    for (let i = 0; i < nRayons; i++) {
      const p = clamp01(rt[i] / rd[i]), e = easeOutCubic(p);
      const ex = rox[i] + (rtx[i] - rox[i]) * e, ey = roy[i] + (rty[i] - roy[i]) * e;
      ctx.save(); ctx.globalAlpha = 1 - p * 0.4; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, cellPix * 0.045); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(rox[i], roy[i]); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
    }
  }

  // --- traînée (ligne, item 2) : blanc → transparent, balaie depuis l'origine vers les deux
  // bouts en 180 ms puis fade 60 ms. Un dégradé par trait, par frame, sur un pool minuscule
  // (≤ 4 traînées simultanées) : coût négligeable, seule façon de rendre un vrai blanc→transparent.
  const tox = new Float32Array(MAX_TRAIL), toy = new Float32Array(MAX_TRAIL);
  const tax = new Float32Array(MAX_TRAIL), tay = new Float32Array(MAX_TRAIL);
  const tbx = new Float32Array(MAX_TRAIL), tby = new Float32Array(MAX_TRAIL);
  const tt = new Float32Array(MAX_TRAIL), tSweep = new Float32Array(MAX_TRAIL), tFade = new Float32Array(MAX_TRAIL);
  let nTrail = 0;
  function emettreTrail(o, a, b, sweep, fade) {
    if (nTrail >= MAX_TRAIL) return;
    const i = nTrail++; tox[i]=o.x; toy[i]=o.y; tax[i]=a.x; tay[i]=a.y; tbx[i]=b.x; tby[i]=b.y; tt[i]=0; tSweep[i]=sweep; tFade[i]=fade;
  }
  function majTrail(dt) {
    for (let i = 0; i < nTrail; i++) {
      tt[i] += dt;
      if (tt[i] >= tSweep[i] + tFade[i]) { const l = nTrail - 1; tox[i]=tox[l]; toy[i]=toy[l]; tax[i]=tax[l]; tay[i]=tay[l]; tbx[i]=tbx[l]; tby[i]=tby[l]; tt[i]=tt[l]; tSweep[i]=tSweep[l]; tFade[i]=tFade[l]; nTrail--; i--; }
    }
  }
  function dessinerTrail(ctx, cellPix) {
    for (let i = 0; i < nTrail; i++) {
      const enSweep = tt[i] < tSweep[i], p = enSweep ? clamp01(tt[i] / tSweep[i]) : 1;
      const alpha = enSweep ? 1 : Math.max(0, 1 - (tt[i] - tSweep[i]) / tFade[i]);
      if (alpha <= 0) continue;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, cellPix * 0.22);
      for (const bout of [[tax[i], tay[i]], [tbx[i], tby[i]]]) {
        const fx = tox[i] + (bout[0] - tox[i]) * p, fy = toy[i] + (bout[1] - toy[i]) * p;
        const g = ctx.createLinearGradient(tox[i], toy[i], fx, fy);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(tox[i], toy[i]); ctx.lineTo(fx, fy); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // --- fusée qui glisse (item 4) : sprite le long du trajet en 200 ms, embers semés en route
  const fox = new Float32Array(MAX_FUSEE), foy = new Float32Array(MAX_FUSEE);
  const ftx = new Float32Array(MAX_FUSEE), fty = new Float32Array(MAX_FUSEE);
  const ft = new Float32Array(MAX_FUSEE), fd = new Float32Array(MAX_FUSEE), fProchain = new Float32Array(MAX_FUSEE);
  const fSprite = new Array(MAX_FUSEE).fill(null), fParticules = new Array(MAX_FUSEE).fill(null);
  let nFusee = 0;
  function emettreFusee(o, t, duree, sprite, particules) {
    if (nFusee >= MAX_FUSEE) return;
    const i = nFusee++; fox[i]=o.x; foy[i]=o.y; ftx[i]=t.x; fty[i]=t.y; ft[i]=0; fd[i]=duree; fProchain[i]=0; fSprite[i]=sprite; fParticules[i]=particules;
  }
  function majFusee(dt) {
    for (let i = 0; i < nFusee; i++) {
      ft[i] += dt;
      const p = clamp01(ft[i] / fd[i]);
      fProchain[i] -= dt;
      if (fProchain[i] <= 0 && fParticules[i]) {
        fParticules[i].emettreFeu(fox[i] + (ftx[i] - fox[i]) * p, foy[i] + (fty[i] - foy[i]) * p, 2);
        fProchain[i] = 0.03;
      }
      if (ft[i] >= fd[i]) { const l = nFusee - 1; fox[i]=fox[l]; foy[i]=foy[l]; ftx[i]=ftx[l]; fty[i]=fty[l]; ft[i]=ft[l]; fd[i]=fd[l]; fProchain[i]=fProchain[l]; fSprite[i]=fSprite[l]; fParticules[i]=fParticules[l]; nFusee--; i--; }
    }
  }
  function dessinerFusee(ctx) {
    for (let i = 0; i < nFusee; i++) {
      const spr = fSprite[i]; if (!spr) continue;
      const p = clamp01(ft[i] / fd[i]);
      const x = fox[i] + (ftx[i] - fox[i]) * p, y = foy[i] + (fty[i] - foy[i]) * p;
      const angle = Math.atan2(fty[i] - foy[i], ftx[i] - fox[i]) + Math.PI / 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(spr, -spr.width / 2, -spr.height / 2); ctx.restore();
    }
  }

  // --- recul (bombe, item 1) : billes voisines survivantes repoussées puis retour, 120 ms.
  // Mute bv.x/bv.y directement (repris tel quel par la boucle de dessin normale de rendu.js) —
  // pas de fonction de dessin dédiée.
  const REC_DUREE = 0.12;
  const rBv = new Array(MAX_RECUL).fill(null);
  const rx0 = new Float32Array(MAX_RECUL), ry0 = new Float32Array(MAX_RECUL);
  const rdx = new Float32Array(MAX_RECUL), rdy = new Float32Array(MAX_RECUL), rt2 = new Float32Array(MAX_RECUL);
  let nRecul = 0;
  function declencherRecul(bv, dx, dy) {
    if (nRecul >= MAX_RECUL) return;
    const i = nRecul++; rBv[i] = bv; rx0[i] = bv.x; ry0[i] = bv.y; rdx[i] = dx; rdy[i] = dy; rt2[i] = 0;
  }
  function majRecul(dt) {
    for (let i = 0; i < nRecul; i++) {
      rt2[i] += dt;
      const p = clamp01(rt2[i] / REC_DUREE), s = Math.sin(p * Math.PI), bv = rBv[i];
      if (bv) { bv.x = rx0[i] + rdx[i] * s; bv.y = ry0[i] + rdy[i] * s; }
      if (p >= 1) {
        if (bv) { bv.x = rx0[i]; bv.y = ry0[i]; }
        const l = nRecul - 1; rBv[i]=rBv[l]; rx0[i]=rx0[l]; ry0[i]=ry0[l]; rdx[i]=rdx[l]; rdy[i]=rdy[l]; rt2[i]=rt2[l]; nRecul--; i--;
      }
    }
  }

  // --- vent de rotation (item 8) : 8-10 traits tangentiels pendant le tween, vie 0,2 s, toutes les 40 ms
  const vpx = new Float32Array(MAX_VENT), vpy = new Float32Array(MAX_VENT);
  const vvx = new Float32Array(MAX_VENT), vvy = new Float32Array(MAX_VENT);
  const vvie = new Float32Array(MAX_VENT), vvieMax = new Float32Array(MAX_VENT);
  let nVent = 0, ventActif = false, ventSens = 1, ventT = 0, ventDuree = 0, ventProchain = 0, ventCx = 0, ventCy = 0, ventR = 0;
  function declencherVent(sens, duree, cx, cy, rayon) {
    ventActif = true; ventSens = sens || 1; ventT = 0; ventDuree = duree; ventProchain = 0; ventCx = cx; ventCy = cy; ventR = rayon;
  }
  function spawnVent() {
    if (nVent >= MAX_VENT) return;
    const i = nVent++, a = Math.random() * Math.PI * 2, signe = ventSens >= 2 || ventSens < 0 ? -1 : 1, vit = 90 + Math.random() * 60;
    vpx[i] = ventCx + Math.cos(a) * ventR; vpy[i] = ventCy + Math.sin(a) * ventR;
    vvx[i] = -Math.sin(a) * signe * vit; vvy[i] = Math.cos(a) * signe * vit; vvieMax[i] = vvie[i] = 0.2;
  }
  function majVent(dt) {
    if (ventActif) {
      ventT += dt;
      if (ventT <= ventDuree) { ventProchain -= dt; if (ventProchain <= 0) { spawnVent(); ventProchain = 0.04; } }
      else ventActif = false;
    }
    for (let i = 0; i < nVent; i++) {
      vpx[i] += vvx[i] * dt; vpy[i] += vvy[i] * dt; vvie[i] -= dt;
      if (vvie[i] <= 0) { const l = nVent - 1; vpx[i]=vpx[l]; vpy[i]=vpy[l]; vvx[i]=vvx[l]; vvy[i]=vvy[l]; vvie[i]=vvie[l]; vvieMax[i]=vvieMax[l]; nVent--; i--; }
    }
  }
  function dessinerVent(ctx, cellPix) {
    for (let i = 0; i < nVent; i++) {
      const alpha = Math.max(0, vvie[i] / vvieMax[i]), ang = Math.atan2(vvy[i], vvx[i]), len = cellPix * 0.3;
      ctx.save(); ctx.globalAlpha = alpha * 0.7; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, cellPix * 0.04); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(vpx[i] - Math.cos(ang) * len, vpy[i] - Math.sin(ang) * len); ctx.lineTo(vpx[i], vpy[i]); ctx.stroke();
      ctx.restore();
    }
  }

  // --- réaction en chaîne (item 5) : dès profondeur >= 2, ralenti réel 150 ms (dtScale=0,5) +
  // zoom caméra ×1,04 centré sur l'origine, retour en ~200 ms. Piloté au temps RÉEL (pas le dt
  // déjà ralenti) — sinon le ralenti s'auto-prolongerait. Au 3e maillon (profondeur === 2, 0-indexé
  // dans le journal, §4), texte « RÉACTION EN CHAÎNE ».
  const CHAINE_RALENTI = 0.15, CHAINE_DUREE = 0.35, CHAINE_PIC = 1.04;
  let chaineActif = false, chaineT = 0, chaineLx = 0, chaineLy = 0;
  function declencherChaine(evt, env) {
    chaineActif = true; chaineT = 0;
    const o = evt.origine || { x: env.w() / 2, y: env.h() / 2 }, cp = env.cellPix();
    chaineLx = (o.x - env.w() / 2 + 0.5) * cp; chaineLy = (o.y - env.h() / 2 + 0.5) * cp;
    if (evt.profondeur === 2) { const e = env.ecran(o.x, o.y); env.juice.emettreMot(e.x, e.y, 'RÉACTION EN CHAÎNE', 1); }
  }
  function majChaine(dt) { if (chaineActif) { chaineT += dt; if (chaineT >= CHAINE_DUREE) chaineActif = false; } }
  function chaineZ() {
    if (chaineT < CHAINE_RALENTI) return 1 + (CHAINE_PIC - 1) * (chaineT / CHAINE_RALENTI);
    return CHAINE_PIC - (CHAINE_PIC - 1) * clamp01((chaineT - CHAINE_RALENTI) / (CHAINE_DUREE - CHAINE_RALENTI));
  }
  // item 5 : appelée par rendu.js juste avant de dessiner le plateau (déjà translaté/tourné) —
  // ajoute le zoom centré sur l'origine (pivot) puis l'échelle normale ; no-op hors chaîne.
  function appliquerZoom(ctx, sx, sy) {
    const z = chaineActif ? chaineZ() : 1;
    if (chaineActif) ctx.translate(chaineLx * sx * (1 - z), chaineLy * sy * (1 - z));
    ctx.scale(sx * z, sy * z);
  }

  // --- item 1 : bombe — flash+onde (repris de l'existant) + recul des voisines + fumée
  async function jouerBombe(evt, env, combo = false) {
    const cellules = evt.cellules || [];
    const origine = evt.origine || (cellules[0] ? { x: cellules[0].x, y: cellules[0].y } : { x: 0, y: 0 });
    const oE = env.ecran(origine.x, origine.y);
    jouerSon(env, 'speciale', { type: 'bombe' });
    let sx = 0, sy = 0, n = 0;
    for (const c of cellules) {
      const bv = env.billes.get(c.id), pos = bv ? { x: bv.x, y: bv.y } : { x: c.x, y: c.y }, e = env.ecran(pos.x, pos.y);
      sx += e.x; sy += e.y; n++;
      env.particules.emettreDestruction(e.x, e.y, env.couleurHex(c.couleur), 5);
      env.billes.delete(c.id);
    }
    const centre = n ? { x: sx / n, y: sy / n } : oE, ampli = combo ? 1.5 : 1;
    env.impact.emettreImpact(centre.x, centre.y, null, ampli * 1.15);
    env.particules.emettreFumee(centre.x, centre.y, 7);
    env.juice.emettreOnde(centre.x, centre.y, env.cellPix() * (0.8 + Math.min(1.4, cellules.length * 0.07)));
    env.juice.emettreBoom(oE.x, oE.y);
    if (combo) env.juice.emettreMot(centre.x, centre.y, MOT_COMBO_FORCE, 1.3);
    const amp = 4 / env.cellPix(), rayon = Math.sqrt(cellules.length) + 1.2;
    for (const [, bv] of env.billes) {
      const dx = bv.x - origine.x, dy = bv.y - origine.y, d = Math.hypot(dx, dy);
      if (d > 0 && d <= rayon) declencherRecul(bv, (dx / d) * amp, (dy / d) * amp);
    }
    env.shake(Math.min(1, cellules.length / 10) * (combo ? 1.4 : 1));
    jouerSon(env, 'detruit', { taille: cellules.length, cause: 'bombe', profondeur: evt.profondeur || 0 });
    await attend(110);
  }

  // --- item 2 : ligne — traînée qui balaie, les billes disparaissent à son passage
  async function jouerLigne(evt, env, combo = false) {
    const cellules = evt.cellules || [];
    if (!cellules.length) return;
    const origine = evt.origine || { x: cellules[0].x, y: cellules[0].y };
    jouerSon(env, 'speciale', { type: 'ligne' });
    const vertical = cellules.every((c) => c.x === origine.x);
    const dist = (c) => (vertical ? Math.abs(c.y - origine.y) : Math.abs(c.x - origine.x));
    const tries = [...cellules].sort((a, b) => dist(a) - dist(b));
    const maxDist = Math.max(1, dist(tries[tries.length - 1]));
    let extA = origine, extB = origine;
    for (const c of tries) {
      if (vertical) { if (c.y < extA.y) extA = c; if (c.y > extB.y) extB = c; }
      else { if (c.x < extA.x) extA = c; if (c.x > extB.x) extB = c; }
    }
    const oE = env.ecran(origine.x, origine.y);
    emettreTrail(oE, env.ecran(extA.x, extA.y), env.ecran(extB.x, extB.y), 0.18, 0.06);
    const DUREE = 180, debut = Date.now();
    let idx = 0;
    while (idx < tries.length) {
      const seuil = Math.min(1, (Date.now() - debut) / DUREE) * maxDist;
      while (idx < tries.length && dist(tries[idx]) <= seuil) {
        const c = tries[idx++], bv = env.billes.get(c.id), e = env.ecran(bv ? bv.x : c.x, bv ? bv.y : c.y);
        env.particules.emettreDestruction(e.x, e.y, env.couleurHex(c.couleur), 5);
        env.impact.emettreImpact(e.x, e.y, c.couleur, (combo ? 1.5 : 1) * 0.6);
        env.billes.delete(c.id);
      }
      if (idx >= tries.length) break;
      await attend(16);
    }
    if (combo) env.juice.emettreMot(oE.x, oE.y, MOT_COMBO_FORCE, 1.3);
    env.shake(0.35 * (combo ? 1.4 : 1));
    jouerSon(env, 'detruit', { taille: cellules.length, cause: 'ligne', profondeur: evt.profondeur || 0 });
    await attend(60);
  }

  // --- item 3 : bombe de couleur — rayons puis aspiration en cascade, la sucette pulse
  async function jouerCouleur(evt, env, combo = false) {
    const cellules = evt.cellules || [];
    if (!cellules.length) return;
    const origine = evt.origine || { x: cellules[0].x, y: cellules[0].y };
    const oE = env.ecran(origine.x, origine.y);
    jouerSon(env, 'speciale', { type: 'couleur' });
    const oCell = cellules.find((c) => c.x === origine.x && c.y === origine.y);
    const origineBv = oCell ? env.billes.get(oCell.id) : null;
    const autres = cellules.filter((c) => !(c.x === origine.x && c.y === origine.y));
    const parDistance = autres.map((c) => ({ c, d: Math.hypot(c.x - origine.x, c.y - origine.y) })).sort((a, b) => a.d - b.d);
    const nRayonsCible = Math.min(12, Math.max(8, parDistance.length || 8));
    const pas = Math.max(1, Math.ceil(parDistance.length / nRayonsCible));
    for (let i = 0; i < parDistance.length; i += pas) { const e = env.ecran(parDistance[i].c.x, parDistance[i].c.y); emettreRayon(oE.x, oE.y, e.x, e.y, 0.12); }
    await attend(120);
    const stagger = Math.max(8, Math.min(40, 900 / Math.max(1, parDistance.length)));
    let i = 0;
    for (const it of parDistance) {
      const bv = env.billes.get(it.c.id);
      if (bv) {
        env.glisser(bv, { x: bv.x, y: bv.y }, { x: origine.x, y: origine.y }, 0.16, false);
        const c = it.c;
        attend(160).then(() => {
          if (!env.billes.has(c.id)) return;
          const e = env.ecran(origine.x, origine.y);
          env.particules.emettreDestruction(e.x, e.y, env.couleurHex(c.couleur), 6);
          env.billes.delete(c.id);
        });
      } else env.billes.delete(it.c.id);
      if (origineBv && i % 3 === 0) origineBv.pulse = { t: 0, duree: 0.22 };
      i++;
      await attend(stagger);
    }
    await attend(200);
    if (origineBv) { env.particules.emettreDestruction(oE.x, oE.y, env.couleurHex(origineBv.couleur ?? 0), 10); env.billes.delete(origineBv.id); }
    else if (oCell) env.billes.delete(oCell.id);
    env.impact.emettreImpact(oE.x, oE.y, null, (combo ? 1.5 : 1) * 1.1);
    if (combo) env.juice.emettreMot(oE.x, oE.y, MOT_COMBO_FORCE, 1.3);
    env.shake(0.5 * (combo ? 1.4 : 1));
    jouerSon(env, 'detruit', { taille: cellules.length, cause: 'couleur', profondeur: evt.profondeur || 0 });
    await attend(90);
  }

  // --- item 4 : fusée (élément) — glisse le long de sa trajectoire, les billes disparaissent au passage
  async function jouerFusee(evt, env, combo = false) {
    const cellules = evt.cellules || [];
    const origine = evt.origine || { x: 0, y: 0 };
    jouerSon(env, 'speciale', { type: 'fusee' });
    const oE = env.ecran(origine.x, origine.y);
    const fin = cellules.length ? cellules[cellules.length - 1] : origine;
    const fE = env.ecran(fin.x, fin.y);
    emettreFusee(oE, fE, 0.2, env.sprites.fusee(), env.particules);
    const DUREE = 200, debut = Date.now();
    let idx = 0;
    while (idx < cellules.length) {
      const seuil = Math.floor(Math.min(1, (Date.now() - debut) / DUREE) * cellules.length + 0.001);
      while (idx < seuil) {
        const c = cellules[idx++], bv = env.billes.get(c.id), e = env.ecran(bv ? bv.x : c.x, bv ? bv.y : c.y);
        env.particules.emettreDestruction(e.x, e.y, env.couleurHex(c.couleur), 5);
        env.billes.delete(c.id);
      }
      if (idx >= cellules.length) break;
      await attend(16);
    }
    while (idx < cellules.length) { const c = cellules[idx++], e = env.ecran(c.x, c.y); env.particules.emettreDestruction(e.x, e.y, env.couleurHex(c.couleur), 5); env.billes.delete(c.id); }
    env.impact.emettreImpact(fE.x, fE.y, null, (combo ? 1.5 : 1) * 0.7);
    if (combo) env.juice.emettreMot(fE.x, fE.y, MOT_COMBO_FORCE, 1.3);
    env.shake(0.4 * (combo ? 1.4 : 1));
    jouerSon(env, 'detruit', { taille: cellules.length, cause: 'fusee', profondeur: evt.profondeur || 0 });
    await attend(40);
  }

  // causes sans activation dédiée ('groupe', 'croix', 'effet', 'maree', 'pierre') : comportement
  // existant (repris tel quel de rendu.js), déplacé ici pour que rendu.js reste < 400 lignes.
  // Renvoie le barycentre écran (pour dernierDetruit, lu par le `xp` suivant, §2) ou null.
  // F08 : tout est lu dans FEEL[palier] (3/5/8/10+) — un 3 reste sec, un 6 pousse une onde, un 8+ secoue
  // le plateau entier et lâche une rafale au barycentre, un 10+ est hors norme.
  async function jouerGenerique(evt, env, combo = false) {
    const cellules = evt.cellules || [], taille = cellules.length || 1, f = FEEL[palierGroupe(taille)];
    let sx = 0, sy = 0, n = 0;
    for (const c of cellules) {
      const bv = env.billes.get(c.id), pos = bv ? { x: bv.x, y: bv.y } : { x: c.x, y: c.y }, e = env.ecran(pos.x, pos.y);
      sx += e.x; sy += e.y; n++;
      env.particules.emettreDestruction(e.x, e.y, env.couleurHex(c.couleur), f.particules);
      env.billes.delete(c.id);
    }
    let centre = null;
    if (n > 0) {
      centre = { x: sx / n, y: sy / n };
      const dominante = cellules.find((c) => c.couleur != null); // a2 : flash + halo teinté — item 6 : ×1,5 en combo
      const explosion = CAUSES_EXPLOSION.has(evt.cause);
      if (explosion || f.onde) env.juice.emettreOnde(centre.x, centre.y, env.cellPix() * (0.8 + Math.min(1.4, taille * 0.07)) * Math.max(1, f.onde), Math.max(1, f.onde));
      env.impact.emettreImpact(centre.x, centre.y, dominante ? dominante.couleur : null, f.impact * (combo ? 1.5 : 1));
      if (f.rafale) env.particules.emettreDestruction(centre.x, centre.y, env.couleurHex(dominante ? dominante.couleur : 3), f.rafale); // rafale d'étoiles au centre (5+)
      if (f.plateau) env.squashPlateau(f.plateau); // le plateau encaisse le coup (8+)
      if (combo) env.juice.emettreMot(centre.x, centre.y, MOT_COMBO_FORCE, 1.3); // item 6 : mot forcé
    }
    env.shake(f.shake * (combo ? 1.4 : 1)); // item 6 : secousse +40 % en combo
    if (CAUSES_EXPLOSION.has(evt.cause)) jouerSon(env, 'speciale', { type: evt.cause }); // item 9 : activation (croix)
    jouerSon(env, 'detruit', { taille, cause: evt.cause, profondeur: evt.profondeur || 0 });
    await attend(90);
    return centre;
  }

  return {
    jouerGenerique,
    maj(dt) { majRayons(dt); majTrail(dt); majFusee(dt); majRecul(dt); majVent(dt); majChaine(dt); },
    dessiner(ctx, cellPix) { dessinerRayons(ctx, cellPix); dessinerTrail(ctx, cellPix); dessinerFusee(ctx); dessinerVent(ctx, cellPix); },
    jouerBombe, jouerLigne, jouerCouleur, jouerFusee,
    declencherVent, declencherChaine, appliquerZoom,
    get dtScale() { return chaineActif && chaineT < CHAINE_RALENTI ? 0.5 : 1; },
    get enCours() { return nRayons > 0 || nTrail > 0 || nFusee > 0 || nRecul > 0 || nVent > 0 || chaineActif; },
    vider() { nRayons = 0; nTrail = 0; nFusee = 0; nRecul = 0; nVent = 0; chaineActif = false; ventActif = false; },
  };
}
