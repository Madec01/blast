import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerRun, chargerRun } from '../src/moteur/run.js';
import { creerGrille, nouvelleBille, existeCoup } from '../src/moteur/grille.js';
import { retomber, verifierFin } from '../src/moteur/tour.js';

test('sauvegardes : refus sûr des données corrompues et isolation de l’objet source', () => {
  for (const data of ['{', null, {}, { version: 2 }, { version: 2, etat: {} }]) assert.equal(chargerRun(data), null);
  const run = creerRun({ seed: 123 });
  const good = JSON.parse(run.serialiser());
  for (const mutate of [e => e.grille.cellules.pop(), e => e.grille.cellules[0].id = e.grille.cellules[1].id, e => e.ordre[0] = 'inconnue', e => e.gravite = 8, e => e.coups = 'vingt']) {
    const data = structuredClone(good); mutate(data.etat); assert.equal(chargerRun(data), null);
  }
  const resumed = chargerRun(good);
  assert.ok(resumed);
  resumed.etat.coups--;
  assert.equal(good.etat.coups, run.etat.coups);
});

test('nouvelles règles explicites, anciennes parties conservées, reprise déterministe', () => {
  const run = creerRun({ seed: 88 });
  assert.equal(run.etat.options.cascades, 'rotation');
  const saved = JSON.parse(run.serialiser());
  const resumed = chargerRun(saved);
  assert.deepEqual(run.tourner(1), resumed.tourner(1));
  delete saved.etat.options.cascades; delete saved.etat.options.secours;
  const old = chargerRun(saved);
  assert.equal(old.etat.options.cascades, false);
  assert.equal(old.etat.options.secours, false);
});

test('une grande grappe qui glisse intacte ne devient jamais une cascade', () => {
  const run = creerRun({ seed: 1 });
  const g = creerGrille(4, 6);
  for (let y = 0; y < 6; y++) g.cellules[y * 4] = nouvelleBille(g, 0);
  run.etat.grille = g; run.etat.gravite = 1;
  run.ctx.evenements = [];
  retomber(run.ctx, { rotation: true });
  assert.ok(run.ctx.evenements.some(v => v.t === 'chute'));
  assert.ok(!run.ctx.evenements.some(v => v.t === 'detruit'));
  assert.equal(g.cellules.filter(Boolean).length, 6);
});

test('plateau sans solution : secours déterministe, sans coût ni XP ; pas après épuisement des coups', () => {
  for (const n of [1, 2]) {
    const run = creerRun({ seed: 1 });
    const g = creerGrille(n, 1);
    for (let i = 0; i < n; i++) g.cellules[i] = nouvelleBille(g, i);
    run.etat.grille = g;
    const coups = run.etat.coups;
    verifierFin(run.ctx);
    assert.ok(existeCoup(g));
    assert.equal(run.etat.enAttente, null);
    assert.equal(run.etat.stats.secours, 1);
    assert.equal(run.etat.coups, coups);
    assert.equal(run.etat.xpSalle, 0);
  }
  const run = creerRun({ seed: 1 });
  run.etat.coups = 0;
  verifierFin(run.ctx);
  assert.equal(run.etat.enAttente.raison, 'coups');
  assert.equal(run.etat.stats.secours, undefined);
});

test('entrées invalides : aucune mutation ni consommation ; salles et difficulté vérifiées', () => {
  const run = creerRun({ seed: 5 });
  const initial = run.serialiser();
  for (const coords of [[8, 0], [-1, 1], [1.5, 0], [NaN, 0]]) assert.deepEqual(run.tap(...coords), []);
  for (const sens of [0, 7, NaN]) { assert.deepEqual(run.tourner(sens), []); assert.equal(run.peutTourner(sens), false); }
  assert.equal(run.serialiser(), initial);
  for (const args of [{ salles: [] }, { salles: ['inconnue'] }, { difficulte: 0 }, { difficulte: NaN }, { options: { couleurs: 12 } }]) assert.throws(() => creerRun(args));
});
