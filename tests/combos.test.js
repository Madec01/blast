import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerGrille, nouvelleBille } from '../src/moteur/grille.js';
import { apercuCombo, declencherCombo } from '../src/moteur/combos.js';
import { avancerElements, resoudre, zoneSpeciale } from '../src/moteur/speciales.js';

function fixture(gravite = 0) {
  const grille = creerGrille(5, 5), events = [], hooks = [];
  for (let i = 0; i < 25; i++) grille.cellules[i] = nouvelleBille(grille, i % 4);
  const ctx = { grille, activesCeTour: new Set(),
    etat: { gravite, xpSalle: 0, xpTotale: 0, niveau: 1, stats: { billesDetruites: 0, chaineMax: 0 }, objectif: { type: 'billes', progres: 0 } },
    bus: { reduire: (_, valeur) => valeur, emettre: (...args) => hooks.push(args) },
    emettre: (e) => events.push(e),
  };
  return { ctx, events, hooks };
}
function paire(ctx, a, b) {
  ctx.grille.cellules[12].speciale = a;
  ctx.grille.cellules[13].speciale = b;
}

for (let gr = 0; gr < 4; gr++) {
  test(`double fusée : croix, XP exacte, sans double explosion, gravité ${gr}`, () => {
    const { ctx, events, hooks } = fixture(gr); paire(ctx, 'ligne', 'ligne');
    const avant = JSON.stringify(ctx.grille);
    const info = apercuCombo(ctx, 12);
    assert.equal(JSON.stringify(ctx.grille), avant, 'prévision pure');
    assert.deepEqual(info.cellules, [2, 7, 10, 11, 12, 13, 14, 17, 22]);
    assert.equal(declencherCombo(ctx, 12), true);
    assert.equal(ctx.etat.stats.billesDetruites, 9);
    assert.equal(ctx.etat.xpSalle, 90);
    assert.equal(ctx.etat.objectif.progres, 9);
    assert.equal(events.filter((e) => e.t === 'detruit').length, 1);
    assert.equal(hooks.filter(([nom]) => nom === 'combo').length, 1);
    assert.equal(declencherCombo(ctx, 12), false);
  });
  test(`bombe + fusée : trois axes, gravité ${gr}`, () => {
    const { ctx } = fixture(gr); paire(ctx, 'bombe', 'ligne');
    const attendu = Array.from({ length: 25 }, (_, i) => i).filter((i) => gr % 2 === 0 ? i % 5 >= 1 && i % 5 <= 3 : i >= 5 && i < 20);
    assert.deepEqual(apercuCombo(ctx, 12).cellules, attendu);
    declencherCombo(ctx, 12);
    assert.equal(ctx.etat.stats.billesDetruites, 15);
    assert.equal(ctx.etat.xpSalle, 150);
  });
}

test('couleur + fusée : conversion ciblée et chaîne finie, chaque bille comptée une seule fois', () => {
  const { ctx, events } = fixture(); paire(ctx, 'couleur', 'ligne');
  const cible = ctx.grille.cellules[13].couleur;
  const prev = apercuCombo(ctx, 12);
  assert.ok(prev.conversions.length > 0);
  assert.ok(prev.conversions.every((i) => ctx.grille.cellules[i].couleur === cible));
  declencherCombo(ctx, 12);
  const detruites = events.filter((e) => e.t === 'detruit').flatMap((e) => e.cellules);
  assert.equal(new Set(detruites.map((c) => c.id)).size, detruites.length);
  assert.equal(ctx.etat.stats.billesDetruites, detruites.length);
  assert.equal(ctx.etat.objectif.progres, detruites.length);
  assert.equal(ctx.etat.xpSalle, events.filter((e) => e.t === 'xp').reduce((s, e) => s + e.gain, 0));
  assert.equal(events.filter((e) => e.t === 'speciale').length, prev.conversions.length);
  assert.ok(events.length < 100);
});

test('relique : immunisée aux combos, explosions et avancement des éléments', () => {
  const { ctx, events } = fixture(); paire(ctx, 'ligne', 'ligne');
  const relique = { id: 99, type: 'element', element: { type: 'relique', activations: 0, max: 1 } };
  ctx.grille.cellules[7] = relique;
  declencherCombo(ctx, 12);
  resoudre(ctx, { cellules: [7], cause: 'bombe', profondeur: 0 });
  avancerElements(ctx);
  assert.equal(ctx.grille.cellules[7], relique);
  assert.equal(relique.element.activations, 0);
  assert.equal(events.filter((e) => e.t === 'element').length, 0);
  assert.equal(ctx.etat.stats.billesDetruites, 8);
});

test('sélection déterministe et recettes limitées aux paires valides', () => {
  const { ctx } = fixture(); paire(ctx, 'ligne', 'bombe');
  ctx.grille.cellules[7].speciale = 'couleur';
  assert.deepEqual(apercuCombo(ctx, 12).indices, [12, 7]);
  assert.equal(apercuCombo(ctx, 0), null);
});

test('portée des spéciales pilotable par les pouvoirs et la résonance', () => {
  const { ctx } = fixture();
  ctx.bus.reduire = (nom, valeur) => nom === 'rayonSpeciale' ? valeur + 1 : valeur;
  assert.equal(zoneSpeciale(ctx, 12, { speciale: 'bombe', rayon: 1 }).size, 25);
});
