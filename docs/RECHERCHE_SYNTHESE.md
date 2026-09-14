# Synthèse des recherches du 2026-09-14 — rendre VERTIGE satisfaisant

Quatre dossiers d'agents (Sonnet), lus et confrontés : `RECHERCHE_VFX.md`, `RECHERCHE_BOUCLE.md`, `RECHERCHE_NIVEAUX.md`, `RECHERCHE_CONTEXTE.md`.
Ce document est la position de l'orchestrateur : ce que je retiens, ce que je conteste, le plan proposé, les décisions à prendre.

## 1. Résumé

- Le micro-loop (tap → feedback) est la seule échelle déjà travaillée ; il manque l'**anticipation** avant l'impact, l'**impact** lui-même (flash, halo), et la **résolution** (poussière, traînées). Les spéciales n'ont aucune activation visuelle distincte. Il n'y a pas de séquence de fin de salle. Tout ça se fait en Canvas 2D avec quelques sprites CC0 de Kenney ; PixiJS n'est pas justifié.
- Le macro-loop (fin de run, quasi-victoire, défi quotidien, déblocages) **n'existe pas** : c'est là que se joue « on y revient ».
- Le système de niveaux est un calcul, pas un dilemme : 13 effets tous positifs, sans rareté, 3 « picks à vide », niveau plafonné à 7. Proposition : 3 cartes (2 sûres + 1 à risque), raretés par palier, reroll payé en jauge, évolutions, 36 effets nouveaux.
- Le contexte : cinq univers proposés, recommandation « buanderie » (tambour de machine à laver). J'y mets une réserve, voir §5.

## 2. VFX et juice — ce que je retiens

**D'accord** avec le plan en 12 items et son ordre. Trois familles d'effets manquent, dans l'ordre d'importance :
1. **Anticipation → impact → résolution** sur le tap (items 1-3) : pré-squash 80 ms, flash radial + halo sprite 150 ms, poussière d'atterrissage et overshoot. Petit effort, gain immédiat sur l'action la plus fréquente du jeu.
2. **Activation des spéciales** (item 4) : bombe = flash + onde + fumée ; ligne = traînée qui balaie la rangée en 180 ms ; bombe de couleur = rayons + billes aspirées en cascade. Aujourd'hui une spéciale « pulse » et disparaît : c'est le plus gros manque.
3. **Fin de salle façon Sugar Crush** (item 7) : les billes restantes explosent une à une, le score grimpe. C'est le moment que Candy Crush a inventé pour « faire durer le plaisir ».
Puis : halo pulsé sur les spéciales au repos (10), traînée sur les textes (9), ralenti + zoom sur les chaînes (5), vent et rebond de rotation (6), combo de spéciales (11), passe son (12).

**Assets** : oui aux sprites PNG du Kenney Particle Pack (CC0) pour halo, fumée, traînée — 15 à 20 fichiers, ~150 Ko, embarqués dans `src/assets/`. Un halo doux est impossible au trait sans `filter` par frame. Les confettis et éclats nets restent codés (cohérents avec le contour encre).

**Désaccord** : pas de GSAP. Il est bien gratuit depuis avril 2025, mais il n'apporterait que des courbes d'easing que `juice.js` a déjà ; 22 à 50 Ko pour ça ne vaut pas la dépendance. Si un jour il faut des séquences complexes, anime.js v4 (17 Ko, MIT) suffira.

**Verdict technique** : rester en Canvas 2D. Migrer vers PixiJS coûterait 1 500 à 2 000 lignes pour un bloom additif qu'on n'utilisera pas sur fond ciel clair.

## 3. Boucle de satisfaction — ce que je retiens

**D'accord** sur le diagnostic : micro solide, macro absent. Les cinq items qui changent le plus pour le moins cher :
1. **Écran de fin de run** : durée, salles franchies, XP, monnaie méta gagnée, plus grosse chaîne, spéciales créées, escalier de l'XP salle par salle, et un **titre de build** généré (« Artificier à bombes »). Moyen.
2. **Quasi-victoire montrée** à l'échec : grille figée, « à 3 billes de l'objectif », sans rien vendre derrière. Petit — et le moteur a déjà `progres / cible`.
3. **Échec nommé** : le moteur a déjà les raisons (`coups`, `bloque`, `vide`, `rotations`) ; l'UI doit les dire en français et en une image. Petit.
4. **Défi quotidien à seed fixe** avec historique local 7 jours. Moyen, zéro serveur.
5. **Déblocages méta ordonnés** : d'abord la variété (pool complet, 3e carte), ensuite la puissance (paliers 8-10). Petit-moyen, phase 2.
Puis : moment « je casse le jeu » mis en scène (ralenti, « RÉACTION EN CHAÎNE »), streak avec jour de grâce, carte de nœuds (phase 2), personnages (phase 3).

**Durées cibles** validées : 45-90 s par salle normale, 12-18 min par run de 3 actes. Une salle fait aujourd'hui ~25 taps : dans la cible.

**À proscrire**, et je le graverai dans CLAUDE.md : vies qui expirent, timers payants, quasi-victoire comme hameçon d'achat, streak qui punit, notifications culpabilisantes.

## 4. Système de niveaux — ce que je retiens

**D'accord** sur le diagnostic (« un calcul, pas un dilemme ») et sur le système :
- **3 cartes** : 2 sûres + 1 à risque (liseré distinct, toujours dans le 3e slot). *Mentor* devient « une 4e carte sûre ».
- **Raretés par palier** : 70/25/5 → 50/35/15 → 25/40/35, avec pitié à la Slay the Spire.
- **Reroll payé en jauge de rotation** : une vraie tension entre tourner et retirer. Excellente idée, à garder.
- **Évolutions** (2 effets d'une famille pris → la 3e proposition devient l'effet évolué) et **bandeau de synergie** avec les compétences possédées.
- **Niveau 10 débloqué** (`NIVEAU_MAX` 7 → 10) ; l'ultime de personnage attendra la phase 3 — d'ici là, le niveau 10 propose une épique garantie.

**Réserves** sur le catalogue de 36 : 6 effets visent des éléments qui n'existent pas encore (lanterne, glaçon, ruche) → phase 2 ; 4 demandent une interface de ciblage « au choix » (Cloison, Colonne verrouillée, Table rase) → plus tard ; *Fuite en avant* et *Marée noire* touchent au renfort, la règle la plus récente : à équilibrer au simulateur avant d'entrer. Reste **une première fournée de 16 effets** codables tout de suite sans nouvelle interface : Jauge gonflée, Renfort doré, Rotation marquée, Économe, Amorce longue, Spirale, Prévision, Sursis, Débutant chanceux, Bombe instable, Réaction, Renfort ciblé, Partage, Va-tout, Attraction, Sacrifice, plus au palier 3 : Apesanteur, Ascension, Dernier arrivage, Mise en jeu, Synchronisation, Débridé, Dette, Foyer, Dernier mot.

**Présentation** : la barre de niveau qui pulse à 80 %, les cartes qui glissent avec un son par rareté, la carte choisie qui s'envole vers le plateau et déclenche son effet visiblement, les pilules d'effets actifs qui clignotent au dernier tour. C'est le même chantier que le juice : à faire ensemble.

## 5. Contexte — ce que je retiens, et ma réserve

Le dossier propose cinq univers et recommande **VERTIGE, la buanderie** : un bouton tombe dans le tambour d'une machine à laver, Bullotte (bulle de savon) plonge, Glouglou (gremlin du siphon) avale tout. Points forts réels : le tambour justifie la rotation sans métaphore, c'est drôle, c'est le moins cher à produire, et le titre prend enfin un sens.

**Ma réserve** : deux choses que le dossier note lui-même sans les peser assez.
1. **L'extensibilité** (3/5) : trois actes dans une machine à laver, c'est court ; « le panier, le tambour, l'étendoir » tient, un acte 4 ou des événements saisonniers non. Dream Blast tient depuis des années parce que ses mondes de rêve permettent n'importe quoi.
2. **Le décor existant** : on vient de construire un ciel bleu à nuages. L'intérieur d'un tambour est sombre et métallique ; seul l'acte 3 (l'étendoir) retrouve le ciel. Le style Cartoon pop survivrait, pas le décor.

Le candidat **Horloger** (33/40) est le plus extensible et le plus « merveilleux », mais froid et sans ciel. Le **Nid** (34/40) colle au décor et au style, mais copie Dream Blast (oiseaux, œufs, prédateur) — exactement ce que Martin ne veut pas.

**Ma proposition** : garder la buanderie **si** on assume que le décor change par acte (tambour = champ indigo actuel, qui se trouve être exactement l'intérieur d'un tambour ; le ciel actuel devient l'acte 3), et **traiter l'extensibilité par les programmes de lavage** (laine, couleurs, délicat, essorage 1 400 tours…) plutôt que par les lieux : chaque « programme » est un acte à règles différentes, ce qui colle à un roguelite. Sinon, l'Horloger. Décision de Martin (D14).

Dans tous les cas, ce qui compte et coûte peu : une **mascotte à 5 poses** au bord du plateau qui réagit aux combos et aux échecs, un **compteur visuel de « choses sauvées »** à la place d'un texte, des **noms de salles** réécrits, et des mots de combo dans la voix de la mascotte. Les cinématiques, jamais.

## 6. Plan proposé — « Phase 1.5 : satisfaction » (avant la carte de nœuds)

| Lot | Contenu | Effort | Agents |
|---|---|---|---|
| A. Juice du tap | VFX items 1, 2, 3, 9, 10 + sprites Kenney vendorés + passe son (12) | Moyen (une session) | 1 rendu + 1 audio |
| B. Spéciales et fin de salle | VFX items 4, 5, 7, 11 (activations différenciées, ralenti de chaîne, Sugar Crush, combo) | Gros (une à deux sessions) | 1 rendu |
| C. Fermer la boucle | Écran de fin de run avec titre de build, quasi-victoire, échec nommé, défi quotidien local, streak avec grâce | Moyen | 1 UI + moteur (orchestrateur) |
| D. Niveaux | 3 cartes dont 1 à risque, raretés + pitié, reroll en jauge, `NIVEAU_MAX` 10, 16 + 9 effets, bandeau de synergie, présentation | Gros | 1 données (Sonnet) + moteur (orchestrateur) + 1 UI |
| E. Contexte | Mascotte 5 poses (dessin CC0 ou procédural), compteur de sauvetage, renommage des salles, mots de combo, 3 écrans d'ouverture | Moyen | 1 idées/textes + 1 rendu |

Ordre recommandé : **A → C → D → B → E**. A parce que c'est l'action la plus fréquente ; C parce que c'est le trou le plus net et le moins cher ; D parce que c'est de la donnée et du moteur, testable au simulateur ; B parce que c'est le plus gros chantier visuel ; E une fois D14 tranchée. Chaque lot se termine par capture d'écran, fumée verte, et commit jouable.

## 7. Décisions demandées

| # | Question | Ma recommandation |
|---|---|---|
| D14 | Contexte : Buanderie (avec décor par acte et actes = programmes), Horloger, ou autre chose ? | Buanderie, à condition d'accepter le décor par acte. |
| D15 | Niveaux : 3 cartes dont 1 à risque, reroll payé en jauge, niveau 10 débloqué ? | Oui aux trois. |
| D16 | Assets : embarquer ~150 Ko de sprites Kenney (CC0) ; aucune bibliothèque d'animation ? | Oui / oui. |
| D17 | Boucle : défi quotidien à seed fixe avec historique local, streak avec jour de grâce, jamais de vies ni de timers ? | Oui, et l'écrire dans CLAUDE.md comme règle. |
| D18 | Ordre des lots A → C → D → B → E ? | Oui. |
