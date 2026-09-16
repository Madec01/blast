// Dessin d'une cellule (bille, pierre, élément) — extrait de rendu.js (audit taille de fichier,
// comportement inchangé, §5). Créé avec les mêmes instances `ctx`/`sprites` que rendu.js ; l'état
// qui varie par frame/bille (tempsTotal, cellPixBase, angleActuel) est passé en paramètre.

import { ENCRE } from '../data/couleurs.js';

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const PERIODE_HALO_SPECIALE = 1.2; // s — a4 : pulsation des spéciales au repos

export function creerDessinCellule(ctx, sprites) {
  const dessinerCentre = (image) => { if (image) ctx.drawImage(image, -image.width / 2, -image.height / 2); };
  function dessinerContenu(c) {
    if (!c) return;
    dessinerCentre(c.type === 'pierre' ? sprites.pierre() : sprites.bille(c.couleur != null ? c.couleur : 0));
  }
  // a4 : halo pulsé derrière les spéciales au repos (alpha 0,15 ↔ 0,35, période 1,2 s), même
  // hors animation — cercle plein alpha-modulé, jamais de dégradé par frame.
  function dessinerHaloSpeciale(bv, tempsTotal, cellPixBase) {
    const alpha = 0.25 + 0.1 * Math.sin((tempsTotal / PERIODE_HALO_SPECIALE) * Math.PI * 2 + bv.x * 1.7 + bv.y * 2.3); // déphasage par case
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, cellPixBase * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`; ctx.fill(); ctx.restore();
  }
  function dessinerBilleCouleur(bv, tempsTotal, cellPixBase, angleActuel) {
    if (bv.speciale) dessinerHaloSpeciale(bv, tempsTotal, cellPixBase);
    if (bv.speciale === 'bombe') { // étincelle vivante : flicker par frame, pas de sprite recalculé
      dessinerCentre(sprites.bombe());
      const off = sprites.bombeMecheOffset(), a = 0.55 + 0.45 * Math.sin(tempsTotal * 9 + bv.x * 3 + bv.y * 5);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ffe27a';
      ctx.beginPath(); ctx.arc(off.ox, off.oy, cellPixBase * 0.055, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      return;
    }
    if (bv.speciale === 'couleur') { ctx.save(); ctx.rotate(tempsTotal * 0.6); dessinerCentre(sprites.couleurSpeciale()); ctx.restore(); return; } // sucette qui tourne lentement
    if (bv.fondu) {
      const p = easeInOut(clamp01(bv.fondu.t / bv.fondu.duree));
      ctx.save(); ctx.globalAlpha *= 1 - p; dessinerCentre(sprites.bille(bv.fondu.de)); ctx.restore();
      ctx.save(); ctx.globalAlpha *= p; dessinerCentre(sprites.bille(bv.fondu.vers)); ctx.restore();
    } else dessinerCentre(sprites.bille(bv.couleur != null ? bv.couleur : 0));
    if (bv.speciale === 'ligne' || bv.speciale === 'croix') { // contre-rotation : icône alignée sur la gravité écran
      ctx.save(); ctx.rotate(-angleActuel);
      dessinerCentre(bv.speciale === 'ligne' ? sprites.overlayLigne() : sprites.overlayCroix());
      ctx.restore();
    }
  }
  function dessinerElement(bv, angleActuel, cellPixBase, tempsTotal) {
    const el = bv.element || {};
    if (el.type === 'relique') {
      const r=cellPixBase*.4;
      ctx.save();ctx.rotate(-angleActuel);ctx.shadowColor='#7affde';ctx.shadowBlur=cellPixBase*.3;
      ctx.strokeStyle='#66f0d7';ctx.lineWidth=cellPixBase*.035;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.39:r*.86;i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle='#ffed9d';ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*.1,-r*.12,r*.12,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    else if (el.type === 'bulle') { if (el.contenu) { ctx.save(); ctx.scale(0.62, 0.62); dessinerContenu(el.contenu); ctx.restore(); } dessinerCentre(sprites.bulleOverlay()); }
    else if (el.type === 'ballon') { // étoile filante (E1) : contre-rotée comme fusee/ligne pour rester orientée écran-haut
      ctx.save(); ctx.rotate(-angleActuel); dessinerCentre(sprites.ballon(bv.couleur != null ? bv.couleur : 0)); ctx.restore();
    }
    else if (el.type === 'fusee') { ctx.save(); ctx.rotate(-angleActuel); dessinerCentre(sprites.fusee()); ctx.restore(); }
  }
  function dessinerCellule(bv, tempsTotal, cellPixBase, angleActuel) {
    if (bv.type === 'pierre') dessinerCentre(sprites.pierre());
    else if (bv.type === 'element') dessinerElement(bv, angleActuel, cellPixBase, tempsTotal);
    else dessinerBilleCouleur(bv, tempsTotal, cellPixBase, angleActuel);
  }
  function dessinerSurlignage(lx, ly, cellPixBase) {
    ctx.save(); ctx.translate(lx, ly);
    ctx.beginPath(); ctx.arc(0, 0, cellPixBase * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
    ctx.lineWidth = Math.max(1, cellPixBase * 0.035); ctx.strokeStyle = ENCRE; ctx.globalAlpha = 0.55; ctx.stroke();
    ctx.restore();
  }
  return { dessinerCellule, dessinerSurlignage };
}
