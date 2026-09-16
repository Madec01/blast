// Orchestration : moteur ↔ rendu ↔ UI ↔ audio. Voir docs/CONTRATS.md.
import { creerRun, chargerRun } from './moteur/run.js';
import { creerRendu } from './rendu/rendu.js';
import { audio } from './audio/audio.js';
import { creerUI } from './ui/ui.js';
import { SALLES, MODES_GRAVITE, MODE_GRAVITE_DEFAUT } from './data/salles.js';
import { COMPETENCES } from './data/competences.js';
import { lire, lireJson, ecrire, effacer, normaliserProfil, appliquerRecompense } from './persistence.js';

const CLE_RUN = 'vertige.run', CLE_PROFIL = 'vertige.profil';

const profil = normaliserProfil(lireJson(CLE_PROFIL, {}));
let run = null, occupe = false, modeTest = false;

const canvas = document.getElementById('plateau');
const rendu = creerRendu(canvas, {
  onTap(x, y) {
    if (occupe || !run || document.hidden) return;
    audio.init();
    if (!run.peutTaper(x, y)) { audio.jouer('erreur'); return; }
    rendu.surligner([]);
    rendu.previsualiserCombo?.(null);
    jouer(run.tap(x, y));
  },
  onSurvol(x, y) {
    const actif = run && !occupe && x != null && y != null;
    rendu.surligner(actif ? run.groupeA(x, y) : []);
    rendu.previsualiserCombo?.(actif ? run.apercuCombo?.(x, y) : null);
  },
});

const ui = creerUI(document.getElementById('ui'), {
  nouveauRun() { audio.init(); modeTest = false; run = creerRun({ seed: Date.now() }); demarrer(run.evenementsInitiaux); },
  continuerRun() {
    audio.init(); modeTest = false;
    run = chargerRun(lire(CLE_RUN));
    if (!run) { effacer(CLE_RUN); run = creerRun({ seed: Date.now() }); demarrer(run.evenementsInitiaux); return; }
    demarrer([{ t: 'salle', index: run.etat.salleIndex, nom: run.etat.salle.nom }]);
  },
  ouvrirModeTest() {
    ui.afficherTest({
      salles: SALLES.map((s) => ({ id: s.id, nom: s.nom })),
      competences: COMPETENCES.map((c) => ({ id: c.id, nom: c.nom, rarete: c.rarete })),
      modesGravite: Object.entries(MODES_GRAVITE).map(([id, m]) => ({ id, nom: m.nom, desc: m.desc })),
      graviteDefaut: MODE_GRAVITE_DEFAUT,
    });
  },
  lancerTest(config) {
    audio.init(); modeTest = true;
    run = creerRun({ seed: config.seed ?? Date.now(), salles: [config.salleId], competences: config.competences ?? [], difficulte: config.difficulte ?? 1,
      options: { couleurs: config.couleurs ?? undefined, jauge: config.jauge ?? undefined, gravite: config.gravite ?? undefined, cascades: config.cascades ?? undefined } }); // cascades : prototype D24 (mode Test seulement)
    demarrer(run.evenementsInitiaux);
  },
  tourner(sens) {
    rendu.previsualiserRotation(null);
    rendu.previsualiserCombo?.(null);
    if (occupe || !run || document.hidden) return;
    audio.init();
    const ev = run.tourner(sens);
    if (!ev.length) { audio.jouer('erreur'); ui.message(run.etat.enAttente ? 'Choisis d’abord' : 'Plus de rotation disponible'); return; }
    jouer(ev);
  },
  // Télégraphe de rotation : appui maintenu ou survol d'une touche de rotation (null pour effacer).
  previsualiser(sens) {
    rendu.previsualiserRotation(sens == null || occupe || !run ? null : run.apercuRotation(sens));
  },
  relancer() {
    if (occupe || !run || run.etat.enAttente?.type !== 'niveau') return;
    const ev = run.relancer();
    if (!ev.length) { audio.jouer('erreur'); return; }
    audio.jouer('ui');
    ui.masquerAttente();
    jouer(ev);
  },
  choisir(id) {
    if (occupe || !run || !run.etat.enAttente) return;
    const att = run.etat.enAttente;
    if (att.type === 'finRun') { quitter(); return; }
    audio.jouer(att.type === 'competence' && id ? 'competence' : 'ui');
    ui.masquerAttente();
    jouer(run.choisir(id));
  },
  quitter() { quitter(); },
  muet(b) { profil.muet = !!b; profil.effets = !b; audio.configurer(profil); ecrire(CLE_PROFIL, profil); },
  reglages(options) { Object.assign(profil, options); profil.muet = !profil.effets; audio.configurer(profil); ecrire(CLE_PROFIL, profil); },
});

function demarrer(evenements) {
  ui.afficherJeu();
  rendu.reprendre();
  audio.reprendre();
  rendu.synchroniser(run.etat);
  ui.majHud(run.etat);
  jouer(evenements);
}

async function jouer(evenements) {
  evenements = evenements ?? [];
  occupe = true;
  canvas.setAttribute('aria-busy', 'true');
  // Les compteurs répondent au geste sans attendre la fin de ses effets visuels.
  if (run) ui.majHud(run.etat);
  sauvegarder();
  // Une seule annonce par action : les effets d'un build ne doivent pas empiler des fenêtres.
  const messages = evenements.filter(ev => ev.t === 'message');
  if (messages.length) ui.message(messages[messages.length - 1].texte);
  if (evenements.some((ev) => ev.t === 'salle')) rendu.synchroniser(run.etat); // nouvelle salle : le rendu repart de l'état
  if (evenements.length) { try { await rendu.jouer(evenements, { audio }); } catch (err) { console.error('rendu', err); rendu.synchroniser(run.etat); } }
  occupe = false;
  canvas.setAttribute('aria-busy', 'false');
  if (!run) return;
  ui.majHud(run.etat);
  gererAttente();
  sauvegarder();
}

function gererAttente() {
  const att = run.etat.enAttente;
  if (!att) { ui.masquerAttente(); return; }
  if (att.type === 'niveau') audio.jouer('niveau');
  if (att.type === 'finSalle') audio.jouer(att.victoire ? 'victoire' : 'echec');
  if (att.type === 'finRun') {
    audio.jouer(att.victoire ? 'victoire' : 'echec');
    if (!modeTest && crediterFinRun()) effacer(CLE_RUN);
  }
  ui.afficherAttente(att);
}

function crediterFinRun() {
  Object.assign(profil, appliquerRecompense(profil, run.etat));
  return ecrire(CLE_PROFIL, profil);
}

function sauvegarder() {
  if (!run || modeTest) return;
  // Créditer le profil avant toute animation et avant d’effacer la partie.
  // Si l’écriture échoue, garder la sauvegarde pour permettre une nouvelle tentative.
  if (run.etat.enAttente?.type === 'finRun' && crediterFinRun()) { effacer(CLE_RUN); return; }
  try { ecrire(CLE_RUN, JSON.parse(run.serialiser())); } catch { /* état non sérialisable */ }
}

function quitter() {
  if (occupe) { ui.message('La réaction se termine…'); return; }
  sauvegarder();
  run = null;
  rendu.pause();
  audio.pause();
  ui.masquerAttente();
  ui.afficherMenu({ profil, runEnCours: !!lire(CLE_RUN) });
}

audio.configurer(profil);
window.addEventListener('resize', () => rendu.redimensionner());
document.addEventListener('pointerdown', () => audio.init(), { once: true });
ui.afficherMenu({ profil, runEnCours: !!lire(CLE_RUN) });

// Accès de débogage et de test de fumée (tools/smoke.mjs).
window.vertige = { get run() { return run; }, get occupe() { return occupe; }, ui, rendu };

// Sauvegarder l'état logique dès le passage en arrière-plan, même pendant une animation.
document.addEventListener('visibilitychange', () => {
  sauvegarder();
  if (document.hidden) audio.pause();
  else if (run) audio.reprendre();
});
window.addEventListener('pagehide', sauvegarder);

// Navigation du plateau au clavier : les flèches déplacent la sélection lorsque le canvas a le focus.
let selection = { x: 0, y: 0 };
canvas.tabIndex = 0;
canvas.setAttribute('role', 'application');
canvas.setAttribute('aria-label', 'Plateau. Flèches pour choisir une pièce, Entrée pour jouer. Q et D pour tourner.');
canvas.addEventListener('keydown', (event) => {
  if (!run || occupe || run.etat.enAttente) return;
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (moves[event.key]) {
    event.preventDefault(); event.stopPropagation();
    const [dx, dy] = moves[event.key];
    selection.x = Math.max(0, Math.min(run.etat.grille.w - 1, selection.x + dx));
    selection.y = Math.max(0, Math.min(run.etat.grille.h - 1, selection.y + dy));
    rendu.surligner(run.groupeA(selection.x, selection.y));
    rendu.previsualiserCombo?.(run.apercuCombo?.(selection.x, selection.y));
    canvas.setAttribute('aria-label', `Colonne ${selection.x + 1}, ligne ${selection.y + 1}. ${run.groupeA(selection.x, selection.y).length} pièces dans le groupe. Entrée pour jouer.`);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); event.stopPropagation();
    if (run.peutTaper(selection.x, selection.y)) { audio.init(); jouer(run.tap(selection.x, selection.y)); }
  }
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
