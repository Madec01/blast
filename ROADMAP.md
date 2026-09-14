# VERTIGE — feuille de route

Tableau de bord du projet. Tenu à jour en direct. Voir `CLAUDE.md` pour le cadrage.

---

## À faire maintenant

Réponses de Martin lues le 2026-09-14 sur la feuille web : https://claude.ai/code/artifact/0aae216f-64a0-44c3-949d-482473879eb2

1. **Audits code + gameplay** de fin de phase 1.5 (agents lancés) : appliquer les bloquants.
2. **Lot E** : Cosmo (sprite de Martin ; recherche d'un sprite libre impossible hors ligne → vectoriel provisoire), ouverture en 3 écrans, noms de salles / titre / méchant après le choix de Martin (propositions : ORBITA ; Première Orbite, La Faille, Pluie de météores, Vent solaire, Le Pulsar ; Krator l'astéroïde).
3. Contenu : le palier 3 n'a qu'une épique non risquée → l'apogée (niveau 10) complète avec des raretés inférieures. Ajouter 4-6 épiques de palier 3.
4. Martin joue : ressenti du juice, des cartes, de la fin de run. Audio (samples) plus tard.

Fait le 2026-09-14 : **Lot A** (juice du tap, ciel étoilé qui tourne, étoile filante, astéroïde, mots de combo, BOOM), **UI nuit** + objectifs visibles, **Lot C** (fin de run avec titre de build, stats, escalier d'XP, quasi-victoire, échec nommé), **Lot D** (3 cartes dont 1 pari, raretés + pitié, relance en jauge, niveau 10, 6 évolutions, synergies, 25 nouveaux effets dont Big Bang, conditions anti-pick à vide). Réglages moteur : croix dès 7, jauge 2, élan ×1,2, fusée et étoile filante dès les premières salles. Bot avisé : 100 / 98 / 96 / 74 / 75 %.

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

| D19 | Audit gameplay 2 : la relance des cartes (1 point de jauge sur 2) n'est jamais rationnelle. Baisser à « gratuite une fois par salle » ? ou creuser l'écart entre cartes ? | Une relance gratuite par salle, puis 1 jauge. |
| D20 | Audit gameplay 2 : les effets de rotation du palier 3 (Débridé, Synchronisation, Apesanteur) sont ≤ 0 en impact. Les rendre « majeurs » (durée 3 → 5 tours, effet immédiat en plus) ? | Oui, après ta partie. |

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

- 2026-09-14 — Lots A, B, C, D de la phase 1.5 livrés. 15 tests, fumée verte sur un run complet (80 taps, 35 choix, 0 erreur).
- 2026-09-11 — Renfort (règle de Martin) : la grille se vide mais reçoit 2 à 5 billes par tap sous 40 % ; bot avisé 100 / 100 / 99 / 75 / ~90 %, gourmand 79 / 54 / 91 / 84 / ~80 %.
- 2026-09-11 — Règle de Martin appliquée : rien n'entre dans la grille (mode `vide`), objectif « billes », condition de blocage réelle (simulation des 3 rotations), rééquilibrage : bot avisé 100 / 96 / 97 / 52 / 60 %, bot gourmand 67 / 44 / 98 / 79 / 71 %.
- 2026-09-11 — Retour de Martin appliqué : gravité collante (D12), rotation payée en coup à jauge vide (D13), télégraphe de rotation, chute ∥ remplissage. Sim comparée sur 200 runs × 3 modes, 12 tests, fumée verte, build 435 Ko.
- 2026-09-11 — Phase 1 jouable : rendu Cartoon pop + juice, UI bonbon, audits code et gameplay appliqués, build 412 Ko avec sourcemaps, zéro réseau.
- 2026-09-11 — Phase 1 : moteur complet (1 200 lignes), données, UI, audio, sim, tests. Reste le rendu et l'intégration.
- 2026-09-11 — Import du document de cadrage dans `vertige/CLAUDE.md`, création de `ROADMAP.md`, mesure des seuils (`tools/seuils.mjs`).
