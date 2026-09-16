// Cartographie photographique locale, projection sphérique et éclairage calculés une fois.
// Les textures source sont créditées dans la documentation des assets.
const fichiers = import.meta.glob('../assets/planetes/*', { eager:true, query:'?url', import:'default' });
const cartes = new Map(), sprites = new Map();
const TAU=Math.PI*2;
const atmosphere={venus:[210,171,103],terre:[58,142,235],mars:[157,86,51],jupiter:[177,153,117],saturne:[202,184,138],uranus:[126,207,217],neptune:[75,126,225]};
function creerCanvas(n){const c=document.createElement('canvas');c.width=c.height=n;return c;}
function carte(id){
  if(cartes.has(id))return cartes.get(id);
  const chemin=Object.entries(fichiers).find(([p])=>p.endsWith('/'+id+'.jpg')||p.endsWith('/'+id+'.png'))?.[1];
  const prom=new Promise((resolve,reject)=>{if(!chemin){reject(new Error('Texture absente : '+id));return;}const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(im,0,0);resolve({w:im.width,h:im.height,data:cx.getImageData(0,0,im.width,im.height).data});};im.onerror=()=>reject(new Error('Texture illisible : '+id));im.src=chemin;});
  cartes.set(id,prom);if(cartes.size>3)cartes.delete(cartes.keys().next().value);return prom;
}
function lire(tex,u,v,k){const x=((u%1+1)%1)*(tex.w-1),y=Math.max(0,Math.min(1,v))*(tex.h-1),x0=x|0,y0=y|0,x1=Math.min(tex.w-1,x0+1),y1=Math.min(tex.h-1,y0+1),a=x-x0,b=y-y0,d=tex.data;return (d[(y0*tex.w+x0)*4+k]*(1-a)+d[(y0*tex.w+x1)*4+k]*a)*(1-b)+(d[(y1*tex.w+x0)*4+k]*(1-a)+d[(y1*tex.w+x1)*4+k]*a)*b;}
/** Sprite immutable. Aucun calcul de pixels dans la boucle d'animation. */
export function chargerPlanete(id,taille=1024,phase=0){
  const cle=id+':'+taille+':'+phase;if(sprites.has(cle))return sprites.get(cle);
  const prom=(async()=>{
    const [map,cloud,ring]=await Promise.all([carte(id),id==='terre'?carte('nuages').catch(()=>null):null,id==='saturne'?carte('anneaux').catch(()=>null):null]);
    // Laisser l'interface peindre avant de construire le bitmap.
    await new Promise(r=>setTimeout(r,0));
    const c=creerCanvas(taille),ctx=c.getContext('2d'),im=ctx.createImageData(taille,taille),d=im.data;
    const rings=id==='saturne',r=taille*(rings?.225:.475),cx=taille/2,cy=taille/2;
    const lx=-.57,ly=-.42,lz=.706,rot=-.38,cr=Math.cos(rot),sr=Math.sin(rot),tilt=.34,tiltZ=Math.sqrt(1-tilt*tilt);
    const decalage={terre:.54,mars:.1,jupiter:.52,mercure:.22,venus:.3,saturne:.16,uranus:.18,neptune:.22,lune:.49,soleil:.2}[id]||0;
    for(let y=0;y<taille;y++)for(let x=0;x<taille;x++){
      const nx=(x-cx)/r,ny=(y-cy)/r,rr=nx*nx+ny*ny,i=(y*taille+x)*4;
      let rgb=null,alpha=0,z=-Infinity;
      if(rr<=1){z=Math.sqrt(1-rr);const u=Math.atan2(nx,z)/TAU+decalage+phase*.12,v=.5+Math.asin(ny)/Math.PI;
        const dot=nx*lx+ny*ly+z*lz,light=id==='soleil'?1:.035+.965*Math.max(0,dot);
        rgb=[0,1,2].map(k=>lire(map,u,v,k));
        if(cloud){const a=Math.max(0,(lire(cloud,u+.008,v,0)-24)/231)*.8;rgb=rgb.map(v=>v*(1-a)+239*a);}
        rgb=rgb.map(v=>v*light);alpha=Math.min(1,(1-Math.sqrt(rr))*r);
        const atm=atmosphere[id];if(atm){const limb=Math.pow(1-z,5)*Math.max(0,dot)*.7;rgb=rgb.map((v,k)=>v*(1-limb)+atm[k]*limb);}
        // Ombre des anneaux sur la surface : intersection du rayon lumineux avec leur plan.
        if(rings){const normalX=-sr*tiltZ,normalY=cr*tiltZ,normalZ=-tilt,den=normalX*lx+normalY*ly+normalZ*lz,t=-(normalX*nx+normalY*ny+normalZ*z)/den;if(t>0){const rx=nx+t*lx,ry=ny+t*ly,rz=z+t*lz,rd=Math.hypot(rx,ry,rz);if(rd>1.22&&rd<2.17)rgb=rgb.map(v=>v*.46);}}
      }else if(rr<1.045&&atmosphere[id]){const a=Math.exp(-(Math.sqrt(rr)-1)*r*.7)*.24*Math.max(0,-nx*.57-ny*.42+.35);rgb=atmosphere[id];alpha=a;}
      if(rings){const rx=nx*cr+ny*sr,ry=-nx*sr+ny*cr,rz=ry/tilt*tiltZ,rad=Math.hypot(rx,ry/tilt);
        if(rad>1.22&&rad<2.17&&rz>z){const u=(rad-1.22)/.95,gap=rad>1.87&&rad<1.93;let a=ring?lire(ring,u,.5,3)/255:.65;a*=gap?.14:.9;
          // Le globe masque la lumière reçue par les anneaux.
          const dot=nx*lx+ny*ly+rz*lz,disc=dot*dot-(nx*nx+ny*ny+rz*rz-1),ombre=disc>0&&(-dot+Math.sqrt(disc))>0,lit=ombre?.12:.77;
          const rc=ring?[0,1,2].map(k=>lire(ring,u,.5,k)*lit):[184,170,141].map(v=>v*lit);
          const out=a+alpha*(1-a);rgb=rc.map((v,k)=>(v*a+(rgb?.[k]||0)*alpha*(1-a))/(out||1));alpha=out;
        }
      }
      if(rgb){d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=alpha*255;}
    }
    ctx.putImageData(im,0,0);return {image:c,rayon:r,taille};
  })();sprites.set(cle,prom);
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
