// Juice « Cartoon pop » (docs/CONTRATS.md §2) : textes flottants (+XP, mots de combo),
// anneaux d'onde de choc sur les explosions, et un squash élastique réutilisable (plateau
// ou bille). Pools fixes, zéro allocation par frame — seul un déclenchement (événement de
// jeu) occupe un emplacement déjà réservé.

import { ENCRE } from '../data/couleurs.js';
import { palierGroupe } from '../data/paliers.js';

const MAX_TEXTES = 16;
const MAX_ONDES = 12;

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
// rebond élastique avec dépassement (overshoot), classique « back out »
const easeBackOut = (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

// Mots de combo « Carrousel cosmique » (contexte validé) : thème spatial plutôt que générique.
const MOTS_COMBO = [[10, 'BIG BANG !'], [8, 'Supernova !'], [6, 'Stellaire !'], [4, 'Étincelle !']];
const ECHELLE_COMBO = [1, 1.05, 1.2, 1.4, 1.65]; // F08 : taille du mot par palier (3/5/8/10+), le BIG BANG est énorme
function motCombo(taille) {
  for (const [seuil, mot] of MOTS_COMBO) if (taille >= seuil) return mot;
  return null;
}
const POLICE = '"Arial Rounded MT Bold", "Trebuchet MS", "Nunito", "Segoe UI", sans-serif';
const polices = new Map(); // taille px → chaîne `ctx.font`, pour ne rien allouer par frame (audit code 2)
function police(px) { let f = polices.get(px); if (!f) { f = `900 ${px}px ${POLICE}`; polices.set(px, f); } return f; }
const RETARDS_FANTOMES = [0.09, 0.06, 0.03]; // a5 : 3 fantômes en retard, du plus vieux au plus récent
const ALPHAS_FANTOMES = [0.1, 0.2, 0.4];

export function creerJuice() {
  // --- textes flottants : type 0 = +XP (monte 1 case, 700 ms), type 1 = combo/BOOM (rebond, 900 ms)
  const tx = new Float32Array(MAX_TEXTES), ty = new Float32Array(MAX_TEXTES);
  const tt = new Float32Array(MAX_TEXTES), td = new Float32Array(MAX_TEXTES);
  const ttype = new Uint8Array(MAX_TEXTES);
  const tech = new Float32Array(MAX_TEXTES); // taille de police, en multiple de case (§7)
  const tmot = new Array(MAX_TEXTES).fill('');
  let nTextes = 0;

  function occuper(i, x, y, type, mot, duree, echelle) { tx[i] = x; ty[i] = y; tt[i] = 0; td[i] = duree; ttype[i] = type; tmot[i] = mot; tech[i] = echelle; }
  // à saturation (≥16 flottants à l'écran) on recycle le plus ancien plutôt que d'en perdre un neuf
  function emettreXP(x, y, gain, echelle = 0.45) { occuper(nTextes < MAX_TEXTES ? nTextes++ : 0, x, y, 0, '+' + (gain ?? ''), 0.7, echelle); } // F08 : taille par palier
  // texte libre qui monte comme un +XP (F09 : « 7 billes » sous « Bon angle ! »)
  function emettreInfo(x, y, mot, echelle = 0.45) { occuper(nTextes < MAX_TEXTES ? nTextes++ : 0, x, y, 0, mot, 0.9, echelle); }
  function emettreCombo(x, y, taille) {
    const mot = motCombo(taille); if (!mot) return;
    const palier = palierGroupe(taille);
    occuper(nTextes < MAX_TEXTES ? nTextes++ : 0, x, y, 1, mot, 0.9 + palier * 0.05, ECHELLE_COMBO[palier]);
  }
  // texte « BOOM ! » à l'origine d'une bombe qui explose (même style que le combo, plus petit — §7)
  function emettreBoom(x, y) { occuper(nTextes < MAX_TEXTES ? nTextes++ : 0, x, y, 1, 'BOOM !', 0.9, 0.9); }
  // texte libre, même style rebond (chaîne « RÉACTION EN CHAÎNE », combo de spéciales forcé « BIG BANG ! »)
  function emettreMot(x, y, mot, echelle = 1) { occuper(nTextes < MAX_TEXTES ? nTextes++ : 0, x, y, 1, mot, 0.9, echelle); }
  function majTextes(dt) {
    for (let i = 0; i < nTextes; i++) {
      tt[i] += dt;
      if (tt[i] >= td[i]) {
        const last = nTextes - 1;
        tx[i] = tx[last]; ty[i] = ty[last]; tt[i] = tt[last]; td[i] = td[last]; ttype[i] = ttype[last]; tech[i] = tech[last]; tmot[i] = tmot[last];
        nTextes--; i--;
      }
    }
  }
  // dessine une occurrence du texte i à une progression p donnée (0..1), avec un multiplicateur
  // d'alpha — sert à la fois au texte plein (alphaMult=1) et à ses fantômes en retard (a5).
  function dessinerUnTexte(ctx, cellPix, i, p, alphaMult) {
    if (p <= 0) return;
    // F08 : un mot ne sort jamais du canvas — police réduite s'il est plus large que 90 % de l'écran
    // (« ALIGNEMENT ! » sur un petit plateau), centre ramené dans les marges (tap au bord). Arithmétique seule.
    const largeur = ctx.canvas ? ctx.canvas.width : Infinity;
    let px = Math.round(cellPix * tech[i]);
    const demi = () => tmot[i].length * 0.31 * px;
    if (demi() * 2 > largeur * 0.9) px = Math.floor((largeur * 0.9) / (tmot[i].length * 0.62));
    const marge = demi() + cellPix * 0.15, x = Math.min(Math.max(tx[i], marge), largeur - marge);
    ctx.save();
    let alphaBase;
    if (ttype[i] === 0) {
      // +XP : monte d'une case le long de l'écran, s'efface en fin de course
      ctx.translate(x, ty[i] - easeOutCubic(p) * cellPix);
      alphaBase = 1 - clamp01((p - 0.55) / 0.45);
    } else {
      // mot de combo/BOOM : rebond élastique (overshoot) + légère rotation, sur la case tapée
      const echelle = p < 0.45 ? Math.max(0, easeBackOut(p / 0.45)) : 1 + Math.sin((p - 0.45) * Math.PI) * 0.03;
      ctx.translate(x, ty[i]);
      ctx.rotate(Math.sin(p * Math.PI * 2.4) * (1 - p) * (6 * Math.PI / 180));
      ctx.scale(echelle, echelle);
      alphaBase = 1 - clamp01((p - 0.72) / 0.28);
    }
    ctx.font = police(px);
    ctx.globalAlpha = Math.max(0, alphaBase) * alphaMult;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, cellPix * 0.08);
    ctx.strokeStyle = ENCRE; ctx.strokeText(tmot[i], 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillText(tmot[i], 0, 0);
    ctx.restore();
  }
  function dessinerTextes(ctx, cellPix) {
    for (let i = 0; i < nTextes; i++) {
      const p = clamp01(tt[i] / td[i]);
      // a5 : 3 fantômes en retard (dessinés d'abord, donc en dessous), puis le texte plein au-dessus
      for (let k = 0; k < 3; k++) dessinerUnTexte(ctx, cellPix, i, p - RETARDS_FANTOMES[k], ALPHAS_FANTOMES[k]);
      dessinerUnTexte(ctx, cellPix, i, p, 1);
    }
  }

  // --- anneaux d'onde de choc : trait épais qui s'élargit et s'efface (explosions uniquement)
  const ox = new Float32Array(MAX_ONDES), oy = new Float32Array(MAX_ONDES);
  const ot = new Float32Array(MAX_ONDES), od = new Float32Array(MAX_ONDES), orayon = new Float32Array(MAX_ONDES);
  const oforce = new Float32Array(MAX_ONDES); // F08 : épaisseur et durée de l'anneau selon le palier
  let nOndes = 0;
  function emettreOnde(x, y, rayonMax, force = 1) {
    if (nOndes >= MAX_ONDES) return;
    const i = nOndes++; ox[i] = x; oy[i] = y; ot[i] = 0; od[i] = 0.42 + 0.1 * (force - 1); orayon[i] = rayonMax; oforce[i] = force;
  }
  function majOndes(dt) {
    for (let i = 0; i < nOndes; i++) {
      ot[i] += dt;
      if (ot[i] >= od[i]) {
        const last = nOndes - 1;
        ox[i] = ox[last]; oy[i] = oy[last]; ot[i] = ot[last]; od[i] = od[last]; orayon[i] = orayon[last]; oforce[i] = oforce[last];
        nOndes--; i--;
      }
    }
  }
  function dessinerOndes(ctx, cellPix) {
    for (let i = 0; i < nOndes; i++) {
      const p = ot[i] / od[i], r = cellPix * 0.3 + orayon[i] * easeOutCubic(p);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, cellPix * 0.16 * oforce[i] * (1 - p * 0.5));
      ctx.beginPath(); ctx.arc(ox[i], oy[i], r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // --- squash élastique générique : échelle x↑ / y↓ puis retour (plateau entier, ou une bille)
  function creerSquash(duree = 0.25, ampli = 0.04) {
    let t = duree, a = ampli; // t >= duree => inactif, échelle neutre ; a = amplitude du déclenchement en cours
    return {
      declencher(amplitude) { t = 0; a = amplitude ?? ampli; }, // F08 : amplitude au choix (explosion 8+ : plus fort)
      maj(dt) { if (t < duree) t += dt; },
      get actif() { return t < duree; },
      get sx() { return t < duree ? 1 + a * Math.sin(clamp01(t / duree) * Math.PI) : 1; },
      get sy() { return t < duree ? 1 - a * Math.sin(clamp01(t / duree) * Math.PI) : 1; },
    };
  }

  return {
    emettreXP, emettreInfo, emettreCombo, emettreBoom, emettreMot, majTextes, dessinerTextes,
    emettreOnde, majOndes, dessinerOndes,
    creerSquash,
    get enCours() { return nTextes > 0 || nOndes > 0; },
    vider() { nTextes = 0; nOndes = 0; },
  };
}
