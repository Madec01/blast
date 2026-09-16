import { CARTES_BUILD, palierBuild, plafondBuild } from '../data/builds.js';
import { planeteParId } from '../data/planetes.js';
import { voisins, tousGroupes, coord } from './grille.js';
import { convertir } from '../data/effets.js';

export const rangBuild = (e,id) => e.build?.find((c)=>c.id===id)?.rang ?? 0;
export function proposerBuild(ctx) {
  const e=ctx.etat, palier=palierBuild(e.xpReference??0,e.salle.planeteIndex), plafond=plafondBuild(e.salle.planeteIndex);
  const pool=CARTES_BUILD.filter(c=>rangBuild(e,c.id)<plafond);
  const sures=ctx.rng.melanger(pool.filter(c=>!c.risque));
  const risques=ctx.rng.melanger(pool.filter(c=>c.risque));
  const choix=[...sures.slice(0,1),...risques.slice(0,1)];
  choix.push(...ctx.rng.melanger(pool.filter(c=>!choix.includes(c))).slice(0,3-choix.length));
  // Si tous les choix sûrs ont atteint le rang maximal, une réserve sans malus reste disponible.
  if (!sures.length) choix.unshift({id:'reserve_solaire',nom:'Réserve solaire',archetype:'Soutien',desc:'+3 coups pour le prochain niveau.',bonus:'+3 coups pour le prochain niveau.',malus:null});
  return choix.slice(0,3).map(c=>({...c,palier,rang:c.id==='reserve_solaire'?1:Math.min(plafond,rangBuild(e,c.id)+palier),rarete:['commun','rare','epique'][palier-1]}));
}
export function choisirBuild(ctx,carte) {
  const e=ctx.etat;
  if(carte.id==='reserve_solaire') { e.memo.reserveSolaire=3; return; }
  const actuel=e.build.find(c=>c.id===carte.id);
  if(actuel) actuel.rang=carte.rang; else e.build.push({id:carte.id,rang:carte.rang});
  ctx.emettre({t:'competence',id:carte.id,nom:carte.nom});
}
export function chargerResonance(ctx,n) {
  const e=ctx.etat,r=e.resonance;
  if(!r||r.actions>0||ctx.finale) return;
  r.charge=Math.min(r.max,r.charge+Math.round(n*(planeteParId(e.salle?.planete)?.resonance??1)));
  if(r.charge>=r.max) {r.charge=0;r.actions=3;ctx.resonanceNouvelle=true;ctx.emettre({t:'message',texte:'RÉSONANCE ! 3 actions amplifiées'});}
  ctx.emettre({t:'resonance',...r});
}
export function commencerActionSolaire(ctx) {ctx.resonanceNouvelle=false;ctx.resonanceActive=(ctx.etat.resonance?.actions??0)>0;}
export function finirActionSolaire(ctx) {
  const r=ctx.etat.resonance;
  if(r&&ctx.resonanceActive&&!ctx.resonanceNouvelle) {r.actions=Math.max(0,r.actions-1);ctx.emettre({t:'resonance',...r});}
  ctx.resonanceActive=false;
}
export function installerSolaire(ctx) {
  if(!ctx.etat.options.buildSolaire)return;
  const rank=(id)=>rangBuild(ctx.etat,id), source={source:'solaire'};
  ctx.bus.on('coupsInitiaux',(v)=>Math.max(8,v-2*rank('artificier')-rank('orbite_risquee')),source);
  ctx.bus.on('jaugeInitiale',(v)=>v+2*rank('navigateur'),source);
  ctx.bus.on('coutRotation',(v)=>ctx.etat.resonance?.actions>0?0:v,source);
  ctx.bus.on('rayonSpeciale',(v,c,ev)=>ev.type==='bombe'?v+rank('artificier')+(planeteParId(c.etat.salle?.planete)?.rayon??0)+(ctx.resonanceActive?1:0):v,source);
  ctx.bus.on('seuils',(v)=>Object.fromEntries(Object.entries(v).map(([k,n])=>[k,Math.max(3,n-rank('amorce_sure'))])),source);
  ctx.bus.on('xpGain',(v,c)=>v*(planeteParId(c.etat.salle?.planete)?.xp??1)*(1-.1*rank('spectre_instable')),source);
  ctx.bus.on('groupeDetruit',(c,ev)=>{
    if(ev.taille>=4&&rank('chromaticien')) {
      const cand=new Set();
      for(const p of ev.cellules) for(const i of voisins(c.grille,p.y*c.grille.w+p.x)) {const b=c.grille.cellules[i];if(b?.type==='bille'&&!b.speciale&&b.couleur!==ev.couleur)cand.add(i);}
      convertir(c,[...cand].slice(0,rank('chromaticien')),ev.couleur);
    }
    if(ev.taille>=5)chargerResonance(c,8);
  },source);
  ctx.bus.on('combo',(c)=>chargerResonance(c,35),source);
  ctx.bus.on('rotationEvaluee',(c,ev)=>{
    if(!ev.productive)return;
    chargerResonance(c,25+12*rank('orbite_risquee'));
    if(!rank('spectre_instable'))return;
    const gr=tousGroupes(c.grille).sort((a,b)=>b.length-a.length)[0];if(!gr)return;
    const couleur=c.grille.cellules[gr[0]].couleur,cand=new Set();
    for(const i of gr)for(const j of voisins(c.grille,i)){const b=c.grille.cellules[j];if(b?.type==='bille'&&!b.speciale&&b.couleur!==couleur)cand.add(j);}
    convertir(c,[...cand].slice(0,2*rank('spectre_instable')),couleur);
  },source);
}
/** Sortie liée au plateau, jamais à l'écran. L'intégralité du bord est un portail. */
export function sauverReliques(ctx) {
  const e=ctx.etat,o=e.objectif,g=ctx.grille;
  if(o.type!=='reliques'||e.gravite!==o.sortie?.gravite)return false;
  let sorties=false;
  for(let i=0;i<g.cellules.length;i++) {
    const c=g.cellules[i];if(c?.element?.type!=='relique')continue;
    const [x,y]=coord(g,i),bord=[y===g.h-1,x===g.w-1,y===0,x===0][e.gravite];
    if(!bord)continue;
    g.cellules[i]=null;o.progres++;sorties=true;
    e.stats.reliquesSauvees=(e.stats.reliquesSauvees??0)+1;
    ctx.emettre({t:'element',x,y,id:c.id,type:'relique',action:'sauvee'});
    ctx.emettre({t:'message',texte:'Noyau sauvé !'});
  }
  return sorties;
}
