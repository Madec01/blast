// Charger réellement les textures avant de révéler le niveau ; tester panne et reprise.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4195','--strictPort'],{stdio:['ignore','pipe','pipe']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))ok();});server.on('error',no);});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let release;const gate=new Promise(r=>release=r);
 await page.route('**/mercure*.jpg',async route=>{await gate;await route.continue();});
 await page.goto('http://127.0.0.1:4195');await page.getByRole('button',{name:/nouveau run/i}).click();
 const dialog=page.getByRole('dialog',{name:'Mercure'});
 await dialog.waitFor();assert(await page.locator('.transit-action').isDisabled());
 assert(await page.locator('#scene').evaluate(e=>e.inert));
 await page.keyboard.press('q');assert.equal(await page.evaluate(()=>window.vertige.run.etat.stats.taps),0);
 await page.screenshot({path:'/tmp/vertige-transit.png'});
 await page.waitForTimeout(4300);assert(await dialog.isVisible(),'fermeture avant texture prête');
 assert(await page.evaluate(()=>window.vertige.occupe));
 release();await page.waitForFunction(()=>!window.vertige.occupe);
 assert(await dialog.isHidden());assert.equal(await page.locator('#scene').evaluate(e=>e.inert),false);
 // La reprise du même monde ne répète pas le passage narratif.
 await page.reload();await page.getByRole('button',{name:/continuer/i}).click();
 assert(await page.locator('.transit-recit').isHidden());await page.waitForFunction(()=>!window.vertige.occupe);
 assert.deepEqual(errors,[]);await page.close();
 const retry=await browser.newPage({viewport:{width:320,height:568}});
 retry.on('pageerror',e=>errors.push(e.message));
 await retry.route('**/mercure*.jpg',r=>r.abort());
 await retry.goto('http://127.0.0.1:4195');await retry.getByRole('button',{name:/nouveau run/i}).click();
 await retry.getByRole('button',{name:'Réessayer'}).waitFor();
 assert(await retry.evaluate(()=>window.vertige.occupe));
 await retry.unroute('**/mercure*.jpg');await retry.getByRole('button',{name:'Réessayer'}).click();
 await retry.waitForFunction(()=>!window.vertige.occupe);
 assert(await retry.locator('.transit-planete').isHidden());assert.deepEqual(errors,[]);
 console.log('Transit : texture lente attendue, commandes bloquées, reprise sans récit et erreur/réessai OK');
} finally {await browser.close();server.kill();}
