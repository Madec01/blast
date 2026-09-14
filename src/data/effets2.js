// Catalogue Lot D (2026-09-14, validé par Martin) : 25 nouveaux effets de niveau + 6 évolutions.
// Suite de src/data/effets.js (mêmes conventions, mêmes contraintes de contrat) — scindé ici pour
// que le fichier principal reste lisible. `EFFETS_NOUVEAUX` et `EVOLUTIONS` sont fusionnés/ré-exportés
// depuis effets.js ; rien d'autre n'importe ce fichier directement.
import { coord, voisins, tousGroupes, compter, tombe, nouvelleBille } from '../moteur/grille.js';
import { colonnes } from '../moteur/gravite.js';
import { avancerElements, TYPES_SPECIALES } from '../moteur/speciales.js';
import { renforcer } from '../moteur/chute.js';
import { RENFORT } from './salles.js';
import { convertir, couleurDominante, couleurRare, billes } from './effets.js';

const src = (id) => ({ source: 'effet:' + id });

// Équivalent local de tirerEntree()/remplirFile() (moteur/tour.js) : on ne peut pas importer tour.js
// depuis un fichier de données sans créer un cycle (tour.js → progression.js → data/effets.js), donc on
// reproduit ici le tirage depuis la même file `etat.prochainesEntrees` (garde l'aperçu de rotation et
// Prévoyance cohérents avec les billes réellement posées).
function tirerEntreeLocale(ctx) {
  const f = ctx.etat.prochainesEntrees;
  while (f.length < 24) f.push(ctx.rng.entier(ctx.etat.couleurs));
  return nouvelleBille(ctx.grille, f.shift());
}

/** Couleur la plus fréquente parmi les voisines orthogonales de la case i (-1 si aucune bille voisine). */
function couleurFrequenteVoisins(ctx, i) {
  const n = new Array(6).fill(0);
  for (const v of voisins(ctx.grille, i)) { const c = ctx.grille.cellules[v]; if (c && c.type === 'bille') n[c.couleur]++; }
  let max = -1;
  for (let k = 0; k < n.length; k++) if (n[k] > 0 && (max === -1 || n[k] > n[max])) max = k;
  return max;
}

/** Même seuil que la règle Renfort (moteur/tour.js `appliquerRenfort`), pour les effets qui en dépendent. */
function sousLeSeuilRenfort(ctx) {
  const e = ctx.etat, regle = e.salle.regles.renfort === undefined ? RENFORT : e.salle.regles.renfort;
  if (!regle) return false;
  const cases = ctx.grille.forme.reduce((n, f) => n + f, 0);
  return compter(ctx.grille, (c) => c.type === 'bille') < Math.round(regle.seuil * cases);
}

export const EFFETS_NOUVEAUX = [
  // ================= Palier 1 (niveaux 2-3) =================
  { id: 'jauge_max', palier: 1, rarete: 'commun', famille: 'rotation', nom: 'Jauge gonflée',
    desc: 'La jauge de rotation gagne +1 de maximum, remplie immédiatement.', duree: null,
    synergies: ['vertige'],
    // jaugeInitiale n'est recalculée qu'à l'entrée en salle (moteur/run.js `entrerSalle`), avant que
    // les hooks de la salle précédente ne soient même retirés : un réducteur posé ici n'aurait donc
    // jamais l'occasion de s'exécuter. On agit immédiatement sur la salle en cours à la place.
    appliquer(ctx) {
      ctx.etat.jaugeMax += 1; ctx.etat.jauge = ctx.etat.jaugeMax;
      ctx.emettre({ t: 'coups', coups: ctx.etat.coups, jauge: ctx.etat.jauge });
    } },

  { id: 'renfort_dore', palier: 1, rarete: 'rare', famille: 'renfort', nom: 'Renfort doré',
    desc: 'Tant que la grille est sous le seuil de renfort, chaque tap vaut ×1,5 d’XP.', duree: 'salle',
    // Simplification assumée (cf. instructions) : suivre individuellement les billes de renfort jusqu'à
    // leur destruction demanderait de lire leur marque après que speciales.js a déjà mis à null la
    // cellule détruite au moment où xpGain est réduit — on applique donc le bonus tant que la règle
    // Renfort est active, plutôt que bille par bille.
    appliquer(ctx) {
      ctx.bus.on('xpGain', (v, c) => (sousLeSeuilRenfort(c) ? v * 1.5 : v), src('renfort_dore'));
    } },

  { id: 'rotation_marquee', palier: 1, rarete: 'commun', famille: 'speciales', nom: 'Rotation marquée',
    desc: 'La prochaine rotation qui laisse un groupe de 5 billes ou plus en fait une bombe.', duree: 'salle',
    appliquer(ctx) {
      ctx.bus.on('apresRotation', (c, e) => { if (!e.auto) c.memo.rotationMarqueeArmee = true; }, src('rotation_marquee'));
      ctx.bus.on('apresChute', (c) => {
        if (!c.memo.rotationMarqueeArmee) return;
        c.memo.rotationMarqueeArmee = false;
        const groupes = tousGroupes(c.grille).filter((g) => g.length >= 5);
        if (!groupes.length) return;
        const i = c.rng.choix(groupes)[0], cellule = c.grille.cellules[i];
        if (!cellule || cellule.speciale) return;
        cellule.speciale = 'bombe'; cellule.rayon = 1;
        const [x, y] = coord(c.grille, i);
        c.emettre({ t: 'speciale', x, y, id: cellule.id, type: 'bombe' });
        c.retirerEffet('rotation_marquee');
      }, src('rotation_marquee'));
    } },

  { id: 'coup_gratuit_rotation', palier: 1, rarete: 'rare', famille: 'rotation', nom: 'Économe',
    desc: 'Une rotation payante sur deux est gratuite.', duree: 'salle',
    // Le moteur n'émet pas d'événement debutTour (seul finTour existe) : impossible de compter les
    // rotations « du tour ». Le compteur porte donc sur l'ensemble des rotations payantes de la salle.
    appliquer(ctx) {
      ctx.bus.on('coutRotation', (v, c) => {
        c.memo.economeCompte = (c.memo.economeCompte ?? 0) + 1;
        return c.memo.economeCompte % 2 === 0 ? 0 : v;
      }, src('coup_gratuit_rotation'));
    } },

  { id: 'bombe_apprivoisee', palier: 1, rarete: 'commun', famille: 'speciales', nom: 'Amorce longue',
    desc: 'Les 2 prochains groupes de 3 billes ou plus créent une bombe.', duree: 'salle',
    synergies: ['double_amorce'],
    appliquer(ctx) {
      ctx.memo.bombeApprivoiseeRestant ??= 2;
      ctx.bus.on('seuils', (v) => ({ ...v, bombe: Math.min(v.bombe, 3) }), src('bombe_apprivoisee'));
      ctx.bus.on('specialeCreee', (c) => {
        c.memo.bombeApprivoiseeRestant--;
        if (c.memo.bombeApprivoiseeRestant <= 0) c.retirerEffet('bombe_apprivoisee');
      }, src('bombe_apprivoisee'));
    } },

  { id: 'spirale_xp', palier: 1, rarete: 'commun', famille: 'xp', nom: 'Spirale',
    desc: 'Rotations consécutives dans le même sens : +10 % d’XP cumulé (max +50 %), remis à zéro au changement de sens ou au tap.', duree: 'salle',
    appliquer(ctx) {
      ctx.memo.spiraleSens ??= null; ctx.memo.spiraleNiveau ??= 0;
      ctx.bus.on('apresRotation', (c, e) => {
        if (e.auto) return;
        c.memo.spiraleNiveau = c.memo.spiraleSens === e.sens ? Math.min(5, c.memo.spiraleNiveau + 1) : 1;
        c.memo.spiraleSens = e.sens;
      }, src('spirale_xp'));
      ctx.bus.on('avantTap', (c) => { c.memo.spiraleSens = null; c.memo.spiraleNiveau = 0; }, src('spirale_xp'));
      ctx.bus.on('xpGain', (v, c) => v * (1 + 0.1 * c.memo.spiraleNiveau), src('spirale_xp'));
    } },

  { id: 'coups_epuises_sursis', palier: 1, rarete: 'epique', famille: 'coups', nom: 'Sursis',
    desc: 'Au prochain 0 coup, +3 coups au lieu de rien (une fois).', duree: 'salle',
    synergies: ['coup_de_trop'],
    appliquer(ctx) {
      ctx.bus.on('coupsEpuises', (c) => {
        if (c.memo.sansFilet) return; // Mise en jeu : plus aucun sursis pour la salle
        if (c.memo.coupsEpuisesSursisUtilise) return;
        c.memo.coupsEpuisesSursisUtilise = true;
        c.etat.coups += 3;
        c.emettre({ t: 'coups', coups: c.etat.coups, jauge: c.etat.jauge });
        c.emettre({ t: 'message', texte: 'Sursis : +3 coups' });
        c.retirerEffet('coups_epuises_sursis');
      }, src('coups_epuises_sursis'));
    } },

  { id: 'taille_generosite', palier: 1, rarete: 'commun', famille: 'xp', nom: 'Débutant chanceux',
    desc: 'Les groupes de 2 comptent comme 3 pendant 2 tours.', duree: 2,
    appliquer(ctx) { ctx.bus.on('tailleGroupe', (v) => (v === 2 ? 3 : v), src('taille_generosite')); } },

  // ================= Palier 2 (niveaux 4-6) =================
  { id: 'bombe_instable', palier: 2, rarete: 'rare', famille: 'speciales', risque: true, nom: 'Bombe instable',
    desc: 'Les bombes créées gagnent +1 de rayon, mais explosent 1 tour après leur création.', duree: 'salle',
    appliquer(ctx) {
      ctx.memo.bombesInstables ??= [];        // armées ce tour-ci
      ctx.memo.bombesInstablesPretes ??= [];   // armées au tour précédent : à faire exploser maintenant
      ctx.bus.on('specialeCreee', (c, e) => {
        if (e.type !== 'bombe') return;
        const cellule = c.grille.cellules[e.i];
        if (!cellule) return;
        cellule.rayon = (cellule.rayon ?? 1) + 1;
        c.memo.bombesInstables.push(cellule.id);
      }, src('bombe_instable'));
      ctx.bus.on('finTour', (c) => {
        const pretes = c.memo.bombesInstablesPretes;
        c.memo.bombesInstablesPretes = c.memo.bombesInstables;
        c.memo.bombesInstables = [];
        if (!pretes.length) return;
        const indices = [];
        for (const id of pretes) { const i = c.grille.cellules.findIndex((cel) => cel && cel.id === id); if (i >= 0) indices.push(i); }
        if (indices.length) { c.detruire(indices, 'bombe'); c.retomber(); }
      }, src('bombe_instable'));
    } },

  { id: 'explosion_en_chaine_couleur', palier: 2, rarete: 'rare', famille: 'speciales', nom: 'Réaction',
    desc: 'Une explosion qui touche une bille de sa propre couleur la transforme en spéciale du même type.', duree: 'salle',
    synergies: ['seuil_abaisse'],
    appliquer(ctx) {
      ctx.bus.on('explosion', (c, e) => {
        if (!TYPES_SPECIALES.includes(e.cause) || !e.origine) return;
        const origineCell = e.cellules.find((k) => k.x === e.origine.x && k.y === e.origine.y);
        if (!origineCell || origineCell.couleur === null || origineCell.couleur === undefined) return;
        const g = c.grille, vus = new Set();
        for (const k of e.cellules) {
          for (const v of voisins(g, k.y * g.w + k.x)) {
            if (vus.has(v)) continue;
            vus.add(v);
            const cv = g.cellules[v];
            if (cv && cv.type === 'bille' && !cv.speciale && cv.couleur === origineCell.couleur) {
              cv.speciale = e.cause; cv.rayon = 1;
              const [x, y] = coord(g, v);
              c.emettre({ t: 'speciale', x, y, id: cv.id, type: e.cause });
              c.bus.emettre('specialeCreee', c, { i: v, type: e.cause, taille: 0 });
              return; // au plus une conversion par explosion
            }
          }
        }
      }, src('explosion_en_chaine_couleur'));
    } },

  { id: 'renfort_cible', palier: 2, rarete: 'commun', famille: 'renfort', nom: 'Renfort ciblé',
    desc: 'Les billes de renfort n’arrivent que dans la couleur la plus rare de la grille.', duree: 'salle',
    appliquer(ctx) {
      ctx.bus.on('remplissage', (c, e) => {
        if (!e.renfort) return;
        const rare = couleurRare(c);
        if (rare < 0) return;
        const g = c.grille, indices = [];
        for (const entree of e.cellules) { const i = entree.y * g.w + entree.x; const cel = g.cellules[i]; if (cel && cel.type === 'bille' && cel.couleur !== rare) indices.push(i); }
        convertir(c, indices, rare);
      }, src('renfort_cible'));
    } },

  { id: 'croix_partagee', palier: 2, rarete: 'rare', famille: 'speciales', nom: 'Partage',
    desc: 'Les spéciales croix, présentes et futures, gagnent +1 de rayon.', duree: 'salle',
    appliquer(ctx, options) {
      if (!options.reprise) {
        ctx.grille.cellules.forEach((c, i) => {
          if (!c || c.speciale !== 'croix') return;
          c.rayon = (c.rayon ?? 1) + 1;
          const [x, y] = coord(ctx.grille, i);
          ctx.emettre({ t: 'speciale', x, y, id: c.id, type: 'croix' });
        });
      }
      ctx.bus.on('specialeCreee', (c, e) => {
        if (e.type !== 'croix') return;
        const cellule = c.grille.cellules[e.i];
        if (cellule) cellule.rayon = (cellule.rayon ?? 1) + 1;
      }, src('croix_partagee'));
    } },

  { id: 'pari_jauge', palier: 2, rarete: 'epique', famille: 'rotation', risque: true, nom: 'Va-tout',
    desc: 'Vide toute la jauge de rotation ; chaque point détruit une bille aléatoire de la couleur la plus fréquente.', duree: null,
    appliquer(ctx) {
      const n = ctx.etat.jauge;
      ctx.etat.jauge = 0;
      ctx.emettre({ t: 'coups', coups: ctx.etat.coups, jauge: 0 });
      for (let k = 0; k < n; k++) {
        const d = couleurDominante(ctx);
        const cibles = billes(ctx, (c) => c.couleur === d);
        if (!cibles.length) break;
        ctx.detruire([ctx.rng.choix(cibles)], 'effet');
      }
      ctx.retomber();
    } },

  { id: 'magnetisme_provisoire', palier: 2, rarete: 'commun', famille: 'teinte', nom: 'Attraction',
    desc: '3 tours : à chaque rotation, 3 billes de la couleur la plus rare prennent la couleur dominante de leurs voisines.', duree: 3,
    appliquer(ctx) {
      ctx.bus.on('apresRotation', (c, e) => {
        if (e.auto) return;
        const rare = couleurRare(c);
        if (rare < 0) return;
        const cibles = c.rng.melanger(billes(c, (cel) => cel.couleur === rare)).slice(0, 3);
        for (const i of cibles) {
          const cible = couleurFrequenteVoisins(c, i);
          if (cible >= 0 && cible !== rare) convertir(c, [i], cible);
        }
      }, src('magnetisme_provisoire'));
    } },

  { id: 'sacrifice_coups', palier: 2, rarete: 'rare', famille: 'speciales', risque: true, nom: 'Sacrifice',
    desc: '−3 coups immédiats ; en échange, les spéciales présentes gagnent +1 de rayon et les éléments +1 activation.', duree: null,
    appliquer(ctx) {
      ctx.etat.coups = Math.max(0, ctx.etat.coups - 3);
      ctx.emettre({ t: 'coups', coups: ctx.etat.coups, jauge: ctx.etat.jauge });
      ctx.grille.cellules.forEach((c, i) => {
        if (!c || !c.speciale) return;
        c.rayon = (c.rayon ?? 1) + 1;
        const [x, y] = coord(ctx.grille, i);
        ctx.emettre({ t: 'speciale', x, y, id: c.id, type: c.speciale });
      });
      avancerElements(ctx);
      ctx.retomber();
    } },

  { id: 'big_bang', palier: 2, rarete: 'rare', famille: 'teinte', nom: 'Big Bang',
    desc: 'Toutes les cellules qui tombent changent de place au hasard sur la grille.', duree: null,
    appliquer(ctx) {
      const g = ctx.grille, indices = [];
      for (let i = 0; i < g.cellules.length; i++) { const c = g.cellules[i]; if (c && tombe(c)) indices.push(i); }
      const cellules = indices.map((i) => g.cellules[i]);
      const melanges = ctx.rng.melanger(indices.slice());
      const deplacements = [];
      indices.forEach((i, k) => {
        const j = melanges[k];
        if (i === j) return;
        const [xi, yi] = coord(g, i), [xj, yj] = coord(g, j);
        deplacements.push({ id: cellules[k].id, de: { x: xi, y: yi }, vers: { x: xj, y: yj } });
      });
      indices.forEach((i, k) => { g.cellules[melanges[k]] = cellules[k]; });
      if (deplacements.length) ctx.emettre({ t: 'chute', deplacements });
      ctx.retomber();
    } },

  // ================= Palier 3 (niveaux 7-10) =================
  { id: 'gravite_libre_prolongee', palier: 3, rarete: 'rare', famille: 'rotation', risque: true, nom: 'Apesanteur',
    desc: '5 tours de rotations gratuites ; une fois sur deux, le plateau tourne encore tout seul, dans un sens aléatoire.', duree: 5,
    appliquer(ctx) {
      ctx.bus.on('coutRotation', () => 0, src('gravite_libre_prolongee'));
      ctx.bus.on('apresRotation', (c, e) => {
        if (e.auto || c.memo.graviteLibreRelance) return; // garde-fou : la rotation relancée ne se relance pas elle-même
        if (c.rng.suivant() >= 0.5) return;
        c.memo.graviteLibreRelance = true;
        c.tourner(c.rng.choix([-1, 1, 2]), { gratuit: true });
        c.retomber({ rotation: true });
        c.memo.graviteLibreRelance = false;
        c.emettre({ t: 'message', texte: 'Apesanteur : le plateau tourne encore, seul' });
      }, src('gravite_libre_prolongee'));
    } },

  { id: 'ligne_devient_croix', palier: 3, rarete: 'epique', famille: 'speciales', nom: 'Ascension',
    desc: 'Les lignes, présentes et futures, deviennent des croix pour le reste de la salle.', duree: 'salle',
    appliquer(ctx, options) {
      ctx.bus.on('typeSpeciale', (v) => (v === 'ligne' ? 'croix' : v), src('ligne_devient_croix'));
      if (!options.reprise) {
        ctx.grille.cellules.forEach((c, i) => {
          if (!c || c.speciale !== 'ligne') return;
          c.speciale = 'croix';
          const [x, y] = coord(ctx.grille, i);
          ctx.emettre({ t: 'speciale', x, y, id: c.id, type: 'croix' });
        });
      }
    } },

  { id: 'renfort_final', palier: 3, rarete: 'commun', famille: 'renfort', nom: 'Dernier arrivage',
    desc: 'Fait entrer 8 billes de renfort immédiatement.', duree: null,
    appliquer(ctx) {
      const entrees = renforcer(ctx.grille, ctx.etat.gravite, 8, ctx.rng, () => tirerEntreeLocale(ctx));
      if (!entrees.length) { ctx.emettre({ t: 'message', texte: 'Dernier arrivage : la grille est pleine' }); return; }
      ctx.emettre({ t: 'remplissage', cellules: entrees, renfort: true });
      ctx.bus.emettre('remplissage', ctx, { cellules: entrees, renfort: true });
    } },

  { id: 'mise_en_jeu', palier: 3, rarete: 'epique', famille: 'xp', risque: true, nom: 'Mise en jeu',
    desc: '×2 XP jusqu’à la fin de la salle, mais plus aucun sursis à 0 coup.', duree: 'salle',
    appliquer(ctx) {
      ctx.memo.sansFilet = true; // lu par Sursis (coups_epuises_sursis) ; Coup de trop (compétence) reste hors de portée
      ctx.bus.on('xpGain', (v) => v * 2, src('mise_en_jeu'));
    } },

  { id: 'speciales_synchrones', palier: 3, rarete: 'rare', famille: 'speciales', nom: 'Synchronisation',
    desc: 'À la prochaine rotation, toutes les spéciales présentes explosent.', duree: 'salle',
    appliquer(ctx) {
      ctx.bus.on('apresRotation', (c, e) => {
        if (e.auto) return;
        const indices = [];
        c.grille.cellules.forEach((cel, i) => { if (cel && cel.speciale) indices.push(i); });
        c.retirerEffet('speciales_synchrones');
        if (indices.length) { c.detruire(indices, 'effet'); c.retomber(); }
      }, src('speciales_synchrones'));
    } },

  { id: 'jauge_infinie_3', palier: 3, rarete: 'rare', famille: 'rotation', nom: 'Débridé',
    desc: '3 tours de rotations illimitées et gratuites.', duree: 3,
    synergies: ['vertige'],
    appliquer(ctx) { ctx.bus.on('coutRotation', () => 0, src('jauge_infinie_3')); } },

  { id: 'dette_de_coups', palier: 3, rarete: 'rare', famille: 'coups', risque: true, nom: 'Dette',
    desc: '+5 coups immédiats ; la salle suivante démarre avec 3 coups de moins.', duree: null,
    // duree:null : jamais ajouté à effetsActifs, donc jamais retiré par le changement de salle
    // (moteur/run.js `entrerSalle` ne purge que les hooks des effets actifs) — le réducteur survit
    // jusqu'à la salle suivante, où il consomme la dette posée dans ctx.memo puis se retire lui-même.
    appliquer(ctx) {
      ctx.etat.coups += 5;
      ctx.emettre({ t: 'coups', coups: ctx.etat.coups, jauge: ctx.etat.jauge });
      ctx.memo.dette = (ctx.memo.dette ?? 0) + 3;
      ctx.bus.on('coupsInitiaux', (v, c) => {
        if (!c.memo.dette) return v;
        const d = c.memo.dette; c.memo.dette = 0;
        c.retirerEffet('dette_de_coups');
        return Math.max(1, v - d);
      }, src('dette_de_coups'));
    } },

  { id: 'zone_permanente', palier: 3, rarete: 'commun', famille: 'speciales', nom: 'Foyer',
    desc: 'Chaque tour, la première bille ordinaire qui se pose sur la case centrale devient une bombe.', duree: 'salle',
    appliquer(ctx) {
      ctx.bus.on('apresChute', (c) => {
        if (c.memo.zonePermanenteTour === c.etat.tour) return; // déjà traité pour ce tour
        const g = c.grille, centre = ((g.h / 2) | 0) * g.w + ((g.w / 2) | 0);
        const cellule = g.cellules[centre];
        if (!cellule || cellule.type !== 'bille' || cellule.speciale) return;
        c.memo.zonePermanenteTour = c.etat.tour;
        cellule.speciale = 'bombe'; cellule.rayon = 1;
        const [x, y] = coord(g, centre);
        c.emettre({ t: 'speciale', x, y, id: cellule.id, type: 'bombe' });
        c.bus.emettre('specialeCreee', c, { i: centre, type: 'bombe', taille: 0 });
      }, src('zone_permanente'));
    } },

  { id: 'dernier_mot', palier: 3, rarete: 'rare', famille: 'speciales', nom: 'Dernier mot',
    desc: 'Quand les coups tombent à 0, toutes les spéciales présentes explosent.', duree: 'salle',
    appliquer(ctx) {
      ctx.bus.on('coupsEpuises', (c) => {
        const indices = [];
        c.grille.cellules.forEach((cel, i) => { if (cel && cel.speciale) indices.push(i); });
        if (indices.length) { c.detruire(indices, 'effet'); c.retomber(); }
      }, src('dernier_mot'));
    } },
];

// ================= Évolutions =================
// Recette { de:[idA,idB], vers:idC } : le moteur (progression.js `proposerEffets`) propose l'évolution
// dans le 1er slot dès que les deux ingrédients ont été VUS dans la salle (etat.effetsVus) et exclut par
// ailleurs les effets évolués du tirage normal. Rareté epique, famille héritée de la recette (partagée par
// les deux ingrédients, sauf Raz-de-marée où elle est mixte : voir commentaire).
export const EVOLUTIONS = [
  { de: ['dominante_3', 'teinte_prochaine'], vers: 'deluge' },
  { de: ['coups_2', 'coups_epuises_sursis'], vers: 'second_vent' },
  { de: ['trois_vaut_quatre', 'taille_generosite'], vers: 'petits_geants' },
  { de: ['rayon_plus', 'bombe_apprivoisee'], vers: 'arsenal' },
  { de: ['rotation_gratuite', 'jauge_max'], vers: 'toupie' },
  { de: ['nettoyage_bas', 'demi_tour'], vers: 'raz_de_maree' },
];

EFFETS_NOUVEAUX.push(
  { id: 'deluge', palier: 2, rarete: 'epique', famille: 'teinte', nom: 'Déluge',
    desc: '2 tours : chaque tour, 6 billes prennent la couleur dominante.', duree: 'salle',
    // Durée auto-gérée (compteur en memo) plutôt que numérique : expirerEffets() tourne avant l'émission
    // de finTour (moteur/tour.js `finDeTour`), donc un duree:2 classique perdrait sa toute dernière vague.
    appliquer(ctx) {
      ctx.memo.delugeRestant ??= 2;
      ctx.bus.on('finTour', (c) => {
        if (c.memo.delugeRestant <= 0) return;
        const d = couleurDominante(c);
        convertir(c, c.rng.melanger(billes(c, (cel) => cel.couleur !== d)).slice(0, 6), d);
        c.memo.delugeRestant--;
        if (c.memo.delugeRestant <= 0) c.retirerEffet('deluge');
      }, src('deluge'));
    } },

  { id: 'second_vent', palier: 2, rarete: 'epique', famille: 'coups', nom: 'Second vent',
    desc: '+4 coups et la jauge de rotation se remplit entièrement.', duree: null,
    synergies: ['coup_de_trop'],
    appliquer(ctx) {
      ctx.etat.coups += 4; ctx.etat.jauge = ctx.etat.jaugeMax;
      ctx.emettre({ t: 'coups', coups: ctx.etat.coups, jauge: ctx.etat.jauge });
    } },

  { id: 'petits_geants', palier: 2, rarete: 'epique', famille: 'xp', nom: 'Petits géants',
    desc: 'Les groupes de 2 comptent comme 4 pendant 3 tours.', duree: 3,
    appliquer(ctx) { ctx.bus.on('tailleGroupe', (v) => (v === 2 ? 4 : v), src('petits_geants')); } },

  { id: 'arsenal', palier: 2, rarete: 'epique', famille: 'speciales', nom: 'Arsenal',
    desc: 'Toutes les spéciales, présentes et futures, gagnent +1 de rayon pour le reste de la salle.', duree: 'salle',
    synergies: ['double_amorce'],
    appliquer(ctx, options) {
      if (!options.reprise) {
        ctx.grille.cellules.forEach((c, i) => {
          if (!c || !c.speciale) return;
          c.rayon = (c.rayon ?? 1) + 1;
          const [x, y] = coord(ctx.grille, i);
          ctx.emettre({ t: 'speciale', x, y, id: c.id, type: c.speciale });
        });
      }
      ctx.bus.on('specialeCreee', (c, e) => {
        const cellule = c.grille.cellules[e.i];
        if (cellule) cellule.rayon = (cellule.rayon ?? 1) + 1;
      }, src('arsenal'));
    } },

  { id: 'toupie', palier: 2, rarete: 'epique', famille: 'rotation', nom: 'Toupie',
    desc: 'Les 5 prochaines rotations sont gratuites, pour le reste de la salle.', duree: 'salle',
    synergies: ['vertige'],
    appliquer(ctx) {
      ctx.memo.toupieRestant ??= 5;
      ctx.bus.on('coutRotation', (v, c) => {
        if (c.memo.toupieRestant <= 0) return v;
        c.memo.toupieRestant--;
        if (c.memo.toupieRestant <= 0) c.retirerEffet('toupie');
        return 0;
      }, src('toupie'));
    } },

  // Recette à familles mélangées (nettoyage_bas = coups, demi_tour = rotation) : rangé sous 'rotation'
  // car le 180° est le geste qui déclenche le deuxième nettoyage.
  { id: 'raz_de_maree', palier: 2, rarete: 'epique', famille: 'rotation', nom: 'Raz-de-marée',
    desc: 'Nettoie la ligne du bas, tourne à 180°, puis nettoie encore la nouvelle ligne du bas.', duree: null,
    appliquer(ctx) {
      const bas1 = colonnes(ctx.grille.w, ctx.grille.h, ctx.etat.gravite).map((col) => col[col.length - 1]);
      ctx.detruire(bas1, 'effet'); ctx.retomber();
      ctx.tourner(2, { gratuit: true }); ctx.retomber({ rotation: true });
      const bas2 = colonnes(ctx.grille.w, ctx.grille.h, ctx.etat.gravite).map((col) => col[col.length - 1]);
      ctx.detruire(bas2, 'effet'); ctx.retomber();
    } },
);
