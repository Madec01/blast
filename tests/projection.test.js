import test from 'node:test';
import assert from 'node:assert/strict';
import { projeterPlanete } from '../src/rendu/projection-planete.js';

const carte = {w:4,h:2,data:new Uint8ClampedArray([
  210,40,20,255, 20,210,40,255, 40,20,210,255, 230,190,120,255,
  70,50,30,255, 30,70,50,255, 50,30,70,255, 120,140,170,255,
])};
test('projection : le secours par bandes conserve exactement les pixels et le rayon', async()=>{
 for(const id of ['terre','saturne','mercure']) {
  const params={id,taille:64,phase:1,map:carte,cloud:id==='terre'?carte:null,ring:id==='saturne'?carte:null};
  const directe=await projeterPlanete(params);let cessions=0;
  const decoupee=await projeterPlanete(params,async()=>{cessions++;});
  assert.deepEqual(decoupee,directe);assert.equal(cessions,4);
  assert.equal(directe.pixels[3],0,'coin transparent hors du globe');
  assert.ok(directe.pixels[(32*64+32)*4+3]>250,'centre opaque');
 }
});
test('projection : les longitudes des niveaux changent la surface sans changer la silhouette',async()=>{
 const a=await projeterPlanete({id:'mercure',taille:64,phase:0,map:carte});
 const b=await projeterPlanete({id:'mercure',taille:64,phase:1,map:carte});
 assert.notDeepEqual(a.pixels,b.pixels);assert.equal(a.rayon,b.rayon);
 for(let i=3;i<a.pixels.length;i+=4)assert.equal(a.pixels[i],b.pixels[i]);
});
