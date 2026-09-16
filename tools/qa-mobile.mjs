// Vérification de l'intégration mobile, de la reprise et du cache hors ligne.
// npm run build && npm run preview, puis node tools/qa-mobile.mjs
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const server = process.env.QA_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4176', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
if (server) await new Promise((resolve, reject) => { server.stdout.on('data', data => { if (String(data).includes('Local:')) resolve(); }); server.on('error', reject); server.on('exit', code => { if (code) reject(new Error('Serveur QA arrêté : ' + code)); }); });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const base = process.env.QA_URL || 'http://127.0.0.1:4176';
const out = process.env.SHOT_DIR || '/tmp/vertige-qa';
mkdirSync(out, { recursive: true });
const errors = [];
try {
  for (const [width, height, deviceScaleFactor] of [[320, 568, 1], [390, 844, 3], [768, 1024, 2], [1440, 900, 2]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600, deviceScaleFactor });
    const page = await context.newPage();
    page.on('requestfailed', request => console.error('Requête :', request.url(), request.failure()?.errorText));
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') { errors.push(msg.text()); console.error(msg.text()); } });
    await page.goto(base);
    await page.waitForFunction(() => window.vertige);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'menu déborde');
    await page.screenshot({ path: `${out}/menu-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /nouveau run/i }).click();
    await page.waitForFunction(() => window.vertige.run && !window.vertige.occupe);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'jeu déborde');
    const raster = await page.locator('#plateau').evaluate(c => ({ w:c.width, h:c.height, rect:c.getBoundingClientRect().toJSON() }));
    assert(raster.w * raster.h <= 2_005_000, 'budget pixels dépassé');
    assert.equal(raster.rect.width, width, 'canvas non plein écran');
    assert.equal(raster.rect.height, height, 'canvas non plein écran');
    const state = await page.evaluate(() => {
      const r = window.vertige.run;
      for (let y = 0; y < r.etat.grille.h; y++) for (let x = 0; x < r.etat.grille.w; x++) {
        if (r.peutTaper(x, y)) return { x, y, pos: window.vertige.rendu.positionCase(x,y), taps: r.etat.stats.taps };
      }
    });
    const box = await page.locator('#plateau').boundingBox();
    if (width < 600) await page.touchscreen.tap(box.x + state.pos.x, box.y + state.pos.y);
    else await page.mouse.click(box.x + state.pos.x, box.y + state.pos.y);
    await page.waitForFunction(n => window.vertige.run.etat.stats.taps === n+1 && !window.vertige.occupe, state.taps);
    const saved = await page.evaluate(() => localStorage.getItem('vertige.run'));
    assert(saved, 'sauvegarde absente');
    await page.screenshot({ path: `${out}/jeu-${width}.png` });
    await page.reload();
    await page.getByRole('button', { name: /continuer/i }).click();
    await page.waitForFunction(() => window.vertige.run && !window.vertige.occupe);
    assert.equal(await page.evaluate(() => window.vertige.run.etat.stats.taps), state.taps + 1, 'reprise perd le coup');
    if (width === 390) {
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => window.vertige).catch(async error => { console.log(await page.evaluate(async () => ({html: document.documentElement.outerHTML.slice(0,1800), caches: await caches.keys(), controlled: !!navigator.serviceWorker.controller}))); throw error; });
      await page.getByRole('button', { name: /continuer/i }).click();
      await page.waitForFunction(() => window.vertige.run && !window.vertige.occupe);
      assert.equal(await page.evaluate(() => window.vertige.run.etat.stats.taps), state.taps + 1);
      await context.setOffline(false);
      console.log('Reprise hors ligne : OK');
    }
    // Après rotation, les coordonnées tactiles doivent suivre la résolution réelle,
    // y compris lorsque le DPR natif dépasse le budget du canvas.
    await page.locator('#btn-rotation-droite').click();
    await page.waitForFunction(() => !window.vertige.occupe);
    const cible = await page.evaluate(() => {
      const v=window.vertige;
      for(let y=0;y<v.run.etat.grille.h;y++)for(let x=0;x<v.run.etat.grille.w;x++)
        if(v.run.peutTaper(x,y))return {pos:v.rendu.positionCase(x,y),taps:v.run.etat.stats.taps};
    });
    assert(cible, 'aucune cible après rotation');
    await page.mouse.click(box.x+cible.pos.x,box.y+cible.pos.y);
    await page.waitForFunction(n=>window.vertige.run.etat.stats.taps===n+1&&!window.vertige.occupe,cible.taps);
    assert.equal(await page.locator('.decor-planetaire').count(),1,'fond dupliqué');
    assert.equal(await page.locator('.decor-vignette').count(),1,'vignette dupliquée');
    if (width === 1440) {
      // Provoquer une fin de run et garder son animation en attente : les gains
      // doivent déjà être durables avant le premier await de l'orchestrateur.
      await page.evaluate(() => {
        const v = window.vertige, e = v.run.etat;
        e.xpTotale = 1000;
        e.enAttente = { type: 'finSalle', victoire: false, raison: 'coups' };
        v.ui.afficherAttente(e.enAttente);
        v.rendu.jouer = () => new Promise(() => {});
      });
      await page.locator('#ui button:visible:enabled').first().click();
      const profil = await page.evaluate(() => JSON.parse(localStorage.getItem('vertige.profil')));
      assert.equal(profil.runs, 1); assert.equal(profil.monnaieMeta, 10);
      assert.equal(await page.evaluate(() => localStorage.getItem('vertige.run')), null);
      await page.reload();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('vertige.profil')).runs), 1);
      console.log('Récompenses conservées après interruption de la finale : OK');
    }
    console.log(`${width}×${height} @${deviceScaleFactor} : rendu, interaction, sauvegarde et reprise OK`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); server?.kill(); }
