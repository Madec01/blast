// Textes flottants du rendu (src/rendu/juice.js) : deux textes d'une même salve ne se superposent pas.
// Pur (aucun canvas à l'émission) : testable sous node comme le moteur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerJuice } from '../src/rendu/juice.js';

function juice() { const j = creerJuice(); j.definirCadre(40, 400, 800); return j; }
const mots = (j) => j.textes.filter((t) => t.type === 1);

test('+XP d’une même salve au même endroit : un seul texte qui s’additionne (« +10 » sous « +100 » en finale)', () => {
  const j = juice();
  j.emettreXP(100, 650, 100, 0.5);
  j.majTextes(0.2); // la spéciale de la finale joue 70-110 ms plus tard
  j.emettreXP(110, 660, 10, 0.45);
  const xp = j.textes.filter((t) => t.type === 0);
  assert.equal(xp.length, 1);
  assert.equal(xp[0].mot, '+110');
  assert.equal(xp[0].echelle, 0.5, 'garde la plus grande taille');
  assert.equal(xp[0].age, 0, 'repart pour une pleine durée');
  assert.ok(xp[0].y < 650, 'reprend là où il était monté, sans redescendre');
});

test('+XP trop tard ou trop loin : deux textes distincts ; « 7 billes » (info) ne fusionne jamais', () => {
  const j = juice();
  j.emettreXP(100, 650, 100); j.majTextes(0.4); j.emettreXP(100, 650, 30);
  assert.deepEqual(j.textes.map((t) => t.mot), ['+100', '+30']);
  const k = juice();
  k.emettreXP(100, 650, 100); k.emettreXP(300, 650, 30); // 5 cases plus loin
  assert.deepEqual(k.textes.map((t) => t.mot), ['+100', '+30']);
  const l = juice();
  l.emettreInfo(100, 650, '7 billes'); l.emettreXP(100, 650, 30); l.emettreXP(100, 650, 20);
  assert.deepEqual(l.textes.map((t) => t.mot), ['7 billes', '+50']);
});

test('« Étincelle ! » puis « BOOM ! » côte à côte : le plus petit mot passe dessous, le mot du tap ne bouge pas', () => {
  const j = juice();
  j.emettreCombo(100, 400, 4); j.majTextes(0.2); j.emettreBoom(140, 400);
  const [etincelle, boom] = mots(j);
  assert.equal(etincelle.mot, 'Étincelle !'); assert.equal(etincelle.y, 400);
  assert.equal(boom.mot, 'BOOM !'); assert.ok(boom.y > 400 + 40, 'sous le mot du tap : ' + boom.y);
});

test('un grand mot qui arrive sur un petit : le petit descend, le grand garde sa place ; près du bas, il monte', () => {
  const j = juice();
  j.emettreBoom(200, 400); j.emettreMot(210, 400, 'BIG BANG !', 1.3);
  const [boom, big] = mots(j);
  assert.equal(big.y, 400); assert.ok(boom.y > 400);
  const k = juice();
  k.emettreCombo(100, 780, 6); k.emettreBoom(120, 780); // bas du canvas (800) : pas de place dessous
  const [stellaire, b2] = mots(k);
  assert.equal(stellaire.y, 780); assert.ok(b2.y < 780 - 40, 'au-dessus : ' + b2.y);
});

test('mots éloignés ou déjà vieux : aucun déplacement', () => {
  const j = juice();
  j.emettreCombo(100, 400, 4); j.emettreBoom(100, 600); // 5 cases plus bas
  assert.deepEqual(mots(j).map((t) => t.y), [400, 600]);
  const k = juice();
  k.emettreCombo(100, 400, 4); k.majTextes(0.6); k.emettreBoom(110, 400); // l’ancien s’efface déjà
  assert.deepEqual(mots(k).map((t) => t.y), [400, 400]);
});
