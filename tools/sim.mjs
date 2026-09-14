/**
 * Simulateur headless : joue des runs complets sans DOM avec une politique simple,
 * et rapporte les statistiques utiles à l'équilibrage.
 *   node tools/sim.mjs                  # 200 runs, seeds 1..200
 *   node tools/sim.mjs --runs 50 --seed 7 --politique gourmande|aleatoire|avisee --competences vertige,domino
 *   (avisee : choisit le sens de rotation avec l'aperçu, comme un joueur qui lit le télégraphe)
 *   node tools/sim.mjs --gravite vide|continue|mixte|collante   # mode de gravité (D12), défaut : celui du jeu (vide)
 *   node tools/sim.mjs --cascades rotation|toutes --cascadeMin 5   # prototype D24 (jamais actif par défaut)
 *   node tools/sim.mjs --verbose        # journal du premier run
 */
import { creerRun } from '../src/moteur/run.js';
import { tousGroupes } from '../src/moteur/grille.js';
import { colonnes } from '../src/moteur/gravite.js';
import { palierGroupe } from '../src/data/paliers.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const RUNS = +opt('runs', 200), SEED0 = +opt('seed', 1), POLITIQUE = opt('politique', 'gourmande');
const COMPETENCES = (opt('competences', '') || '').split(',').filter(Boolean);
const GRAVITE = opt('gravite', null);
const CASCADES = opt('cascades', null), CASCADE_MIN = +opt('cascadeMin', 5); // prototype D24
const VERBOSE = args.includes('--verbose');

/** Plus gros groupe après la rotation `sens`, d'après l'aperçu (entrées de couleur inconnue ignorées). */
function evaluerRotation(run, sens) {
  const g = run.etat.grille, ap = run.apercuRotation(sens);
  if (!ap) return -1;
  const parId = new Map(); for (const c of g.cellules) if (c) parId.set(c.id, c);
  const finale = new Map(); for (const d of ap.deplacements) finale.set(d.id, d.vers);
  const eclatent = new Set(ap.eclatent.map((d) => d.id));
  const cellules = g.cellules.map((c) => (c && (finale.has(c.id) || eclatent.has(c.id)) ? null : c));
  for (const [id, v] of finale) cellules[v.y * g.w + v.x] = parId.get(id);
  return tousGroupes({ w: g.w, h: g.h, forme: g.forme, cellules }).reduce((m, gr) => Math.max(m, gr.length), 0);
}

/** Politique : tap du plus gros groupe ; tourne si aucun groupe ≥ 3 et jauge disponible. */
function agir(run, rng) {
  const e = run.etat;
  if (e.enAttente) {
    const a = e.enAttente;
    if (a.type === 'niveau' || a.type === 'competence') return run.choisir(a.propositions[Math.floor(rng() * a.propositions.length)].id);
    return run.choisir(null);
  }
  const groupes = tousGroupes(e.grille).sort((a, b) => b.length - a.length);
  const specialeSeule = e.grille.cellules.findIndex((c) => c && c.speciale);
  if (POLITIQUE === 'aleatoire' && groupes.length && rng() < 0.8) {
    const g = groupes[Math.floor(rng() * groupes.length)];
    return run.tap(g[0] % e.grille.w, (g[0] / e.grille.w) | 0);
  }
  if (POLITIQUE === 'avisee') {
    const tap = (gr) => run.tap(gr[0] % e.grille.w, (gr[0] / e.grille.w) | 0);
    const meilleur = groupes.length ? groupes[0].length : 0;
    if (meilleur >= 5) return tap(groupes[0]);
    if (run.peutTourner(1)) {
      let meilleurSens = 1, apres = -1;
      for (const sens of [-1, 1, 2]) { const v = evaluerRotation(run, sens); if (v > apres) { apres = v; meilleurSens = sens; } }
      const gratuite = e.jauge > 0 || run.ctx.bus.reduire('coutRotation', 1, run.ctx, { sens: 1 }) === 0; // Débridé / Apesanteur : gratuite même à jauge vide
      // Rotation gratuite : dès qu'elle crée un groupe nettement meilleur ; payante : seulement faute de groupe ≥ 3.
      if ((gratuite && apres >= meilleur + 2) || (!gratuite && meilleur < 3 && apres > meilleur)) return run.tourner(meilleurSens);
    }
    if (groupes.length) return tap(groupes[0]);
    if (specialeSeule >= 0) return run.tap(specialeSeule % e.grille.w, (specialeSeule / e.grille.w) | 0);
    return run.peutTourner(1) ? run.tourner(1) : null;
  }
  if ((!groupes.length || groupes[0].length < 3) && run.peutTourner(1)) return run.tourner(rng() < 0.5 ? 1 : -1);
  if (groupes.length) return run.tap(groupes[0][0] % e.grille.w, (groupes[0][0] / e.grille.w) | 0);
  if (specialeSeule >= 0) return run.tap(specialeSeule % e.grille.w, (specialeSeule / e.grille.w) | 0);
  if (run.peutTourner(1)) return run.tourner(1);
  return null;
}

/** Invariant (modes avec chute au tap) : la grille est compactée — sous chaque cellule qui tombe, jamais de vide. */
function verifierPleine(e) {
  if (e.modeGravite === 'collante') return;
  const g = e.grille;
  for (const col of colonnes(g.w, g.h, e.gravite)) {
    for (let i = 0; i < col.length - 1; i++) {
      const c = g.cellules[col[i]];
      const fixe = c && c.type === 'element' && c.element.type === 'ballon';
      if (c && !fixe && g.cellules[col[i + 1]] === null) throw new Error('bille en l\'air, tour ' + e.tour + ' salle ' + e.salle.id);
    }
  }
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const stats = { runs: 0, victoires: 0, parSalle: {}, speciales: {}, niveauxMax: [], xpTotale: 0, tours: 0, salles: 0, erreurs: 0,
  taps: 0, rotations: 0, rotationsPayees: 0, rotationsUtiles: 0, deplacesRotation: 0, entreesRotation: 0, trousRotation: 0,
  // Baseline (feuille de route de Martin, étape 0) : taille des groupes, spéciales utilisées, chaîne max, premier gros moment.
  tailleGroupes: 0, specialesExplosees: 0, chaineMaxCumul: 0, chaineMaxAbs: 0, premierGrosMoment: 0, runsAvecGrosMoment: 0, rotationsProductives: 0,
  // D25 (frénésie) : sources possibles de jauge, comptées par salle · D26 : combos (≥ 2 salves explosives dans une même action)
  tapsParPalier: [0, 0, 0, 0, 0], cascades: 0, combos: 0,
  xpFinale: 0 }; // F07 : XP rapportée par les finales de salle (incluse dans xpTotale)
const CAUSES_EXPLOSION = new Set(['bombe', 'ligne', 'croix', 'couleur', 'fusee']);
const TYPES_SPECIALES = ['bombe', 'ligne', 'croix', 'couleur'];
const nbVides = (g) => { let n = 0; for (const c of g.cellules) if (c === null) n++; return n; };
const salleStat = (id) => (stats.parSalle[id] ??= { jouees: 0, gagnees: 0, xp: 0, xpFinale: 0, niveau: 0, coupsRestants: 0, restantes: 0, raisons: {} });

for (let s = 0; s < RUNS; s++) {
  const run = creerRun({ seed: SEED0 + s, competences: COMPETENCES, options: { ...(GRAVITE ? { gravite: GRAVITE } : {}), ...(CASCADES ? { cascades: CASCADES, cascadeMin: CASCADE_MIN } : {}) } });
  const rng = mulberry(SEED0 + s);
  let garde = 0, journal = run.evenementsInitiaux, tapsCeRun = 0, grosMoment = 0;
  try {
    while (garde++ < 5000) {
      const e = run.etat;
      if (e.enAttente?.type === 'finRun') break;
      const videsAvant = e.enAttente ? 0 : nbVides(e.grille);
      const ev = agir(run, rng);
      if (ev === null) { stats.erreurs++; break; }
      // Mesure du grief D12 : que déplace une rotation du joueur ?
      const tap = ev.find((x) => x.t === 'tap');
      if (tap) {
        stats.taps++; tapsCeRun++; stats.tailleGroupes += tap.taille; stats.tapsParPalier[palierGroupe(tap.taille)]++;
        if (!grosMoment && (tap.taille >= 6 || ev.some((x) => x.t === 'detruit' && x.profondeur >= 1))) grosMoment = tapsCeRun; // premier « gros boom » : groupe 6+ ou chaîne
      } else if (ev.some((x) => x.t === 'rotation' && !x.auto)) {
        stats.rotations++; stats.trousRotation += videsAvant;
        if (!e.enAttente && tousGroupes(e.grille).some((g) => g.length >= 3)) stats.rotationsUtiles++;
        if (ev.some((x) => x.t === 'rotation' && x.enCoups)) stats.rotationsPayees++;
        for (const x of ev) { if (x.t === 'chute') stats.deplacesRotation += x.deplacements.length; if (x.t === 'remplissage') stats.entreesRotation += x.cellules.length; }
      }
      if (VERBOSE && s === 0) for (const x of ev) console.log(JSON.stringify(x).slice(0, 160));
      let explosives = 0; for (const x of ev) { if (x.t === 'detruit' && !x.finale && CAUSES_EXPLOSION.has(x.cause)) explosives++; if (x.t === 'detruit' && x.cause === 'cascade') stats.cascades++; } // F07 : la finale ne compte ni combo ni spéciale « utilisée »
      if (explosives >= 2) stats.combos++;
      for (const x of ev) {
        if (x.t === 'speciale') stats.speciales[x.type] = (stats.speciales[x.type] ?? 0) + 1;
        if (x.t === 'detruit' && !x.finale && TYPES_SPECIALES.includes(x.cause)) stats.specialesExplosees++;
        if (x.t === 'finSalle') {
          const st = salleStat(e.salle.id);
          st.jouees++; if (x.victoire) st.gagnees++; st.xp += e.xpSalle; st.niveau += e.niveau; st.coupsRestants += e.coups; st.restantes += e.grille.cellules.filter((c) => c && c.type === 'bille').length;
          st.raisons[x.raison] = (st.raisons[x.raison] ?? 0) + 1;
          st.xpFinale += e.enAttente?.finale?.xp ?? 0; // F07 : coups et jauge ne sont pas consommés, `coupsRestants` reste lisible
          stats.tours += e.tour; stats.salles++;
        }
      }
      // Invariant (gravité continue seulement) : aucune case vide après un tour joué, sauf sous un ballon (qui flotte et fait sol).
      if (!e.enAttente && e.modeGravite === 'continue') verifierPleine(e);
    }
    stats.runs++;
    if (run.etat.enAttente?.victoire) stats.victoires++;
    stats.xpTotale += run.etat.xpTotale;
    const cm = run.etat.stats?.chaineMax ?? 0; stats.chaineMaxCumul += cm; if (cm > stats.chaineMaxAbs) stats.chaineMaxAbs = cm;
    stats.rotationsProductives += run.etat.stats?.rotationsProductives ?? 0; // F09 : compteur du moteur (groupe ≥3 plus gros qu'avant, ou un de plus)
    stats.xpFinale += run.etat.stats?.xpFinale ?? 0; // F07
    if (grosMoment) { stats.premierGrosMoment += grosMoment; stats.runsAvecGrosMoment++; }
  } catch (err) { stats.erreurs++; console.error('seed', SEED0 + s, err.message); if (VERBOSE) console.error(err.stack); }
}

console.log(`\n${stats.runs} runs, politique ${POLITIQUE}, gravité ${GRAVITE ?? 'défaut'}, compétences [${COMPETENCES.join(', ')}]`);
const r = Math.max(1, stats.rotations);
console.log(`rotations : ${stats.rotations} pour ${stats.taps} taps (1 pour ${(stats.taps / r).toFixed(1)}), payées en coups ${stats.rotationsPayees} — par rotation : ${(stats.trousRotation / r).toFixed(1)} trous, ${(stats.deplacesRotation / r).toFixed(1)} billes déplacées, ${(stats.entreesRotation / r).toFixed(1)} entrées`);
console.log(`victoires : ${stats.victoires} (${((100 * stats.victoires) / Math.max(1, stats.runs)).toFixed(0)} %) — XP moyenne par run ${(stats.xpTotale / Math.max(1, stats.runs)).toFixed(0)} (dont finale F07 ${(stats.xpFinale / Math.max(1, stats.runs)).toFixed(0)}) — erreurs ${stats.erreurs}`);
console.log('spéciales créées :', stats.speciales);
const nbSpeciales = Object.values(stats.speciales).reduce((a, b) => a + b, 0);
console.log(`métriques : ${(stats.tours / Math.max(1, stats.salles)).toFixed(1)} tours par salle — groupe tapé moyen ${(stats.tailleGroupes / Math.max(1, stats.taps)).toFixed(2)} billes — rotations utiles (groupe ≥3 juste après) ${((100 * stats.rotationsUtiles) / r).toFixed(0)} % — rotations productives (moteur, F09) ${((100 * stats.rotationsProductives) / r).toFixed(0)} % — spéciales explosées / créées ${((100 * stats.specialesExplosees) / Math.max(1, nbSpeciales)).toFixed(0)} % — chaîne max moyenne par run ${(stats.chaineMaxCumul / Math.max(1, stats.runs)).toFixed(2)} (max ${stats.chaineMaxAbs}) — premier gros moment (groupe 6+ ou chaîne) au tap ${(stats.premierGrosMoment / Math.max(1, stats.runsAvecGrosMoment)).toFixed(1)} (${((100 * stats.runsAvecGrosMoment) / Math.max(1, stats.runs)).toFixed(0)} % des runs)`);
const ps = Math.max(1, stats.salles), tp = stats.tapsParPalier;
console.log(`par salle (D25 frénésie / D26 combos) : taps 2 ${(tp[0] / ps).toFixed(1)} · 3-4 ${(tp[1] / ps).toFixed(1)} · 5-7 ${(tp[2] / ps).toFixed(1)} · 8-9 ${(tp[3] / ps).toFixed(1)} · 10+ ${(tp[4] / ps).toFixed(1)} — rotations productives ${(stats.rotationsProductives / ps).toFixed(2)} — cascades ${(stats.cascades / ps).toFixed(2)} — combos de spéciales ${(stats.combos / ps).toFixed(2)}${CASCADES ? ` — cascades ${CASCADES} ≥ ${CASCADE_MIN}` : ''}`);
console.table(Object.fromEntries(Object.entries(stats.parSalle).map(([id, s]) => [id, {
  jouees: s.jouees, 'gagnées %': ((100 * s.gagnees) / s.jouees).toFixed(0), 'xp moy': (s.xp / s.jouees).toFixed(0),
  'xp finale': (s.xpFinale / Math.max(1, s.gagnees)).toFixed(0), 'niveau moy': (s.niveau / s.jouees).toFixed(1), 'coups rest.': (s.coupsRestants / s.jouees).toFixed(1), 'billes rest.': (s.restantes / s.jouees).toFixed(0), raisons: JSON.stringify(s.raisons) }])));
