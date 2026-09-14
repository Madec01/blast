/**
 * Test de fumée : build de production, serveur statique, Chromium headless, scénario joué,
 * toute erreur de console fait échouer.   node tools/smoke.mjs [--shot] [--keep]
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const SHOT_DIR = process.env.SHOT_DIR || '/tmp/vertige-shots';
const wantShots = process.argv.includes('--shot');
const PORT = 5300 + Math.floor(Math.random() * 300);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.map': 'application/json' };

function build() {
  return new Promise((resolve, reject) => {
    const p = spawn('npx', ['vite', 'build', '--logLevel', 'warn'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    p.on('exit', (c) => (c === 0 ? resolve(out) : reject(new Error('Échec du build :\n' + out))));
  });
}

function servir(racine) {
  const srv = createServer((req, res) => {
    let p = join(racine, decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(p));
  });
  return new Promise((r) => srv.listen(PORT, () => r(srv)));
}

const chemin = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((c) => existsSync(c));

async function main() {
  await build();
  const srv = await servir(join(process.cwd(), 'dist'));
  const browser = await chromium.launch({ executablePath: chemin });
  const page = await browser.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2 });
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => erreurs.push('requête échouée: ' + r.url()));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost') && !r.url().startsWith('http://127.0.0.1')) erreurs.push('appel réseau externe: ' + r.url()); });
  if (wantShots) mkdirSync(SHOT_DIR, { recursive: true });
  const shot = async (nom) => { if (wantShots) await page.screenshot({ path: join(SHOT_DIR, nom + '.png') }); };

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.vertige && document.querySelector('#ui button'), null, { timeout: 15000 });
  await shot('01-menu');
  await page.getByRole('button', { name: /nouveau run/i }).click();
  await page.waitForFunction(() => window.vertige.run !== null);

  const attendre = () => page.waitForFunction(() => !window.vertige.occupe, null, { timeout: 20000 });
  let taps = 0, rotations = 0, choix = 0, shotsNiveau = 0, shotJeu = 0;
  const tapsRates = []; // un tap sur un bord pendant une secousse peut rater d'un pixel : seul un cumul est une erreur
  for (let i = 0; i < 160; i++) {
    await attendre();
    const etat = await page.evaluate(() => {
      const r = window.vertige.run; if (!r) return null;
      const e = r.etat, g = e.grille; let meilleur = null;
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (r.peutTaper(x, y)) { const n = r.groupeA(x, y).length; if (!meilleur || n > meilleur.n) meilleur = { x, y, n }; }
      return { attente: e.enAttente?.type ?? null, meilleur, coups: e.coups, jauge: e.jauge, w: g.w, h: g.h, gravite: e.gravite, salle: e.salle.nom };
    });
    if (!etat) break;
    if (etat.attente === 'finRun') { await shot('07-fin-run'); break; }
    if (etat.attente) {
      if (etat.attente === 'niveau' && shotsNiveau++ === 0) await shot('03-niveau');
      if (etat.attente === 'finSalle') await shot('05-fin-salle');
      // Une carte d'abord (niveau / compétence), sinon le premier bouton actif (Continuer, Retour…) — jamais un bouton désactivé.
      const cartes = page.locator('#ui button.carte:visible');
      if (await cartes.count()) await cartes.first().click(); else await page.locator('#ui button:visible:enabled').first().click();
      choix++;
      continue;
    }
    if (i >= 3 && !shotJeu++) {
      await shot('02-jeu');
      // Télégraphe : le survol d'une touche de rotation affiche l'aperçu (fantômes, chevrons).
      await page.hover('#btn-rotation-droite'); await page.waitForTimeout(450);
      if (!(await page.evaluate(() => window.vertige.rendu.apercuActif))) erreurs.push('aperçu de rotation absent au survol');
      await shot('02b-apercu');
      await page.mouse.move(5, 5); await page.waitForTimeout(60);
      if (await page.evaluate(() => window.vertige.rendu.apercuActif)) erreurs.push('aperçu de rotation non effacé après le survol');
    }
    if (i % 5 === 4 && etat.jauge > 0) { await page.locator('#btn-rotation-droite').click(); rotations++; continue; }
    if (!etat.meilleur) { await page.locator('#btn-rotation-gauche').click(); rotations++; continue; }
    // Un vrai tap par le pointeur : la case est projetée comme le rendu le fait (centrage, marge 6 %, rotation).
    // Position exacte fournie par le rendu (même transformation que le pointeur).
    const boite = await page.locator('#plateau').boundingBox();
    const pos = await page.evaluate(([x, y]) => window.vertige.rendu.positionCase(x, y), [etat.meilleur.x, etat.meilleur.y]);
    const sx = boite.x + pos.x, sy = boite.y + pos.y;
    const coupsAvant = etat.coups;
    await page.mouse.click(sx, sy);
    await page.waitForTimeout(80);
    let coupsApres = await page.evaluate(() => window.vertige.run?.etat.coups);
    if (coupsApres === coupsAvant) { // une animation pouvait encore bloquer l'entrée : un second essai
      await attendre(); await page.mouse.click(sx, sy); await page.waitForTimeout(80);
      coupsApres = await page.evaluate(() => window.vertige.run?.etat.coups);
      if (coupsApres === coupsAvant) tapsRates.push(`(${etat.meilleur.x},${etat.meilleur.y}) gravité ${etat.gravite}`);
    }
    taps++;
  }
  await attendre();
  await shot('04-fin');
  // Panneau Test
  await page.evaluate(() => window.vertige.ui.afficherMenu({ profil: { runs: 1 }, runEnCours: false }));
  await page.getByRole('button', { name: /mode test/i }).click();
  await shot('06-test');

  await browser.close(); srv.close();
  if (tapsRates.length > 1) erreurs.push('taps pointeur sans effet : ' + tapsRates.join(', '));
  else if (tapsRates.length) console.log('  avertissement : un tap pointeur sans effet en ' + tapsRates[0]);
  const propres = erreurs.filter((e) => !/favicon/.test(e));
  console.log(`taps ${taps}, rotations ${rotations}, choix ${choix}, erreurs ${propres.length}`);
  for (const e of propres) console.log('  ' + e);
  if (wantShots) console.log('captures dans ' + SHOT_DIR);
  process.exit(propres.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
