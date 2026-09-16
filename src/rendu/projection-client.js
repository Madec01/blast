// Un worker partagé par l'accueil et le jeu : les rotations restent réactives
// pendant la préparation d'un globe. Sans Worker, travail par bandes de 16 lignes.
import { projeterPlanete } from './projection-planete.js';
let worker=null, indisponible=typeof Worker==='undefined', numero=0;
const attentes=new Map();
const ceder=()=>new Promise(resolve=>setTimeout(resolve,0));
function obtenirWorker(){
  if(indisponible)return null;
  if(worker)return worker;
  try {
    worker=new Worker(new URL('./projection-planete.worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      const attente=attentes.get(data.id);if(!attente)return;
      attentes.delete(data.id);
      if(data.erreur)attente.reject(new Error(data.erreur));else attente.resolve(data.resultat);
    };
    worker.onerror=()=>{
      indisponible=true;worker?.terminate();worker=null;
      for(const a of attentes.values())a.reject(new Error('Projection en secours'));
      attentes.clear();
    };
    return worker;
  }catch{indisponible=true;return null;}
}
export async function construireProjection(parametres){
  const courant=obtenirWorker();
  if(courant){
    const id=++numero;
    try {
      return await new Promise((resolve,reject)=>{
        attentes.set(id,{resolve,reject});
        try { courant.postMessage({id,parametres}); }
        catch(e){attentes.delete(id);reject(e);}
      });
    }catch{/* Secours local découpé, mêmes pixels et aucun appel réseau. */}
  }
  return projeterPlanete(parametres,ceder);
}
