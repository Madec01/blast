import { construireProjection } from './projection-client.js';
// Cartographie photographique locale, projection sphérique et éclairage calculés une fois.
// Les textures source sont créditées dans la documentation des assets.
const fichiers = import.meta.glob('../assets/planetes/*', { eager:true, query:'?url', import:'default' });
const cartes = new Map(), sprites = new Map();
function creerCanvas(n){const c=document.createElement('canvas');c.width=c.height=n;return c;}
function carte(id){
  if(cartes.has(id))return cartes.get(id);
  const chemin=Object.entries(fichiers).find(([p])=>p.endsWith('/'+id+'.jpg')||p.endsWith('/'+id+'.png'))?.[1];
  const prom = new Promise((resolve, reject) => {
    if (!chemin) { reject(new Error('Texture absente : ' + id)); return; }
    const im = new Image();
    const delai = setTimeout(() => { im.src = ''; reject(new Error('Chargement trop long : ' + id)); }, 15000);
    im.onload = () => {
      clearTimeout(delai);
      try {
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const cx = c.getContext('2d', { willReadFrequently:true }); cx.drawImage(im, 0, 0);
        resolve({ w:im.width, h:im.height, data:cx.getImageData(0, 0, im.width, im.height).data });
      } catch (erreur) { reject(erreur); }
    };
    im.onerror = () => { clearTimeout(delai); reject(new Error('Texture illisible : ' + id)); };
    im.src = chemin;
  });
  prom.catch(()=>{if(cartes.get(id)===prom)cartes.delete(id);});
  cartes.set(id,prom);if(cartes.size>3)cartes.delete(cartes.keys().next().value);return prom;
}
/** Sprite immutable. Aucun calcul de pixels dans la boucle d'animation. */
export function chargerPlanete(id,taille=1024,phase=0){
  const cle=id+':'+taille+':'+phase;if(sprites.has(cle))return sprites.get(cle);
  const prom=(async()=>{
    const [map,cloud,ring]=await Promise.all([carte(id),id==='terre'?carte('nuages').catch(()=>null):null,id==='saturne'?carte('anneaux').catch(()=>null):null]);
    const resultat = await construireProjection({id,taille,phase,map,cloud,ring});
    const c=creerCanvas(taille),ctx=c.getContext('2d');
    ctx.putImageData(new ImageData(resultat.pixels,taille,taille),0,0);
    return {image:c,rayon:resultat.rayon,taille};
  })();prom.catch(()=>{if(sprites.get(cle)===prom)sprites.delete(cle);});sprites.set(cle,prom);
  // Borner la mémoire mobile pendant les 24 étapes de l'expédition.
  const grands=[...sprites.keys()].filter(k=>Number(k.split(':')[1])>=1024);
  if(grands.length>4)sprites.delete(grands[0]);
  return prom;
}
export function dessinerAstre(ctx,sprite,x,y,r){const s=r/sprite.rayon;ctx.drawImage(sprite.image,x-sprite.taille*s/2,y-sprite.taille*s/2,sprite.taille*s,sprite.taille*s);}
/** Un seul rendu après chargement, utilisable sur un canvas de menu détaché. */
export async function dessinerSystemeSolaire(canvas){
  const ids=['mercure','venus','terre','mars','jupiter','saturne','uranus','neptune'];
  const [astres,soleil]=await Promise.all([Promise.all(ids.map(id=>chargerPlanete(id,384).catch(()=>null))),chargerPlanete('soleil',384).catch(()=>null)]);
  const w=canvas.width||960,h=canvas.height||400,ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
  const halo=ctx.createRadialGradient(w*.1,h*.15,w*.04,w*.1,h*.15,Math.min(w*.1,h*.15));halo.addColorStop(0,'rgba(255,175,57,.5)');halo.addColorStop(1,'rgba(255,143,35,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
  if(soleil)dessinerAstre(ctx,soleil,w*.1,h*.15,w*.072);
  // Tailles et distances volontairement composées pour lire les huit mondes sur mobile.
  const pos=[[.12,.36,.033],[.27,.28,.054],[.29,.64,.088],[.48,.45,.045],[.59,.73,.13],[.76,.32,.085],[.83,.83,.052],[.94,.62,.046]];
  astres.forEach((s,i)=>{if(s){const [x,y,r]=pos[i];dessinerAstre(ctx,s,x*w,y*h,r*w);}});
  return canvas;
}
