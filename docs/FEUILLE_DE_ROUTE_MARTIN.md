# Feuille de route gameplay de Martin (2026-09-14)

Transcription du classeur `Feuille_de_route_VERTIGE_CandyCrush_DreamBlast.xlsx` remis par Martin. Référence pour l'ordre des chantiers ; l'état d'avancement et les décisions sont dans `ROADMAP.md`.

## Lisez-moi

- **Objectif** : faire évoluer VERTIGE vers une expérience plus immédiatement fun et satisfaisante, inspirée de la philosophie Candy Crush / Dream Blast, sans perdre la mécanique distinctive de rotation de gravité.
- **Ordre recommandé** : 1) Feel → 2) Cascades → 3) Spéciales & combos → 4) Finale de salle → 5) Builds → 6) Niveaux → 7) Carte → 8) Méta.
- **Règle d'or** : ne pas ajouter beaucoup de contenu avant que les 60 secondes de jeu dans une salle soient vraiment satisfaisantes.
- **Fichiers les plus importants** : `src/moteur/tour.js`, `speciales.js`, `run.js` ; `src/rendu/juice.js`, `rendu.js`, `finale.js` ; `src/data/competences.js`, `effets.js`, `effets2.js`, `salles.js` ; `src/ui/hud.js`.
- Le projet est déjà équipé (bus d'événements, aperçu de rotation, pools de particules/juice, spéciales, compétences, effets) : étendre ces fondations plutôt que réécrire le moteur.

## Roadmap

| Étape | Prio | Objectif | Quoi | Dépend de | Critère de réussite |
|---|---|---|---|---|---|
| 0 — Baseline | P0 | Mesurer avant de modifier | Batterie de tests + fiche de métriques : durée d'une salle, taps/rotation, taille moyenne des groupes, chaîne max, taux d'utilisation des spéciales. | — | Comparer objectivement chaque itération. |
| 1 — Feel | P0 | Rendre chaque action satisfaisante | Séquence tap → anticipation → explosion → chute. Micro-pause avant les grosses explosions, squash, onde de choc, particules, feedback score. | Baseline | Un groupe 6+ semble nettement plus puissant qu'un groupe 3. |
| 1 — Feel | P0 | Rotation lisible et spectaculaire | Garder le télégraphe. Animation d'anticipation/impact et feedback clair sur le résultat de la rotation. | Feel | Le joueur comprend pourquoi une rotation était bonne et a envie de la tenter. |
| 2 — Cascades | P0 | Une vraie chaîne de destruction | Profondeur de cascade persistante dans un même tour : explosion → chute → nouveau groupe → nouvelle explosion. Chaîne x2/x3/x4 dans les événements et les stats. | Feel | Une cascade de 4 étapes produit un feedback continu et met à jour la chaîne max. |
| 2 — Cascades | P0 | Combo / Frénésie | Jauge Frénésie alimentée par taille de groupe, profondeur de cascade, rotation productive, combo de spéciales. À 100 % : court mode VERTIGE. | Cascades | La jauge monte de façon compréhensible puis déclenche un payoff clair sans casser le rythme. |
| 3 — Spéciales | P0 | Des spéciales-événements | Apparition, armement, explosion des bombes/lignes/croix/couleur/fusées ; langage visuel commun ; effets plus forts selon le rayon. | Feel | Le joueur reconnaît une spéciale immédiatement et attend son activation. |
| 3 — Spéciales | P0 | Combos de spéciales | Recettes : bombe+bombe, bombe+ligne, ligne+ligne, couleur+bombe, couleur+ligne, couleur+couleur, chacune avec un payoff unique. | Spéciales | Chaque combo crée une réaction plus forte qu'une utilisation séparée. |
| 4 — Fin de salle | P0 | Fin façon Sugar Crush | À l'objectif atteint, ne pas couper : convertir coups / rotations / spéciales restants en destructions et score. | Cascades + Spéciales | La fin de niveau devient un moment de récompense. |
| 5 — Builds | P1 | Familles de builds lisibles | Familles : Bombes, Rotation, Couleur, Spéciales, Combo, Gravité. Afficher les synergies quand deux effets se renforcent. | Spéciales + Frénésie | Le joueur décrit son build en une phrase. |
| 5 — Builds | P1 | Synergies de cartes | Messages/animations quand une carte complète une synergie ; pas de synergie cachée dans les descriptions. | Familles | Après un choix, le joueur comprend ce que son build gagne. |
| 6 — Niveaux | P1 | Objectifs variés | Score, couleur, obstacles, création de spéciales, chaîne x5, rotations productives, coups restants. Chaque salle pousse une décision différente. | Fin de salle | Deux salles consécutives ne se jouent pas pareil. |
| 6 — Niveaux | P1 | Règles de salle | Salles à règle forte : rotation auto, gravité particulière, obstacles, renforts… | Objectifs variés | Identité mécanique identifiable en 5 secondes. |
| 7 — Progression | P1 | Carte du monde et étoiles | Après stabilisation du micro-jeu : niveaux normaux/difficiles/élites/bonus, score 1-3 étoiles, carte de progression. | Niveaux | Le joueur veut lancer le niveau suivant et améliorer ses étoiles. |
| 8 — Méta | P2 | Une raison de recommencer | Défis quotidiens, statistiques, cosmétiques, déblocages légers. Pas de boutique ni de monnaie premium au début. | Carte + builds | Une nouvelle run a une promesse claire. |

## Backlog détaillé

| ID | Prio | Tâche | Fichiers | Complexité | Valeur fun | Notes |
|---|---|---|---|---|---|---|
| F01 | P0 | Combo de cascade x2/x3/x4 | tour.js, speciales.js, run.js, juice.js | M | Très haute | Profondeur de cascade explicite, `stats.chaineMax`. |
| F02 | P0 | Jauge Frénésie | run.js, tour.js, hud.js, main.css | M | Très haute | État 0..100, gain/perte, événement `frenesieMax`. |
| F03 | P0 | Mode VERTIGE temporaire | run.js, tour.js, rendu.js, juice.js | M | Très haute | Bonus court : XP/effets/feedback ; ne pas changer trop de règles à la fois. |
| F04 | P0 | Combo bombe+bombe | speciales.js, speciales-fx.js, juice.js | M | Très haute | Une recette dédiée avant un moteur de recettes. |
| F05 | P0 | Combo bombe+ligne / ligne+ligne | speciales.js, speciales-fx.js | M | Très haute | Centraliser les combinaisons. |
| F06 | P0 | Combo couleur+spéciale | speciales.js, data/effets*.js | L | Très haute | Borner les conversions (boucles infinies). |
| F07 | P0 | Finale Sugar Crush | tour.js, finale.js, main.js | M | Très haute | Seulement après victoire ; consommer virtuellement les ressources restantes. |
| F08 | P0 | Feedback taille de groupe | juice.js, particules.js, rendu.js | S | Haute | 3/5/8/10+ : amplitudes visuelles distinctes. |
| F09 | P0 | Feedback rotation productive | tour.js, juice.js, rendu.js | S | Haute | « + rotation », « bon angle », résultat du télégraphe. |
| F10 | P1 | Familles de builds | effets.js, effets2.js, cartes.js, main.css | M | Haute | Icône/famille, compter les synergies. |
| F11 | P1 | Messages de synergie | cartes.js, progression.js, juice.js | M | Haute | Seulement quand une synergie nouvelle s'active. |
| F12 | P1 | Objectifs variés | salles.js, tour.js, progression.js | M | Très haute | Réutiliser les événements existants. |
| F13 | P1 | Salles à règle forte | salles.js, tour.js | M | Haute | Une seule règle nouvelle par salle au début. |
| F14 | P1 | Étoiles de niveau | run.js, ui.js, finale.js | M | Haute | Score/objectif/coups restants ; 3 critères max. |
| F15 | P1 | Carte du monde | ui nouveau, salles.js, main.js | L | Moyenne | Après validation du micro-jeu. |
| F16 | P2 | Défis quotidiens | module méta | M | Moyenne | Après stabilité des niveaux. |
| F17 | P2 | Cosmétiques / déblocages | profil, module | M | Moyenne | Pas de boutique au début. |

## Principes de design

| Principe | Décision pour VERTIGE |
|---|---|
| USP | La rotation de gravité reste le cœur différenciant. Ne pas la noyer sous les mécaniques. |
| Récompense | Une action intelligente produit un feedback visuel, sonore et numérique disproportionné. |
| Cascade | Une explosion doit pouvoir créer la situation de la suivante. |
| Spéciales | Désirables, lisibles, surtout combinables. |
| Progression | Chaque salle apprend ou exploite une idée ; pas de niveaux qui ne changent que les chiffres. |
| Build | Peu d'effets, mais des synergies fortes et visibles. |
| Fin de niveau | La victoire déclenche un payoff spectaculaire au lieu de couper l'action. |
| Méta | Construire après le plaisir minute par minute, pas avant. |
| Anti-clone | S'inspirer de la satisfaction de Candy Crush / Dream Blast, garder gravité + rotation + identité spatiale. |
| Performance | Étendre les pools existants et le bus d'événements ; pas d'allocation par frame. |

## Métriques à suivre

| Métrique | Pourquoi | Cible / tendance | Où |
|---|---|---|---|
| Durée moyenne d'une salle | Rythme | Stable après ajout de juice | stats / télémétrie locale ; sim : tours par salle |
| Chaîne max | Profondeur | Doit augmenter après les cascades | `run.etat.stats.chaineMax` |
| Taille moyenne du groupe | Qualité des coups | Pas de baisse forte | sim : groupe tapé moyen |
| Rotations par salle | USP | Utile, pas décorative | `run.etat.stats.rotations` ; sim : rotations utiles |
| Spéciales créées | Pouvoir | Monte avec les gros groupes | `run.etat.stats.speciales` |
| Taux d'utilisation des spéciales | Satisfaction | Aucune spéciale stockée sans intérêt | sim : explosées / créées |
| Victoires / échecs | Difficulté | Progression sans mur brutal | profil ; sim par salle |
| Rejouabilité | Macro-jeu | Envie de refaire une run | runs / salle / build |
| Temps jusqu'au premier gros moment | Onboarding | Le premier « gros boom » arrive tôt | sim : premier gros moment ; test manuel |
