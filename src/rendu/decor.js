// Le décor est rasterisé uniquement à son chargement ou au redimensionnement.
// La rotation du bitmap est composée par le navigateur, hors du canvas du jeu.
import { planeteParId } from '../data/planetes.js';
import { chargerPlanete, dessinerAstre } from './planetes.js';
const TAU = Math.PI * 2;
const MAX_COTE = Math.floor(Math.sqrt(2_000_000));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function calque(nom) {
  const c = document.createElement('canvas');
  c.className = nom; c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position:'absolute', pointerEvents:'none', maxWidth:'none', zIndex:'0' });
  return c;
}
export function creerDecor() {
  let id = 'terre', planete = null, sprite = null, lune = null, phase = 0, version = 0;
  let fond = null, vignette = null, largeur = 0, hauteur = 0, largeurCSS = 0, hauteurCSS = 0, sale = true, dernierAngle = null, detruit = false;
  chargerPlanete('lune', 160).then(s => { if (!detruit) { lune = s; sale = true; } }).catch(() => {});
  function definirPlanete(nouveau, etape = 0) {
    if (detruit) return;
    const next = nouveau || 'terre', nouvellePhase = Number(etape) || 0;
    if (next === id && nouvellePhase === phase && (sprite || version)) return;
    id = next; phase = nouvellePhase; planete = planeteParId(id); sprite = null; sale = true;
    const v = ++version;
    chargerPlanete(id, 1024, phase).then(s => { if (!detruit && v === version) { sprite = s; sale = true; } }).catch(() => {});
  }
  function regenerer(_cell, cw, ch) {
    if (cw !== largeur || ch !== hauteur) { largeur = cw; hauteur = ch; sale = true; }
  }
  function installer(cible) {
    const parent = cible.parentElement;
    if (!parent) return false;
    fond = calque('decor-planetaire'); vignette = calque('decor-vignette');
    Object.assign(fond.style, { left:'50%', top:'50%', transformOrigin:'50% 50%', willChange:'transform' });
    Object.assign(vignette.style, { left:'0', top:'0', width:'100%', height:'100%' });
    parent.insertBefore(fond, cible); parent.insertBefore(vignette, cible);
    return true;
  }
  function peindre(cible, cw, ch) {
    // Deux mégapixels maximum pour le fond, quelle que soit la densité de l'écran.
    // Le carré diagonal couvre le viewport pour tous les angles intermédiaires.
    const diagonale = Math.ceil(Math.hypot(cw, ch) * 1.05);
    const cote = Math.max(1, Math.min(MAX_COTE, diagonale)), ratio = cote / diagonale;
    const densite = cw / (cible.clientWidth || cw);
    fond.width = fond.height = cote;
    fond.style.width = fond.style.height = `${diagonale / densite}px`;
    const ctx = fond.getContext('2d', { alpha:false });
    ctx.fillStyle = '#030917'; ctx.fillRect(0, 0, cote, cote);
    ctx.scale(ratio, ratio); ctx.translate(diagonale / 2, diagonale / 2);
    // Même constellation déterministe et mêmes coordonnées que le décor initial.
    const side = Math.min(2048, diagonale), random = rng(1337);
    for (let i = 0; i < 420; i++) {
      const x = random() * side - side / 2, y = random() * side - side / 2, r = .4 + random() * 1.2;
      ctx.globalAlpha = .3 + random() * .7; ctx.fillStyle = i % 5 ? '#d1e8ff' : '#ffe3aa';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (i % 40 === 0) { ctx.fillRect(x - r * 3, y - .4, r * 6, .8); ctx.fillRect(x - .4, y - r * 3, .8, r * 6); }
    }
    ctx.globalAlpha = 1;
    const m = Math.min(cw, ch), radius = m * .85, px = m * .38, py = m * .42;
    const sx = -m * .4, sy = -m * .44, sr = m * (id === 'mercure' ? .052 : .025);
    const soleil = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 9);
    soleil.addColorStop(0, '#fff7d1'); soleil.addColorStop(.1, 'rgba(255,222,148,.9)'); soleil.addColorStop(.28, 'rgba(250,152,64,.18)'); soleil.addColorStop(1, 'rgba(255,150,30,0)');
    ctx.fillStyle = soleil; ctx.fillRect(sx - sr * 9, sy - sr * 9, sr * 18, sr * 18);
    ctx.beginPath(); ctx.arc(sx, sy, sr * .7, 0, TAU); ctx.fillStyle = '#fff7e1'; ctx.fill();
    if (sprite) dessinerAstre(ctx, sprite, px, py, radius);
    else {
      const g = ctx.createRadialGradient(px - radius * .4, py - radius * .4, 0, px, py, radius);
      g.addColorStop(0, planete?.couleur || '#49687e'); g.addColorStop(1, '#060b13');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, radius, 0, TAU); ctx.fill();
    }
    const moons = Math.min(3, planete?.lunes ?? (id === 'terre' ? 1 : 0));
    for (let i = 0; i < moons; i++) {
      const mx = -m * .35 + i * m * .21, my = -m * .13 - i * m * .11, r = m * (.025 + i * .007);
      if (lune) dessinerAstre(ctx, lune, mx, my, r);
    }
    // La vignette reste fixe par rapport à l'écran, comme auparavant.
    const reduction = Math.min(1, Math.sqrt(1_000_000 / (cw * ch)));
    vignette.width = Math.max(1, Math.round(cw * reduction)); vignette.height = Math.max(1, Math.round(ch * reduction));
    const vctx = vignette.getContext('2d'); vctx.scale(vignette.width / cw, vignette.height / ch);
    const v = vctx.createRadialGradient(cw * .5, ch * .5, m * .28, cw * .5, ch * .5, Math.max(cw, ch) * .72);
    v.addColorStop(0, 'rgba(1,5,15,0)'); v.addColorStop(1, 'rgba(1,5,15,.38)');
    vctx.fillStyle = v; vctx.fillRect(0, 0, cw, ch);
    sale = false;
  }
  function dessiner(ctx, cw, ch, angle) {
    if (detruit) return;
    if (!version) definirPlanete(id);
    regenerer(0, cw, ch);
    // Le budget de pixels peut garder le même framebuffer pendant un resize CSS.
    const cssW = ctx.canvas.clientWidth, cssH = ctx.canvas.clientHeight;
    if (cssW !== largeurCSS || cssH !== hauteurCSS) { largeurCSS = cssW; hauteurCSS = cssH; sale = true; }
    if (!fond && !installer(ctx.canvas)) return;
    if (sale) peindre(ctx.canvas, cw, ch);
    if (angle !== dernierAngle) {
      fond.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
      dernierAngle = angle;
    }
  }
  function detruire() {
    detruit = true; version++;
    for (const c of [fond, vignette]) if (c) { c.remove(); c.width = c.height = 1; }
    fond = vignette = sprite = lune = null;
  }
  return { regenerer, definirPlanete, definirActe() {}, maj() {}, dessiner, detruire };
}
