import test from 'node:test';
import assert from 'node:assert/strict';
import {creerRun,chargerRun} from '../src/moteur/run.js';
import {finirSalle} from '../src/moteur/tour.js';
import {palierBuild,plafondBuild} from '../src/data/builds.js';
import {ORDRE_SOLAIRE_HISTORIQUE,NIVEAUX_SOLAIRES} from '../src/data/planetes.js';
import {normaliserProfil,appliquerRecompense} from '../src/persistence.js';

test('24 niveaux : transitions, rangs étalés, cartes et sauvegardes jusqu’à Neptune',()=>{
 let run=creerRun({seed:28});
 assert.equal(new Set(NIVEAUX_SOLAIRES.map(s=>s.id)).size,24);
 for(let n=0;n<24;n++){
  const e=run.etat,pi=Math.floor(n/3);
  assert.equal(e.salle.planeteIndex,pi);assert.equal(e.salle.niveauPlanete,n%3+1);
  e.xpSalle=3500;finirSalle(run.ctx,true,'objectif');
  assert.equal(e.enAttente.planeteSauvee,n%3===2);
  run=chargerRun(run.serialiser());assert.ok(run);
  run.choisir(null);
  if(n===23)break;
  const att=run.etat.enAttente;
  assert.equal(att.type,'competence');assert.equal(att.palier,plafondBuild(pi));
  assert.ok(att.propositions.every(c=>c.rang<=plafondBuild(pi)));
  assert.ok(att.propositions.some(c=>!c.malus));
  const choice=att.propositions.find(c=>!c.malus).id;
  const loaded=chargerRun(run.serialiser());assert.ok(loaded);
  assert.deepEqual(run.choisir(choice),loaded.choisir(choice));
 }
 assert.equal(run.etat.enAttente.type,'finRun');
 assert.equal(run.etat.enAttente.planetesSauvees,8);assert.equal(run.etat.enAttente.niveauxTermines,24);
 const profile=appliquerRecompense(normaliserProfil({}),run.etat);assert.equal(profile.planetesSauvees,8);
});
test('échec au milieu d’une planète : seuls les chapitres achevés sont sauvés',()=>{
 const run=creerRun({seed:19});
 for(let i=0;i<4;i++){finirSalle(run.ctx,true,'objectif');run.choisir(null);run.choisir(null);}
 finirSalle(run.ctx,false,'coups');run.choisir(null);
 assert.equal(run.etat.enAttente.planetesSauvees,1);
 assert.equal(run.etat.enAttente.niveauxTermines,4);
});
test('ancienne expédition : huit salles et rang XP historique conservés',()=>{
 const run=creerRun({seed:4,salles:ORDRE_SOLAIRE_HISTORIQUE});
 run.etat.xpSalle=3000;finirSalle(run.ctx,true,'objectif');
 const serialized=JSON.parse(run.serialiser());delete serialized.etat.stats.salles[0].planete;
 const loaded=chargerRun(serialized);assert.ok(loaded);assert.equal(loaded.etat.ordre.length,8);
 loaded.choisir(null);assert.equal(loaded.etat.enAttente.palier,3);
 assert.equal(loaded.etat.stats.salles[0].planete,'mercure');
 assert.equal(palierBuild(3500,0),1);assert.equal(palierBuild(3500,2),2);assert.equal(palierBuild(3500,5),3);
});
test('balises : difficultés extrêmes créent exactement le nombre demandé',()=>{
 for(const difficulte of [.5,1,2,5]){
  const run=creerRun({seed:42,salles:['solaire_neptune_3'],difficulte});
  assert.equal(run.etat.grille.cellules.filter(c=>c?.element?.type==='relique').length,run.etat.objectif.cible);
  assert.ok(chargerRun(run.serialiser()));
 }
});
