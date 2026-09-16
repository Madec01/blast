// Illustration originale vectorielle : aucune ressource distante ni police réseau.
import { formatNombre } from './utils.js';
const COSMOS = `<svg viewBox="0 0 520 370" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="planet" cx="30%" cy="20%"><stop stop-color="#ffc295"/><stop offset=".5" stop-color="#ff826f"/><stop offset="1" stop-color="#c84467"/></radialGradient><radialGradient id="moon" cx="28%" cy="23%"><stop stop-color="#d3fff0"/><stop offset=".6" stop-color="#6ddac7"/><stop offset="1" stop-color="#269391"/></radialGradient><radialGradient id="violet" cx="30%" cy="20%"><stop stop-color="#e5d5ff"/><stop offset="1" stop-color="#9378db"/></radialGradient></defs><g fill="none" stroke="#adc4db" opacity=".17"><ellipse cx="260" cy="190" rx="210" ry="115" transform="rotate(-23 260 190)"/><ellipse cx="260" cy="190" rx="248" ry="149" transform="rotate(-23 260 190)" stroke-dasharray="2 9"/></g><g fill="#ffe7b3"><path d="M100 74l3 10 10 3-10 3-3 10-3-10-10-3 10-3zM420 238l3 10 10 3-10 3-3 10-3-10-10-3 10-3z"/><circle cx="389" cy="63" r="2"/><circle cx="54" cy="220" r="2"/><circle cx="327" cy="321" r="2"/></g><g class="cosmos-float"><circle cx="263" cy="177" r="98" fill="url(#planet)"/><path d="M196 132q48-54 113-20" stroke="#ffd5ab" stroke-width="12" opacity=".4" fill="none" stroke-linecap="round"/><ellipse cx="233" cy="149" rx="11" ry="17" fill="#28304b"/><ellipse cx="290" cy="149" rx="11" ry="17" fill="#28304b"/><circle cx="230" cy="143" r="3" fill="white"/><circle cx="287" cy="143" r="3" fill="white"/><path d="M247 178q15 17 30 0" stroke="#773b58" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="211" cy="172" rx="14" ry="7" fill="#ffbdd2" opacity=".5"/><ellipse cx="311" cy="172" rx="14" ry="7" fill="#ffbdd2" opacity=".5"/><path d="M162 185C36 286 437 293 372 144" fill="none" stroke="#f5daaa" stroke-width="16"/><path d="M162 182C36 283 437 290 372 141" fill="none" stroke="#fff0d0" stroke-width="5"/></g><circle cx="407" cy="113" r="34" fill="url(#moon)"/><ellipse cx="398" cy="102" rx="10" ry="5" fill="#f6fff7" opacity=".7" transform="rotate(-25 398 102)"/><circle cx="117" cy="276" r="25" fill="url(#violet)"/><ellipse cx="110" cy="267" rx="7" ry="4" fill="white" opacity=".5"/></svg>`;

export function construireMenu(conteneur, actions, { profil = {}, runEnCours = false } = {}) {
  const doc = conteneur.ownerDocument;
  conteneur.innerHTML = '';
  const panneau = doc.createElement('div');
  panneau.className = 'panneau-menu';
  panneau.innerHTML = `<div class="menu-univers"><span class="marque-orbite">V</span> LE CARROUSEL COSMIQUE <span class="menu-edition">01</span></div><div class="menu-hero"><div class="menu-illustration">${COSMOS}</div><div class="menu-contenu"><p class="menu-kicker">UN PETIT GESTE. UN GRAND BIG BANG.</p><h1 class="titre-vertige">VERTIGE<span>Changez d’angle.</span></h1><p class="menu-description">Éclatez les couleurs. Faites tourner les étoiles.<br>Inventez votre prochaine réaction en chaîne.</p><div class="menu-boutons"></div><p class="menu-promesse">À votre rythme · Sans vies à attendre · Hors ligne</p></div></div><div class="menu-bas"><div class="menu-stats"></div><div class="menu-outils"></div></div>`;
  const boutons = panneau.querySelector('.menu-boutons');
  function bouton(label, classe, callback, parent = boutons) {
    const b = doc.createElement('button'); b.type = 'button'; b.className = classe; b.textContent = label;
    b.addEventListener('click', callback); parent.appendChild(b); return b;
  }
  if (runEnCours) bouton('Continuer', 'touche touche-accent touche-large', () => actions.continuerRun());
  bouton('Nouveau run', `touche ${runEnCours ? '' : 'touche-accent'} touche-large`, () => actions.nouveauRun());
  const stats = panneau.querySelector('.menu-stats');
  [['Expéditions', formatNombre(profil.runs ?? 0)], ['Meilleure salle', profil.meilleureSalle || '—'], ['Poussières d’étoiles', formatNombre(profil.monnaieMeta ?? 0)]].forEach(([label, valeur]) => {
    const item = doc.createElement('div'); item.className = 'menu-stat';
    const v = doc.createElement('span'); v.className = 'menu-stat-valeur'; v.textContent = valeur;
    const l = doc.createElement('span'); l.className = 'menu-stat-label'; l.textContent = label;
    item.append(v,l); stats.appendChild(item);
  });
  const outils = panneau.querySelector('.menu-outils');
  const detailsAide = doc.createElement('details'); detailsAide.className = 'menu-details';
  detailsAide.innerHTML = `<summary>Comment jouer</summary><div class="menu-explications"><p><b>01 · Éclatez</b>Touchez au moins deux billes voisines de même couleur. Un grand groupe crée une spéciale.</p><p><b>02 · Tournez</b>Changez la gravité pour regrouper les billes. Maintenez une flèche pour voir le résultat avant de tourner.</p><p><b>03 · Combinez</b>Déclenchez une spéciale seule ou combinez deux spéciales voisines. Choisissez vos pouvoirs à chaque niveau.</p><p class="aide-seuils">4 : bombe · 6 : ligne · 7 : croix · 10 : couleur<br>Rotation : 1 énergie, puis 1 coup si la jauge est vide.<br>Une rotation qui assemble 6 billes ou plus déclenche une cascade. Un plateau sans solution reçoit un coup de pouce gratuit.</p></div>`;
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
