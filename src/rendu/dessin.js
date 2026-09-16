// Dessin d'une cellule (bille, pierre, élément) — extrait de rendu.js (audit taille de fichier,
// comportement inchangé, §5). Créé avec les mêmes instances `ctx`/`sprites` que rendu.js ; l'état
// qui varie par frame/bille (tempsTotal, cellPixBase, angleActuel) est passé en paramètre.


const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const PERIODE_HALO_SPECIALE = 2.4; // s — a4 : pulsation des spéciales au repos

export function creerDessinCellule(ctx, sprites) {
  const dessinerCentre = (image) => { if (image) ctx.drawImage(image, -image.width / 2, -image.height / 2); };
  function dessinerContenu(c) {
    if (!c) return;
    dessinerCentre(c.type === 'pierre' ? sprites.pierre() : sprites.bille(c.couleur != null ? c.couleur : 0));
  }
  // a4 : halo pulsé derrière les spéciales au repos (alpha 0,15 ↔ 0,35, période 1,2 s), même
  // hors animation — cercle plein alpha-modulé, jamais de dégradé par frame.
  function dessinerHaloSpeciale(bv, tempsTotal, cellPixBase) {
    const alpha = 0.14 + 0.045 * Math.sin((tempsTotal / PERIODE_HALO_SPECIALE) * Math.PI * 2 + bv.x * 1.7 + bv.y * 2.3); // déphasage par case
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, cellPixBase * 0.49, 0, Math.PI * 2);
    ctx.strokeStyle = '#b9e8f5'; ctx.globalAlpha *= alpha; ctx.lineWidth = Math.max(1,cellPixBase*.022); ctx.stroke(); ctx.restore();
  }
  function dessinerBilleCouleur(bv, tempsTotal, cellPixBase, angleActuel) {
    if (bv.speciale) dessinerHaloSpeciale(bv, tempsTotal, cellPixBase);
    if (bv.speciale === 'bombe') { // étincelle vivante : flicker par frame, pas de sprite recalculé
      dessinerCentre(sprites.bombe());
      const off = sprites.bombeMecheOffset(), a = 0.55 + 0.45 * Math.sin(tempsTotal * 9 + bv.x * 3 + bv.y * 5);
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#ffe27a';
      ctx.beginPath(); ctx.arc(off.ox, off.oy, cellPixBase * 0.055, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      return;
    }
    if (bv.speciale === 'couleur') { ctx.save(); ctx.rotate(tempsTotal * 0.22); dessinerCentre(sprites.couleurSpeciale()); ctx.restore(); return; } // cage spectrale en rotation lente
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
      ctx.save();ctx.rotate(-angleActuel);
      ctx.fillStyle='#0a2730';ctx.strokeStyle='#66f0d7';ctx.lineWidth=Math.max(1,cellPixBase*.026);
      ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,r*.64,.25,Math.PI*1.6);ctx.strokeStyle='#c6fff0';ctx.lineWidth=Math.max(1,cellPixBase*.035);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-r*.43);ctx.lineTo(r*.3,0);ctx.lineTo(0,r*.43);ctx.lineTo(-r*.3,0);ctx.closePath();ctx.fillStyle='#ffe7a1';ctx.fill();
      ctx.restore();
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
    ctx.lineWidth = Math.max(1, cellPixBase * 0.035); ctx.strokeStyle = '#d8f5ff'; ctx.globalAlpha *= 0.65; ctx.stroke();
    ctx.restore();
  }
  return { dessinerCellule, dessinerSurlignage };
}
