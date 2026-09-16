# VERTIGE — feuille de route

Tableau de bord du projet. Tenu à jour en direct. Voir `CLAUDE.md` pour le cadrage.

---

## À faire maintenant — 2026-09-16

- [x] Refonte visuelle mobile, silhouettes distinctes, HUD/menu/cartes et réglages séparés.
- [x] Cascades de rotation sur nouveaux groupes 6+, secours plateau, sauvegardes validées.
- [x] PWA hors ligne, tests Node et vérifications navigateur multi-résolutions.
- [ ] Playtester sur iPhone et Android physiques ; mesurer cadence et durée des longues chaînes.
- [ ] Concevoir les recettes de combos dédiées puis enrichir la progression.
- [ ] Préparer les exigences natives/légales/commerciales avant soumission store.

Bilan détaillé et limites : `docs/REFONTE_2026-09-16.md`. La demande du 16 septembre autorise cette
refonte autonome ; les décisions historiques ci-dessous sont conservées comme historique.

## Historique des priorités — 2026-09-14


**Feuille web des décisions (2026-09-14, reprise)** : https://claude.ai/code/artifact/146f2bd7-bb12-4ca5-8acf-66a884747deb — document `retours/partie2`, 30 points (feel livré à juger, D24 cascades, D25 frénésie, D26 les 6 recettes de combos, titre / salles / Krator / format du sprite Cosmo, D21-D23, D27 carte, audio, D7). Lire avec `read_db` avant de coder. L'ancienne feuille (https://claude.ai/code/artifact/0aae216f-64a0-44c3-949d-482473879eb2, `retours/phase15`) reste consultable mais n'est plus alimentée.

**Feuille de route de Martin (2026-09-14, classeur → `docs/FEUILLE_DE_ROUTE_MARTIN.md`)** : ordre Feel → Cascades → Spéciales & combos → Finale → Builds → Niveaux → Carte → Méta. Règle d'or : pas de contenu tant que les 60 secondes en salle ne sont pas satisfaisantes. Elle remplace l'ordre précédent (lot E, D21-D23 passent après).

0. **Baseline — fait** : `docs/METRIQUES.md` (sim avisée/gourmande : tours par salle, taps/rotation, groupe moyen, spéciales explosées/créées, chaîne max, premier gros moment), 17 tests, fumée.
1. **Feel (F08, F09, micro-pause) — livré, à valider par Martin en jouant** : paliers 3/5/8/10+ dans une seule table (`src/data/paliers.js` : anticipation, confettis, flash, onde dès 5, secousse, squash du plateau dès 8, taille du +XP, son plus grave dès 8), hitstop 60 ms dès 8 / 90 ms dès 10 (un par coup), « Bon angle ! » / « ALIGNEMENT ! » (8+) avec le groupe qui pulse après une rotation productive (`rotationResultat`, `stats.rotationsProductives` en fin de run). Sim identique à la baseline. **Naissance des spéciales** (étape 3, langage visuel) livrée le soir : le groupe converge vers la case de naissance, flash + onde + éclat, la spéciale sort en grand. Questions à Martin sur la **feuille web** (`retours/partie2`) : un 6 paraît-il nettement plus fort qu'un 3 ? le hitstop gêne-t-il le rythme ? le mot après rotation est-il lisible ? les 60 premières secondes sont-elles satisfaisantes ?
2. **Cascades (F01-F03) — à trancher, D24-D25, chiffres prêts** : prototype D24 mesuré (`docs/METRIQUES.md`, 5 variantes) et jouable dans le **mode Test** (champ « Cascades »). Recommandation confirmée par la sim : **sur rotation seulement, seuil 5** (+5 points de runs complets, chaînes 3,4 → 4,0, Pendule 53 → 63 %) ; seuil 4 ou « après chaque chute » vident la grille. Prix : les taps de 5-7 du joueur passent de 3,1 à 1,5 par salle (la cascade les prend), Tempête −5 points. Si oui : F09 à évaluer avant les vagues, Avalanche (épique) devient redondante, mot « CASCADE ×n » et anticipation à ajouter au rendu. Frénésie D25 : chiffres proposés dans le tableau ci-dessous.
3. **Spéciales & combos (F04-F06)** — langage visuel : naissance faite (2026-09-14 soir), armement = halo pulsé (a4) et activations (lot B) déjà là. **Recettes à valider, D26** (une par point sur la feuille web) : bombe+bombe = bombe rayon 2 ; ligne+ligne = croix ; bombe+ligne = 3 lignes ; couleur+bombe = toutes les billes de la couleur deviennent des bombes ; couleur+ligne = elles deviennent des lignes ; couleur+couleur = tout le plateau. En règle de base (aujourd'hui seule *Double amorce*, compétence).
4. **Finale (F07) — livrée, à valider par Martin en jouant** (`src/moteur/finale.js`) : à la victoire, les spéciales restantes explosent, chaque coup restant fait sauter une bille au hasard (+25 XP en plus de la bille), chaque point de jauge tourne le plateau et fait tout retomber, puis la supernova. Consommation virtuelle (le HUD et l'écran de fin gardent les coups), rng à part (la salle suivante ne change pas), « FINALE ! » à l'écran, bilan sur l'écran de victoire. ≈ un quart de l'XP d'un run (sim), 5-7 s à l'écran avec la supernova : deux réglages à juger en jouant (`XP_FINALE_COUP`, cadence 70 ms) — **item f07 de la feuille web réécrit** (« livrée · à juger en jouant », question plaisir / attente, D28).
5. Puis Builds (F10-F11 : familles déjà dans les données, à afficher), Niveaux (F12-F13), Carte (F14-F15, **D27** : carte du monde à étoiles façon Candy Crush ou carte de run façon Slay the Spire ?), Méta (F16-F17).

Toujours en attente (vérifié le 2026-09-14 nuit puis à la reprise suivante : `retours/partie2` n'existe pas encore, seul `retours/phase15` du matin ; D24-D26 et les réglages de la finale ne sont pas codés tant qu'il manque) : retour de Martin après sa partie — **tout est sur la feuille web** (https://claude.ai/code/artifact/0aae216f-64a0-44c3-949d-482473879eb2, document `retours/partie2`, 29 points : feel livré, D24-D27, D21-D23, titre / noms de salles / Krator / format du sprite Cosmo). Lire avec `read_db` avant de coder. Audit gameplay 3 (`docs/AUDIT_GAMEPLAY_3.md`) reste en fond.

Fait le 2026-09-14 (reprise, en attendant Martin) : **mots d'une même salve** — les +XP d'une même salve s'additionnent en un seul texte (« +10 » sous « +100 » → « +110 »), un mot de combo qui en recouvre un autre passe dessous (« BOOM ! » sous « Étincelle ! », le plus petit bouge, au-dessus près du bas du canvas), et les textes ne sortent plus du canvas verticalement. `src/rendu/juice.js` seul, aucune règle changée. 27 tests (5 nouveaux, `tests/juice.test.js`), fumée verte (76 taps, 8 rotations, 30 choix, 0 erreur), sonde `tools/_sonde_mots.mjs` vérifiée à l'œil.

Fait le 2026-09-14 (nuit) : **F07 finale de salle** (étape 4 de la feuille, livrée avant la réponse de Martin car indépendante de D24-D26 ; D24-D26 non codées, conformément à la consigne). 22 tests, fumée verte (69 taps, 12 rotations, 28 choix, 0 erreur), sim identique à la baseline hors XP, sonde visuelle `tools/_sonde_finale.mjs` vérifiée à l'œil.

Fait le 2026-09-14 (soir, suite) : **naissance des spéciales** (étape 3, langage visuel), fumée corrigée (mesure des taps ratés sur `stats.taps` : un 7+ avec Avidité rendait le coup), feuille web v2 pour le retour de partie. 20 tests, fumée verte (74 taps, 14 rotations, 37 choix, 0 erreur).

Fait le 2026-09-14 (soir) : **étape 1 Feel** (F08 paliers 3/5/8/10+, hitstop, F09 rotation productive), 19 tests, fumée verte, sim identique à la baseline + métrique « rotations productives » 87 % (avisée) / 5 % (gourmande).

Fait le 2026-09-14 (après-midi) : **D19** (relance gratuite une fois par salle), **D20** (Débridé, Synchronisation, Apesanteur majeurs ; durée en coups), **5 épiques de palier 3** (Dernière danse, Danse des couleurs, Absorption, Jackpot, Avalanche), audit gameplay 3, HUD masqué sous la fin de run, 3 mineurs de l'audit code 2. 17 tests, fumée verte, sim avisée 38 % (39 % avant).

Fait le 2026-09-14 (matin) : **Lot A** (juice du tap, ciel étoilé qui tourne, étoile filante, astéroïde, mots de combo, BOOM), **UI nuit** + objectifs visibles, **Lot C** (fin de run avec titre de build, stats, escalier d'XP, quasi-victoire, échec nommé), **Lot D** (3 cartes dont 1 pari, raretés + pitié, relance en jauge, niveau 10, 6 évolutions, synergies, 25 nouveaux effets dont Big Bang, conditions anti-pick à vide). Réglages moteur : croix dès 7, jauge 2, élan ×1,2, fusée et étoile filante dès les premières salles. Bot avisé : 100 / 98 / 96 / 74 / 75 %.

---

## Décisions en attente de Martin

| # | Question | Ma recommandation |
|---|---|---|
| D12 | **Tranchée par Martin.** Gravité *vide* : les billes tombent dans les trous à chaque coup, mais **rien n'entre jamais de l'extérieur** — la grille se vide, la rotation regroupe ce qui reste. Marée haute reste la seule source de billes (règle de salle). Modes *continue*, *mixte*, *collante* conservés dans le mode Test. | Appliquée. Objectifs recalés (Vestibule et Puits : vider N billes ; Pendule : score 1 200), seuils de niveau divisés par ~1,7. |
| D13 | **Appliqué provisoirement.** À jauge vide, la rotation coûte un coup (pastille « −1 coup » sur les touches) au lieu d'être refusée. | Garder : sans ça, la collante bloque le joueur sans groupe. |
| D7 | Le trou sous un ballon (il flotte et fait sol) reste vide jusqu'à la prochaine rotation. Garder ce comportement ou faire tomber le ballon comme les autres ? | Garder. En gravité collante (D12), tous les trous attendent la rotation : le point devient mineur. |
| D8 | Audio : Martin sait déjà que la synthèse sonnera 8-bit → samples CC0 **plus tard** (réseau bloqué pour les télécharger depuis l'environnement : Martin les déposera dans `src/assets/audio/`). | Plus tard. |

| D9 | Audit gameplay : jauge de rotation 3 → 2 et bonus XP ×1,2 sur le tap qui suit une rotation, pour que tourner devienne une décision (le bot tourne 1 fois pour 25 taps). | Oui aux deux, après ton ressenti en jouant. |
| D10 | Audit gameplay : seuil croix 8 → 7 (croix = 3,5 % des spéciales créées). | Attendre : à revoir avec les compétences de conversion de la phase 2. |
| D11 | Audit gameplay : mettre fusées et ballons dès le Vestibule et le Puits pour que la rotation serve dès la première salle. | Oui, une fusée dans le Vestibule, un ballon dans le Puits. |

| D14 | **Tranchée** : Carrousel cosmique. Précisions de Martin : méchant = un **astéroïde** (pas un trou noir) ; pierres = morceaux d'astéroïde ; ballons = étoiles filantes ; billes bonbon gardées ; Cosmo dessiné par Martin ; **titre à reproposer** (plus évocateur, international) ; **noms de salles à reproposer** ; combos « Stellaire ! » et « Supernova ! » gardés. | Propositions de titre et de noms dans la réponse du 2026-09-14 ; appliquer après son choix. |
| D15 | **Tranchée** : oui à tout (3 cartes dont 1 à risque, raretés, reroll en jauge, niveau 10, évolutions, synergies). Prévision : non. Rotation marquée : dès 5. + carte « Big Bang » (remélange tout). | Lot D. |
| D16 | **Tranchée** : oui, mais kenney.nl est inaccessible depuis l'environnement → sprites de halo/fumée pré-rendus par code (dégradés radiaux), aucune bibliothèque. | Lot A. |
| D17 | **Tranchée** : fin de run + quasi-victoire + échec nommé maintenant ; défi quotidien et série **plus tard** ; règle « jamais de vies ni de timers » écrite dans CLAUDE.md. | Lot C. |
| D18 | **Tranchée** : A → C → D → B → E, avec E1 (le ciel) juste après A. | En cours. |

| D19 | **Appliquée.** Relance des cartes gratuite une fois par salle, puis 1 point de jauge (`relanceGratuite` dans l'état, bouton « Retirer les cartes (gratuit) »). | Sonde : disponible dans 99 % des choix. |
| D20 | **Appliquée.** Débridé (5 coups de rotations gratuites, jauge remplie), Synchronisation (2 bombes tout de suite + 5 coups où chaque rotation fait exploser les spéciales), Apesanteur (5 coups : rotations gratuites, ×1,5 XP, rotation subie annoncée après chaque coup). Durée comptée en **coups** (`parTap`) : une rotation n'use plus la durée. | Sonde après : Apesanteur +0,6, Synchronisation −3,4, Débridé −4,4 (bruit ±7 ; le bot n'exploite pas les rotations gratuites). Voir D21. |
| D21 | L'agent idées juge que Débridé et Apesanteur *suppriment* la décision de rotation (gratuite, automatique) au lieu de l'enrichir (pilier 1). Les remplacer par des effets à payoff de rotation (Surtension, Supernova différée, `docs/IDEES_EPIQUES_3.md`) ? | Oui, à la prochaine passe de contenu ; garder Synchronisation. |
| D22 | Audit gameplay 3, majeure C : un épique non-pari encore actif en fin de salle « gradue » en compétence de run affaiblie (1 par salle). Les niveaux en salle construiraient enfin quelque chose de permanent. | Oui, petit lot après le retour de Martin ; A (carte) et B (boutique) restent en phase 2. |
| D24 | **Cascades (feuille de Martin, F01)** : contredit §3.1 « les cascades ne se déclenchent pas ». Autoriser les cascades automatiques ? Sur tap et rotation, ou sur rotation seulement ? **Prototype mesuré et jouable en mode Test** (`docs/METRIQUES.md`). | Sur rotation seulement, seuil 5 : la rotation devient le moteur de chaîne (pilier 1), le tap reste un tap-blast ; c'est la seule variante qui gagne partout (43 % de runs, chaîne 4,0, Pendule 63 %). À sentir en jouant avant de dire oui : la cascade prend la moitié des gros taps du joueur. |
| D25 | **Frénésie + mode VERTIGE (F02-F03)** : jauge 0-100 alimentée par groupes, cascades, rotations productives, combos ; à 100 % un mode court. Contenu du mode ? | Gains proposés d'après la sim (sources par salle, bot avisé) : groupe 5-7 **+10** (3,1/salle → 31), 8-9 **+20** (0,3 → 6), 10+ **+35** (0,2 → 7), rotation productive **+12** (1,9 → 23), combo de spéciales **+15** (1,35 → 20), cascade **+8** si D24 (1,8 → 14) : ≈ 87 points par salle sans cascades, ≈ 100 avec — la jauge se remplit **environ une fois par salle** pour un bon joueur, jamais pour qui tape des 2. Pas de perte au fil du temps (jamais de timer). Mode VERTIGE : 3 coups, chaque tap vaut ×2 XP et crée une spéciale dès 3 billes, ciel qui accélère. Hook `rotationEvaluee` déjà en place. |
| D26 | **Recettes de combos de spéciales (F04-F06)** en règle de base, voir « À faire maintenant » 3. Sim : déjà **1,35 combo par salle** (deux spéciales qui explosent dans la même action) sans rien changer — assez fréquent pour être reconnu, assez rare pour rester un événement. | Oui, dans cet ordre ; *Double amorce* devient un renfort de la recette. |
| D27 | **Carte (F14-F15)** : la feuille parle de « carte du monde et étoiles » (Candy Crush) ; CLAUDE.md §3.3 d'une carte de run à nœuds (Slay the Spire). Les deux ? | Carte de run à nœuds pour le run, étoiles 1-3 par salle comme score de maîtrise ; pas de niveaux fixes à rejouer. |
| D28 | **Finale F07 livrée** avant ta réponse (feuille : « oui, après les combos ») : coup restant = une bille au hasard + 25 XP (≈ la moitié d'un coup joué), point de jauge = rotation gratuite sans hook, spéciales d'abord, rng à part, objectif plafonné à la cible. Durée 5-7 s avec la supernova, ≈ 2 700 XP par run (27 % du total). | Garder ; si c'est long, cadence 70 → 50 ms ou supernova raccourcie ; si c'est trop d'XP, 25 → 15. À sentir en jouant. |
| D23 | Audit gameplay 3, mineures : XP non convertie → monnaie de run visible dès maintenant ; fusionner les 2 barres du HUD ; 1-2 fusions spéciale×spéciale en règle de base. | Monnaie de run oui (prépare la boutique) ; HUD non (Martin a demandé de mieux voir l'objectif) ; fusions à discuter. |

Décisions D0-D6 tranchées le 2026-09-11 (voir CLAUDE.md §12).

---

## Phase 1 — Le cœur

- [x] Squelette Vite, `src/moteur/` pur, `src/rendu/`, `src/ui/`, `src/audio/`, `tests/`, `tools/`
- [x] Contrats entre modules (`docs/CONTRATS.md`)
- [x] Grille, gravité mobile, groupes, tap, rotation 90/180, chute, remplissage par le haut visuel
- [x] Spéciales bombe / ligne / croix / couleur orientées par la gravité, chaînes, spéciales adjacentes
- [x] Éléments bulle, ballon, fusée (activation par proximité)
- [x] Pierres (détruites par adjacence et par explosion)
- [x] XP, niveau en salle 1 → 7, 13 effets de niveau (paliers 1-2) par hooks
- [x] Bus de hooks central
- [x] 10 compétences de run par hooks, écran de choix entre les salles
- [x] 5 salles linéaires : Vestibule, Puits, Marée haute, Tempête, Le Pendule
- [x] Jauge de rotation (+1 par groupe de 6+), coût en donnée
- [x] Sauvegarde du run (localStorage) et profil méta minimal
- [x] Simulateur headless `tools/sim.mjs`, tests `node --test` (8)
- [x] UI HTML/CSS, panneau mode Test (salle, compétences, seed, difficulté, couleurs, jauge)
- [x] Restyle « Cartoon pop » de l'UI (boutons bonbon 3D, badges, cartes qui rebondissent, ciel)
- [x] Audio Web Audio en synthèse (13 familles de sons)
- [x] Rendu Canvas 2D (première version « Atelier », rejetée : trop sobre)
- [x] Restyle « Cartoon pop » du rendu + juice (textes flottants +XP, mots de combo, confettis, ondes de choc, squash du plateau, nuages)
- [x] Test de fumée Playwright vert (`npm run smoke`) : 24 taps, 6 rotations, 10 choix, 0 erreur
- [x] Captures vérifiées à l'œil (menu, jeu, niveau, fin de salle, mode test)
- [x] Retour de Martin : « la grille se remplit constamment, ça rend le retournement inutile » → gravité **collante** par défaut (D12), trois modes dans le moteur, champ *Gravité* du mode Test, `sim --gravite` et politique `avisee` (2026-09-11)
- [x] Télégraphe de rotation : `run.apercuRotation(sens)` (pur), fantômes + chevrons + cases d'entrée dans le rendu, appui maintenu ou survol des touches (2026-09-11)
- [x] Feel du tap : chute et remplissage en parallèle, chute qui démarre à 70 % de la rotation (tap ≈ 90 ms en collante, ≈ 440 ms en continue) (2026-09-11)
- [ ] Ressenti validé par Martin en jouant
- [x] Audit code + audit gameplay de fin de phase (`docs/AUDIT_CODE.md`, `docs/AUDIT_GAMEPLAY.md`), bloquants et importants appliqués

## Phase 2 — Le run

- [ ] Carte de nœuds, acte 1 (~12 salles), élites, salles spéciales
- [ ] Tous les éléments de §5
- [ ] Pool complet de compétences et d'effets 1-7
- [ ] Boutique méta minimale
- [ ] Audit équilibrage sur simulation

## Phase 3 — Profondeur

- [ ] Actes 2 et 3, tous les boss, salles à étapes et anarchiques restantes
- [ ] Effets 8-10, ultimes, personnages, atelier (fusions)
- [ ] Cosmétiques, statistiques, équilibrage final

---

## Bugs

- [x] (mineur, capture 07-fin-run) Le HUD restait visible derrière le titre « Fin du run » ; un panneau plus haut que l'écran était coupé par le centrage — HUD masqué sous la fin de run, `margin-block: auto` sur les panneaux (2026-09-14).
- [x] (mineur, audit code 2) `surSalle` résolvait avant l'atterrissage sur les grandes grilles ; police reconstruite à chaque texte ; écouteur clavier sans retrait — corrigés (2026-09-14).
- [x] (équilibrage, sonde) Les premières versions de Dernière danse et Comète noire détruisaient des billes à 10 XP : −6 et −10 points — une bille est une munition dans une grille qui ne se remplit pas. Réécrites en conversion (Dernière danse unit le sol ; Absorption teinte les voisines avant le tap) (2026-09-14).
- [x] (mineur, outil) `tools/smoke.mjs` signalait « taps pointeur sans effet » quand le coup était rendu (Avidité sur un 7+, Coup de trop) et non quand le tap était perdu : la mesure compare désormais `stats.taps` (2026-09-14).
- [x] (mineur, sonde finale) Après la finale, le HUD affichait « Billes 94 / 60 » (les billes soufflées par la finale comptaient encore pour l'objectif) — progrès plafonné à la cible (2026-09-14).
- [ ] (mineur, sonde finale) La finale complète prend 5-7 s avec la supernova (2 spéciales, 9 coups, 2 rotations) : à juger en jouant, D28.
- [x] (mineur, sonde finale) En finale, une spéciale isolée qui explose affichait « +10 » (sa propre bille) sous le « +100 » de sa zone — les +XP émis à moins de 350 ms et 1,5 case l'un de l'autre s'additionnent en un seul texte (2026-09-14).
- [x] (mineur, capture naissance) Quand une bombe s'enchaînait sur le tap, « Étincelle ! » et « BOOM ! » se superposaient — un mot encore plein qui en recouvre un autre passe dessous (le plus petit bouge ; au-dessus si le bas du canvas est trop près), textes bornés verticalement (2026-09-14).
- [ ] (mineur, audit code 2) 8 pools à tableaux typés dupliqués dans 4 fichiers du rendu : mutualisables, non fait.
- [x] (mineur, sonde feel) Un mot de combo sur une case du bord sortait du canvas (« G BANG ! ») ; le +XP se superposait au mot — police bornée à 90 % de la largeur, centre ramené dans les marges, +XP décalé au-dessus (2026-09-14).
- [x] (important) Audit gameplay 2 : le boss ne filtrait rien (cible 1 800 → 2 200 : bot avisé 54 % contre 74 % à Tempête) ; « Mise en jeu » était un pari gratuit (−3 coups à la prise) ; Tempête et Pendule bloquaient 1 run sur 5 (seuil de renfort 45 %) (2026-09-14).
- [x] (règle) Renfort : sous 40 % de billes, 2 à 5 billes par tap, au hasard. Boss remonté à 1 800 points (2026-09-11).
- [x] (bloquant, retour de Martin) Mauvaise lecture de la règle : la grille ne doit **jamais** se remplir de l'extérieur. Mode `vide` par défaut, objectifs et seuils de niveau recalés au simulateur (2026-09-11).
- [x] (bloquant, retour de Martin) La grille se remplissait à chaque coup : une grille pleine ne bouge pas, la rotation ne servait à rien (sim : 0,3 bille déplacée par rotation). Gravité collante par défaut, D12 (2026-09-11).
- [x] (important) Rendu : la boucle rAF tournait après retour au menu — `pause()`/`reprendre()` appelés par main.js (audit code, 2026-09-11).
- [x] (mineur) Rendu : une chaîne allouée par bille et par frame sans survol (audit code, 2026-09-11).
- [ ] (à trancher, D7) Case vide sous un ballon jamais comblée tant qu'on ne tourne pas : l'audit code le classe bloquant, c'est un choix de design à valider en jouant. Devenu mineur avec D12 (tous les trous attendent la rotation).
- [ ] (mineur) Niveau atteint au tour où l'objectif est atteint : le choix d'effet est sauté (choix assumé : il serait sans effet), à confirmer.
- [x] (bloquant) Plateau minuscule : la taille CSS du canvas n'était pas suivie après la mise en page — ResizeObserver dans le rendu + resize fenêtre (2026-09-11).
- [x] (mineur) HUD : un effet valable toute la salle affichait « null » (2026-09-11).
- [x] (mineur) Après « Salle terminée », l'écran de choix de compétence ne s'affichait pas (journal vide non traité dans main.js) (2026-09-11).
- [x] (important) Équilibrage : Propagation verte + Avidité = coups quasi infinis. Avidité plafonnée à 3 par salle ; Propagation limitée aux groupes tapés (2026-09-11).
- [x] (important) Le Puits (salle 2) plus dur que le boss : coups 22 → 26 ; Marée haute triviale : cible 8 → 12 (audit gameplay, 2026-09-11).
- [ ] (mineur) `tools/sim.mjs` : la politique gourmande ignore l'objectif couleur, ce qui sous-estime le Puits.

---

## Idées en plus

Agent idées 2026-09-14 (14 épiques de palier 3 dans `docs/IDEES_EPIQUES_3.md`) : 5 implémentées (Dernière danse, Danse des couleurs, Absorption ex-Comète noire, Jackpot, Avalanche). Restent : **Surtension** (pari : les taps sans rotation chargent la prochaine spéciale, la rotation vide la jauge), **Supernova différée**, Écho, Point de rupture, Rafale, Ceinture d'astéroïdes, Horizon des événements, Vertige final, Roulette russe, Dette cosmique.

Audit gameplay 3 (`docs/AUDIT_GAMEPLAY_3.md`) : carte de nœuds (phase 2), boutique de run avec vente/retrait (phase 2), graduation des épiques (D22), monnaie de run dès maintenant (D23).

Recherches du 2026-09-14 (4 dossiers + synthèse dans `docs/RECHERCHE_*.md`) : juice en 12 items chiffrés, 15 mécanismes de rétention, système de niveaux à 3 cartes + 36 effets, 5 contextes. Les décisions D14-D18 ci-dessus en découlent ; les items non retenus restent dans les dossiers.

Agent idées 2026-09-11 (18 idées dans `docs/IDEES.md`), son Top 5 :
- **Cadran** (règle de salle) — la jauge devient 4 crans, un par orientation ; une orientation utilisée se verrouille jusqu'à ce que les 3 autres aient servi. Force à jouer les quatre gravités.
- **Contrepoids** (compétence) — rotation gratuite après un groupe de 6+. Proche de la règle « +1 jauge par groupe de 6+ » déjà en place ; à fusionner ou à écarter.
- **Toupie** (élément) — pivote à chaque rotation et teinte la bille adjacente dans le sens de rotation ; 3e activation = bombe de couleur. Élément signature de la rotation.
- **Halo directionnel** (feel) — flèche craie sur le bord du plateau indiquant la gravité, qui pulse quand une spéciale ligne/fusée est alignée. Peu coûteux, faisable dès la phase 1.
- **Double engagement** (compétence épique) — le prochain choix est restreint à la même catégorie, en échange les deux compétences font 150 %. Archétypes de build.

- **Phase 0 avant la phase 1** — deux piliers sur cinq sont des questions de ressenti (rotation, satisfaction physique) ; aucune discussion ne les tranche. Proposé ci-dessus.
- **Télégraphe de rotation** — au survol / appui long du bouton de rotation, afficher en fantôme où les billes vont retomber. Rend la rotation lisible sans la rendre triviale, et sert directement le pilier 1.
- **Interdire tout aléatoire dans la rotation** — aucun mélange, jamais. Les salles anarchiques (Tempête, Roulette, Vrille) annoncent toujours la rotation *avant* que le joueur ne s'engage, comme le fait « Pile ou face ». Sinon elles cassent la prévisibilité qui rend la mécanique lisible.
- **Bombe de couleur créée autrement que par la taille de groupe** — elle n'apparaît quasiment jamais naturellement (1,1 % des grilles ont un groupe de 12). La rattacher au Cristal, à une compétence ou à un effet de niveau plutôt qu'à un seuil.
- **Jauge de rotation qui se recharge sur les gros groupes** — +1 rotation par groupe de 6+. Lie les deux verbes du jeu au lieu de les mettre en concurrence.
- **Le moteur ne connaît pas le rendu** — `src/moteur/` en JS pur, testable avec `node --test` et simulable en headless dès la phase 0, comme `terra-nova`. Condition pour que l'audit d'équilibrage de la phase 2 soit possible.

---

## Fait

- 2026-09-14 — Mots d'une même salve : fusion des +XP, étalement des mots de combo, borne verticale (`src/rendu/juice.js`, `definirCadre` posé par le rendu à la mise en page), 5 tests `tests/juice.test.js`. 27 tests, fumée verte.
- 2026-09-14 — F07 finale de salle : `src/moteur/finale.js` (spéciales → coups → rotations, consommation virtuelle, rng à part, `stats.xpFinale`, `enAttente.finSalle.finale`), événements `finale` / cause `finale`, rendu (« FINALE ! », pops 70 ms, pas de combo pendant la finale), son `detruit` cause `finale`, bilan sur l'écran de victoire, colonne « xp finale » du simulateur, sonde `tools/_sonde_finale.mjs`. 22 tests, fumée verte, sim = baseline hors XP.
- 2026-09-14 — Naissance des spéciales (convergence du groupe, flash, onde, éclat, pulse ×0,5 ; `rendu.js`, `speciales-fx.js`), mesure de la fumée corrigée, feuille web v2 (`retours/partie2`, 29 points). 20 tests, fumée verte.
- 2026-09-14 — Prototype D24 (cascades, `options.cascades`, mode Test + `sim --cascades`), 5 variantes mesurées dans `docs/METRIQUES.md`, chiffres D25 (sources de jauge par salle) et D26 (combos par salle). 20 tests.
- 2026-09-14 — Étape 1 Feel (feuille de Martin) : `src/data/paliers.js` (3/5/8/10+, une table pour rendu et audio), hitstop 60/90 ms avant les explosions 8+/10+, `rotationResultat` + « Bon angle ! » / « ALIGNEMENT ! », `stats.rotationsProductives` (fin de run, sim). 19 tests, fumée verte (77 taps, 14 rotations, 25 choix, 0 erreur), build 145 Ko de JS, sim inchangée.
- 2026-09-14 — Feuille de route de Martin transcrite (`docs/FEUILLE_DE_ROUTE_MARTIN.md`), étape 0 faite (`docs/METRIQUES.md`, métriques dans `tools/sim.mjs`).
- 2026-09-14 — D19 (relance gratuite 1×/salle), D20 (palier 3 rotation majeur, durée en coups `parTap`), 5 épiques de palier 3, audit gameplay 3 comparatif, HUD de fin de run, mineurs de l'audit code 2. 17 tests, fumée verte (78 taps, 16 rotations, 26 choix, 0 erreur), build 141 Ko de JS.
- 2026-09-14 — Audits code 2 et gameplay 2 appliqués (`docs/AUDIT_CODE_2.md`, `docs/AUDIT_GAMEPLAY_2.md`) : boss à 2 200, Mise en jeu payante, renfort 45 % sur Tempête/Pendule, filets anti-blocage, dette côté moteur, texture d'étoiles plafonnée.
- 2026-09-14 — Lots A, B, C, D de la phase 1.5 livrés. 15 tests, fumée verte sur un run complet (80 taps, 35 choix, 0 erreur).
- 2026-09-11 — Renfort (règle de Martin) : la grille se vide mais reçoit 2 à 5 billes par tap sous 40 % ; bot avisé 100 / 100 / 99 / 75 / ~90 %, gourmand 79 / 54 / 91 / 84 / ~80 %.
- 2026-09-11 — Règle de Martin appliquée : rien n'entre dans la grille (mode `vide`), objectif « billes », condition de blocage réelle (simulation des 3 rotations), rééquilibrage : bot avisé 100 / 96 / 97 / 52 / 60 %, bot gourmand 67 / 44 / 98 / 79 / 71 %.
- 2026-09-11 — Retour de Martin appliqué : gravité collante (D12), rotation payée en coup à jauge vide (D13), télégraphe de rotation, chute ∥ remplissage. Sim comparée sur 200 runs × 3 modes, 12 tests, fumée verte, build 435 Ko.
- 2026-09-11 — Phase 1 jouable : rendu Cartoon pop + juice, UI bonbon, audits code et gameplay appliqués, build 412 Ko avec sourcemaps, zéro réseau.
- 2026-09-11 — Phase 1 : moteur complet (1 200 lignes), données, UI, audio, sim, tests. Reste le rendu et l'intégration.
- 2026-09-11 — Import du document de cadrage dans `vertige/CLAUDE.md`, création de `ROADMAP.md`, mesure des seuils (`tools/seuils.mjs`).

## Expédition solaire 0.3 — 2026-09-16

- [x] Huit planètes avec modificateurs et décors proches rotatifs.
- [x] Choix de build entre salles, rang selon XP active, cartes à compromis.
- [x] Trois recettes de boosters, balises par gravité, résonance sans timer.
- [x] HUD, route, inventaire du build et bilan final.
- [x] Tests moteur, simulations, sauvegardes et contrôle mobile/hors ligne.
- [ ] Retour de jeu humain sur rythme, Terre/Saturne et valeur des malus.

Voir [le bilan solaire](docs/EXPEDITION_SOLAIRE.md).

- [x] Publication : workflow de compilation, tests et déploiement Pages ; compatibilité avec la publication Jekyll historique.
