// Sprites pré-rendus sur canvas hors écran — cristaux et instruments d’Hélios.
// Six silhouettes, facettes minérales et reflets fins, jamais de dégradé recalculé par frame. Régénérés uniquement quand la taille de case change :
// rendu.js ne fait que des drawImage + transformations sur ces sprites.

import { COULEURS, ENCRE } from '../data/couleurs.js';


// --- petits utilitaires couleur -----------------------------------------------------
function hex2rgb(hex) { const n = parseInt(hex.slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
function melangeHex(hex1, hex2, t) {
  const a = hex2rgb(hex1), b = hex2rgb(hex2);
  return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`;
}
const eclaircir = (hex, t) => melangeHex(hex, '#ffffff', t);
const assombrir = (hex, t) => melangeHex(hex, '#000000', t);

function creerCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return { canvas: c, ctx: c.getContext('2d') };
}

// rectangle à coins arrondis (évite de dépendre de ctx.roundRect)
function chemineRectArrondi(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// étoile à n branches (croix, boulons, étincelle) : chemin seul, à remplir/tracer par l'appelant
function cheminEtoile(ctx, cx, cy, r, branches, ratioCreux) {
  ctx.beginPath();
  for (let i = 0; i < branches; i++) {
    const a = (i / branches) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    const aMid = a + Math.PI / branches;
    ctx.lineTo(cx + Math.cos(aMid) * r * ratioCreux, cy + Math.sin(aMid) * r * ratioCreux);
  }
  ctx.closePath();
}

// Six silhouettes indépendantes de la couleur : lecture du groupe même sans perception
// des teintes. Toute la matière est cuite au redimensionnement, aucun filtre par frame.
function cheminGemme(ctx, cx, cy, r, forme) {
  // Contours francs, six silhouettes identifiables à petite taille.
  const formes = [
    [[-.63,-.86],[.63,-.86],[.86,-.63],[.86,.63],[.63,.86],[-.63,.86],[-.86,.63],[-.86,-.63]],
    [[-.78,.72],[-.9,-.12],[-.38,-.84],[.78,-.72],[.9,.12],[.38,.84]],
    [[0,-.96],[.68,-.68],[.96,0],[.68,.68],[0,.96],[-.68,.68],[-.96,0],[-.68,-.68]],
    [[0,-1],[.86,0],[0,1],[-.86,0]],
    [[-1,0],[-.5,-.86],[.5,-.86],[1,0],[.5,.86],[-.5,.86]],
    [[0,-1],[.77,.08],[.7,.65],[0,.96],[-.7,.65],[-.77,.08]],
  ];
  ctx.beginPath();
  formes[forme % 6].forEach(([x,y],i) => i ? ctx.lineTo(cx+x*r,cy+y*r) : ctx.moveTo(cx+x*r,cy+y*r));
  ctx.closePath();
}

function dessinerBille(ctx, cx, cy, cellPix, hex, contour, forme) {
  const r=cellPix*.424;
  ctx.save();
  cheminGemme(ctx,cx,cy+r*.06,r,forme);
  ctx.fillStyle='#040b17'; ctx.fill();
  cheminGemme(ctx,cx,cy,r,forme);
  const g=ctx.createLinearGradient(cx-r,cy-r,cx+r*.7,cy+r);
  g.addColorStop(0,eclaircir(hex,.36)); g.addColorStop(.2,hex);
  g.addColorStop(.57,assombrir(hex,.24)); g.addColorStop(1,assombrir(hex,.62));
  ctx.fillStyle=g;ctx.fill();
  ctx.lineWidth=Math.max(.8,cellPix*.018);ctx.lineJoin='round';
  ctx.strokeStyle=eclaircir(hex,.36);ctx.stroke();ctx.clip();
  // Plans minéraux et lumière interne : ni reflet ovale ni biseau gonflé.
  ctx.beginPath();ctx.moveTo(cx-r,cy-r);ctx.lineTo(cx+r,cy-r);
  ctx.lineTo(cx+r*.52,cy-r*.5);ctx.lineTo(cx-r*.42,cy-r*.42);ctx.closePath();
  ctx.fillStyle='rgba(239,251,255,.2)';ctx.fill();
  ctx.beginPath();ctx.moveTo(cx-r,cy-r);ctx.lineTo(cx-r*.42,cy-r*.42);
  ctx.lineTo(cx-r*.42,cy+r*.4);ctx.lineTo(cx-r,cy+r);ctx.closePath();
  ctx.fillStyle='rgba(213,247,255,.12)';ctx.fill();
  const core=ctx.createRadialGradient(cx-r*.1,cy+r*.06,0,cx,cy,r*.83);
  core.addColorStop(0,eclaircir(hex,.65));core.addColorStop(.2,hex);core.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=.48;ctx.fillStyle=core;ctx.fillRect(cx-r,cy-r,r*2,r*2);ctx.globalAlpha=1;
  cheminGemme(ctx,cx,cy,r*.57,forme);
  ctx.strokeStyle='rgba(224,252,255,.25)';ctx.lineWidth=Math.max(.5,cellPix*.011);ctx.stroke();
  // Une arête spéculaire fine relie les facettes, direction commune à la série.
  ctx.beginPath();ctx.moveTo(cx-r*.68,cy-r*.48);ctx.lineTo(cx-r*.39,cy-r*.65);ctx.lineTo(cx+r*.28,cy-r*.65);
  ctx.strokeStyle='rgba(246,255,255,.78)';ctx.lineWidth=Math.max(.7,cellPix*.02);ctx.stroke();
  ctx.restore();
}

// --- module principal -----------------------------------------------------------------
export function creerSprites() {
  let cellPix = 0;
  const billes = new Map(), ballons = new Map();
  let bombe = null, mecheOffset = { ox: 0, oy: 0 };
  let flecheLigne = null, etoileCroix = null, sucette = null;
  let pierre = null, bulleOverlay = null, fusee = null;
  let plateauCanvas = null, plateauInfo = null;

  function batirBille(hex, contour, forme) {
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    dessinerBille(ctx, cellPix / 2, cellPix / 2, cellPix, hex, contour, forme);
    return canvas;
  }

  // Contexte « Carrousel cosmique » : l'élément ballon devient une étoile filante (id/comportement
  // inchangés — CONTRATS §1, il monte toujours d'une case contre la gravité à chaque rotation ;
  // rendu.js le contre-tourne comme fusee/ligne pour que la traînée reste orientée écran-haut).
  function batirEtoileFilante(hex, contour) {
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    const cx = cellPix * 0.5, cy = cellPix * 0.6, r = cellPix * 0.27;
    // traînée courte, effilée vers le haut du sprite (canonique — contre-rotée à l'usage)
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.24, cy - r * 0.15);
    ctx.quadraticCurveTo(cx - r * 0.06, cy - r * 2.5, cx, cy - r * 3.2);
    ctx.quadraticCurveTo(cx + r * 0.06, cy - r * 2.5, cx + r * 0.24, cy - r * 0.15); ctx.closePath();
    const gt = ctx.createLinearGradient(cx, cy, cx, cy - r * 3.2);
    gt.addColorStop(0, 'rgba(255,244,200,0.85)'); gt.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = gt; ctx.fill(); ctx.restore();
    // ombre portée douce
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx + r * 0.14, cy + r * 0.3, r * 0.7, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,4,26,0.28)'; ctx.filter = 'blur(1.5px)'; ctx.fill(); ctx.filter = 'none'; ctx.restore();
    // corps : étoile cartoon à 5 branches, aplat dégradé (teinte de la couleur logique), contour encre
    ctx.save(); cheminEtoile(ctx, cx, cy, r, 5, 0.46);
    const g = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, eclaircir(hex, 0.35)); g.addColorStop(0.6, hex); g.addColorStop(1, assombrir(hex, 0.2));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(1.5, cellPix * 0.06); ctx.strokeStyle = contour || assombrir(hex, 0.5); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(cx - r * 0.22, cy - r * 0.24, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.restore();
    return canvas;
  }

  function batirBombe() {
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    const cx=cellPix/2, cy=cellPix/2, r=cellPix*.42;
    // Réacteur à implosion : le point lumineux remplace la mèche historique.
    ctx.save();cheminGemme(ctx,cx,cy,r,4);
    const g=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);
    g.addColorStop(0,'#708d9d');g.addColorStop(.25,'#263d51');g.addColorStop(1,'#081420');
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#a4c5d1';ctx.lineWidth=Math.max(.8,cellPix*.025);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,r*.67,0,Math.PI*2);ctx.strokeStyle='#ffb467';ctx.lineWidth=cellPix*.065;ctx.stroke();
    const core=ctx.createRadialGradient(cx,cy,0,cx,cy,r*.53);
    core.addColorStop(0,'#fff6db');core.addColorStop(.3,'#ffcd7b');core.addColorStop(1,'rgba(255,120,36,0)');
    ctx.fillStyle=core;ctx.fillRect(cx-r,cy-r,r*2,r*2);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3-Math.PI/2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*.76,cy+Math.sin(a)*r*.76);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.strokeStyle='#d9e8eb';ctx.lineWidth=cellPix*.035;ctx.stroke();}
    ctx.restore();mecheOffset={ox:0,oy:0};return canvas;
  }

  function batirSucette() {
    // Noyau spectral : six segments d'énergie dans une cage optique.
    const { canvas, ctx }=creerCanvas(cellPix,cellPix);
    const cx=cellPix/2,cy=cellPix/2,r=cellPix*.425;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#071626';ctx.fill();
    ctx.strokeStyle='#bedbe7';ctx.lineWidth=Math.max(.8,cellPix*.018);ctx.stroke();
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      ctx.beginPath();ctx.arc(cx,cy,r*.76,a+.065,a+Math.PI/3-.065);
      ctx.lineWidth=r*.3;ctx.strokeStyle=COULEURS[i].hex;ctx.stroke();
    }
    const core=ctx.createRadialGradient(cx,cy,0,cx,cy,r*.55);
    core.addColorStop(0,'#ffffff');core.addColorStop(.22,'#bdefff');core.addColorStop(1,'rgba(122,201,255,0)');
    ctx.fillStyle=core;ctx.fillRect(cx-r,cy-r,r*2,r*2);
    cheminGemme(ctx,cx,cy,r*.32,3);ctx.strokeStyle='#e8fbff';ctx.lineWidth=Math.max(.7,cellPix*.016);ctx.stroke();
    return canvas;
  }

  function batirFlecheLigne() {
    // flèche blanche épaisse, canonique pointant « vers le bas » du sprite (contre-rotée à l'usage)
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    const cx = cellPix / 2, cy = cellPix / 2, s = cellPix * 0.32;
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, s * 1.1); ctx.lineTo(-s * 0.62, s * 0.15); ctx.lineTo(-s * 0.24, s * 0.15);
    ctx.lineTo(-s * 0.24, -s * 1.05); ctx.lineTo(s * 0.24, -s * 1.05); ctx.lineTo(s * 0.24, s * 0.15);
    ctx.lineTo(s * 0.62, s * 0.15); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = Math.max(.8, cellPix * 0.022); ctx.strokeStyle = '#183345'; ctx.stroke();
    ctx.restore();
    return canvas;
  }

  function batirEtoileCroix() {
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    const cx = cellPix / 2, cy = cellPix / 2, r = cellPix * 0.34;
    ctx.save();
    cheminEtoile(ctx, cx, cy, r, 4, 0.42);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = Math.max(.8, cellPix * 0.022); ctx.strokeStyle = '#183345'; ctx.stroke();
    ctx.restore();
    return canvas;
  }

  // Contexte « Carrousel cosmique » : la pierre devient un morceau d'astéroïde (id/comportement
  // inchangés) — même polygone jitté gris-bleu remplacé par un gris-brun rocheux + 2-3 cratères.
  function batirPierre() {
    // fragment minéral gris-brun, facetté — polygone déterministe (stable entre régénérations)
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    const cx = cellPix / 2, cy = cellPix / 2, r = cellPix * 0.42;
    const jitter = [1, 0.84, 0.96, 0.78, 1, 0.86, 0.9, 0.8];
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.18, cy + r * 0.28, r * 0.8, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,4,26,0.28)'; ctx.filter = 'blur(1.5px)'; ctx.fill(); ctx.filter = 'none'; ctx.restore();
    ctx.save();
    ctx.beginPath();
    jitter.forEach((j, i) => {
      const a = (i / jitter.length) * Math.PI * 2 - Math.PI / 2, rr = r * j;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); // gris-brun astéroïde
    g.addColorStop(0, '#b79c7a'); g.addColorStop(0.5, '#8a7259'); g.addColorStop(1, '#4a3c2c');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(.8, cellPix * 0.025); ctx.strokeStyle = ENCRE; ctx.stroke(); ctx.restore();
    // cratères : creux ombré + liseré clair (2-3, positions déterministes)
    const crateres = [{ x: cx - r * 0.3, y: cy - r * 0.16, rr: r * 0.22 }, { x: cx + r * 0.26, y: cy + r * 0.1, rr: r * 0.17 }, { x: cx - r * 0.02, y: cy + r * 0.36, rr: r * 0.13 }];
    for (const c of crateres) {
      ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, c.rr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,20,10,0.4)'; ctx.fill();
      ctx.lineWidth = Math.max(1, cellPix * 0.02); ctx.strokeStyle = 'rgba(255,235,200,0.35)'; ctx.stroke(); ctx.restore();
    }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.5); ctx.lineTo(cx + r * 0.1, cy - r * 0.1);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    return canvas;
  }

  function batirBulleOverlay() {
    // sphère de verre transparente, contour + reflet ; le contenu miniature est dessiné en
    // dessous par rendu.js avant de composer cette surcouche.
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    const cx = cellPix / 2, cy = cellPix / 2, r = cellPix * 0.46;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(0.75, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(1.5, cellPix * 0.05); ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.lineWidth = Math.max(1, cellPix * 0.02); ctx.strokeStyle = ENCRE; ctx.globalAlpha = 0.5; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    ctx.restore();
    return canvas;
  }

  function batirFusee() {
    // Sonde dormante en titane, pointe canonique vers le bas (contre-rotée)
    const { canvas, ctx } = creerCanvas(cellPix, cellPix);
    const s = cellPix * 0.4, rouge = '#78afb9';
    ctx.save(); ctx.translate(cellPix / 2, cellPix / 2);
    ctx.beginPath();
    ctx.moveTo(0, s * 1.05); ctx.lineTo(-s * 0.4, s * 0.15);
    ctx.quadraticCurveTo(-s * 0.4, -s * 0.85, 0, -s * 1.05);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.85, s * 0.4, s * 0.15); ctx.closePath();
    const metal=ctx.createLinearGradient(-s,0,s,0);metal.addColorStop(0,'#496575');metal.addColorStop(.45,'#edf4f5');metal.addColorStop(1,'#607985');ctx.fillStyle = metal; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -s * 1.05); ctx.quadraticCurveTo(s * 0.4, -s * 0.85, s * 0.4, -s * 0.35);
    ctx.lineTo(-s * 0.4, -s * 0.35); ctx.quadraticCurveTo(-s * 0.4, -s * 0.85, 0, -s * 1.05); ctx.closePath();
    ctx.fillStyle = rouge; ctx.fill();
    ctx.lineWidth = Math.max(.7, s * 0.035); ctx.strokeStyle = ENCRE;
    ctx.beginPath();
    ctx.moveTo(0, s * 1.05); ctx.lineTo(-s * 0.4, s * 0.15); ctx.quadraticCurveTo(-s * 0.4, -s * 0.85, 0, -s * 1.05);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.85, s * 0.4, s * 0.15); ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.38, s * 0.1); ctx.lineTo(-s * 0.75, s * 0.55); ctx.lineTo(-s * 0.18, s * 0.3); ctx.closePath();
    ctx.moveTo(s * 0.38, s * 0.1); ctx.lineTo(s * 0.75, s * 0.55); ctx.lineTo(s * 0.18, s * 0.3); ctx.closePath();
    ctx.fillStyle = rouge; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.05); ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#8fd6ff'; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.04); ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.restore();
    return canvas;
  }

  function regenererCases(taille) {
    taille = Math.max(4, Math.round(taille));
    if (taille === cellPix) return;
    cellPix = taille;
    billes.clear(); ballons.clear();
    for (const c of COULEURS) { billes.set(c.id, batirBille(c.hex, c.contour, c.id)); ballons.set(c.id, batirEtoileFilante(c.hex, c.contour)); }
    bombe = batirBombe();
    flecheLigne = batirFlecheLigne();
    etoileCroix = batirEtoileCroix();
    sucette = batirSucette();
    pierre = batirPierre();
    bulleOverlay = batirBulleOverlay();
    fusee = batirFusee();
  }

  // Logements discrets : ne concurrencent pas les six silhouettes des gemmes.
  function dessinerCuvette(ctx, cx, cy, taille) {
    const s = taille * 0.445;
    chemineRectArrondi(ctx,cx-s,cy-s,s*2,s*2,taille*.06);
    ctx.fillStyle='rgba(0,5,17,.12)'; ctx.fill();
    ctx.strokeStyle='rgba(166,220,225,.075)'; ctx.lineWidth=Math.max(1,taille*.018); ctx.stroke();
  }

  // (re)construit la texture du plateau : verre fumé + repères métalliques + cuvettes. Une
  // fois par taille de plateau — jamais recalculé par frame.
  function regenererPlateau(w, h, taille, forme) {
    taille = Math.max(4, Math.round(taille));
    if (plateauInfo && plateauInfo.w === w && plateauInfo.h === h && plateauInfo.cellPix === taille && plateauInfo.forme === forme) return;
    plateauInfo = { w, h, cellPix: taille, forme };
    const rim = taille * 0.42, pad = taille * 0.32;
    const largeur = w * taille + rim * 2 + pad * 2, hauteur = h * taille + rim * 2 + pad * 2;
    const { canvas, ctx } = creerCanvas(largeur, hauteur);
    const bx = pad, by = pad, bw = largeur - pad * 2, bh = hauteur - pad * 2, rCoin = rim * .45;

    // ombre portée douce sous le plateau
    ctx.save(); ctx.filter = 'blur(6px)';
    chemineRectArrondi(ctx, bx + rim * 0.3, by + rim * 0.5, bw, bh, rCoin);
    ctx.fillStyle = 'rgba(8,4,26,0.3)'; ctx.fill(); ctx.filter = 'none'; ctx.restore();

    // Cadre optique fin, presque transparent devant le paysage spatial.
    chemineRectArrondi(ctx, bx, by, bw, bh, rCoin);
    const gc = ctx.createLinearGradient(bx, by, bx, by + bh);
    gc.addColorStop(0, 'rgba(132,173,190,.15)'); gc.addColorStop(0.5, 'rgba(15,31,45,.08)'); gc.addColorStop(1, 'rgba(7,16,28,.2)');
    ctx.fillStyle = gc; ctx.fill();
    ctx.lineWidth = Math.max(1, taille * 0.025); ctx.strokeStyle = 'rgba(161,208,223,.38)'; ctx.stroke();

    // Verre fumé pour garder les cristaux lisibles devant la planète.
    const ix = bx + rim, iy = by + rim, iw = bw - rim * 2, ih = bh - rim * 2;
    chemineRectArrondi(ctx, ix, iy, iw, ih, rCoin * 0.55);
    const gf = ctx.createLinearGradient(ix, iy, ix, iy + ih);
    gf.addColorStop(0, 'rgba(3,10,20,.49)'); gf.addColorStop(1, 'rgba(3,10,20,.58)');
    ctx.fillStyle = gf; ctx.fill();
    ctx.lineWidth = Math.max(.6, taille * 0.013); ctx.strokeStyle = 'rgba(156,209,227,.18)'; ctx.stroke();

    // cuvettes en losange, à l'intérieur du champ (clip)
    ctx.save();
    chemineRectArrondi(ctx, ix, iy, iw, ih, rCoin * 0.55); ctx.clip();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (forme && forme[y * w + x] === 0) continue;
      const cx = ix + (x + 0.5) * taille, cy = iy + (y + 0.5) * taille;
      dessinerCuvette(ctx, cx, cy, taille);
    }
    ctx.restore();

    // Repères instrumentaux fins ; aucun boulon décoratif.
    ctx.strokeStyle='rgba(177,226,238,.7)';ctx.lineWidth=Math.max(.8,taille*.022);
    const marge=rim*.3, repere=taille*.35;
    for(const [x,y,sx,sy] of [[bx+marge,by+marge,1,1],[bx+bw-marge,by+marge,-1,1],[bx+marge,by+bh-marge,1,-1],[bx+bw-marge,by+bh-marge,-1,-1]]) {
      ctx.beginPath();ctx.moveTo(x+sx*repere,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*repere);ctx.stroke();
    }

    plateauCanvas = canvas;
  }

  return {
    regenererCases, regenererPlateau,
    bille: (couleur) => billes.get(couleur) || null,
    ballon: (couleur) => ballons.get(couleur) || null,
    bombe: () => bombe,
    bombeMecheOffset: () => mecheOffset,
    overlayLigne: () => flecheLigne,
    overlayCroix: () => etoileCroix,
    couleurSpeciale: () => sucette,
    pierre: () => pierre,
    bulleOverlay: () => bulleOverlay,
    fusee: () => fusee,
    plateau: () => plateauCanvas,
    plateauInfo: () => plateauInfo,
    get cellPix() { return cellPix; },
  };
}
