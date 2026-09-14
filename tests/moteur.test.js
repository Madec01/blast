import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerRun, chargerRun } from '../src/moteur/run.js';
import { creerGrille, nouvelleBille, nouvellePierre, nouvelElement, groupe } from '../src/moteur/grille.js';
import { appliquerGravite, remplir } from '../src/moteur/chute.js';
import { colonnes, tourner } from '../src/moteur/gravite.js';
import * as awaitImport from '../src/moteur/tour.js';
import { appliquerEffet } from '../src/moteur/progression.js';
import { tousGroupes } from '../src/moteur/grille.js';

test('gravité : colonnes ordonnées du haut visuel vers le bas pour les 4 orientations', () => {
  const c0 = colonnes(3, 2, 0); assert.deepEqual(c0[0], [0, 3]);          // x=0 : y 0→1
  const c1 = colonnes(3, 2, 1); assert.deepEqual(c1[0], [0, 1, 2]);       // y=0 : x 0→2 (bas = droite)
  const c2 = colonnes(3, 2, 2); assert.deepEqual(c2[0], [3, 0]);          // bas = haut du plateau
  const c3 = colonnes(3, 2, 3); assert.deepEqual(c3[0], [2, 1, 0]);       // bas = gauche
  assert.equal(tourner(3, 1), 0); assert.equal(tourner(0, -1), 3); assert.equal(tourner(1, 2), 3);
});

test('chute : compaction vers G, le ballon sert de sol, remplissage par le haut visuel', () => {
  const g = creerGrille(1, 4);
  g.cellules[0] = nouvelleBille(g, 0); g.cellules[1] = null; g.cellules[2] = nouvelElement(g, 'ballon'); g.cellules[3] = null;
  const dep = appliquerGravite(g, 0);
  assert.equal(dep.length, 1); assert.deepEqual(dep[0].vers, { x: 0, y: 1 });
  assert.equal(g.cellules[1].couleur, 0); assert.equal(g.cellules[2].element.type, 'ballon'); assert.equal(g.cellules[3], null);
  let k = 0;
  const entrees = remplir(g, 0, () => nouvelleBille(g, k++));
  assert.equal(entrees.length, 1); assert.deepEqual(entrees[0].depuis, { x: 0, y: -1 });
  assert.equal(g.cellules[3], null, 'sous le ballon, pas de remplissage');
  // gravité inversée : le trou sous le ballon devient le haut, il se remplit
  const e2 = remplir(g, 2, () => nouvelleBille(g, 9));
  assert.equal(e2.length, 1); assert.deepEqual(e2[0].depuis, { x: 0, y: 4 });
});

test('groupe : flood fill orthogonal de même couleur', () => {
  const g = creerGrille(3, 3);
  const cols = [1, 1, 0, 1, 0, 0, 2, 2, 2];
  cols.forEach((c, i) => { g.cellules[i] = nouvelleBille(g, c); });
  assert.deepEqual(groupe(g, 0).sort(), [0, 1, 3]);
  assert.deepEqual(groupe(g, 6).sort(), [6, 7, 8]);
});

/** Joue le premier tap possible (répond d'abord à un choix de niveau en attente). */
function premierTap(run) {
  const e = run.etat;
  if (e.enAttente?.type === 'niveau') run.choisir(e.enAttente.propositions[0].id);
  for (let y = 0; y < e.grille.h; y++) for (let x = 0; x < e.grille.w; x++) if (run.peutTaper(x, y)) return run.tap(x, y);
  return [];
}

test('run : un tap détruit un groupe, décrémente les coups ; en gravité continue la grille reste pleine', () => {
  const run = creerRun({ seed: 42, options: { gravite: 'continue' } });
  const e = run.etat;
  const coups = e.coups;
  let joue = false;
  for (let y = 0; y < e.grille.h && !joue; y++) for (let x = 0; x < e.grille.w && !joue; x++) if (run.peutTaper(x, y)) {
    const ev = run.tap(x, y);
    assert.ok(ev.some((v) => v.t === 'tap')); assert.ok(ev.some((v) => v.t === 'detruit'));
    joue = true;
  }
  assert.ok(joue);
  assert.equal(e.coups, coups - 1);
  assert.ok(e.grille.cellules.every((c) => c !== null));
});

test('run : rotation consomme la jauge et change la gravité ; à jauge 0 elle coûte un coup (D13)', () => {
  const run = creerRun({ seed: 3, options: { jauge: 1, gravite: 'continue' } });
  const e = run.etat;
  assert.equal(e.jauge, 1);
  const ev = run.tourner(1);
  assert.ok(ev.some((v) => v.t === 'rotation' && v.vers === 1 && !v.enCoups));
  assert.equal(e.jauge, 0);
  const coups = e.coups;
  assert.ok(run.peutTourner(1));
  const ev2 = run.tourner(1);
  assert.ok(ev2.some((v) => v.t === 'rotation' && v.vers === 2 && v.enCoups === 1));
  assert.equal(e.coups, coups - 1);
  assert.equal(e.jauge, 0);
  assert.ok(e.grille.cellules.every((c) => c !== null));
});

test('gravité vide (défaut) : chute au tap, rien n’entre jamais, la grille se vide et reste compactée', () => {
  const run = creerRun({ seed: 42 });
  const e = run.etat, g = e.grille;
  assert.equal(e.modeGravite, 'vide');
  const total = g.cellules.filter((c) => c !== null).length;
  const tap = premierTap(run);
  const detruites = tap.filter((v) => v.t === 'detruit').reduce((n, v) => n + v.cellules.length, 0);
  assert.ok(detruites >= 2);
  assert.ok(!tap.some((v) => v.t === 'remplissage'), 'aucun remplissage au tap');
  assert.equal(g.cellules.filter((c) => c !== null).length, total - detruites);
  const rot = run.tourner(1);
  assert.ok(rot.some((v) => v.t === 'rotation') && !rot.some((v) => v.t === 'remplissage'), 'aucun remplissage à la rotation');
  assert.equal(g.cellules.filter((c) => c !== null).length, total - detruites - rot.filter((v) => v.t === 'detruit').reduce((n, v) => n + v.cellules.length, 0));
});

test('gravité collante (option, D12) : les trous restent après un tap ; tout retombe et se remplit à la rotation', () => {
  const run = creerRun({ seed: 42, options: { gravite: 'collante' } });
  const e = run.etat, g = e.grille;
  assert.equal(e.modeGravite, 'collante');
  const tap = premierTap(run);
  const detruites = tap.filter((v) => v.t === 'detruit').reduce((n, v) => n + v.cellules.length, 0);
  assert.ok(detruites >= 2);
  assert.ok(!tap.some((v) => v.t === 'chute' || v.t === 'remplissage'), 'ni chute ni remplissage au tap');
  assert.equal(g.cellules.filter((c) => c === null).length, detruites);
  const rot = run.tourner(1);
  assert.ok(rot.some((v) => v.t === 'chute') && rot.some((v) => v.t === 'remplissage'));
  assert.ok(g.cellules.every((c) => c !== null));
});

test('gravité mixte : chute après le tap sans remplissage, les trous sont côté haut visuel', () => {
  const run = creerRun({ seed: 42, options: { gravite: 'mixte' } });
  const e = run.etat, g = e.grille;
  const tap = premierTap(run);
  assert.ok(!tap.some((v) => v.t === 'remplissage'));
  assert.ok(g.cellules.some((c) => c === null));
  for (let x = 0; x < g.w; x++) {
    let vu = false;
    for (let y = 0; y < g.h; y++) { const c = g.cellules[y * g.w + x]; if (c) vu = true; else assert.ok(!vu, `trou sous une bille en (${x},${y})`); }
  }
  run.tourner(-1);
  assert.ok(g.cellules.every((c) => c !== null));
});

test('aperçu de rotation : prédit exactement la chute et le remplissage, sans modifier l’état', () => {
  const run = creerRun({ seed: 7, options: { gravite: 'collante' } });
  premierTap(run); premierTap(run); premierTap(run);
  while (run.etat.enAttente) run.choisir(run.etat.enAttente.propositions?.[0]?.id ?? null); // un niveau peut être en attente
  const e = run.etat;
  const avant = JSON.stringify(e.grille.cellules), rngAvant = run.ctx.rng.etat;
  const ap = run.apercuRotation(1);
  assert.equal(JSON.stringify(e.grille.cellules), avant); assert.equal(run.ctx.rng.etat, rngAvant);
  assert.equal(ap.gravite, 1);
  assert.ok(ap.deplacements.length > 0 && ap.entrees.length > 0);
  assert.ok(ap.entrees.every((c) => c.couleur === null), 'couleurs inconnues sans Prévoyance');
  const ev = run.tourner(1);
  const chute = ev.filter((v) => v.t === 'chute').flatMap((v) => v.deplacements);
  const remplissage = ev.filter((v) => v.t === 'remplissage').flatMap((v) => v.cellules);
  const cle = (d) => `${d.id}:${d.vers.x},${d.vers.y}`;
  assert.deepEqual(new Set(chute.map(cle)), new Set(ap.deplacements.map(cle)));
  assert.deepEqual(new Set(remplissage.map((c) => `${c.x},${c.y}`)), new Set(ap.entrees.map((c) => `${c.x},${c.y}`)));
});

test('aperçu de rotation : avec Prévoyance, les couleurs des entrées sont celles de la file', () => {
  const run = creerRun({ seed: 7, competences: ['prevoyance'] });
  premierTap(run); premierTap(run);
  const ap = run.apercuRotation(2);
  const ev = run.tourner(2);
  const remplissage = ev.filter((v) => v.t === 'remplissage').flatMap((v) => v.cellules);
  const parCase = new Map(remplissage.map((c) => [`${c.x},${c.y}`, c.couleur]));
  for (const c of ap.entrees) assert.equal(c.couleur, parCase.get(`${c.x},${c.y}`));
});

test('sérialisation : même seed, même journal ; recharger reproduit la suite', () => {
  const a = creerRun({ seed: 99 }), b = creerRun({ seed: 99 });
  assert.equal(JSON.stringify(a.etat.grille.cellules), JSON.stringify(b.etat.grille.cellules));
  const jouer = (r) => { const e = r.etat; for (let y = 0; y < e.grille.h; y++) for (let x = 0; x < e.grille.w; x++) if (r.peutTaper(x, y)) return r.tap(x, y); };
  const ea = jouer(a), eb = jouer(b);
  assert.equal(JSON.stringify(ea), JSON.stringify(eb));
  const c = chargerRun(a.serialiser());
  assert.equal(JSON.stringify(jouer(a)), JSON.stringify(jouer(c)));
});

test('renfort : sous le seuil de billes, chaque tap fait entrer 2 à 5 billes au hasard, posées sur la pile', async () => {
  const run = creerRun({ seed: 21 });
  const e = run.etat, g = e.grille;
  const seuil = Math.round(0.4 * g.cellules.length);
  // On vide artificiellement la grille jusqu'à passer sous le seuil, en gardant la compaction (on retire par le haut).
  for (let i = 0; i < g.cellules.length && g.cellules.filter((c) => c).length > seuil - 3; i++) g.cellules[i] = null;
  const dep = run.ctx.etat.gravite; void dep;
  const ev = premierTap(run);
  const renfort = ev.filter((v) => v.t === 'remplissage' && v.renfort).flatMap((v) => v.cellules);
  assert.ok(renfort.length >= 2 && renfort.length <= 5, 'entre 2 et 5 billes, reçu ' + renfort.length);
  for (const c of renfort) assert.ok(g.cellules[c.y * g.w + c.x] && g.cellules[c.y * g.w + c.x].id === c.id, 'la bille est bien posée à la case annoncée');
  // Grille compactée : rien ne flotte.
  const { colonnes } = await import('../src/moteur/gravite.js');
  for (const col of colonnes(g.w, g.h, e.gravite)) for (let i = 0; i < col.length - 1; i++) {
    const c = g.cellules[col[i]];
    if (c && !(c.type === 'element' && c.element.type === 'ballon')) assert.notEqual(g.cellules[col[i + 1]], null, 'bille en l’air');
  }
  const ev2 = premierTap(run);
  assert.ok(ev2.some((v) => v.t === 'remplissage' && v.renfort), 'le renfort revient à chaque tap sous le seuil');
});

test('spéciale : un groupe ≥ 4 crée une bombe sur la case tapée', () => {
  const run = creerRun({ seed: 5 });
  const e = run.etat, g = e.grille;
  // Force une colonne de 4 rouges en bas à gauche.
  for (let y = 6; y < 10; y++) g.cellules[y * g.w] = nouvelleBille(g, 0);
  for (let y = 6; y < 10; y++) if (g.w > 1) g.cellules[y * g.w + 1].couleur = 1;
  const ev = run.tap(0, 9);
  const sp = ev.find((v) => v.t === 'speciale');
  assert.ok(sp && sp.type === 'bombe' && sp.x === 0 && sp.y === 9);
  assert.equal(g.cellules[9 * g.w].speciale, 'bombe');
});

test('pierre : détruite par adjacence à un groupe', () => {
  const run = creerRun({ seed: 11 });
  const e = run.etat, g = e.grille;
  g.cellules[9 * g.w] = nouvelleBille(g, 2); g.cellules[9 * g.w + 1] = nouvelleBille(g, 2); g.cellules[8 * g.w] = nouvellePierre(g);
  g.cellules[8 * g.w + 1].couleur = 3; g.cellules[9 * g.w + 2].couleur = 3;
  const ev = run.tap(0, 9);
  assert.ok(ev.some((v) => v.t === 'detruit' && v.cause === 'pierre'));
});

test('niveau : trois cartes proposées, relance gratuite une fois par salle puis payée en jauge (D19), cartes retirées jamais reproposées', () => {
  const run = creerRun({ seed: 33 });
  const e = run.etat;
  e.xpSalle = 100; // seuil du niveau 2
  run.ctx.evenements = [];
  const { verifierNiveau } = awaitImport;
  verifierNiveau(run.ctx);
  assert.equal(e.enAttente?.type, 'niveau');
  assert.equal(e.enAttente.propositions.length, 3);
  for (const p of e.enAttente.propositions) assert.ok(p.id && p.nom && p.rarete && typeof p.risque === 'boolean');
  const avant = e.enAttente.propositions.map((p) => p.id), jauge = e.jauge;
  assert.ok(e.enAttente.relance.possible && e.enAttente.relance.gratuite && e.enAttente.relance.cout === 0);
  const ev = run.relancer();
  assert.ok(ev.some((v) => v.t === 'niveau' && v.relance));
  assert.equal(e.jauge, jauge, 'la première relance de la salle est gratuite');
  for (const p of e.enAttente.propositions) assert.ok(!avant.includes(p.id), 'carte retirée reproposée : ' + p.id);
  assert.ok(e.enAttente.relance.possible && !e.enAttente.relance.gratuite && e.enAttente.relance.cout === 1);
  const avant2 = e.enAttente.propositions.map((p) => p.id);
  run.relancer();
  assert.equal(e.jauge, jauge - 1, 'la deuxième relance coûte 1 point de jauge');
  for (const p of e.enAttente.propositions) assert.ok(!avant.includes(p.id) && !avant2.includes(p.id), 'carte retirée reproposée : ' + p.id);
  assert.ok(run.choisir(e.enAttente.propositions[0].id).some((v) => v.t === 'effet'));
  assert.equal(e.enAttente?.type ?? null, null);
});

test('D20 : une durée « parTap » ne s’use qu’aux taps ; Débridé rend la rotation gratuite', () => {
  const run = creerRun({ seed: 5 });
  const e = run.etat;
  run.ctx.evenements = [];
  appliquerEffet(run.ctx, 'jauge_infinie_3');
  const actif = () => e.effetsActifs.find((a) => a.id === 'jauge_infinie_3');
  assert.equal(actif().restant, 5);
  assert.equal(e.jauge, e.jaugeMax, 'Débridé remplit la jauge');
  assert.ok(run.tourner(1).length);
  assert.equal(e.jauge, e.jaugeMax, 'rotation gratuite');
  assert.equal(actif().restant, 5, 'la rotation ne consomme pas la durée');
  const gr = tousGroupes(e.grille)[0];
  assert.ok(run.tap(gr[0] % e.grille.w, (gr[0] / e.grille.w) | 0).length);
  assert.equal(actif().restant, 4, 'le tap consomme la durée');
});

test('épique Dernière danse : la rotation qui vide la jauge unit la rangée du sol', () => {
  const run = creerRun({ seed: 7 });
  const e = run.etat;
  run.ctx.evenements = [];
  appliquerEffet(run.ctx, 'derniere_danse');
  e.jauge = 1;
  const ev = run.tourner(1);
  assert.equal(e.jauge, 0);
  assert.ok(ev.some((v) => v.t === 'conversion'), 'une conversion attendue');
  const g = e.grille, couleurs = new Set();
  for (const col of colonnes(g.w, g.h, e.gravite)) { const c = g.cellules[col[col.length - 1]]; if (c && c.type === 'bille' && !c.speciale) couleurs.add(c.couleur); }
  assert.equal(couleurs.size, 1, 'toutes les billes du sol ont la même couleur');
  run.ctx.evenements = [];
  e.jauge = 0; e.coups = 10;
  const ev2 = run.tourner(1); // payée en coups : rien ne se passe
  assert.ok(!ev2.some((v) => v.t === 'conversion'));
});
