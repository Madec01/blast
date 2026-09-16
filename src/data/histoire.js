// Transmissions courtes, déverrouillées par le parcours : aucun arrêt narratif en jeu.
export const INTRO_HELIOS = 'Une rupture du réseau Hélios propage une onde gravitationnelle à travers le système solaire. Aux commandes de la sonde VERTIGE, rétablissez les huit relais avant que leurs mondes ne basculent.';
export const ORIGINE_HELIOS = 'L’humanité a construit Hélios pour distribuer l’énergie du Soleil entre les planètes. Une expérience de transfert a rompu la synchronisation du réseau. Les relais amplifient désormais les perturbations : stations disloquées, orbites fragilisées, tempêtes déchaînées.';
export const PHASES_MISSION = ['Sécuriser l’approche', 'Rétablir l’alimentation', 'Récupérer le stabilisateur'];
export const TRANSMISSIONS = [
  { planete:'Mercure', entree:'Le premier relais sature. Dissipez les charges, puis récupérez son stabilisateur pour arrêter la propagation locale.', fin:'Mercure est stable. Dans les débris du relais, une commande persiste : « Correction automatique en cours. » Qui continue de la transmettre ?' },
  { planete:'Vénus', entree:'Les nuages masquent le relais de Vénus. Sa pression énergétique augmente à chaque tentative de rétablissement.', fin:'Vénus répond de nouveau. Les archives confirment que l’onde a commencé pendant une expérience de transfert solaire.' },
  { planete:'Terre', entree:'Le réseau orbital terrestre perd sa cohésion. Récupérez les stabilisateurs avant que les stations ne dérivent.', fin:'La Terre est hors de danger immédiat. Les dernières commandes viennent d’Hélios lui-même : personne ne pilote ces corrections.' },
  { planete:'Mars', entree:'Des fragments du relais martien encombrent l’approche. Ouvrez un passage jusqu’à son cœur énergétique.', fin:'Mars est stabilisée. Chaque correction d’Hélios déclenche une nouvelle onde. Le réseau tente de se réparer, mais amplifie la rupture.' },
  { planete:'Jupiter', entree:'Le relais de Jupiter absorbe une énergie immense. Les corrections automatiques y déforment la gravité : anticipez chaque rotation.', fin:'Jupiter est apaisée. Les relais réparés par VERTIGE restent stables lorsqu’ils sont isolés des corrections centrales. Nous tenons une solution.' },
  { planete:'Saturne', entree:'Les anneaux conduisent les surcharges entre les débris. Canalisez leur énergie pour extraire les stabilisateurs captifs.', fin:'Saturne est sécurisée. Six relais peuvent désormais fonctionner seuls. Il faut encore protéger Uranus et Neptune avant de resynchroniser le réseau.' },
  { planete:'Uranus', entree:'L’axe du relais a basculé. Recomposez sa matrice de fréquences et retrouvez un flux stable sous la glace.', fin:'Uranus est stabilisée. Le dernier relais porte encore la boucle de correction. Neptune sera notre point de coupure.' },
  { planete:'Neptune', entree:'Aux confins du réseau, la dernière boucle amplifie toutes les autres. Récupérez ses stabilisateurs pour permettre la coupure.', fin:'Dernier relais isolé. La boucle s’arrête. Hélios se resynchronise avec les huit mondes : l’énergie circule de nouveau, sans l’onde. Mission VERTIGE accomplie.' },
];
export function missionHelios(planeteIndex, niveauPlanete = 1) {
  const transmission = TRANSMISSIONS[planeteIndex];
  if (!transmission) return null;
  return { ...transmission, phase: PHASES_MISSION[Math.max(0, Math.min(2, niveauPlanete - 1))] };
}
export function transmissionFin(enAttente) {
  if (!enAttente?.victoire) return null;
  const index = enAttente.planeteIndex ?? ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'].indexOf(enAttente.planete);
  const mission = missionHelios(index, enAttente.niveauPlanete);
  if (!mission) return null;
  const derniere = enAttente.planeteSauvee ?? !enAttente.totalNiveauxPlanete;
  if (derniere) return mission.fin;
  return enAttente.niveauPlanete === 1
    ? 'Approche sécurisée. Le relais est accessible ; rétablissez maintenant son alimentation.'
    : 'Alimentation rétablie. Il reste à récupérer les stabilisateurs pour isoler ce relais de l’onde.';
}
