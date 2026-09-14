// Lot B — fin de salle « supernova » (docs/RECHERCHE_VFX.md §4 item 7, §5 verdict) : nouveau cas
// `finSalle` joué par rendu.js. Victoire : les billes restantes explosent une à une en balayage
// depuis le bas visuel, fond qui s'éclaircit, grand flash + confettis, plateau vidé. Échec :
// plateau grisé + léger affaissement. `jouer()` (rendu.js) attend la Promise renvoyée ici avant
// de résoudre — c'est ce await, pas une boucle interne, qui fait que « jouer() ne résout qu'à la
// fin de la séquence ». Pools/etats internes typés, zéro allocation par frame pour `maj`/`dessiner`.
//
// `env` : mêmes champs que speciales-fx.js, + cw()/ch() (dimensions canvas) et G() (vecteur gravité).

const attend = (ms) => new Promise((res) => setTimeout(res, ms));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
function jouerSon(env, nom, params) { const a = env.audio(); if (a) a.jouer(nom, params); }

const CAP_ETAPES = 40;      // au-delà, on groupe plusieurs billes par étape (grappes)
const BUDGET_MS = 2500;     // plafond total de la séquence de victoire
const INTERVALLE_DEBUT = 60, INTERVALLE_FIN = 35; // en accélérant

export function creerFinale() {
  // --- fond qui s'éclaircit (victoire) + voile gris (échec) + flash final : trois rampes simples,
  // avancées en temps réel (indépendantes d'un éventuel ralenti de chaîne — non concurrent ici).
  let fondAlpha = 0, fondCible = 0, fondT = 0, fondDuree = 1;
  let griseAlpha = 0, griseCible = 0, griseT = 0, griseDuree = 1;
  let flashT = -1, flashDuree = 0.3;

  function demarrerFondEclaircir(duree) { fondCible = 0.4; fondDuree = Math.max(0.05, duree); fondT = 0; }
  function demarrerGrisage(duree) { griseCible = 0.5; griseDuree = Math.max(0.05, duree); griseT = 0; }
  function declencherFlash() { flashT = 0; }

  function maj(dt) {
    if (fondT < fondDuree) { fondT += dt; fondAlpha = fondCible * Math.min(1, fondT / fondDuree); }
    if (griseT < griseDuree) { griseT += dt; griseAlpha = griseCible * Math.min(1, griseT / griseDuree); }
    if (flashT >= 0) { flashT += dt; if (flashT > flashDuree) flashT = -1; }
  }
  // fond éclairci : dessiné TÔT (avant le plateau), en dessous des billes/confettis
  function dessinerFond(ctx, cw, ch) {
    if (fondAlpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha = fondAlpha; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); ctx.restore();
  }
  // voile gris (échec) + flash final (victoire) : dessinés TARD (après billes/particules)
  function dessinerOverlay(ctx, cw, ch) {
    if (griseAlpha > 0.001) { ctx.save(); ctx.globalAlpha = griseAlpha; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cw, ch); ctx.restore(); }
    if (flashT >= 0) {
      const p = flashT / flashDuree;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); ctx.restore();
    }
  }

  // --- victoire : balayage depuis le bas visuel, +5 flottant par bille, confettis + flash final
  async function jouerVictoire(env) {
    jouerSon(env, 'victoire', {});
    const items = [...env.billes.entries()].map(([id, bv]) => { const e = env.ecran(bv.x, bv.y); return { id, bv, sx: e.x, sy: e.y }; });
    items.sort((a, b) => b.sy - a.sy); // bas visuel (plus grand y écran) d'abord
    const n = items.length;
    if (n === 0) { declencherFlash(); await attend(250); return; }
    const groupSize = Math.max(1, Math.ceil(n / CAP_ETAPES));
    const groupes = [];
    for (let i = 0; i < n; i += groupSize) groupes.push(items.slice(i, i + groupSize));
    const nEtapes = groupes.length;
    demarrerFondEclaircir((nEtapes * ((INTERVALLE_DEBUT + INTERVALLE_FIN) / 2)) / 1000);
    for (let s = 0; s < nEtapes; s++) {
      const p = nEtapes <= 1 ? 1 : s / (nEtapes - 1);
      const intervalle = INTERVALLE_DEBUT - (INTERVALLE_DEBUT - INTERVALLE_FIN) * p;
      for (const it of groupes[s]) {
        env.particules.emettreDestruction(it.sx, it.sy, env.couleurHex(it.bv.couleur != null ? it.bv.couleur : 0), 6);
        env.juice.emettreXP(it.sx, it.sy, 5);
        env.billes.delete(it.id);
      }
      jouerSon(env, 'detruit', { taille: groupes[s].length, cause: 'effet', profondeur: 0 });
      await attend(intervalle);
    }
    // grand flash + confettis multicolores sur tout le plateau (le plateau est déjà vide visuellement)
    declencherFlash();
    const cw = env.cw(), ch = env.ch();
    for (let gx = 0; gx < 4; gx++) for (let gy = 0; gy < 3; gy++) {
      env.particules.emettreConfettis(cw * (0.15 + (0.7 * gx) / 3), ch * (0.15 + (0.7 * gy) / 2), 14);
    }
    await attend(350);
  }

  // --- échec : voile gris + léger affaissement des billes restantes le long de la gravité
  async function jouerEchec(env) {
    jouerSon(env, 'echec', {});
    demarrerGrisage(0.4);
    const G = env.G(), cp = Math.max(1, env.cellPix()), sagCases = 3 / cp;
    const items = [...env.billes.values()].map((bv) => ({ bv, x0: bv.x, y0: bv.y }));
    const PAS = 8;
    for (let i = 1; i <= PAS; i++) {
      const e = easeOutCubic(i / PAS);
      for (const it of items) { it.bv.x = it.x0 + G.x * sagCases * e; it.bv.y = it.y0 + G.y * sagCases * e; }
      await attend(400 / PAS);
    }
  }

  return {
    maj, dessinerFond, dessinerOverlay,
    jouerVictoire, jouerEchec,
    get enCours() { return fondAlpha > 0.001 || griseAlpha > 0.001 || flashT >= 0; },
    vider() { fondAlpha = 0; fondCible = 0; fondT = 0; fondDuree = 1; griseAlpha = 0; griseCible = 0; griseT = 0; griseDuree = 1; flashT = -1; },
  };
}
