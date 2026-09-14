// Assemble l'interface complète de VERTIGE : menu, HUD, commandes de
// rotation, cartes de choix, panneau Mode Test et toasts. Point d'entrée
// unique conforme au contrat §7 (docs/CONTRATS.md) : creerUI(racine, actions).
import { creerHud } from './hud.js';
import { creerCartes } from './cartes.js';
import { creerTest } from './test.js';
import { formatNombre } from './utils.js';
import { ROTATION_HORS_JAUGE } from '../data/salles.js';

const DUREE_TOAST = 1600; // ms
const DELAI_APPUI = 180;  // ms d'appui avant l'aperçu de rotation (tactile et souris)
const DELAI_SURVOL = 300; // ms de survol (souris seulement)

export function creerUI(racine, actions) {
  const doc = racine.ownerDocument || document;
  const elHud = doc.getElementById('hud');

  racine.innerHTML = '';

  // --- Couches plein écran (mutuellement exclusives) ---
  const coucheMenu = doc.createElement('div');
  coucheMenu.className = 'couche couche-menu';
  coucheMenu.hidden = true;

  const coucheAttente = doc.createElement('div');
  coucheAttente.className = 'couche';
  coucheAttente.hidden = true;

  const coucheTest = doc.createElement('div');
  coucheTest.className = 'couche';
  coucheTest.hidden = true;

  const coucheToasts = doc.createElement('div');
  coucheToasts.className = 'couche-toasts';

  racine.append(coucheMenu, coucheAttente, coucheTest, coucheToasts);

  const hud = creerHud(elHud);
  const cartes = creerCartes(coucheAttente, actions);
  const test = creerTest(coucheTest, actions);

  function masquerCouches() {
    coucheMenu.hidden = true;
    coucheAttente.hidden = true;
    coucheTest.hidden = true;
  }

  // =====================================================================
  // Menu principal
  // =====================================================================
  function construireMenu({ profil, runEnCours } = {}) {
    coucheMenu.innerHTML = '';
    const p = profil ?? {};

    const panneau = doc.createElement('div');
    panneau.className = 'panneau-menu';

    const titre = doc.createElement('h1');
    titre.className = 'titre-vertige';
    titre.textContent = 'VERTIGE';
    panneau.appendChild(titre);

    const boutons = doc.createElement('div');
    boutons.className = 'menu-boutons';

    const btnNouveau = doc.createElement('button');
    btnNouveau.type = 'button';
    btnNouveau.className = 'touche touche-accent touche-large';
    btnNouveau.textContent = 'Nouveau run';
    btnNouveau.addEventListener('click', () => actions.nouveauRun());
    boutons.appendChild(btnNouveau);

    if (runEnCours) {
      const btnContinuer = doc.createElement('button');
      btnContinuer.type = 'button';
      btnContinuer.className = 'touche touche-large';
      btnContinuer.textContent = 'Continuer';
      btnContinuer.addEventListener('click', () => actions.continuerRun());
      boutons.appendChild(btnContinuer);
    }

    const btnTest = doc.createElement('button');
    btnTest.type = 'button';
    btnTest.className = 'touche touche-orange touche-large';
    btnTest.textContent = 'Mode Test';
    // Le contrat §7 ne définit pas d'action dédiée pour ouvrir le panneau
    // Test depuis le menu (seul actions.lancerTest(config) existe, pour le
    // bouton « Lancer » du panneau). On appelle un hook optionnel : si le
    // module applicatif ne le fournit pas, le clic ne fait rien plutôt que
    // de lever une erreur.
    btnTest.addEventListener('click', () => actions.ouvrirModeTest?.());
    boutons.appendChild(btnTest);

    panneau.appendChild(boutons);

    const ligneSon = doc.createElement('label');
    ligneSon.className = 'menu-son';
    const caseSon = doc.createElement('input');
    caseSon.type = 'checkbox';
    caseSon.checked = !!p.muet;
    caseSon.addEventListener('change', () => actions.muet(caseSon.checked));
    ligneSon.append(caseSon, doc.createTextNode(' Couper le son'));
    panneau.appendChild(ligneSon);

    const stats = doc.createElement('div');
    stats.className = 'menu-stats';
    [
      ['Runs joués', formatNombre(p.runs ?? 0)],
      ['Meilleure salle', p.meilleureSalle ?? '—'],
      ['Monnaie méta', formatNombre(p.monnaieMeta ?? 0)],
    ].forEach(([libelle, valeur]) => {
      const item = doc.createElement('div');
      item.className = 'menu-stat';
      const l = doc.createElement('span');
      l.className = 'menu-stat-label';
      l.textContent = libelle;
      const v = doc.createElement('span');
      v.className = 'menu-stat-valeur';
      v.textContent = valeur;
      item.append(l, v);
      stats.appendChild(item);
    });
    panneau.appendChild(stats);

    coucheMenu.appendChild(panneau);
  }

  // =====================================================================
  // Commandes de rotation (footer #commandes, déjà présent dans index.html)
  // =====================================================================
  const btnGauche = doc.getElementById('btn-rotation-gauche');
  const btnDroite = doc.getElementById('btn-rotation-droite');
  const btn180 = doc.getElementById('btn-rotation-180');

  // Télégraphe : un appui maintenu (ou un survol à la souris) montre l'aperçu de la rotation ;
  // relâcher sur la touche déclenche la rotation. Après un appui long, iOS n'émet pas toujours de
  // `click` : on tourne dès le `pointerup` si l'aperçu était visible, et le `click` qui suit est ignoré.
  function brancherRotation(bouton, sens) {
    if (!bouton) return;
    let minuteur = null, visible = false, dejaTourne = false;
    const cacher = () => {
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
      if (visible) { visible = false; actions.previsualiser?.(null); }
    };
    const armer = (delai) => {
      if (bouton.disabled) return;
      if (minuteur) clearTimeout(minuteur);
      minuteur = setTimeout(() => { minuteur = null; visible = true; actions.previsualiser?.(sens); }, delai);
    };
    bouton.addEventListener('pointerdown', () => { dejaTourne = false; armer(DELAI_APPUI); });
    bouton.addEventListener('pointerenter', (evt) => { if (evt.pointerType === 'mouse') armer(DELAI_SURVOL); });
    bouton.addEventListener('pointerup', () => {
      const apresApercu = visible;
      cacher();
      if (apresApercu && !bouton.disabled) { dejaTourne = true; actions.tourner(sens); }
    });
    bouton.addEventListener('pointerleave', cacher);
    bouton.addEventListener('pointercancel', cacher);
    bouton.addEventListener('contextmenu', (evt) => evt.preventDefault()); // appui long tactile : pas de menu
    bouton.addEventListener('click', () => {
      if (dejaTourne) { dejaTourne = false; return; }
      cacher(); actions.tourner(sens);
    });
  }
  brancherRotation(btnGauche, -1);
  brancherRotation(btnDroite, 1);
  brancherRotation(btn180, 2);

  function majBoutonsRotation(etat) {
    const jaugeVide = (etat.jauge ?? 0) <= 0;
    const payante = jaugeVide && ROTATION_HORS_JAUGE === 'coup' && (etat.coups ?? 0) > 0; // D13 : la rotation coûte un coup
    const desactive = !!etat.enAttente || (jaugeVide && !payante);
    [btnGauche, btnDroite, btn180].forEach((bouton) => {
      if (!bouton) return;
      bouton.disabled = desactive;
      bouton.classList.toggle('touche-payante', payante && !etat.enAttente);
    });
  }

  // =====================================================================
  // Clavier : Q/← = -1, D/→ = +1, S/↓ = 2, Échap = quitter (confirmation)
  // =====================================================================
  const surClavier = (evt) => {
    if (evt.repeat) return;
    const touche = evt.key.toLowerCase();
    if (touche === 'q' || touche === 'arrowleft') actions.tourner(-1);
    else if (touche === 'd' || touche === 'arrowright') actions.tourner(1);
    else if (touche === 's' || touche === 'arrowdown') actions.tourner(2);
    else if (evt.key === 'Escape') {
      const confirmer = doc.defaultView?.confirm ?? globalThis.confirm;
      if (typeof confirmer === 'function' && confirmer('Quitter le run en cours ?')) {
        actions.quitter();
      }
    }
  };
  doc.addEventListener('keydown', surClavier);

  // =====================================================================
  // Toasts
  // =====================================================================
  function message(texte) {
    const toast = doc.createElement('div');
    toast.className = 'toast';
    toast.textContent = texte;
    coucheToasts.appendChild(toast);
    setTimeout(() => toast.remove(), DUREE_TOAST);
  }

  // =====================================================================
  // API publique (§7 CONTRATS)
  // =====================================================================
  return {
    /** Retire ce que creerUI a posé hors de la racine (écouteur clavier sur document). */
    detruire() { doc.removeEventListener('keydown', surClavier); },
    afficherMenu(donnees) {
      masquerCouches();
      construireMenu(donnees);
      coucheMenu.hidden = false;
    },

    afficherJeu() {
      masquerCouches();
      elHud.hidden = false;
    },

    majHud(etat) {
      hud.maj(etat);
      majBoutonsRotation(etat);
    },

    afficherAttente(enAttente) {
      if (!enAttente) {
        coucheAttente.hidden = true;
        cartes.masquer();
        return;
      }
      masquerCouches();
      cartes.afficher(enAttente);
      coucheAttente.hidden = false;
      elHud.hidden = enAttente.type === 'finRun'; // l'écran de fin de run occupe tout l'écran : le HUD n'a plus de sens
    },

    masquerAttente() {
      coucheAttente.hidden = true;
      cartes.masquer();
      elHud.hidden = false;
    },

    message,

    afficherTest(config) {
      masquerCouches();
      test.afficher(config);
      coucheTest.hidden = false;
    },
  };
}
