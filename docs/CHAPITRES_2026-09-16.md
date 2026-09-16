# Chapitres et planètes réalistes — VERTIGE 0.4

Martin a précisé qu’une planète devait contenir plusieurs niveaux, puis demandé des planètes aussi réalistes que possible sur l’accueil et pendant le jeu.

## Parcours et cartes

La nouvelle expédition compte **24 niveaux : trois par planète**, de Mercure à Neptune. Chaque chapitre propose une découverte par collecte de gemmes, un défi à score, puis un sauvetage de deux noyaux par une sortie liée au plateau. Les contraintes planétaires restent actives : rochers, nombre de couleurs, rotations forcées ou réserve d’énergie.

Les choix de cartes arrivent uniquement entre les niveaux. Le build est conservé pendant toute l’expédition. L’XP des actions, mesurée avant la finale automatique, détermine la puissance proposée, avec un plafond qui étale la progression :

| Planètes | Rang maximal |
|---|---|
| Mercure, Vénus | I |
| Terre, Mars, Jupiter | II |
| Saturne, Uranus, Neptune | III |

Le plafond s’applique au rang total de chaque carte, y compris après plusieurs améliorations. Lorsqu’aucune amélioration sûre n’est disponible, Réserve solaire offre trois coups pour le niveau suivant. Les cartes à contrepartie restent facultatives.

Une planète n’est comptée comme sauvée qu’après son troisième niveau. La sauvegarde conserve le niveau, le plateau, le build, la résonance et le hasard. Les expéditions déjà commencées à huit salles gardent leurs identifiants et leurs règles ; démarrer un nouveau run donne accès aux 24 niveaux.

## Planètes et ressources

L’accueil et le fond du plateau utilisent les cartographies locales de Solar System Scope / INOVE, sous licence CC BY 4.0. Les textures 2K sont projetées sur des sphères éclairées : cratères, continents, bandes nuageuses, atmosphères, nuages terrestres et anneaux de Saturne. Le décor reste solidaire de la rotation du plateau. Les différentes étapes d’une planète font varier l’angle visible.

Ce sont des cartographies composites, avec certaines régions reconstituées ou couleurs accentuées, et non des photographies individuelles de chaque scène. Les distances et tailles du menu sont composées pour la lisibilité. Aucun service d’image distant n’est appelé pendant le jeu.

- [Crédits, licence et adaptations](../public/CREDITS_PLANETES.md).
- [Sources, miroir de téléchargement et empreintes SHA-256](SOURCES_PLANETES.json).

Le rendu reste en Canvas 2D. Les sprites sphériques sont construits puis mis en cache, avec une limite pour les grands sprites pendant l’expédition. Aucune nouvelle dépendance d’exécution.

## Validation et équilibrage

- **59 tests Node réussis**, dont transitions des 24 niveaux, reprise pendant le choix de carte, plafonds de rang, compteur de planètes sauvées, compatibilité historique et nombre de noyaux aux difficultés testées.
- **20 expéditions simulées, seeds 1 à 20 : 10 victoires complètes**, 0 erreur, 0 interruption de choix pendant les niveaux. 9 081 étapes au total, 366 choix de cartes, 144 événements de combo.
- Le planificateur recharge une sauvegarde après chaque étape. La seed 3 termine l’expédition en 544 étapes, écrans de transition compris.
- Premier chapitre joué par vrais clics dans Chromium : 39 taps, 4 rotations, 6 choix, aucune erreur. Arrivée sur Vénus niveau 1/3, trois cartes conservées, une seule planète sauvée. L’horloge de test accélère les animations sans changer les règles. Reproduire avec `npm run smoke -- --chapitre`.
- Vérifications navigateur réussies sur quatre résolutions : 320 × 568, 390 × 844, 768 × 1024, 1440 × 900 ; sauvegarde, reprise et fonctionnement hors ligne.

Les simulations ont permis de réduire les objectifs de score tardifs qui bloquaient toutes les premières expéditions. La plupart des niveaux demandent environ 15 à 29 actions au planificateur ; les sauvetages peuvent être plus courts. Le défi d’Uranus reste plus exigeant, autour de 40 actions dans cet échantillon. Ces résultats décrivent une politique automatique et ne prédisent pas le taux de victoire humain.

## Publication et limites

La publication existante compile et teste le projet, puis publie `dist/` sur GitHub Pages après modification de `main`. Une branche non fusionnée ne remplace pas la version publique. Après publication, fermer tous les anciens onglets et l’application installée pour laisser le nouveau cache s’activer ; conserver les données du site pour préserver les sauvegardes.

À vérifier avec Martin : longueur totale de l’expédition, rythme des cartes entre niveaux, lisibilité des planètes sur téléphone physique et difficulté d’Uranus. La reprise restaure une partie interrompue ; elle ne transforme pas une défaite en point de contrôle gratuit.
