// Construit et met à jour l'en-tête de jeu (#hud) : coups restants, jauge de
// rotation, XP/niveau de salle, objectif, nom de salle, annonce de rotation,
// bande « Prochaines entrées » (compétence Prévoyance) et effets actifs.
import { COULEURS } from '../data/couleurs.js';
import { formatNombre } from './utils.js';

// Traduit l'objectif de la salle en texte français selon son type (§3/§7 CONTRATS).
function texteObjectif(objectif) {
  if (!objectif) return '';
  const progres = formatNombre(objectif.progres ?? 0);
  const cible = formatNombre(objectif.cible ?? 0);
  switch (objectif.type) {
    case 'score':   return `Score ${progres} / ${cible}`;
    case 'couleur': return `${progres} / ${cible}`;
    case 'ballons': return `Étoiles filantes ${progres} / ${cible}`;
    case 'pierres': return `Astéroïdes ${progres} / ${cible}`;
    case 'billes':  return `Billes ${progres} / ${cible}`;
    default:        return `${progres} / ${cible}`;
  }
}

// Types d'objectif ayant une icône dessinée en CSS (score, ballons, pierres) ;
// 'couleur' et 'billes' affichent plutôt une petite bille (.bille-mini).
const ICONE_PAR_TYPE = { score: 'score', ballons: 'ballons', pierres: 'pierres' };
const AVEC_BILLE = new Set(['couleur', 'billes']);

// sens de rotation → symbole affiché dans l'annonce.
const SYMBOLE_ROTATION = { '-1': '⟲', '1': '⟳', '2': '↻' };

export function creerHud(elHud) {
  elHud.innerHTML = '';
  elHud.classList.add('hud');

  const ligneHaut = document.createElement('div');
  ligneHaut.className = 'hud-ligne hud-ligne-haut';
  const nomSalle = document.createElement('span');
  nomSalle.className = 'hud-salle';
  const coupsEl = document.createElement('span');
  coupsEl.className = 'hud-coups';
  ligneHaut.append(nomSalle, coupsEl);

  const jaugeEl = document.createElement('div');
  jaugeEl.className = 'hud-jauge';

  const xpEl = document.createElement('div');
  xpEl.className = 'hud-xp';
  // Niveau affiché dans une pastille ronde (style Cartoon pop) plutôt qu'en texte.
  const niveauEl = document.createElement('span');
  niveauEl.className = 'niveau-pastille';
  const barreXp = document.createElement('div');
  barreXp.className = 'barre-xp';
  const remplissageXp = document.createElement('div');
  remplissageXp.className = 'remplissage';
  barreXp.appendChild(remplissageXp);
  xpEl.append(niveauEl, barreXp);

  // Objectif : gros badge (icône par type + texte) + barre de progression
  // dessous (retour Martin : « il faut mieux voir les objectifs »).
  const objectifEl = document.createElement('div');
  objectifEl.className = 'hud-objectif';

  const objectifBadge = document.createElement('div');
  objectifBadge.className = 'objectif-badge';

  const objectifIcone = document.createElement('span');
  objectifIcone.className = 'objectif-icone';
  objectifIcone.hidden = true;

  const pastilleObjectif = document.createElement('span');
  pastilleObjectif.className = 'objectif-icone bille-mini';
  pastilleObjectif.hidden = true;

  const texteObjectifEl = document.createElement('span');
  texteObjectifEl.className = 'objectif-texte';

  const objectifCoche = document.createElement('span');
  objectifCoche.className = 'objectif-coche';
  objectifCoche.textContent = '✓';
  objectifCoche.hidden = true;

  objectifBadge.append(objectifIcone, pastilleObjectif, texteObjectifEl, objectifCoche);

  const objectifBarre = document.createElement('div');
  objectifBarre.className = 'objectif-barre';
  const objectifRemplissage = document.createElement('div');
  objectifRemplissage.className = 'objectif-remplissage';
  objectifBarre.appendChild(objectifRemplissage);

  objectifEl.append(objectifBadge, objectifBarre);

  const annonceEl = document.createElement('div');
  annonceEl.className = 'hud-annonce';
  annonceEl.hidden = true;

  const entreesEl = document.createElement('div');
  entreesEl.className = 'hud-entrees';
  entreesEl.hidden = true;
  const entreesLabel = document.createElement('span');
  entreesLabel.className = 'hud-entrees-label';
  entreesLabel.textContent = 'Prochaines entrées';
  const entreesBilles = document.createElement('span');
  entreesBilles.className = 'hud-entrees-billes';
  entreesEl.append(entreesLabel, entreesBilles);

  const effetsEl = document.createElement('div');
  effetsEl.className = 'hud-effets';

  // objectifEl juste après ligneHaut : premier élément de la 2e ligne du HUD (les
  // deux ont flex-basis:100% en CSS, donc chacun occupe sa propre ligne).
  elHud.append(ligneHaut, objectifEl, jaugeEl, xpEl, annonceEl, entreesEl, effetsEl);

  // Le nombre de pastilles de jauge ne change presque jamais : on ne
  // reconstruit la rangée que si jaugeMax a changé.
  let jaugeMaxPrecedent = -1;
  // Pour détecter la progression de l'objectif et déclencher le « pop ».
  let progresObjectifPrecedent = null;
  let minuteurPopObjectif = null;
  function majJauge(jauge, jaugeMax) {
    if (jaugeMax !== jaugeMaxPrecedent) {
      jaugeEl.innerHTML = '';
      for (let i = 0; i < jaugeMax; i += 1) {
        const pastille = document.createElement('span');
        pastille.className = 'jauge-pastille';
        pastille.textContent = '★'; // étoile allumée/éteinte selon .allumee (CSS)
        jaugeEl.appendChild(pastille);
      }
      jaugeMaxPrecedent = jaugeMax;
    }
    Array.from(jaugeEl.children).forEach((pastille, i) => {
      pastille.classList.toggle('allumee', i < jauge);
    });
  }

  return {
    // Met à jour l'ensemble du HUD depuis l'état du moteur (etat, §3 CONTRATS).
    maj(etat) {
      nomSalle.textContent = etat.salle?.nom ?? '';
      coupsEl.textContent = `${etat.coups ?? 0} coups`;
      majJauge(etat.jauge ?? 0, etat.jaugeMax ?? 0);

      const niveau = etat.niveau ?? 1;
      niveauEl.textContent = String(niveau);
      niveauEl.setAttribute('aria-label', `Niveau ${niveau} sur 10`);
      const bas = etat.xpNiveau ?? 0, haut = etat.xpProchain;
      const fraction = haut === null || haut === undefined ? 1 : (etat.xpSalle - bas) / Math.max(1, haut - bas);
      remplissageXp.style.width = `${Math.min(100, Math.max(0, fraction * 100))}%`;

      const objectif = etat.objectif;
      objectifEl.hidden = !objectif;
      if (objectif) {
        texteObjectifEl.textContent = texteObjectif(objectif);

        const icone = ICONE_PAR_TYPE[objectif.type];
        objectifIcone.hidden = !icone;
        objectifIcone.className = icone ? `objectif-icone icone-${icone}` : 'objectif-icone';

        pastilleObjectif.hidden = !AVEC_BILLE.has(objectif.type);
        if (objectif.type === 'couleur' && objectif.couleur != null) {
          pastilleObjectif.style.setProperty('--c', COULEURS[objectif.couleur]?.hex ?? '#999');
        } else if (objectif.type === 'billes') {
          pastilleObjectif.style.removeProperty('--c'); // gris par défaut (.bille-mini)
        }

        const progres = objectif.progres ?? 0;
        const cible = objectif.cible ?? 0;
        const fraction = cible > 0 ? Math.min(1, Math.max(0, progres / cible)) : 0;
        const atteint = cible > 0 && progres >= cible;
        objectifRemplissage.style.width = `${fraction * 100}%`;
        objectifRemplissage.classList.toggle('presque', fraction >= 0.8);
        objectifBadge.classList.toggle('atteint', atteint);
        objectifCoche.hidden = !atteint;

        // Petit « pop » d'échelle sur le badge quand la progression avance.
        if (progresObjectifPrecedent !== null && progres > progresObjectifPrecedent) {
          objectifBadge.classList.remove('pop');
          void objectifBadge.offsetWidth; // reflow : relance l'animation même si elle était déjà en cours
          objectifBadge.classList.add('pop');
          clearTimeout(minuteurPopObjectif);
          minuteurPopObjectif = setTimeout(() => objectifBadge.classList.remove('pop'), 250);
        }
        progresObjectifPrecedent = progres;
      } else {
        progresObjectifPrecedent = null;
      }

      if (etat.annonce) {
        annonceEl.hidden = false;
        const symbole = SYMBOLE_ROTATION[String(etat.annonce.sens)] ?? '?';
        annonceEl.textContent = `Prochaine rotation : ${symbole}`;
      } else {
        annonceEl.hidden = true;
      }

      const aPrevoyance = etat.competences?.includes('prevoyance');
      const regles = etat.salle?.regles ?? {};
      const entrees = regles.maree || regles.entree || etat.modeGravite !== 'vide' ? (etat.prochainesEntrees ?? []).slice(0, 8) : [];
      if (aPrevoyance && entrees.length) {
        entreesEl.hidden = false;
        entreesBilles.innerHTML = '';
        entrees.forEach((couleur) => {
          const bille = document.createElement('span');
          bille.className = 'bille-mini';
          bille.style.setProperty('--c', COULEURS[couleur]?.hex ?? '#999');
          entreesBilles.appendChild(bille);
        });
      } else {
        entreesEl.hidden = true;
      }

      const effets = etat.effetsActifs ?? [];
      effetsEl.innerHTML = '';
      effetsEl.hidden = effets.length === 0;
      effets.forEach((effet) => {
        const chip = document.createElement('span');
        chip.className = 'hud-effet';
        chip.textContent = effet.restant === null || effet.restant === undefined ? `${effet.nom} · salle` : `${effet.nom} · ${effet.restant} tour${effet.restant > 1 ? 's' : ''}`;
        effetsEl.appendChild(chip);
      });
    },
  };
}
