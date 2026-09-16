import test from 'node:test';
import assert from 'node:assert/strict';
import {creerRun,chargerRun} from '../src/moteur/run.js';
import {verifierNiveau,finirSalle} from '../src/moteur/tour.js';
import {chargerResonance,proposerBuild,sauverReliques} from '../src/moteur/solaire.js';
import {CARTES_BUILD,palierBuild} from '../src/data/builds.js';
import {PLANETES} from '../src/data/planetes.js';
import {creerGrille,nouvelleBille,nouvelElement} from '../src/moteur/grille.js';

test('campagne : huit planètes, sans carte pendant une salle, énergie automatique',()=>{
 const r=creerRun({seed:17}),e=r.etat;assert.equal(e.ordre.length,8);assert.equal(e.salle.planete,'mercure');
 e.xpSalle=3000;e.jauge=0;verifierNiveau(r.ctx);assert.equal(e.enAttente,null);assert.equal(e.niveau,10);assert.equal(e.jauge,e.jaugeMax);
 assert.ok(chargerRun(r.serialiser()));
});
test('build : XP active avant finale, choix persistant et reprise déterministe',()=>{
 const r=creerRun({seed:14}),e=r.etat;e.xpSalle=1700;e.xpTotale=1700;finirSalle(r.ctx,true,'objectif');
 assert.equal(e.xpReference,1700);assert.ok(e.xpSalle>1700);r.choisir(null);assert.equal(e.enAttente.palier,2);
 assert.ok(e.enAttente.propositions.some(c=>!c.malus));
 const reprise=chargerRun(r.serialiser());assert.ok(reprise);
 const choix=e.enAttente.propositions[0];assert.deepEqual(r.choisir(choix.id),reprise.choisir(choix.id));
 assert.equal(e.build.find(c=>c.id===choix.id).rang,2);assert.equal(e.salle.planete,'venus');assert.equal(e.enAttente,null);
 assert.equal(palierBuild(1599),1);assert.equal(palierBuild(1600),2);assert.equal(palierBuild(2800),3);
});
test('build : choix sûr après épuisement, cumul borné et réserve prochaine planète',()=>{
 const r=creerRun({seed:3});r.etat.build=CARTES_BUILD.filter(c=>!c.risque).map(c=>({id:c.id,rang:3}));r.etat.xpReference=4000;
 const props=proposerBuild(r.ctx);assert.ok(props.some(c=>c.id==='reserve_solaire'));assert.ok(props.every(c=>c.rang<=3));
});
test('résonance : déclenchement sans attente, exactement trois actions acceptées, rotation gratuite',()=>{
 const r=creerRun({seed:33}),e=r.etat;chargerResonance(r.ctx,100);assert.equal(e.resonance.actions,3);assert.equal(e.enAttente,null);
 const jauge=e.jauge;r.tourner(1);assert.equal(e.jauge,jauge);assert.equal(e.resonance.actions,2);
 r.tap(-1,0);assert.equal(e.resonance.actions,2);r.tourner(1);r.tourner(-1);assert.equal(e.resonance.actions,0);
});
test('balises : chaque sortie fixe fonctionne seulement vers son bord',()=>{
 for(let gr=0;gr<4;gr++) {
  const r=creerRun({seed:5,salles:['solaire_terre']});r.etat.grille=creerGrille(3,3);const g=r.etat.grille;
  const i=[7,5,1,3][gr];g.cellules[i]=nouvelElement(g,'relique');r.etat.objectif={type:'reliques',cible:1,progres:0,sortie:{gravite:gr}};
  r.etat.gravite=(gr+1)%4;assert.equal(sauverReliques(r.ctx),false);r.etat.gravite=gr;assert.equal(sauverReliques(r.ctx),true);assert.equal(r.etat.objectif.progres,1);assert.equal(g.cellules[i],null);
 }
});
test('balises : chute et sortie gagnent sans disparition par explosion, sauvegarde supportée',()=>{
 const r=creerRun({seed:8,salles:['solaire_terre']});const e=r.etat;e.grille=creerGrille(4,4);e.gravite=0;
 e.objectif={type:'reliques',cible:1,progres:0,sortie:{gravite:1}};e.grille.cellules[5]=nouvelElement(e.grille,'relique');
 e.grille.cellules[12]=nouvelleBille(e.grille,0);e.grille.cellules[13]=nouvelleBille(e.grille,0);
 assert.ok(chargerRun(r.serialiser()));r.tourner(1);assert.equal(e.enAttente?.type,'finSalle');assert.equal(e.enAttente.victoire,true);
});
test('planètes : modificateurs mécaniques et cartes à malus restaurés une fois',()=>{
 for(const p of PLANETES){const r=creerRun({salles:['solaire_'+p.id],seed:1});assert.equal(r.etat.salle.bonus,p.bonus);assert.equal(r.etat.salle.malus,p.malus);assert.ok(chargerRun(r.serialiser()));}
 const r=creerRun({seed:1});r.etat.build=[{id:'artificier',rang:2},{id:'spectre_instable',rang:2}];
 const loaded=chargerRun(r.serialiser());assert.ok(loaded);
 assert.equal(loaded.ctx.bus.reduire('coupsInitiaux',32,loaded.ctx),28);
 assert.equal(loaded.ctx.bus.reduire('rayonSpeciale',1,loaded.ctx,{type:'bombe'}),3);
 assert.equal(loaded.ctx.bus.reduire('xpGain',100,loaded.ctx),80);
});
test('sauvegardes : ancien run conservé, données solaires corrompues rejetées',()=>{
 const old=creerRun({seed:1,salles:['vestibule']});const d=JSON.parse(old.serialiser());delete d.etat.options.buildSolaire;delete d.etat.build;delete d.etat.resonance;
 const legacy=chargerRun(d);assert.ok(legacy);legacy.etat.xpSalle=100;verifierNiveau(legacy.ctx);assert.equal(legacy.etat.enAttente.type,'niveau');
 const r=creerRun({seed:1});for(const bad of [{charge:-1,max:100,actions:0},{charge:0,max:100,actions:4}]){const s=JSON.parse(r.serialiser());s.etat.resonance=bad;assert.equal(chargerRun(s),null);}
 const s=JSON.parse(r.serialiser());s.etat.build=[{id:'artificier',rang:99}];assert.equal(chargerRun(s),null);
});
