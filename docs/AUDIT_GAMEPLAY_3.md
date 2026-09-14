# Audit gameplay 3 — comparaison aux références (VERTIGE)

Méthode : CLAUDE.md (§1-3, §5-8), ROADMAP.md, AUDIT_GAMEPLAY_2.md et RECHERCHE_SYNTHESE.md (repris comme acquis, pas refaits), lecture de `salles.js`, `competences.js`, `effets.js`/`effets2.js`, `speciales.js`, `tour.js`, `run.js`, `progression.js`, `elements.js`. Chiffres : `tools/sim.mjs` (300 runs avisée/gourmande, +1 combo de compétences) et `tools/_sonde_effets.mjs` (600 runs, stratifié par salle). Captures : `/tmp/vertige-shots/02-jeu.png`, `03-niveau.png`, `05-fin-salle.png`, `07-fin-run.png`.

> Note (même jour, après l'audit) : D19 et D20 ont été codés juste après (voir ROADMAP.md) ; les mentions « non codées » de §2-3 et §6 décrivent l'état au moment de l'audit.

---

## 1. Verdict

Le **micro-loop** (taper, tourner, ressentir) est solide et déjà comparable aux références tap-blast : le télégraphe de rotation (88-99 % des rotations avisées créent un groupe utile) fait de la rotation une vraie décision, ce qu'aucune des références citées ne propose littéralement. Le **macro-loop** (fin de salle nommée, fin de run avec titre de build et escalier d'XP) existe et couvre l'essentiel de ce que Candy Crush/Royal Match font en fin de niveau. Mais le **run**, au sens Slay the Spire/Balatro — celui qui justifie de comparer VERTIGE à ces jeux — **n'existe pas encore** : 5 salles fixes, aucune carte, aucune boutique, aucun élite, une seule couche de build persistante (10 compétences, 4 choix par run). Le système de niveau en salle (44 effets) est riche en apparence mais **entièrement jetable** (remis à zéro à chaque salle) et sa rareté ne prédit pas son impact (mesuré). VERTIGE est aujourd'hui un excellent prototype de moteur tap-blast avec un habillage de roguelite ; ce n'est pas encore un roguelite à builds.

---

## 2. Comparaison par référence

### Tap-blast / match-3 (feel, lisibilité, courbe, fin de niveau)

| Référence | Ce qu'elle fait | Ce que VERTIGE fait | Écart |
|---|---|---|---|
| **Candy Crush Saga** | Courbe à la salle près (milliers de niveaux A/B testés), un seul objectif lisible à l'écran, Sugar Crush qui convertit les coups restants en score/spectacle. | 5 salles, courbe grossière (100→98→92→77→55 % avisée sur 300 runs), un objectif par salle, séquence de fin de salle (`finale.js`, 101 lignes). | Granularité de la courbe : rien entre "salle facile" et "salle qui perd 1 run sur 2" (Tempête/Pendule) ; pas de palier intermédiaire. |
| **Angry Birds Dream Blast** | Tap-blast avec éléments à activation par proximité, plusieurs objectifs combinés par niveau, monde en arborescence (pas un couloir). | Éléments à activation par proximité (pilier 4, ✓), mais 1 seul objectif par salle et **1 seul chemin** (`ORDRE_PHASE1`, linéaire). | Pas de multi-objectifs, pas de branches — la promesse "monde" de Dream Blast n'est pas là. |
| **Toon Blast** | Contours encre épais, fusion d'objets spéciaux adjacents (fusée+fusée, bombe+bombe, disco), déclinaisons visuelles fortes. | Style "billes glossy" sans contour encre visible (capture `02-jeu.png`) malgré la décision "Cartoon pop" de CLAUDE.md §2 ; une seule combinaison spéciale codée (*Double amorce*, une compétence rare, pas une règle de base). | Écart visuel avec la décision déjà prise (pas juste vs la référence) ; matrice de fusion spéciale×spéciale quasi absente en base. |
| **Royal Match** | 15-20 coups par niveau, difficulté secrètement adaptative, HUD minimal, indices. | 24-30 coups par salle, aucune difficulté adaptative (le paramètre `difficulte` existe mais n'est piloté par rien en jeu), HUD à 2 barres de progression + 3 étoiles + jauge (capture `02-jeu.png`) sur une seule salle. | HUD plus chargé que la référence pour moins d'information utile ; pas de filet de difficulté dynamique. |

### Run / builds (choix, synergies, montée en puissance)

| Référence | Ce qu'elle fait | Ce que VERTIGE fait | Écart |
|---|---|---|---|
| **Slay the Spire** | Carte à embranchements visible avant de s'engager, nœuds élite/boutique/repos/mystère, reliques qui s'accumulent tout le run, 3 actes. | Chaîne fixe de 5 salles (`ORDRE_PHASE1`), 1 seul boss, 0 élite/boutique/repos/mystère codés (§7.6 spécifié, 0 ligne de code). | La structure même du "run" façon StS est absente : c'est un niveau, pas une carte. |
| **Balatro** | Boutique entre chaque manche (achat/vente/reroll de jokers), ~150 jokers qui persistent tout le run, tags/vouchers. | Aucune boutique, aucune monnaie de run en jeu (`monnaie de run` citée en CLAUDE §6.3/7.6, introuvable dans `src/`), 10 compétences codées sur les ~25+ documentées en §6.2, tirées 4 fois par run (après les 4 premières salles). | Pas d'agentivité économique (rien à vendre/retirer) ; pool de build 4× trop petit (10 vs 150) et fenêtre de choix 2-3× trop courte (4 choix vs 8+ manches). |
| **Peglin** | Aperçu de trajectoire avant chaque lancer, relique qui infléchit le hasard physique. | Aperçu de rotation (`apercuRotation`, fantômes + chevrons) — même idée, déjà en place et bien notée par l'audit 2 (88-99 % d'utilité). | Aucun, VERTIGE est à niveau ici (à ne pas casser, voir §5). |
| **Luck be a Landlord** | Économie serrée (loyer qui monte / argent), achat-vente-reroll de symboles entre chaque manche, synergies d'adjacence. | Seuils d'XP qui montent (0→2900) comparable au loyer, mais aucune vente/reroll réel (relance à 1 jauge jamais rationnelle : sonde 600 runs, 0 % d'usage malgré 83 % de disponibilité). | Le reroll existe dans le code mais pas dans la pratique : décision D19 ("relance gratuite 1×/salle") tranchée le 2026-09-14, **toujours pas codée** (`COUT_RELANCE = 1` fixe dans `progression.js`, aucune gratuité par salle). |
| **Vampire Survivors** | Choix de carte à chaque niveau (comme VERTIGE), mais ce choix **est** le build permanent du run, avec évolutions (arme+passif → forme unique). | Choix de carte à chaque niveau (§6.1, jusqu'à 30/run), mais entièrement **local à la salle** : `run.js` `entrerSalle` vide `effetsActifs`/`effetsVus` à chaque nouvelle salle. Les évolutions (`EVOLUTIONS`, 3 recettes) ne survivent pas non plus au changement de salle. | La mécanique visuelle est la même, la fonction est inverse : chez VS chaque choix compte pour tout le run, chez VERTIGE chaque choix compte pour ~5 tours puis disparaît. C'est la source principale du sentiment "ça recommence à zéro" toutes les 5 minutes. |

---

## 3. Points faibles priorisés

**Bloquant**
- **Le "run" façon référence n'existe pas.** 5 salles fixes, 1 boss, 0 embranchement, 0 boutique/élite/repos codés (§7.6 CLAUDE.md, 0 correspondance dans `src/`). Sim 300 runs avisée : 38 % terminent le run entier (11 % en gourmande) — un jeu qui se compare à Slay the Spire/Balatro doit d'abord avoir une carte.
- **Le système de niveau (44 effets, palier 1-3) ne construit rien de permanent.** `entrerSalle` (run.js) réinitialise `effetsActifs` et `effetsVus` à chaque salle. Sur les 3 couches de progression promises par le pilier 3 de CLAUDE.md, la couche "niveau en salle" ne fuit jamais vers la couche "compétences" — ce qui rend le palier 3 (épique) aussi jetable qu'un palier 1.

**Important**
- **La rareté ne prédit pas l'impact**, contrairement à la promesse explicite de RECHERCHE_NIVEAUX. Sonde 600 runs (stratifiée/salle) : le meilleur effet est *Renfort doré* (rare, +7,5 pts), le pire est *Débridé* (rare, non-risque, **−9,6**) ; *Synchronisation* (rare) −9,6 ; *Ascension* (épique) −6,2 ; *Foyer* (commun) −4,1. Les cartes marquées `risque` négatives sont attendues ; celles-ci ne le sont pas.
- **D19 (relance) et D20 (palier 3 rotation) tranchées le 2026-09-14, non codées.** Reroll toujours à 1 jauge fixe (`COUT_RELANCE = 1`), jamais utilisé par le bot avisé malgré disponibilité 83 % (sonde). *Débridé* (durée 3, pas d'effet immédiat) et *Synchronisation* restent sous 0 alors que D20 demandait de les rendre "majeurs".
- **Pool de build 4× trop petit pour porter la comparaison Balatro/StS.** 10 compétences codées (25+ documentées en §6.2), 4 choix par run (après les 4 premières salles sur 5) ; combo à 4 compétences testé (`vertige,seuil_abaisse,avidite,domino`) : 38 %→42 % de runs complétés, un swing de +4 points là où Balatro/StS visent un swing de x2-x10 sur un bon build.
- **Catalogue d'éléments à 27 % du plan.** 3 types codés (bulle, ballon, fusée) sur 11 documentés en §5 (cristal, ruche, coffre, lanterne, aimant, miroir, glaçon, boîte à musique manquants) — la variété tactique promise par le pilier 4 ("les éléments donnent du sens à la rotation") repose sur un tiers du catalogue.
- **HUD plus chargé que les références pour moins d'info** : capture `02-jeu.png` montre 2 barres de progression superposées + 3 étoiles + badge jauge + compteur coups, sur une seule salle à un seul objectif — Royal Match et Candy Crush tiennent la même information en 1 barre + 1 compteur.

**Mineur**
- **Style "contours encre épais" décidé (CLAUDE §2) mais pas au rendu** : les billes de `02-jeu.png` sont des sphères glossy sans trait noir marqué, plus proches de Candy Crush que de Toon Blast/Royal Match — écart à une décision déjà prise, pas seulement à la référence.
- Seule 1 combinaison spéciale×spéciale existe en dur dans le moteur de base (*Double amorce*, compétence rare) ; Toon Blast en propose au moins 4 (fusée+fusée, bombe+bombe, disco+n'importe, fusée+bombe) accessibles sans build.
- Aucune difficulté adaptative malgré le paramètre `difficulte` déjà présent dans `creerRun` — jamais lu ailleurs qu'à l'entrée en salle pour un multiplicateur fixe.

---

## 4. Trois améliorations majeures

### A. Une carte de nœuds, même minimale, avant tout le reste
**Problème résolu** : il n'y a pas de "run" à comparer à Slay the Spire ou Balatro — juste un couloir de 5 salles. C'est le trou qui rend toute comparaison avec ces deux références caduque en l'état.
**Référence** : Slay the Spire — carte visible par embranchements, 1-2 nœuds à la fois, mix élite (risque/récompense)/boutique/repos/mystère/boss.
**Proposition concrète** : générer 1 acte de 10-12 nœuds en 2-3 chemins parallèles qui se recroisent 2-3 fois, types de nœuds pris dans §7.6 déjà écrit (normale, élite, boutique, repos, mystère) + le boss existant en fin d'acte ; le joueur voit les 2 prochains nœuds accessibles et choisit. Réutiliser les 5 salles actuelles comme "normales", ajouter 1 élite (reprendre "Le Miroir" ou "La Ruche mère" de §7.5, déjà écrites) et 1 boutique (§7.6) pour le premier acte.
**Coût** : gros (modèle de données de carte, génération procédurale simple, UI de carte, 2-3 salles neuves).
**Risque** : gros — scope le plus large des trois ; à découper (acte 1 seul d'abord, comme prévu en Phase 2) pour ne pas bloquer la sortie.

### B. Une boutique de run avec agentivité réelle (vendre/retirer, pas seulement piocher)
**Problème résolu** : le joueur n'a aucune prise active sur son run — pas de monnaie de run en jeu, pas de retrait de couleur, pas de reroll qui vaille le coup (0 % d'usage mesuré malgré 83 % de disponibilité). Toute la boucle est "on te propose, tu prends ou tu ignores".
**Référence** : Balatro (boutique entre manches : achat/vente/reroll de jokers) et Luck be a Landlord (achat/vente/reroll de symboles, loyer qui monte).
**Proposition concrète** : implémenter la "Boutique de run" déjà écrite en §7.6 comme un nœud de la carte (A) : racheter des coups (coût croissant), retirer une couleur du pool pour le reste du run (une fois, prix élevé), améliorer une spéciale (+1 rayon, permanent), acheter directement un effet de niveau vu dans une salle passée. Monnaie : XP non convertie de la salle (actuellement perdue, il suffit de la router vers une monnaie de run au lieu de seulement `xpTotale`).
**Coût** : moyen (la donnée existe déjà en doc, il manque la monnaie, l'UI de boutique, 4 achats).
**Risque** : moyen — à équilibrer au simulateur avant d'entrer en jeu (un rachat de coups trop généreux annule la tension du pilier "rotation = décision").

### C. Faire "graduer" les effets épiques en règles permanentes de run
**Problème résolu** : les deux couches "niveau en salle" et "compétences de run" ne communiquent jamais (`entrerSalle` vide `effetsActifs` à chaque salle) — un épique de palier 3 a le même horizon de vie qu'un commun de palier 1, ce qui explique à la fois pourquoi la rareté ne prédit pas l'impact (§3) et pourquoi le jeu "recommence à zéro" toutes les 5 minutes.
**Référence** : Vampire Survivors (les choix de niveau *sont* le build permanent, avec évolutions) et les jokers légendaires de Balatro (une rareté qui change une règle, pas juste un nombre).
**Proposition concrète** : à la sortie de la salle, si un effet **épique** encore actif à ce moment a été choisi, il "graduate" en compétence de run à effet réduit (ex. *Ascension* épique "lignes → croix toute la salle" devient la compétence permanente "25 % de chance qu'une ligne devienne croix"). 1 graduation maximum par salle, réservée aux épiques non-`risque` pour ne pas doubler le pari. Réutilise l'infrastructure `effetsActifs`/compétences existante ; ne nécessite pas de nouvelle rareté.
**Coût** : moyen (règle de transition dans `finirSalle`/`entrerSalle`, rédiger la version "affaiblie" de chaque épique — texte + hook, pas de nouveau système).
**Risque** : moyen — lisibilité (le joueur doit comprendre qu'un effet de salle peut devenir permanent) et équilibrage (cumul de règles en fin de run) ; mitigé par le plafond à 1/salle et en le réservant aux épiques.

---

## 5. Ce qui est au-dessus des références (ne pas casser)

- **Télégraphe de rotation** (`apercuRotation`, fantômes + chevrons) : aucune des références tap-blast ne montre où les éléments vont retomber avant de s'engager. Sonde 600 runs : 88-99 % des rotations avisées créent un groupe ≥2-3 juste après — c'est mieux que le "coup de bol" qu'accepteraient Dream Blast ou Toon Blast sur leurs propres mécaniques spéciales.
- **La règle "vide"** (rien n'entre de l'extérieur, D12) est plus honnête que Candy Crush/Royal Match, qui remplissent en permanence par le haut — ici la grille se vide vraiment, la rotation a un sens mécanique, pas juste esthétique.
- **Écran de fin de run avec titre de build généré** (`07-fin-run.png` : "Réaction en chaîne en orbite", durée, salles franchies, escalier d'XP salle par salle, compétences prises) : équivalent fonctionnel du récap Balatro/StS, absent de toutes les références tap-blast citées.
- **Aucune vie, aucun timer payant, aucune notification culpabilisante** : règle déjà gravée en CLAUDE.md, à l'opposé de Candy Crush/Royal Match — ne jamais y revenir même sous pression de rétention.

---

## 6. Améliorations mineures rapides

- Router l'XP de fin de salle non convertie vers une monnaie de run visible dès maintenant (prépare B, coût quasi nul).
- Coder D19 tel que tranché : 1 relance gratuite par salle, puis coût en jauge — la sonde montre que la version actuelle (payante d'emblée) a un taux d'usage de 0 %.
- Buffer *Débridé* (durée 3→5 + effet immédiat) et vérifier *Synchronisation* au simulateur — D20 tranchée, non codée, toujours négatives (−9,6 chacune).
- Ajouter un contour encre visible sur les billes (2-3 px, cohérent avec la décision "Cartoon pop" déjà prise) — écart visuel à une décision, pas à goûter.
- Fusionner les 2 barres de progression du HUD (`02-jeu.png`) en une seule ; la jauge de rotation et les étoiles peuvent partager un seul bloc compact.
- Coder 1-2 combinaisons spéciale×spéciale en règle de base (pas en compétence) pour rapprocher la base du niveau Toon Blast sans attendre un build.
