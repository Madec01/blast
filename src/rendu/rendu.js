// Rendu Canvas 2D — style « Cartoon pop » (Toon Blast pour le dessin, Candy Crush pour le juice — §2).
// Ne connaît rien au moteur : ne lit que `etat` (§3) et les événements du journal (§4).
import { creerSprites } from './sprites.js';
import { creerParticules } from './particules.js';
import { creerDecor } from './decor.js';
import { creerJuice } from './juice.js';
import { creerImpact } from './impact.js';
import { creerTelegraphe } from './telegraphe.js';
import { creerDessinCellule } from './dessin.js';
import { COULEURS } from '../data/couleurs.js';
const HEX = COULEURS.map((c) => c.hex);
const couleurHex = (i) => HEX[i] ?? '#8a857b';
// durées (s) rotation/chute (§5) · accél. chute (cases/s²) · restitution au rebond · shake max (px) · marge plateau
const DUREE_ROTATION = 0.38, DUREE_CHUTE = 0.35, GRAVITE_CASES = 78, RESTITUTION = 0.25, SHAKE_MAX = 10, MARGE = 0.94;
const CAUSES_EXPLOSION = new Set(['bombe', 'ligne', 'croix', 'couleur', 'fusee']); // anneau d'onde de choc (§2)
// a1 (anticipation, 80 ms, squash x1,08/y0,92 + recul) · a3 (overshoot d'atterrissage 0,10→0,14) · a4 (pulsation spéciales, 1,2 s)
const DUREE_ANTICIPATION = 0.08, AMPLI_ANTICIPATION = 0.08, RECUL_ANTICIPATION = 0.055, AMPLI_ATTERRISSAGE = 0.14;
const clamp01 = (t) => Math.max(0, Math.min(1, t)), lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const attend = (ms) => new Promise((res) => setTimeout(res, ms)); // gravité en coordonnées plateau, table fixe (§1)
const TABLE_G = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }];
const vecteurG = (g) => TABLE_G[((g % 4) + 4) % 4];
export function creerRendu(canvas, { onTap, onSurvol } = {}) {
  const ctx = canvas.getContext('2d');
  const sprites = creerSprites(), particules = creerParticules(), decor = creerDecor();
  const juice = creerJuice(), impact = creerImpact(), telegraphe = creerTelegraphe();
  const dessin = creerDessinCellule(ctx, sprites);
  // wrappers : lisent tempsTotal/cellPixBase/angleActuel courants à chaque appel (mêmes signatures qu'avant l'extraction)
  const dessinerCellule = (bv) => dessin.dessinerCellule(bv, tempsTotal, cellPixBase, angleActuel);
  const dessinerSurlignage = (lx, ly) => dessin.dessinerSurlignage(lx, ly, cellPixBase);
  const squashPlateau = juice.creerSquash(0.25, 0.04); // échelle x 1,04 / y 0,96, 250 ms (§2)
  // --- état de la grille / plateau, et de la transform écran (centre+secousse, rotation, échelle)
  let w = 8, h = 10, forme = null, graviteCourante = 0, etatCourant = null;
  const billes = new Map(); // id -> billeVis
  let cellPixBase = 40, fitNormalPx = 40, fitSwapPx = 40, angleActuel = 0, echelleActuelle = 1;
  let angleTween = null; // {angleDebut,angleFin,echelleDebut,echelleFin,t,duree}
  let shakeMag = 0, shakeX = 0, shakeY = 0, tempsTotal = 0; // tempsTotal : micro-animations vivantes (sucette, étincelle)
  let dernierDetruit = null; // position écran de la dernière salve `detruit` (pour le +XP qui suit, §2)
  const surligneesSet = new Set();
  let courantAudio = null, rafId = null, dernierT = null;
  // fabrique un sprite visuel de bille à partir d'une Cellule (§1)
  function creerBilleVis(cel, x, y) {
    return {
      id: cel.id, type: cel.type, couleur: cel.couleur, speciale: cel.speciale || null,
      element: cel.element ? { type: cel.element.type, activations: cel.element.activations || 0, max: cel.element.max || 1, contenu: cel.element.contenu || null } : null,
      x, y, echelle: 1, alpha: 1, fondu: null, pulse: null, pop: null, chute: null, glisse: null,
      squash: null, squashX: 1, squashY: 1, anticip: null,
    };
  }
  // --- transform : case plateau <-> pixel écran (fonctions miroir l'une de l'autre) --------
  function localVersEcran(cx, cy) {
    const lx = (cx - w / 2 + 0.5) * cellPixBase * echelleActuelle, ly = (cy - h / 2 + 0.5) * cellPixBase * echelleActuelle;
    const ca = Math.cos(angleActuel), sa = Math.sin(angleActuel);
    return { x: canvas.width / 2 + shakeX + lx * ca - ly * sa, y: canvas.height / 2 + shakeY + lx * sa + ly * ca };
  }
  function ecranVersCase(px, py) {
    const dx = px - (canvas.width / 2 + shakeX), dy = py - (canvas.height / 2 + shakeY);
    const ca = Math.cos(-angleActuel), sa = Math.sin(-angleActuel);
    const lx = (dx * ca - dy * sa) / echelleActuelle, ly = (dx * sa + dy * ca) / echelleActuelle;
    return { x: lx / cellPixBase + w / 2 - 0.5, y: ly / cellPixBase + h / 2 - 0.5 };
  }
  const calcEchelle = (gravite) => (gravite % 2 === 0 ? fitNormalPx : fitSwapPx) / cellPixBase;
  function recalculerEchelles() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const cw = Math.max(1, Math.round((canvas.clientWidth || canvas.width || 1) * dpr));
    const ch = Math.max(1, Math.round((canvas.clientHeight || canvas.height || 1) * dpr));
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    fitNormalPx = Math.min((cw * MARGE) / w, (ch * MARGE) / h); fitSwapPx = Math.min((cw * MARGE) / h, (ch * MARGE) / w);
    cellPixBase = Math.max(8, Math.floor(Math.max(fitNormalPx, fitSwapPx)));
    sprites.regenererCases(cellPixBase); sprites.regenererPlateau(w, h, cellPixBase, forme); decor.regenerer(cellPixBase);
    if (!angleTween) echelleActuelle = calcEchelle(graviteCourante);
  }
  // --- pointeur : tap (souris et tactile) et survol -----------------------------------------
  function pointDepuisEvenement(e) {
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width || canvas.width || 1, rh = rect.height || canvas.height || 1;
    const c = ecranVersCase((e.clientX - rect.left) * (canvas.width / rw), (e.clientY - rect.top) * (canvas.height / rh));
    const rx = Math.round(c.x), ry = Math.round(c.y);
    if (rx < 0 || ry < 0 || rx >= w || ry >= h || (forme && forme[ry * w + rx] === 0)) return null;
    return { x: rx, y: ry };
  }
  const surPointerDown = (e) => { const p = pointDepuisEvenement(e); if (p && onTap) onTap(p.x, p.y); };
  const surPointerMove = (e) => { const p = pointDepuisEvenement(e); if (onSurvol) onSurvol(p ? { x: p.x, y: p.y } : null); };
  const surPointerLeave = () => { if (onSurvol) onSurvol(null); };
  canvas.addEventListener('pointerdown', surPointerDown); canvas.addEventListener('pointermove', surPointerMove); canvas.addEventListener('pointerleave', surPointerLeave);
  // --- intégrateurs d'animation par bille -----------------------------------------------------
  function demarrerChute(bv, de, vers, retard = 0) {
    // décompose le déplacement sur l'axe de G (animé) et son perpendiculaire (posé instantanément)
    const axeX = de.y === vers.y && de.x !== vers.x;
    if (axeX) { bv.y = vers.y; bv.x = de.x; } else { bv.x = vers.x; bv.y = de.y; }
    const delta = axeX ? vers.x - de.x : vers.y - de.y;
    const dir = delta === 0 ? 1 : Math.sign(delta);
    bv.chute = { axe: axeX ? 'x' : 'y', origine: axeX ? de.x : de.y, dir, distance: Math.abs(delta), v: 0, pos: 0, t: 0, rebondFait: false, retard };
  }
  function avancerChute(bv, dt) {
    const c = bv.chute; if (!c) return;
    if (c.retard > 0) { c.retard -= dt; if (c.retard > 0) return; dt += c.retard; c.retard = 0; }
    c.v += GRAVITE_CASES * dt; c.pos += c.v * dt; c.t += dt;
    let fini = false;
    if (!c.rebondFait && c.pos >= c.distance) {
      c.pos = c.distance - (c.pos - c.distance) * RESTITUTION;
      c.v = -c.v * RESTITUTION; c.rebondFait = true;
      // a3 : squash à l'atterrissage, overshoot amplifié (0,10 → 0,14), + poussière d'impact
      bv.squash = { t: 0, duree: 0.18, ampli: AMPLI_ATTERRISSAGE };
      const ei = localVersEcran(c.axe === 'x' ? c.origine + c.dir * c.distance : bv.x, c.axe === 'y' ? c.origine + c.dir * c.distance : bv.y);
      particules.emettrePoussiere(ei.x, ei.y);
      if (courantAudio) courantAudio.jouer('rebond', { n: 1 });
    } else if (c.rebondFait && c.v <= 0) fini = true;
    if (c.t > 0.6) fini = true;
    if (fini) { c.pos = c.distance; bv.chute = null; }
    const val = c.origine + c.dir * c.pos;
    if (c.axe === 'x') bv.x = val; else bv.y = val;
  }
  function demarrerGlisse(bv, de, vers, duree, retirerApres) {
    bv.x = de.x; bv.y = de.y;
    bv.glisse = { de: { x: de.x, y: de.y }, vers: { x: vers.x, y: vers.y }, t: 0, duree, retirerApres };
  }
  function avancerGlisse(id, bv, dt) {
    const gl = bv.glisse; if (!gl) return;
    gl.t += dt;
    const p = easeInOut(clamp01(gl.t / gl.duree));
    bv.x = lerp(gl.de.x, gl.vers.x, p); bv.y = lerp(gl.de.y, gl.vers.y, p);
    if (gl.t >= gl.duree) { bv.glisse = null; if (gl.retirerApres) billes.delete(id); }
  }
  // a1 : amorce le squash + recul vers le barycentre des billes du groupe qui va être détruit
  // (avancé chaque frame dans majAnimations). Purement cosmétique : n'affecte pas le jeu.
  function demarrerAnticipation(cellules) {
    let sx = 0, sy = 0, n = 0; const vus = [];
    for (const c of cellules) { const bv = billes.get(c.id); if (bv) { vus.push(bv); sx += bv.x; sy += bv.y; n++; } }
    if (n === 0) return;
    const bx = sx / n, by = sy / n;
    for (const bv of vus) { const dx = bx - bv.x, dy = by - bv.y, dist = Math.hypot(dx, dy) || 1; bv.anticip = { t: 0, duree: DUREE_ANTICIPATION, x0: bv.x, y0: bv.y, dx: dx / dist, dy: dy / dist }; }
  }
  const declencherShake = (intensite) => { shakeMag = Math.min(SHAKE_MAX, Math.max(shakeMag, SHAKE_MAX * intensite)); };
  function majShake(dt) {
    if (shakeMag > 0.05) { shakeMag *= Math.exp(-dt * 8); shakeX = (Math.random() * 2 - 1) * shakeMag; shakeY = (Math.random() * 2 - 1) * shakeMag; }
    else { shakeMag = 0; shakeX = 0; shakeY = 0; }
  }
  function dessinerFrame() {
    decor.dessiner(ctx, canvas.width, canvas.height, angleActuel); // ciel étoilé tourné avec le plateau (E1)
    ctx.save();
    ctx.translate(canvas.width / 2 + shakeX, canvas.height / 2 + shakeY);
    ctx.rotate(angleActuel); ctx.scale(echelleActuelle * squashPlateau.sx, echelleActuelle * squashPlateau.sy);
    const plateau = sprites.plateau(); if (plateau) ctx.drawImage(plateau, -plateau.width / 2, -plateau.height / 2);
    for (const [, bv] of billes) {
      const lx = (bv.x - w / 2 + 0.5) * cellPixBase, ly = (bv.y - h / 2 + 0.5) * cellPixBase;
      if (surligneesSet.size && surligneesSet.has(`${Math.round(bv.x)},${Math.round(bv.y)}`)) dessinerSurlignage(lx, ly); // pas de chaîne allouée sans survol
      ctx.save();
      ctx.translate(lx, ly); ctx.globalAlpha = bv.alpha * (telegraphe.ids && telegraphe.ids.has(bv.id) ? 0.28 : 1); // en aperçu, ce qui bouge s'estompe
      ctx.scale(bv.echelle * bv.squashX, bv.echelle * bv.squashY);
      dessinerCellule(bv);
      ctx.restore();
    }
    telegraphe.dessiner(ctx, { cellPixBase, w, h, billes, dessinerCellule, tempsTotal, couleurHex });
    ctx.restore();
    juice.dessinerOndes(ctx, cellPixBase); juice.dessinerTextes(ctx, cellPixBase);
    impact.dessiner(ctx, cellPixBase); // a2 : flash + halo, sous les confettis
    particules.dessiner(ctx);
  }
  // Boucle en continu tant que visible (§2, décor), coupée sur document.hidden puis reprise par
  // 'visibilitychange'. `enAnimation` (§5) reflète l'activité de premier plan, pas cette boucle.
  function rienNAnime() {
    if (angleTween || telegraphe.actif || particules.enCours || juice.enCours || impact.enCours || squashPlateau.actif || shakeMag > 0.05 || surligneesSet.size > 0) return false;
    for (const [, bv] of billes) if (bv.chute || bv.glisse || bv.pulse || bv.fondu || bv.pop || bv.squash || bv.anticip) return false;
    return true;
  }
  function majAnimations(dt) {
    tempsTotal += dt; decor.maj(dt); squashPlateau.maj(dt); juice.majTextes(dt); juice.majOndes(dt); impact.maj(dt);
    if (angleTween) {
      angleTween.t += dt;
      const p = clamp01(angleTween.t / angleTween.duree), e = easeInOut(p);
      angleActuel = lerp(angleTween.angleDebut, angleTween.angleFin, e);
      echelleActuelle = lerp(angleTween.echelleDebut, angleTween.echelleFin, e);
      if (p >= 1) angleTween = null;
    }
    for (const [id, bv] of billes) {
      if (bv.fondu) { bv.fondu.t += dt; if (bv.fondu.t >= bv.fondu.duree) bv.fondu = null; }
      if (bv.pulse) { bv.pulse.t += dt; const p = clamp01(bv.pulse.t / bv.pulse.duree); bv.echelle = 1 + Math.sin(p * Math.PI) * 0.18; if (p >= 1) { bv.pulse = null; bv.echelle = 1; } }
      if (bv.pop) { bv.pop.t += dt; const p = clamp01(bv.pop.t / bv.pop.duree); bv.echelle = easeInOut(p); if (p >= 1) { bv.pop = null; bv.echelle = 1; } }
      if (bv.squash) { bv.squash.t += dt; const p = clamp01(bv.squash.t / bv.squash.duree), s = Math.sin(p * Math.PI), a = bv.squash.ampli ?? 0.1; bv.squashX = 1 + a * s; bv.squashY = 1 - a * s; if (p >= 1) { bv.squash = null; bv.squashX = 1; bv.squashY = 1; } }
      if (bv.anticip) { // a1 : squash x1,08/y0,92 + recul vers le barycentre, avant destruction
        const an = bv.anticip; an.t += dt;
        const p = clamp01(an.t / an.duree), e = easeOutCubic(p), recul = RECUL_ANTICIPATION * e;
        bv.squashX = 1 + AMPLI_ANTICIPATION * e; bv.squashY = 1 - AMPLI_ANTICIPATION * e;
        bv.x = an.x0 + an.dx * recul; bv.y = an.y0 + an.dy * recul;
        if (p >= 1) bv.anticip = null;
      }
      if (bv.chute) avancerChute(bv, dt);
      if (bv.glisse) avancerGlisse(id, bv, dt);
    }
    majShake(dt); particules.maj(dt);
  }
  function tick(ts) {
    if (dernierT == null) dernierT = ts;
    const dt = Math.min(0.05, (ts - dernierT) / 1000); dernierT = ts;
    majAnimations(dt); dessinerFrame();
    if (typeof document !== 'undefined' && document.hidden) { rafId = null; return; } // repris par 'visibilitychange'
    rafId = requestAnimationFrame(tick);
  }
  let enPause = false; // retour au menu : plus rien à dessiner, on coupe la boucle (audit code 2026-09-11)
  function pause() { enPause = true; if (rafId != null) cancelAnimationFrame(rafId); rafId = null; }
  function reprendre() { enPause = false; demarrerBoucle(); }
  function demarrerBoucle() {
    if (enPause || rafId != null || (typeof document !== 'undefined' && document.hidden)) return;
    dernierT = null; rafId = requestAnimationFrame(tick);
  }
  // --- gestion des événements du journal (§4) : chacun anime puis attend sa propre durée ------
  // a1 : mot de combo sur la case tapée (§2), puis anticipation (squash + recul, 80 ms) sur le
  // groupe qui va être détruit — `detruitSuivant` = l'événement `detruit` qui suit immédiatement
  // ce `tap` dans le journal (peeké par jouer()), ou null s'il n'y en a pas.
  async function surTap(evt, detruitSuivant) {
    const ecran = localVersEcran(evt.x, evt.y);
    juice.emettreCombo(ecran.x, ecran.y, evt.taille || 0);
    if (courantAudio) courantAudio.jouer('tap', { taille: evt.taille });
    if (detruitSuivant && detruitSuivant.cellules && detruitSuivant.cellules.length) {
      demarrerAnticipation(detruitSuivant.cellules);
      demarrerBoucle(); await attend(DUREE_ANTICIPATION * 1000); // les `detruit` qui suivent attendent ces 80 ms
    } else demarrerBoucle();
  }
  function surXp(evt) { // +gain à la position de la dernière salve `detruit` (§2, xp suit toujours detruit)
    if (dernierDetruit) juice.emettreXP(dernierDetruit.x, dernierDetruit.y, evt.gain);
    demarrerBoucle();
  }
  async function surDetruit(evt) {
    const cellules = evt.cellules || [], taille = cellules.length || 1;
    let sx = 0, sy = 0, n = 0;
    for (const c of cellules) {
      const bv = billes.get(c.id), pos = bv ? { x: bv.x, y: bv.y } : { x: c.x, y: c.y }, ecran = localVersEcran(pos.x, pos.y);
      sx += ecran.x; sy += ecran.y; n++;
      particules.emettreDestruction(ecran.x, ecran.y, couleurHex(c.couleur), Math.min(12, 4 + Math.round(16 / taille)));
      if (bv) billes.delete(c.id);
    }
    if (n > 0) {
      dernierDetruit = { x: sx / n, y: sy / n };
      if (CAUSES_EXPLOSION.has(evt.cause)) juice.emettreOnde(dernierDetruit.x, dernierDetruit.y, cellPixBase * (0.8 + Math.min(1.4, taille * 0.07)));
      // a2 : flash + halo teinté (couleur dominante du groupe) au barycentre, sous les confettis
      const dominante = cellules.find((c) => c.couleur != null);
      impact.emettreImpact(dernierDetruit.x, dernierDetruit.y, dominante ? dominante.couleur : null);
    }
    if (evt.cause === 'bombe') { // « BOOM ! » à l'origine de l'explosion (§7)
      const org = evt.origine || (cellules[0] ? { x: cellules[0].x, y: cellules[0].y } : null);
      if (org) { const eo = localVersEcran(org.x, org.y); juice.emettreBoom(eo.x, eo.y); }
    }
    declencherShake(Math.min(1, taille / 10));
    if (courantAudio) courantAudio.jouer('detruit', { taille, cause: evt.cause, profondeur: evt.profondeur || 0 });
    demarrerBoucle(); await attend(90);
  }
  async function surSpeciale(evt) {
    const bv = billes.get(evt.id); if (bv) { bv.speciale = evt.type; bv.pulse = { t: 0, duree: 0.22 }; }
    if (courantAudio) courantAudio.jouer('speciale', { type: evt.type });
    demarrerBoucle(); await attend(180);
  }
  async function surConversion(evt) {
    for (const c of evt.cellules) {
      const bv = billes.get(c.id); if (!bv) continue;
      if (c.type) bv.type = c.type; // ex : pierre convertie en bille
      bv.fondu = { de: bv.couleur != null ? bv.couleur : c.couleur, vers: c.couleur, t: 0, duree: 0.3 }; bv.couleur = c.couleur;
    }
    demarrerBoucle(); await attend(300);
  }
  async function surElement(evt) {
    const bv = billes.get(evt.id);
    if (bv) {
      bv.element = { type: evt.type, activations: evt.activations, max: evt.max, contenu: bv.element ? bv.element.contenu : null };
      if (evt.action === 'activation' || evt.action === 'libere') bv.pulse = { t: 0, duree: 0.2 };
      else if (evt.action === 'eclate') {
        const ecran = localVersEcran(bv.x, bv.y);
        if (evt.type === 'ballon') particules.emettreConfettis(ecran.x, ecran.y, 18);
        else particules.emettreDestruction(ecran.x, ecran.y, couleurHex(bv.couleur), 14);
        billes.delete(evt.id);
      } else if (evt.action === 'fusee') {
        const G = vecteurG(graviteCourante);
        demarrerGlisse(bv, { x: bv.x, y: bv.y }, { x: bv.x + G.x * (w + h), y: bv.y + G.y * (w + h) }, 0.3, true);
      } else if (evt.action === 'monte') {
        demarrerGlisse(bv, evt.de || { x: bv.x, y: bv.y }, { x: evt.x, y: evt.y }, 0.2, false);
      }
    }
    if (courantAudio) courantAudio.jouer('element', { type: evt.type, action: evt.action });
    demarrerBoucle(); await attend(evt.action === 'monte' ? 200 : evt.action === 'fusee' ? 300 : 150);
  }
  async function surRotation(evt) {
    const avant = graviteCourante;
    graviteCourante = evt.vers != null ? evt.vers : ((avant + evt.sens + 4) % 4);
    const delta = evt.sens === 2 ? Math.PI : evt.sens * (Math.PI / 2);
    angleTween = { angleDebut: angleActuel, angleFin: angleActuel + delta, echelleDebut: calcEchelle(avant), echelleFin: calcEchelle(graviteCourante), t: 0, duree: DUREE_ROTATION };
    if (courantAudio) courantAudio.jouer('rotation', { sens: evt.sens });
    demarrerBoucle(); await attend(DUREE_ROTATION * 700); // la chute qui suit démarre pendant la fin (ease-out) de la rotation
    setTimeout(() => squashPlateau.declencher(), DUREE_ROTATION * 300); // squash élastique du plateau en fin de rotation (§2)
  }
  function lancerChute(evt) {
    for (const d of evt.deplacements || []) { const bv = billes.get(d.id); if (bv) demarrerChute(bv, d.de, d.vers); }
    demarrerBoucle();
  }
  async function surChute(evt) { // squash élastique du plateau à l'atterrissage des billes (§2)
    lancerChute(evt); await attend(DUREE_CHUTE * 1000); squashPlateau.declencher();
  }
  async function surRemplissage(evt) {
    for (const c of evt.cellules || []) {
      const bv = creerBilleVis(c, c.depuis.x, c.depuis.y);
      billes.set(c.id, bv); demarrerChute(bv, c.depuis, { x: c.x, y: c.y });
    }
    demarrerBoucle(); await attend(DUREE_CHUTE * 1000); squashPlateau.declencher();
  }
  async function surMaree(evt) {
    const duree = 0.3;
    for (const d of evt.deplacements || []) { const bv = billes.get(d.id); if (bv) demarrerGlisse(bv, { x: bv.x, y: bv.y }, d.vers, duree, false); }
    for (const e of evt.entrees || []) {
      const depuis = e.depuis || { x: e.x, y: e.y }, bv = creerBilleVis(e, depuis.x, depuis.y);
      billes.set(e.id, bv); demarrerGlisse(bv, depuis, { x: e.x, y: e.y }, duree, false);
    }
    for (const s of evt.sorties || []) billes.delete(s.id);
    demarrerBoucle(); await attend(duree * 1000);
  }
  async function surSalle() {
    const G = vecteurG(graviteCourante);
    for (const [, bv] of billes) {
      const cible = { x: bv.x, y: bv.y }, depart = { x: cible.x - G.x * 3, y: cible.y - G.y * 3 };
      demarrerChute(bv, depart, cible, (bv.x + bv.y) * 0.015);
    }
    demarrerBoucle(); await attend(450);
  }
  async function surApparition(evt) {
    for (const c of evt.cellules || []) { const bv = creerBilleVis(c, c.x, c.y); bv.echelle = 0; bv.pop = { t: 0, duree: 0.18 }; billes.set(c.id, bv); }
    demarrerBoucle(); await attend(180);
  }
  // --- API publique (§5) -----------------------------------------------------------------------
  function synchroniser(etat) {
    etatCourant = etat;
    w = etat.grille.w; h = etat.grille.h; forme = etat.grille.forme || null; graviteCourante = etat.gravite || 0;
    const s = etat.salle; decor.definirActe(s && s.total ? s.index / s.total : 0); // E1 : ciel/nébuleuses selon l'acte — tolérant si absent
    angleTween = null; telegraphe.definir(null); particules.vider(); juice.vider(); impact.vider(); dernierDetruit = null;
    shakeMag = 0; shakeX = 0; shakeY = 0; surligneesSet.clear(); billes.clear();
    recalculerEchelles();
    angleActuel = graviteCourante * (Math.PI / 2); echelleActuelle = calcEchelle(graviteCourante);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (forme && forme[idx] === 0) continue;
      const cel = etat.grille.cellules[idx];
      if (cel) billes.set(cel.id, creerBilleVis(cel, x, y));
    }
    dessinerFrame();
    demarrerBoucle(); // le décor anime en continu tant que visible (§2)
  }
  async function jouer(evenements, { audio } = {}) {
    courantAudio = audio || null;
    if (telegraphe.actif) previsualiserRotation(null);
    demarrerBoucle();
    const liste = evenements || [];
    for (let i = 0; i < liste.length; i++) {
      const evt = liste[i], suivant = liste[i + 1];
      switch (evt.t) {
        case 'tap': await surTap(evt, suivant && suivant.t === 'detruit' ? suivant : null); break; // a1 : attend l'anticipation (80 ms) avant le detruit qui suit
        case 'detruit': await surDetruit(evt); break;
        case 'speciale': await surSpeciale(evt); break;
        case 'conversion': await surConversion(evt); break;
        case 'element': await surElement(evt); break;
        case 'rotation': await surRotation(evt); break;
        case 'chute': // chute et remplissage jouent en parallèle : une seule attente (audit gameplay, cible < 450 ms par tap)
          if (suivant && suivant.t === 'remplissage') { lancerChute(evt); await surRemplissage(suivant); i++; }
          else await surChute(evt);
          break;
        case 'remplissage': await surRemplissage(evt); break;
        case 'maree': await surMaree(evt); break;
        case 'salle': await surSalle(evt); break;
        case 'apparition': await surApparition(evt); break;
        case 'xp': surXp(evt); break;
        default: break; // événement ignoré par le rendu (UI/audio/moteur uniquement)
      }
    }
  }
  function surligner(cellules) {
    surligneesSet.clear();
    for (const c of cellules || []) surligneesSet.add(`${c.x},${c.y}`);
    demarrerBoucle(); if (!cellules || cellules.length === 0) dessinerFrame();
  }
  /** Télégraphe : `a` = run.apercuRotation(sens) ({sens, gravite, deplacements, entrees, eclatent}) ou null pour effacer. */
  function previsualiserRotation(a) { telegraphe.definir(a); demarrerBoucle(); dessinerFrame(); }
  function redimensionner() { if (etatCourant) { recalculerEchelles(); dessinerFrame(); } }
  let observateur = null; // suit les changements de taille CSS du canvas après mise en page (HUD, couche masquée)
  if (typeof ResizeObserver !== 'undefined') { observateur = new ResizeObserver(redimensionner); observateur.observe(canvas); }
  const surVisibilite = () => { if (typeof document !== 'undefined' && !document.hidden) demarrerBoucle(); }; // décor en continu tant que visible (§2)
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', surVisibilite);
  function detruire() {
    if (observateur) { observateur.disconnect(); observateur = null; }
    if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('visibilitychange', surVisibilite);
    if (rafId != null) cancelAnimationFrame(rafId); rafId = null;
    canvas.removeEventListener('pointerdown', surPointerDown); canvas.removeEventListener('pointermove', surPointerMove); canvas.removeEventListener('pointerleave', surPointerLeave);
    particules.vider(); juice.vider(); impact.vider(); billes.clear();
  }
  return {
    synchroniser, jouer, surligner, previsualiserRotation, redimensionner, detruire, pause, reprendre,
    get enAnimation() { return !rienNAnime(); },
    get apercuActif() { return telegraphe.actif; },
  };
}
