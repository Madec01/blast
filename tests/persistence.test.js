import test from 'node:test';
import assert from 'node:assert/strict';
import { lire, lireJson, ecrire, effacer, normaliserProfil, appliquerRecompense } from '../src/persistence.js';

test('stockage refusé : toutes les opérations restent sûres', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  assert.equal(lire('run'), null);
  assert.deepEqual(lireJson('profil', {}), {});
  assert.equal(ecrire('profil', { runs: 1 }), false);
  assert.doesNotThrow(() => effacer('run'));
  delete globalThis.localStorage;
});

test('profil corrompu : compteurs finis et migration de l’ancien réglage audio', () => {
  const p = normaliserProfil({ runs: 'x', victoires: -3, xpTotale: Infinity, muet: true });
  assert.equal(p.runs, 0); assert.equal(p.victoires, 0); assert.equal(p.xpTotale, 0);
  assert.equal(p.effets, false); assert.equal(p.musique, false);
  assert.equal(normaliserProfil(null).vibrations, true);
  assert.equal(normaliserProfil({ effets: true, muet: true }).effets, true);
});

test('récompense terminale : idempotente après sauvegarde/rechargement du profil', () => {
  const etat = { seed: 123, stats: { debut: 100, fin: 200 }, enAttente: { type: 'finRun', victoire: true, salleIndex: 4, monnaieMeta: 15, xpTotale: 1000 } };
  const p = appliquerRecompense(normaliserProfil({}), etat);
  assert.equal(p.runs, 1); assert.equal(p.monnaieMeta, 15);
  const reprise = normaliserProfil(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(appliquerRecompense(reprise, etat), reprise);
  assert.equal(appliquerRecompense(reprise, { ...etat, seed: 124 }).runs, 2);
});
