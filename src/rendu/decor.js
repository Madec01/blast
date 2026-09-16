// Décor astronomique : seuls les bitmaps mis en cache sont dessinés à chaque frame.
import { planeteParId } from '../data/planetes.js';
import { chargerPlanete, dessinerAstre } from './planetes.js';
const TAU=Math.PI*2;
function canvas(cote){const c=document.createElement('canvas');c.width=c.height=cote;return c;}
function rng(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function creerDecor() {
  let id='terre', planete=null, sprite=null, lune=null, stars=null, side=0,phase=0,version=0;
  chargerPlanete('lune',160).then(s=>{lune=s;}).catch(()=>{});
  function definirPlanete(nouveau,etape=0) {
    const next=nouveau || 'terre',nouvellePhase=Number(etape)||0;
    if(next===id && nouvellePhase===phase && sprite)return;
    id=next;phase=nouvellePhase;planete=planeteParId(id);sprite=null;const v=++version;
    chargerPlanete(id,1024,phase).then(s=>{if(v===version)sprite=s;}).catch(()=>{});
  }
  function regenerer(_cell,cw,ch) { const taille=Math.min(2048,Math.ceil(Math.hypot(cw,ch)*1.05)); if(taille===side)return;side=taille;stars=canvas(side);const ctx=stars.getContext('2d'),random=rng(1337);for(let i=0;i<420;i++){const x=random()*side,y=random()*side,r=.4+random()*1.2;ctx.globalAlpha=.3+random()*.7;ctx.fillStyle=i%5?'#d1e8ff':'#ffe3aa';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();if(i%40===0){ctx.fillRect(x-r*3,y-.4,r*6,.8);ctx.fillRect(x-.4,y-r*3,.8,r*6);}} }
  function dessiner(ctx,cw,ch,angle) {
    if(!version) definirPlanete(id);
    ctx.fillStyle='#030917';ctx.fillRect(0,0,cw,ch);
    const m=Math.min(cw,ch), radius=m*.85, px=m*.38,py=m*.42;
    ctx.save();ctx.translate(cw/2,ch/2);ctx.rotate(angle);
    if(stars)ctx.drawImage(stars,-side/2,-side/2,side,side);
    // Le soleil et ses halos restent solidaires de la planète et du plateau.
    const sx=-m*.4,sy=-m*.44,sr=m*(id==='mercure'?.052:.025);
    let g=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*9);g.addColorStop(0,'#fff7d1');g.addColorStop(.1,'rgba(255,222,148,.9)');g.addColorStop(.28,'rgba(250,152,64,.18)');g.addColorStop(1,'rgba(255,150,30,0)');ctx.fillStyle=g;ctx.fillRect(sx-sr*9,sy-sr*9,sr*18,sr*18);
    ctx.beginPath();ctx.arc(sx,sy,sr*.7,0,TAU);ctx.fillStyle='#fff7e1';ctx.fill();
    if(sprite) dessinerAstre(ctx,sprite,px,py,radius);
    else {const g=ctx.createRadialGradient(px-radius*.4,py-radius*.4,0,px,py,radius);g.addColorStop(0,planete?.couleur||'#49687e');g.addColorStop(1,'#060b13');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,radius,0,TAU);ctx.fill();}
    const moons=Math.min(3,planete?.lunes ?? (id==='terre'?1:0));
    for(let i=0;i<moons;i++){const mx=-m*.35+i*m*.21,my=-m*.13-i*m*.11,r=m*(.025+i*.007);if(lune)dessinerAstre(ctx,lune,mx,my,r);}
    ctx.restore();
    // Vignette très légère ; la surface conserve sa couleur et sa texture sous le verre.
    const v=ctx.createRadialGradient(cw*.5,ch*.5,m*.28,cw*.5,ch*.5,Math.max(cw,ch)*.72);v.addColorStop(0,'rgba(1,5,15,0)');v.addColorStop(1,'rgba(1,5,15,.38)');ctx.fillStyle=v;ctx.fillRect(0,0,cw,ch);
  }
  return { regenerer, definirPlanete, definirActe(){}, maj(){}, dessiner };
}
