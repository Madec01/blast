import { creerRun, chargerRun } from '../src/moteur/run.js';
import { choisirAction, appliquerAction } from './politique-solaire.mjs';
const n = Math.max(1, Number(process.argv[2] || 20));
const stats = { runs:n, victoires:0, erreurs:0, actions:0, cartes:0, interruptions:0, combos:0, resonances:0, parPlanete:{} };
for (let seed=1;seed<=n;seed++) {
  const run=creerRun({seed});
  let pas=0;
  try {
    while (run.etat.enAttente?.type!=='finRun' && pas++<500) {
      const a=choisirAction(run); if(!a) throw new Error('Aucune action');
      if(run.etat.enAttente?.type==='niveau') stats.interruptions++;
      if(run.etat.enAttente?.type==='competence') stats.cartes++;
      const ev=appliquerAction(run,a);stats.actions++;
      stats.combos+=ev.filter(v=>v.t==='combo').length;
      stats.resonances+=ev.filter(v=>v.t==='resonance' && v.actions===3).length;
      if(!chargerRun(run.serialiser())) throw new Error('Sauvegarde non rechargeable');
      for(const v of ev.filter(v=>v.t==='finSalle')) {
        const id=run.etat.salle.id;
        const p=stats.parPlanete[id]??={jouees:0,gagnees:0,xp:0,tours:0};
        p.jouees++;p.gagnees+=v.victoire?1:0;p.xp+=run.etat.xpSalle;p.tours+=run.etat.tour;
      }
    }
    if(pas>=500) throw new Error('Limite actions');
    if(run.etat.enAttente?.victoire)stats.victoires++;
  } catch(error) {stats.erreurs++;console.error('seed',seed,error.stack);}
}
console.log(JSON.stringify(stats,null,2));
if(stats.erreurs||stats.interruptions)process.exitCode=1;
