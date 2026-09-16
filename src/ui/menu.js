// Illustration originale vectorielle : aucune ressource distante ni police réseau.
import { formatNombre } from './utils.js';
const COSMOS = `<svg viewBox="0 0 520 370" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="solar-sun"><stop stop-color="#fff9ce"/><stop offset=".55" stop-color="#ffca65"/><stop offset="1" stop-color="#ff8049"/></radialGradient><radialGradient id="solar-earth" cx="30%" cy="20%"><stop stop-color="#91efdc"/><stop offset=".35" stop-color="#469ed0"/><stop offset="1" stop-color="#122752"/></radialGradient><radialGradient id="solar-gas" cx="25%" cy="20%"><stop stop-color="#ffe0a3"/><stop offset=".55" stop-color="#d19d81"/><stop offset="1" stop-color="#694857"/></radialGradient></defs><g fill="none" stroke="#a8c1d7" opacity=".16" transform="rotate(-24 260 190)"><ellipse cx="260" cy="190" rx="96" ry="50"/><ellipse cx="260" cy="190" rx="155" ry="86"/><ellipse cx="260" cy="190" rx="208" ry="123"/><ellipse cx="260" cy="190" rx="250" ry="154" stroke-dasharray="2 7"/></g><g fill="#e5e8ff" opacity=".7"><circle cx="73" cy="44" r="1.5"/><circle cx="452" cy="68" r="2"/><circle cx="405" cy="306" r="1.5"/><circle cx="157" cy="311" r="1"/><circle cx="270" cy="45" r="1"/></g><circle cx="238" cy="180" r="71" fill="#ffb16f" opacity=".045"/><circle cx="238" cy="180" r="56" fill="#ffb16f" opacity=".08"/><circle cx="238" cy="180" r="42" fill="url(#solar-sun)"/><g class="cosmos-float"><circle cx="169" cy="207" r="7" fill="#b6a8a3"/><circle cx="287" cy="106" r="12" fill="#e9be89"/><circle cx="124" cy="140" r="30" fill="url(#solar-earth)"/><path d="M107 124l13-6 10 10-6 9 8 10-11 10-7-11-10-6z" fill="#8ad5ad" opacity=".8"/><circle cx="88" cy="111" r="5" fill="#dbe2ed"/><circle cx="339" cy="234" r="16" fill="#cf715f"/><circle cx="399" cy="143" r="43" fill="url(#solar-gas)"/><path d="M366 128q31 14 67 5M361 150q37 17 79 5" stroke="#fff0c4" stroke-width="7" opacity=".23"/><circle cx="216" cy="293" r="25" fill="url(#solar-gas)"/><ellipse cx="216" cy="293" rx="43" ry="10" fill="none" stroke="#d9ba91" stroke-width="5" transform="rotate(-22 216 293)"/><circle cx="66" cy="246" r="16" fill="#76cfda"/><circle cx="443" cy="259" r="18" fill="#4d75bf"/></g><text x="260" y="357" text-anchor="middle" fill="#8fa7c0" font-family="sans-serif" font-size="9" letter-spacing="4">HUIT MONDES · UNE MISSION</text></svg>`;

export function construireMenu(conteneur, actions, { profil = {}, runEnCours = false } = {}) {
  const doc = conteneur.ownerDocument;
  conteneur.innerHTML = '';
  const panneau = doc.createElement('div');
  panneau.className = 'panneau-menu';
  panneau.innerHTML = `<div class="menu-univers"><span class="marque-orbite">V</span> MISSION SYSTÈME SOLAIRE <span class="menu-edition">02</span></div><div class="menu-hero"><div class="menu-illustration">${COSMOS}</div><div class="menu-contenu"><p class="menu-kicker">RESTAUREZ L’ÉQUILIBRE DES HUIT PLANÈTES.</p><h1 class="titre-vertige">VERTIGE<span>Sauvez leur lumière.</span></h1><p class="menu-description">De Mercure à Neptune, libérez les noyaux stellaires.<br>Tournez les mondes. Assemblez vos pouvoirs.</p><div class="menu-boutons"></div><p class="menu-promesse">À votre rythme · Sans vies à attendre · Hors ligne</p></div></div><div class="menu-bas"><div class="menu-stats"></div><div class="menu-outils"></div></div>`;
  const boutons = panneau.querySelector('.menu-boutons');
  function bouton(label, classe, callback, parent = boutons) {
    const b = doc.createElement('button'); b.type = 'button'; b.className = classe; b.textContent = label;
    b.addEventListener('click', callback); parent.appendChild(b); return b;
  }
  if (runEnCours) bouton('Continuer', 'touche touche-accent touche-large', () => actions.continuerRun());
  bouton('Nouveau run', `touche ${runEnCours ? '' : 'touche-accent'} touche-large`, () => actions.nouveauRun());
  const stats = panneau.querySelector('.menu-stats');
  [['Expéditions', formatNombre(profil.runs ?? 0)], ['Planètes sauvées · record', profil.meilleureSalle || '—'], ['Poussières d’étoiles', formatNombre(profil.monnaieMeta ?? 0)]].forEach(([label, valeur]) => {
    const item = doc.createElement('div'); item.className = 'menu-stat';
    const v = doc.createElement('span'); v.className = 'menu-stat-valeur'; v.textContent = valeur;
    const l = doc.createElement('span'); l.className = 'menu-stat-label'; l.textContent = label;
    item.append(v,l); stats.appendChild(item);
  });
  const outils = panneau.querySelector('.menu-outils');
  const detailsAide = doc.createElement('details'); detailsAide.className = 'menu-details';
  detailsAide.innerHTML = `<summary>Comment jouer</summary><div class="menu-explications"><p><b>01 · Éclatez</b>Touchez au moins deux billes voisines de même couleur. Un grand groupe crée une spéciale.</p><p><b>02 · Tournez</b>Changez la gravité pour regrouper les billes. Maintenez une flèche pour voir le résultat avant de tourner.</p><p><b>03 · Combinez</b>Déclenchez une spéciale seule ou combinez deux spéciales voisines. Construisez votre collection de cartes entre les planètes. Plus vous gagnez d’XP, plus leurs rangs sont élevés.</p><p class="aide-seuils">4 : bombe · 6 : ligne · 7 : croix · 10 : couleur<br>Rotation : 1 énergie, puis 1 coup si la jauge est vide.<br>Deux fusées : grande croix. Bombe + fusée : trois lignes. Couleur + fusée : une flotte de fusées.<br>Les noyaux doivent sortir par le bord lumineux, orienté vers le bas. La résonance offre trois actions renforcées.<br>Une rotation qui assemble 6 billes ou plus déclenche une cascade. Un plateau sans solution reçoit un coup de pouce gratuit.</p></div>`;
  outils.appendChild(detailsAide);
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
  bouton('Mode Test', 'menu-test', () => actions.ouvrirModeTest?.(), outils);
  conteneur.appendChild(panneau);
}
