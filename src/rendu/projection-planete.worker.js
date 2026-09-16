import { projeterPlanete } from './projection-planete.js';
self.onmessage = async ({data}) => {
  try {
    const resultat = await projeterPlanete(data.parametres);
    self.postMessage({id:data.id,resultat}, [resultat.pixels.buffer]);
  } catch (erreur) {
    self.postMessage({id:data.id,erreur:String(erreur.message || erreur)});
  }
};
