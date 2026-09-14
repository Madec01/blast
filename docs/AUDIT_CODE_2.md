# Audit de code — fin de phase 1.5 (2026-09-14)

Portée : CONTRATS.md, moteur/*, data/*, main.js, rendu/* (10 fichiers), ui/*, audio/*. `npm test` passe, `sim.mjs --runs 100 avisee` : 0 erreur, 48 % de victoires.

## BLOQUANT

- **progression.js:76-78** — Niveau 10 (« apogée : 3 épiques ») peut n'afficher AUCUNE épique : les seules épiques non-risque du catalogue (`coups_epuises_sursis`, `ligne_devient_croix`) s'épuisent vite, `piocher()` retombe sur du rare/commun. Repro : seed=1, salle `vestibule` → niveau 10 = `[speciales_synchrones:rare, zone_permanente:commun, renfort_final:commun]`. Pire : si le pool est totalement vide, `propositions:[]` et `run.choisir()` ne peut plus jamais réussir → run figé en `enAttente:'niveau'` à vie. Fix : garantir un pool d'épiques suffisant par palier, et un filet si `propositions.length===0`.
- **run.js:61** + **effets2.js:324** + **competences.js:66** — `etat.memo` n'est jamais réinitialisé en entrant dans une salle. L'effet « Mise en jeu » (`memo.sansFilet=true`, censé durer « jusqu'à la fin de la salle ») désactive donc silencieusement la compétence run-wide « Coup de trop » pour **tout le reste du run**. Fix : `e.memo.sansFilet = false;` en tête de `entrerSalle` (sans toucher `memo.dette`, qui doit lui survivre à un changement de salle).
- **rendu.js:92-98** (`demarrerChute`) + **effets2.js:263-280** (`big_bang`) — `demarrerChute` suppose un déplacement aligné sur un seul axe (x OU y constant) ; `big_bang` émet des `chute` en diagonale (positions aléatoires). Les billes téléportent instantanément sur un axe et n'animent que sur l'autre : effet vedette visuellement cassé à chaque usage. Fix : router ces déplacements vers `demarrerGlisse` (tween 2D), pas `demarrerChute`.

## IMPORTANT

- **progression.js:112** + **run.js:215** — `dette_de_coups` (duree:null) n'entre jamais dans `effetsActifs` ; `chargerRun` ne réinstalle que les hooks de `effetsActifs`. Sauvegarder/recharger avant la salle suivante efface silencieusement la dette (les +5 coups déjà gagnés restent). Fix : sérialiser/relire `ctx.memo.dette` indépendamment, ou passer l'effet en `duree:'salle'`.
- **effets2.js:150-158** — `bombe_instable` détone via `c.detruire(indices,'bombe')` avec seulement la case de la bombe, sans calculer `zoneSpeciale` : la bombe « instable » (rayon+1 annoncé) ne détruit que sa propre case. Fix : pousser une salve `{cellules:[...zoneSpeciale(ctx,i,cellule)], cause:'bombe'}` via `resoudre`.
- **decor.js:128-177** — texture d'étoiles = carré de côté « diagonale du canvas × 1,03 » en **pixels device**. Sur mobile 3×dpr (ex. 393×852 CSS) ≈ 2900×2900 px ≈ 33,6 Mo RGBA, ×2 textures (base + scintillantes) ≈ 67 Mo, **régénérées à chaque resize** (barre d'adresse mobile qui apparaît/disparaît). Risque mémoire/jank réel. Fix : plafonner le côté (ex. 2048 px) au lieu de suivre la diagonale device brute.
- **finale.js:29-33,98** — `fondAlpha`/`griseAlpha` montent mais ne redescendent jamais (pas de fade-out) : `enCours` (donc `rendu.enAnimation`, contrat §5) reste vrai indéfiniment après une victoire/défaite de fin de run, puisqu'aucun `synchroniser()` n'est rappelé après. Fix : ramener les alphas à 0 en fin de séquence.

## MINEUR

- **juice.js / impact.js / particules.js / speciales-fx.js** — 8 pools à tableaux typés quasi identiques (swap-remove) dupliqués dans 4 fichiers ; mutualisables dans un seul helper générique.
- **juice.js:74** — `ctx.font` reconstruit en chaîne à chaque texte dessiné (jusqu'à 64×/frame avec les fantômes) : contredit le « zéro allocation par frame » du contrat §5, coût négligeable en pratique.
- **ui.js:183** — `keydown` posé une fois sur `document` sans fonction de retrait ; inoffensif tant que `creerUI` n'est instancié qu'une fois (cas actuel), fragile sinon.
- **rendu.js:315-322** (`surSalle`) — attend un délai fixe de 450 ms alors que le retard par bille (`(x+y)*0.015`) peut le dépasser sur les grandes grilles (Le Puits, 5×14) : `jouer()` peut résoudre avant la fin visuelle de l'entrée en salle.

## Ce qui est bien

La boucle rAF est bien gardée : `pause()`/`reprendre()` coupent le rendu au menu, aucune fuite `ResizeObserver`/`visibilitychange` détectée. Le bus de hooks (`bus.on/off` par `source`) retire proprement les effets à la sortie de salle — pas de hook orphelin trouvé hors les cas listés ci-dessus. `cartes.js`, après ses trois refontes, utilise `hidden` de façon cohérente partout et ne laisse aucun listener ni nœud DOM orphelin (vérification ciblée, RAS).

**Lignes à changer pour lever les 3 bloquants : ~25-30** (1 ligne pour `memo.sansFilet` ; ~5-10 pour router `big_bang` vers `demarrerGlisse` ; ~15 pour sécuriser/garantir le pool d'épiques niveau 10 et le filet anti-blocage).
