// Écrans d'attente construits depuis etat.enAttente (§3/§7 CONTRATS) :
// montée de niveau, choix de compétence, fin de salle, fin de run.
import { COMPETENCES } from '../data/competences.js';
import { formatNombre } from './utils.js';

// Mot affiché dans le bandeau de rareté des cartes de niveau/compétence.
const LIBELLE_RARETE = { commun: 'COMMUN', rare: 'RARE', epique: 'ÉPIQUE' };

// Raison de fin de salle → texte français lisible.
const LIBELLE_RAISON = {
  coups: 'Plus de coups',
  bloque: 'Plateau bloqué : plus aucun groupe',
  vide: 'Plateau vide',
  rotations: 'Plus de rotations',
  objectif: 'Objectif atteint',
};

// Unité affichée dans « À {manque} {unité} de l'objectif » selon le type d'objectif.
const UNITE_OBJECTIF = {
  score: 'points',
  couleur: 'billes',
  ballons: 'étoiles filantes',
  pierres: 'astéroïdes',
  billes: 'billes',
};

// mm:ss entre deux instants epoch (ms).
function formatDuree(ms) {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// « Titre de build » de fin de run : première règle vraie dans l'ordre, puis
// un suffixe selon le résultat. Fonction pure, testable indépendamment du DOM.
export function titreDeBuild(enAttente) {
  const stats = enAttente?.stats ?? {};
  const speciales = stats.speciales ?? {};
  const competences = enAttente?.competences ?? [];

  let nom;
  if ((stats.chaineMax ?? 0) >= 3) nom = 'Réaction en chaîne';
  else if ((speciales.couleur ?? 0) >= 3) nom = 'Arc-en-ciel';
  else if ((speciales.bombe ?? 0) >= 12) nom = 'Artificier';
  else if ((stats.taps ?? 0) > 0 && (stats.rotations ?? 0) >= (stats.taps ?? 0) / 2) nom = 'Toupie cosmique';
  else if (competences.includes('propagation_vert')) nom = 'Jardinier stellaire';
  else if (competences.includes('seuil_abaisse')) nom = 'Précoce';
  else if ((stats.plusGrosGroupe ?? 0) >= 12) nom = 'Gourmand';
  else if ((stats.etoilesLiberees ?? 0) >= 6) nom = 'Berger d\'étoiles';
  else nom = 'Explorateur';

  const suffixe = enAttente?.victoire ? 'triomphant' : 'en orbite';
  return `${nom} ${suffixe}`;
}

export function creerCartes(conteneur, actions) {
  conteneur.classList.add('couche-attente');
  conteneur.innerHTML = '';

  const panneau = document.createElement('div');
  panneau.className = 'panneau-attente';

  const titre = document.createElement('h2');
  titre.className = 'attente-titre';

  const sousTitre = document.createElement('p');
  sousTitre.className = 'attente-soustitre';
  sousTitre.hidden = true;

  // Quasi-victoire (échec de salle) : « À {manque} {unité} de l'objectif »
  // et, si on était tout près, le badge d'objectif en jaune « Tu y étais presque ! ».
  const quasiVictoireEl = document.createElement('p');
  quasiVictoireEl.className = 'quasi-victoire';
  quasiVictoireEl.hidden = true;

  // F07 : bilan de la finale (coups, rotations, spéciales restants convertis en XP) sur l'écran de victoire.
  const finaleEl = document.createElement('p');
  finaleEl.className = 'fin-finale';
  finaleEl.hidden = true;

  const badgeEncourageEl = document.createElement('div');
  badgeEncourageEl.className = 'objectif-badge encourage';
  badgeEncourageEl.hidden = true;
  const badgeEncourageTexte = document.createElement('span');
  badgeEncourageTexte.className = 'objectif-texte';
  badgeEncourageTexte.textContent = 'Tu y étais presque !';
  badgeEncourageEl.appendChild(badgeEncourageTexte);

  const grille = document.createElement('div');
  grille.className = 'grille-cartes';
  grille.hidden = true;

  // Fin de run : grille de 6 tuiles chiffrées.
  const statsGrille = document.createElement('div');
  statsGrille.className = 'grille-stats-fin';
  statsGrille.hidden = true;

  // Fin de run : escalier d'XP (une barre par salle jouée).
  const escalierXp = document.createElement('div');
  escalierXp.className = 'escalier-xp';
  escalierXp.hidden = true;

  // Fin de run : compétences prises (pilules).
  const competencesFin = document.createElement('div');
  competencesFin.className = 'competences-fin';
  competencesFin.hidden = true;

  const pied = document.createElement('div');
  pied.className = 'attente-pied';

  panneau.append(titre, sousTitre, quasiVictoireEl, finaleEl, badgeEncourageEl, grille, statsGrille, escalierXp, competencesFin, pied);
  conteneur.appendChild(panneau);

  function vider() {
    titre.textContent = '';
    sousTitre.hidden = true;
    sousTitre.textContent = '';
    quasiVictoireEl.hidden = true;
    quasiVictoireEl.textContent = '';
    finaleEl.hidden = true;
    finaleEl.textContent = '';
    badgeEncourageEl.hidden = true;
    grille.hidden = true;
    grille.innerHTML = '';
    grille.classList.remove('grille-niveau', 'apogee');
    statsGrille.hidden = true;
    statsGrille.innerHTML = '';
    escalierXp.hidden = true;
    escalierXp.innerHTML = '';
    competencesFin.hidden = true;
    competencesFin.innerHTML = '';
    pied.innerHTML = '';
  }

  // Une carte de choix (niveau ou compétence), inclinée façon carton posé sur
  // la table (voir .carte en CSS). risque/synergie/evolution ne concernent
  // que les cartes de niveau ; absents (undefined), ils n'ajoutent rien —
  // l'écran « compétence » est donc inchangé.
  function carteChoix({ nom, desc, rarete, risque, synergie, evolution, onChoisir }) {
    const carte = document.createElement('button');
    carte.type = 'button';
    carte.className = 'carte';
    if (rarete) carte.classList.add(`carte-${rarete}`);
    if (risque) carte.classList.add('carte-risque');
    if (evolution) carte.classList.add('carte-evolution');

    // Bandeau de rareté (couleur + mot COMMUN/RARE/ÉPIQUE) ; devient rayé
    // rouge-or sur une carte à risque, doré chatoyant sur une évolution.
    const bandeau = document.createElement('div');
    bandeau.className = 'carte-bandeau';
    if (rarete) {
      const labelRarete = document.createElement('span');
      labelRarete.className = 'carte-bandeau-label';
      labelRarete.textContent = LIBELLE_RARETE[rarete] ?? '';
      bandeau.appendChild(labelRarete);
    }
    carte.appendChild(bandeau);

    if (risque) {
      const etiquette = document.createElement('span');
      etiquette.className = 'carte-etiquette-pari';
      etiquette.textContent = 'PARI';
      carte.appendChild(etiquette);
    }
    if (evolution) {
      const etoile = document.createElement('span');
      etoile.className = 'carte-etoile-evolution';
      etoile.textContent = '★ ÉVOLUTION';
      carte.appendChild(etoile);
    }
    if (rarete) {
      const pastille = document.createElement('span');
      pastille.className = `pastille-rarete pastille-${rarete}`;
      carte.appendChild(pastille);
    }

    const titreCarte = document.createElement('h3');
    titreCarte.textContent = nom;
    const descCarte = document.createElement('p');
    descCarte.textContent = desc;
    carte.append(titreCarte, descCarte);

    if (synergie) {
      const bandeauSynergie = document.createElement('p');
      bandeauSynergie.className = 'carte-synergie';
      bandeauSynergie.textContent = `Synergie : ${synergie}`;
      carte.appendChild(bandeauSynergie);
    }

    carte.addEventListener('click', onChoisir);
    return carte;
  }

  function boutonPied(texte, onClick, accent = false) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = accent ? 'touche touche-accent touche-large' : 'touche touche-large';
    bouton.textContent = texte;
    bouton.addEventListener('click', onClick);
    pied.appendChild(bouton);
    return bouton;
  }

  // Une tuile chiffrée de l'écran de fin de run (cf. .tuile-stat en CSS).
  function tuileStat(label, valeur, detail, indice) {
    const tuile = document.createElement('div');
    tuile.className = 'tuile-stat cascade';
    tuile.style.setProperty('--i', indice);
    const v = document.createElement('span');
    v.className = 'tuile-stat-valeur';
    v.textContent = valeur;
    const l = document.createElement('span');
    l.className = 'tuile-stat-label';
    l.textContent = label;
    tuile.append(v, l);
    if (detail) {
      const d = document.createElement('span');
      d.className = 'tuile-stat-detail';
      d.textContent = detail;
      tuile.appendChild(d);
    }
    return tuile;
  }

  return {
    afficher(enAttente) {
      vider();
      if (!enAttente) return;

      if (enAttente.type === 'niveau') {
        const apogee = enAttente.niveau === 10;
        titre.textContent = apogee ? 'Niveau 10 — apogée !' : `Niveau ${enAttente.niveau} !`;
        grille.hidden = false;
        grille.classList.add('grille-niveau');
        grille.classList.toggle('apogee', apogee);
        (enAttente.propositions ?? []).forEach((prop) => {
          grille.appendChild(carteChoix({
            nom: prop.nom,
            desc: prop.desc,
            rarete: prop.rarete,
            risque: prop.risque,
            synergie: prop.synergie,
            evolution: prop.evolution,
            onChoisir: () => actions.choisir(prop.id),
          }));
        });

        // Retirer les 3 cartes : gratuit une fois par salle (D19), puis 1 point de jauge de rotation.
        const relance = enAttente.relance ?? {};
        if (!apogee) {
          const boutonRelance = boutonPied(
            !relance.possible ? 'Jauge vide' : relance.cout ? 'Retirer les cartes (−1 rotation)' : 'Retirer les cartes (gratuit)',
            () => actions.relancer(),
          );
          boutonRelance.disabled = !relance.possible;
        }
      } else if (enAttente.type === 'competence') {
        titre.textContent = 'Choisis une compétence';
        grille.hidden = false;
        (enAttente.propositions ?? []).forEach((prop) => {
          grille.appendChild(carteChoix({
            nom: prop.nom,
            desc: prop.desc,
            rarete: prop.rarete,
            onChoisir: () => actions.choisir(prop.id),
          }));
        });
        boutonPied('Passer', () => actions.choisir(null));
      } else if (enAttente.type === 'finSalle') {
        titre.textContent = enAttente.victoire ? 'Étape franchie' : 'Échec';
        sousTitre.hidden = false;
        const libelleRaison = enAttente.raison ? (LIBELLE_RAISON[enAttente.raison] ?? enAttente.raison) : '';
        const raison = libelleRaison ? `${libelleRaison} — ` : '';
        sousTitre.textContent = `${raison}XP ${enAttente.xpSalle ?? 0}`;

        // F07 : ce que la finale a rapporté (rien à l'échec, rien si tout était déjà dépensé).
        const finale = enAttente.finale;
        if (enAttente.victoire && finale && finale.xp > 0) {
          const s = (n) => (n > 1 ? 's' : '');
          const parts = [];
          if (finale.coups) parts.push(`${finale.coups} coup${s(finale.coups)}`);
          if (finale.rotations) parts.push(`${finale.rotations} rotation${s(finale.rotations)}`);
          if (finale.speciales) parts.push(`${finale.speciales} spéciale${s(finale.speciales)}`);
          const gain = document.createElement('b');
          gain.textContent = `+${formatNombre(finale.xp)} XP`;
          const detail = document.createElement('small');
          detail.textContent = parts.join(' · ');
          finaleEl.hidden = false;
          finaleEl.append('Finale ', gain, detail);
        }

        // Quasi-victoire : jamais rien à acheter, juste un encouragement.
        const objectif = enAttente.objectif;
        const manque = objectif?.manque ?? 0;
        if (!enAttente.victoire && objectif && manque > 0) {
          const unite = UNITE_OBJECTIF[objectif.type] ?? 'points';
          quasiVictoireEl.hidden = false;
          quasiVictoireEl.textContent = `À ${formatNombre(manque)} ${unite} de l'objectif`;
          if (objectif.cible > 0 && manque / objectif.cible <= 0.2) {
            badgeEncourageEl.hidden = false;
          }
        }

        boutonPied('Continuer', () => actions.choisir(null), true);
      } else if (enAttente.type === 'finRun') {
        titre.textContent = enAttente.victoire ? 'Victoire !' : 'Fin du run';
        sousTitre.hidden = false;
        sousTitre.textContent = titreDeBuild(enAttente);

        const stats = enAttente.stats ?? {};
        const speciales = stats.speciales ?? {};
        const totalSpeciales = (speciales.bombe ?? 0) + (speciales.ligne ?? 0) + (speciales.croix ?? 0) + (speciales.couleur ?? 0);

        statsGrille.hidden = false;
        [
          ['Durée', formatDuree((stats.fin ?? 0) - (stats.debut ?? 0))],
          ['Salles franchies', `${enAttente.salleIndex ?? 0} / ${enAttente.totalSalles ?? 0}`],
          ['XP totale', formatNombre(enAttente.xpTotale ?? 0)],
          ['Monnaie méta', `+${formatNombre(enAttente.monnaieMeta ?? 0)}`],
          ['Plus grosse chaîne', `×${(stats.chaineMax ?? 0) + 1}`],
          ['Rotations productives', `${stats.rotationsProductives ?? 0} / ${stats.rotations ?? 0}`], // F09
          ['Spéciales créées', formatNombre(totalSpeciales),
            `Bombe ${speciales.bombe ?? 0} · Ligne ${speciales.ligne ?? 0} · Croix ${speciales.croix ?? 0} · Couleur ${speciales.couleur ?? 0}`],
        ].forEach(([label, valeur, detail], i) => statsGrille.appendChild(tuileStat(label, valeur, detail, i)));

        // Escalier d'XP : une barre par salle jouée, largeur ∝ à la salle la plus XP.
        const salles = stats.salles ?? [];
        if (salles.length) {
          escalierXp.hidden = false;
          const titreSection = document.createElement('p');
          titreSection.className = 'section-fin-titre';
          titreSection.textContent = 'Escalier d\'XP';
          escalierXp.appendChild(titreSection);

          const maxXp = Math.max(1, ...salles.map((s) => s.xp ?? 0));
          salles.forEach((s, i) => {
            const ligne = document.createElement('div');
            ligne.className = 'escalier-ligne cascade';
            // Cascade propre à cette section (jamais chaînée après les 6 tuiles) et plafonnée :
            // avec beaucoup de salles, aucune barre ne doit rester à opacity:0 (délai encore à
            // courir) plus longtemps que nécessaire — la salle échouée doit rester visible.
            ligne.style.setProperty('--i', Math.min(i, 8));

            const tete = document.createElement('div');
            tete.className = 'escalier-tete';
            const nom = document.createElement('span');
            nom.className = 'escalier-nom';
            nom.textContent = s.nom ?? s.id ?? '';
            const meta = document.createElement('span');
            meta.className = 'escalier-meta';
            meta.textContent = `XP ${formatNombre(s.xp ?? 0)} · Niv ${s.niveau ?? 1}`;
            tete.append(nom, meta);

            const barre = document.createElement('div');
            barre.className = 'escalier-barre';
            const remplissage = document.createElement('div');
            remplissage.className = s.victoire ? 'escalier-remplissage' : 'escalier-remplissage echec';
            remplissage.style.width = `${Math.max(8, ((s.xp ?? 0) / maxXp) * 100)}%`;
            barre.appendChild(remplissage);

            ligne.append(tete, barre);
            escalierXp.appendChild(ligne);
          });
        }

        // Compétences prises, en pilules (nom français depuis src/data/competences.js).
        const competences = enAttente.competences ?? [];
        if (competences.length) {
          competencesFin.hidden = false;
          const titreSection = document.createElement('p');
          titreSection.className = 'section-fin-titre';
          titreSection.textContent = 'Compétences prises';
          competencesFin.appendChild(titreSection);

          const listePilules = document.createElement('div');
          listePilules.className = 'liste-pilules';
          competences.forEach((id, i) => {
            const info = COMPETENCES.find((c) => c.id === id);
            const pilule = document.createElement('span');
            pilule.className = 'pilule-competence cascade';
            // Idem : cascade propre à cette section, plafonnée (ne dépend ni des tuiles ni de l'escalier).
            pilule.style.setProperty('--i', Math.min(i, 8));
            if (info?.rarete) {
              const pastille = document.createElement('span');
              pastille.className = `pastille-rarete pastille-${info.rarete}`;
              pilule.appendChild(pastille);
            }
            pilule.appendChild(document.createTextNode(info?.nom ?? id));
            listePilules.appendChild(pilule);
          });
          competencesFin.appendChild(listePilules);
        }

        boutonPied('Retour au menu', () => actions.quitter());
        boutonPied('Rejouer', () => actions.nouveauRun(), true);
      }
    },
    masquer() {
      vider();
    },
  };
}
