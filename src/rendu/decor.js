// Décor orbital original : textures calculées une fois et conservées au redimensionnement.
// Aucun téléchargement, filtre par frame ou allocation de bitmap pendant une rotation.
import { planeteParId } from '../data/planetes.js';
const TAU = Math.PI * 2, textures = new Map();
function canvas(cote) { const c = document.createElement('canvas'); c.width = c.height = cote; return c; }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noise(x,y,z) { return (Math.sin(x*3.1+y*2.7+z*2.4)+.5*Math.sin(x*7.3-y*6.1+z*5.7)+.25*Math.cos(x*15.7+y*13.1-z*11.9)+.12*Math.sin(x*32.3-y*25.7+z*29.1))/1.87; }
const palettes = { mercure:[[94,87,79],[184,166,142]], venus:[[151,85,40],[247,211,132]], terre:[[9,47,112],[28,107,174]], mars:[[114,41,27],[220,121,62]], jupiter:[[136,72,47],[238,205,153]], saturne:[[150,120,69],[239,217,161]], uranus:[[45,133,158],[157,225,226]], neptune:[[16,48,145],[69,132,228]] };
function batirPlanete(id) {
  if (textures.has(id)) return textures.get(id);
  const c = canvas(768), ctx = c.getContext('2d'), im = ctx.createImageData(768,768), p = palettes[id] || palettes.terre;
  for(let y=0;y<768;y++) for(let x=0;x<768;x++) {
    const nx=(x-384)/378, ny=(y-384)/378, r2=nx*nx+ny*ny; if(r2>1) continue;
    const nz=Math.sqrt(1-r2), n=noise(nx*2.8,ny*2.8,nz*2.8), lon=Math.atan2(nx,nz), lat=Math.asin(ny);
    let v=.5+n*.5, col;
    if(['jupiter','saturne','uranus','neptune','venus'].includes(id)) v=.5+.3*Math.sin(lat*48+3*n)+.15*Math.sin(lat*121+n*7);
    col=p[0].map((a,i)=>a+(p[1][i]-a)*v);
    if(id==='terre') {
      const land=noise(Math.sin(lon)*3.5+.8,lat*4.2,Math.cos(lon)*3.5);
      if(land>.12) col=[49+v*47,87+v*47,61+v*25];
      if(Math.abs(lat)>1.12+.1*n) col=[195,222,227];
      const cloud=Math.max(0,noise(nx*7+2,ny*11,nz*6)-.21)*1.55;
      col=col.map(a=>a*(1-cloud)+230*cloud);
    }
    if(id==='mars' && lat < -1.22) col=[224,208,184];
    if(id==='jupiter') { const storm=((nx-.35)/.28)**2+((ny-.22)/.10)**2; if(storm<1) col=[186+26*Math.sin(storm*15),89+25*storm,55]; }
    const diffuse=Math.max(0,-nx*.65-ny*.42+nz*.64), light=.13+.87*diffuse, edge=Math.pow(1-nz,7);
    const index=(y*768+x)*4;
    for(let k=0;k<3;k++) im.data[index+k]=Math.min(255,col[k]*light+edge*[26,65,95][k]*diffuse);
    im.data[index+3]=Math.min(255,(1-Math.sqrt(r2))*378*255);
  }
  ctx.putImageData(im,0,0);
  if(id==='mercure' || id==='mars') {
    const random=rng(id==='mars'?345:119); ctx.save(); ctx.beginPath();ctx.arc(384,384,375,0,TAU);ctx.clip();
    for(let i=0;i<150;i++){ const x=random()*768,y=random()*768,r=2+random()*17;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle='rgba(22,12,10,.11)';ctx.fill();ctx.beginPath();ctx.arc(x,y,r,-2.8,-.4);ctx.strokeStyle='rgba(255,222,185,.16)';ctx.lineWidth=1.5;ctx.stroke(); }
    ctx.restore();
  }
  textures.set(id,c); return c;
}
export function creerDecor() {
  let id='terre', planete=null, sprite=null, stars=null, side=0;
  function definirPlanete(nouveau) { const next=nouveau || 'terre'; if(sprite && next===id)return;id=next;planete=planeteParId(id);sprite=batirPlanete(id); }
  function regenerer(_cell,cw,ch) { const taille=Math.min(2048,Math.ceil(Math.hypot(cw,ch)*1.05)); if(taille===side)return;side=taille;stars=canvas(side);const ctx=stars.getContext('2d'),random=rng(1337);for(let i=0;i<420;i++){const x=random()*side,y=random()*side,r=.4+random()*1.2;ctx.globalAlpha=.3+random()*.7;ctx.fillStyle=i%5?'#d1e8ff':'#ffe3aa';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();if(i%40===0){ctx.fillRect(x-r*3,y-.4,r*6,.8);ctx.fillRect(x-.4,y-r*3,.8,r*6);}} }
  function dessiner(ctx,cw,ch,angle) {
    if(!sprite) definirPlanete('terre');
    ctx.fillStyle='#030917';ctx.fillRect(0,0,cw,ch);
    const m=Math.min(cw,ch), radius=m*.85, px=m*.38,py=m*.42;
    ctx.save();ctx.translate(cw/2,ch/2);ctx.rotate(angle);
    if(stars)ctx.drawImage(stars,-side/2,-side/2,side,side);
    // Le soleil et ses halos restent solidaires de la planète et du plateau.
    const sx=-m*.4,sy=-m*.44,sr=m*(id==='mercure'?.052:.025);
    let g=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*9);g.addColorStop(0,'#fff7d1');g.addColorStop(.1,'rgba(255,222,148,.9)');g.addColorStop(.28,'rgba(250,152,64,.18)');g.addColorStop(1,'rgba(255,150,30,0)');ctx.fillStyle=g;ctx.fillRect(sx-sr*9,sy-sr*9,sr*18,sr*18);
    ctx.beginPath();ctx.arc(sx,sy,sr*.7,0,TAU);ctx.fillStyle='#fff7e1';ctx.fill();
    // Anneau atmosphérique doux : grand limbe visible, jamais une petite icône.
    g=ctx.createRadialGradient(px,py,radius*.93,px,py,radius*1.025);g.addColorStop(0,'rgba(55,147,224,0)');g.addColorStop(.72,'rgba(88,170,221,.24)');g.addColorStop(1,'rgba(60,141,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,radius*1.025,0,TAU);ctx.fill();
    const rings=planete?.anneaux || id==='saturne';
    const anneau=(de,a)=>{ctx.save();ctx.translate(px,py);ctx.rotate(-.42);for(let i=0;i<14;i++){ctx.beginPath();ctx.ellipse(0,0,radius*(1.18+i*.035),radius*(.27+i*.009),0,de,a);ctx.strokeStyle=`rgba(213,191,147,${i%3===0?.34:.17})`;ctx.lineWidth=radius*.025;ctx.stroke();}ctx.restore();};
    if(rings)anneau(Math.PI,TAU);
    ctx.drawImage(sprite,px-radius,py-radius,radius*2,radius*2);
    if(rings)anneau(0,Math.PI);
    const moons=Math.min(3,planete?.lunes ?? (id==='terre'?1:0));
    for(let i=0;i<moons;i++){const mx=-m*.35+i*m*.21,my=-m*.13-i*m*.11,r=m*(.025+i*.007);const moon=ctx.createRadialGradient(mx-r*.4,my-r*.4,0,mx,my,r);moon.addColorStop(0,'#d0dae0');moon.addColorStop(.6,'#75838f');moon.addColorStop(1,'#172231');ctx.fillStyle=moon;ctx.beginPath();ctx.arc(mx,my,r,0,TAU);ctx.fill();}
    ctx.restore();
    // Vignette très légère ; la surface conserve sa couleur et sa texture sous le verre.
    const v=ctx.createRadialGradient(cw*.5,ch*.5,m*.28,cw*.5,ch*.5,Math.max(cw,ch)*.72);v.addColorStop(0,'rgba(1,5,15,0)');v.addColorStop(1,'rgba(1,5,15,.38)');ctx.fillStyle=v;ctx.fillRect(0,0,cw,ch);
  }
  return { regenerer, definirPlanete, definirActe(){}, maj(){}, dessiner };
}
