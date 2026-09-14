// Télégraphe de rotation (aperçu) — extrait de rendu.js (audit taille de fichier, comportement
// inchangé, §5) : bande claire sur la rangée qui devient le sol, trois chevrons animés dans le
// sens de la nouvelle gravité, fantômes des billes à leur point de chute, cases d'entrée en
// pointillé (teintées si la couleur est connue : Prévoyance). Dessiné dans le repère du plateau
// (déjà translaté/tourné par l'appelant) — rendu.js ne fait que passer ses données courantes.

import { ENCRE } from '../data/couleurs.js';

const TABLE_G = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }];
const vecteurG = (g) => TABLE_G[((g % 4) + 4) % 4];

export function creerTelegraphe() {
  // {sens, gravite, deplacements, entrees, eclatent} et ids qui bougent (pour l'estompage §5)
  let apercu = null, apercuIds = null;

  function definir(a) {
    apercu = a && a.deplacements ? a : null;
    apercuIds = apercu ? new Set([...apercu.deplacements.map((d) => d.id), ...(apercu.eclatent || []).map((d) => d.id)]) : null;
  }

  function dessiner(ctx, { cellPixBase, w, h, billes, dessinerCellule, tempsTotal, couleurHex }) {
    if (!apercu) return;
    const G = vecteurG(apercu.gravite), cp = cellPixBase, demiW = (w * cp) / 2, demiH = (h * cp) / 2;
    const long = G.x ? demiW : demiH, perp = G.x ? demiH : demiW; // demi-longueur le long de G et en travers
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    if (G.x) ctx.fillRect(G.x > 0 ? demiW - cp : -demiW, -demiH, cp, h * cp);
    else ctx.fillRect(-demiW, G.y > 0 ? demiH - cp : -demiH, w * cp, cp);
    const angle = Math.atan2(G.y, G.x), s = cp * 0.3;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) { // trois chevrons dans la bande, vague qui court vers G
      const cx = G.x * (long - cp / 2) - G.y * k * perp * 0.55, cy = G.y * (long - cp / 2) + G.x * k * perp * 0.55;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(tempsTotal * 6 - k * 0.9);
      ctx.beginPath(); ctx.moveTo(-s * 0.6, -s); ctx.lineTo(s * 0.5, 0); ctx.lineTo(-s * 0.6, s);
      ctx.strokeStyle = ENCRE; ctx.lineWidth = Math.max(3, cp * 0.17); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, cp * 0.08); ctx.stroke();
      ctx.restore();
    }
    for (const d of apercu.deplacements) {
      const bv = billes.get(d.id); if (!bv) continue;
      ctx.save(); ctx.translate((d.vers.x - w / 2 + 0.5) * cp, (d.vers.y - h / 2 + 0.5) * cp);
      ctx.globalAlpha = 0.75; ctx.scale(0.9, 0.9); dessinerCellule(bv);
      ctx.restore();
    }
    ctx.setLineDash([cp * 0.12, cp * 0.1]); ctx.lineWidth = Math.max(1.5, cp * 0.06);
    for (const c of apercu.entrees) {
      ctx.beginPath(); ctx.arc((c.x - w / 2 + 0.5) * cp, (c.y - h / 2 + 0.5) * cp, cp * 0.36, 0, Math.PI * 2);
      if (c.couleur != null) { ctx.globalAlpha = 0.5; ctx.fillStyle = couleurHex(c.couleur); ctx.fill(); }
      ctx.globalAlpha = 0.85; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
    ctx.restore();
  }

  return {
    definir, dessiner,
    get actif() { return apercu !== null; },
    get ids() { return apercuIds; },
  };
}
