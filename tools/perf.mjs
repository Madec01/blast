// Comparaison reproductible du rendu : node tools/perf.mjs [racine du projet].
// Chromium de bureau émulé : ces chiffres ne remplacent pas un téléphone physique.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { creerRun } from '../src/moteur/run.js';
const root=resolve(process.argv[2]||'.');
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4194','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))ok();});server.on('error',no);server.on('exit',c=>{if(c)no(new Error('Vite '+c));});});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try{
for(const deviceScaleFactor of [1,3]){
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 const native=window.requestAnimationFrame.bind(window);
 window.measure={enabled:false,cpu:[],intervals:[],gradients:0,draws:0,last:0};
 window.requestAnimationFrame=callback=>native(ts=>{const m=window.measure,t=performance.now();callback(ts);if(m.enabled){m.cpu.push(performance.now()-t);if(m.last&&ts!==m.last)m.intervals.push(ts-m.last);m.last=ts;}});
 for(const [method,key] of [['createRadialGradient','gradients'],['drawImage','draws']]){const old=CanvasRenderingContext2D.prototype[method];CanvasRenderingContext2D.prototype[method]=function(...args){if(window.measure.enabled)window.measure[key]++;return old.apply(this,args);};}
});
await page.goto('http://127.0.0.1:4194');
await page.evaluate(s=>localStorage.setItem('vertige.run',s),creerRun({seed:112}).serialiser());
await page.reload();await page.getByRole('button',{name:/continuer/i}).click();
await page.waitForFunction(()=>window.vertige.run&&!window.vertige.occupe);await page.waitForTimeout(2200);
await page.evaluate(()=>window.measure.enabled=true);
await page.waitForTimeout(1500);
for(let i=0;i<8;i++)await page.evaluate(async i=>window.vertige.rendu.jouer([{t:'rotation',sens:1,vers:(i+1)%4}]),i);
// Déplacements souris pour inclure les survols du plateau.
for(let i=0;i<40;i++)await page.mouse.move(40+(i%8)*40,300+(i%10)*30);
const result=await page.evaluate(()=>{
const m=window.measure;m.enabled=false;const stats=a=>{a.sort((a,b)=>a-b);return {n:a.length,p50:+a[Math.floor(a.length*.5)]?.toFixed(2),p95:+a[Math.floor(a.length*.95)]?.toFixed(2)};};
return {canvas:[document.querySelector('#plateau').width,document.querySelector('#plateau').height],cpuMs:stats(m.cpu),frameMs:stats(m.intervals),gradients:m.gradients,draws:m.draws};
});
console.log(JSON.stringify({deviceScaleFactor,...result,errors}));if(errors.length)throw new Error(errors.join('; '));await page.close();
}
}finally{await browser.close();server.kill();}
