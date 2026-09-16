import { INTRO_HELIOS, ORIGINE_HELIOS } from '../data/histoire.js';
import { formatNombre } from './utils.js';
import { dessinerSystemeSolaire } from '../rendu/planetes.js';

export function construireMenu(conteneur, actions, { profil = {}, runEnCours = false } = {}) {
  const doc = conteneur.ownerDocument;
  conteneur.innerHTML = '';
  const panneau = doc.createElement('div');
  panneau.className = 'panneau-menu';
  panneau.innerHTML = `<div class="menu-univers"><span class="marque-orbite">V</span> LA RUPTURE D’HÉLIOS <span class="menu-edition">05</span></div><div class="menu-hero"><div class="menu-illustration"><canvas class="menu-systeme-solaire" width="1040" height="740" role="img" aria-label="Les huit planètes du système solaire, représentées avec des textures réalistes autour du Soleil.">Les huit planètes du système solaire.</canvas></div><div class="menu-contenu"><p class="menu-kicker">RESTAUREZ L’ÉQUILIBRE DES HUIT PLANÈTES.</p><h1 class="titre-vertige">VERTIGE<span>Sauvez leur lumière.</span></h1><p class="menu-description">${INTRO_HELIOS}</p><div class="menu-boutons"></div><p class="menu-promesse">À votre rythme · Sans vies à attendre · Hors ligne</p></div></div><div class="menu-bas"><div class="menu-stats"></div><div class="menu-outils"></div></div>`;
  const boutons = panneau.querySelector('.menu-boutons');
  function bouton(label, classe, callback, parent = boutons) {
    const b = doc.createElement('button'); b.type = 'button'; b.className = classe; b.textContent = label;
    b.addEventListener('click', callback); parent.appendChild(b); return b;
  }
  if (runEnCours) bouton('Continuer', 'touche touche-accent touche-large', () => actions.continuerRun());
  bouton('Nouveau run', `touche ${runEnCours ? '' : 'touche-accent'} touche-large`, () => actions.nouveauRun());
  const stats = panneau.querySelector('.menu-stats');
  [['Expéditions', formatNombre(profil.runs ?? 0)], ['Planètes sauvées · record', profil.planetesSauvees || '—'], ['Poussières d’étoiles', formatNombre(profil.monnaieMeta ?? 0)]].forEach(([label, valeur]) => {
    const item = doc.createElement('div'); item.className = 'menu-stat';
    const v = doc.createElement('span'); v.className = 'menu-stat-valeur'; v.textContent = valeur;
    const l = doc.createElement('span'); l.className = 'menu-stat-label'; l.textContent = label;
    item.append(v,l); stats.appendChild(item);
  });
  const outils = panneau.querySelector('.menu-outils');
  const detailsAide = doc.createElement('details'); detailsAide.className = 'menu-details';
  detailsAide.innerHTML = `<summary>Comment jouer</summary><div class="menu-explications"><p><b>01 · Dissipez</b>Touchez au moins deux cristaux voisins de même couleur. Un grand groupe crée une spéciale.</p><p><b>02 · Tournez</b>Changez la gravité pour regrouper les cristaux. Maintenez une flèche pour voir le résultat avant de tourner.</p><p><b>03 · Combinez</b>Déclenchez une spéciale seule ou combinez deux spéciales voisines. Construisez votre collection de cartes entre les niveaux. L’XP gagnée détermine leur puissance ; de nouveaux rangs se débloquent en avançant dans le système solaire.</p><p class="aide-seuils">4 : bombe · 6 : ligne · 7 : croix · 10 : couleur<br>Rotation : 1 énergie, puis 1 coup si la jauge est vide.<br>Deux fusées : grande croix. Bombe + fusée : trois lignes. Couleur + fusée : une flotte de fusées.<br>Les noyaux doivent sortir par le bord lumineux, orienté vers le bas. La résonance offre trois actions renforcées.<br>Une rotation qui assemble 6 cristaux ou plus déclenche une cascade. Un plateau sans solution reçoit un coup de pouce gratuit.</p></div>`;
  outils.appendChild(detailsAide);
  const journal = doc.createElement('details'); journal.className = 'menu-details menu-journal';
  const sommaire = doc.createElement('summary'); sommaire.textContent = 'Journal de mission';
  const contenu = doc.createElement('div'); contenu.className = 'menu-explications';
  for (const [titre, texte] of [['La Rupture d’Hélios', ORIGINE_HELIOS], ['Votre sonde : VERTIGE', 'Sa matrice réoriente la gravité. Les cristaux représentent des fréquences d’énergie : les assembler produit des décharges contrôlées. Les cartes modifient les modules de la sonde, parfois au prix de sa stabilité.'], ['Huit relais à sauver', 'Sur chaque planète : sécuriser l’approche, rétablir l’alimentation, puis récupérer les stabilisateurs. De nouvelles transmissions révèlent l’origine de la catastrophe au fil du voyage.']]) {
    const p = doc.createElement('p'); const b = doc.createElement('b'); b.textContent = titre; p.append(b, doc.createTextNode(texte)); contenu.appendChild(p);
  }
  journal.append(sommaire, contenu); outils.appendChild(journal);
  const reglages = doc.createElement('details'); reglages.className = 'menu-details';
  reglages.innerHTML = '<summary>Réglages</summary><div class="menu-reglages"></div>';
  const preferences = { effets: profil.effets ?? !profil.muet, musique: profil.musique ?? false, vibrations: profil.vibrations ?? true };
  [['effets','Effets sonores'],['musique','Ambiance musicale'],['vibrations','Vibrations']].forEach(([cle, libelle]) => {
    const label = doc.createElement('label'); const input = doc.createElement('input');
    input.type = 'checkbox'; input.checked = preferences[cle];
    input.addEventListener('change', () => { preferences[cle] = input.checked; actions.reglages?.({ ...preferences }); });
    label.append(doc.createTextNode(libelle), input); reglages.lastChild.appendChild(label);
  });
  outils.appendChild(reglages);
  const credits = doc.createElement('details'); credits.className = 'menu-details';
  credits.innerHTML = '<summary>Crédits des planètes</summary><div class="menu-explications"><p>Textures : <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope</a>, sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Surfaces adaptées avec projection sphérique et éclairage pour le jeu. Tailles et distances artistiques.</p></div>';
  outils.appendChild(credits);
  bouton('Mode Test', 'menu-test', () => actions.ouvrirModeTest?.(), outils);
  conteneur.appendChild(panneau);
  dessinerSystemeSolaire(panneau.querySelector('.menu-systeme-solaire')).catch(() => {});
}
