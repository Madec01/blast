# Métriques de référence (baseline)

Étape 0 de la feuille de route de Martin (`docs/FEUILLE_DE_ROUTE_MARTIN.md`) : mesurer avant de modifier. Chaque itération de feel / cascades / spéciales se compare à cette ligne. Source : `node tools/sim.mjs --runs 200 --politique avisee|gourmande` (seeds 1-200, sortie « métriques »), plus `npm test` (17 tests) et `npm run smoke` (fumée Playwright).

| Métrique (200 runs) | Bot avisé (lit le télégraphe) | Bot gourmand (rotation au hasard) | Tendance attendue |
|---|---|---|---|
| Runs complets (5 salles) | 38 % | 7 % | monter doucement, pas de mur |
| Victoires par salle | 100 / 100 / 93 / 77 / 53 % | — | la marche Tempête → Pendule reste la plus dure |
| Tours par salle (durée) | 16,2 | 20,8 | stable après le juice |
| Taps par rotation | 6,4 | 0,3 | la rotation reste utile, pas décorative |
| Rotations utiles (groupe ≥3 juste après) | 84 % | 5 % | ne pas baisser |
| Rotations productives (moteur, F09 : groupe ≥3 plus gros qu'avant, ou un groupe ≥3 de plus) | 87 % | 5 % | ne pas baisser ; alimente la frénésie (D25) |
| Groupe tapé moyen | 3,86 billes | 3,85 | ne pas baisser fortement |
| Spéciales explosées / créées | 60 % | 57 % | monter (une spéciale stockée est perdue) |
| Chaîne max moyenne par run (max) | 3,4 (6) | 2,8 (6) | monter avec les cascades |
| Premier gros moment (groupe 6+ ou chaîne) | tap 3,6 (100 % des runs) | tap 3,7 (98 %) | rester ≤ 5 |
| XP moyenne par run | 7 396 | 4 333 | — |

Mesurées le 2026-09-14 après D19, D20 et les 5 épiques de palier 3. Le ressenti (durée réelle d'une salle, juice) se mesure en jouant : Martin.

Étape 1 Feel (F08, F09, hitstop — 2026-09-14 après-midi) : **toutes les lignes ci-dessus inchangées** (feel pur, aucune règle touchée) ; seule la ligne « rotations productives » est nouvelle.

## Sources de jauge par salle (D25 frénésie, D26 combos) — bot avisé, 200 runs, jeu normal

Taps de 2 : 2,2 · 3-4 : 8,4 · **5-7 : 3,1** · **8-9 : 0,3** · **10+ : 0,2** · rotations productives : **1,92** · combos de spéciales (≥ 2 salves explosives dans une même action) : **1,35** · cascades : 0 (1,8 avec le prototype D24 sur rotation ≥ 5). `node tools/sim.mjs --politique avisee`, ligne « par salle ».

## Prototype D24 — cascades (`--cascades rotation|toutes --cascadeMin N`, bot avisé, 200 runs, jamais actif par défaut)

Les groupes ≥ N formés par une chute explosent d'eux-mêmes comme s'ils étaient tapés (XP de tap × chaîne, spéciale au seuil), jusqu'à 4 vagues.

| Variante | Runs complets | Tours / salle | Groupe tapé | Rot. productives* | Chaîne max | Cascades / salle | Taps 5-7 / salle | Tempête | Pendule | Billes rest. Tempête |
|---|---|---|---|---|---|---|---|---|---|---|
| Jeu normal (baseline) | 38 % | 16,2 | 3,86 | 87 % | 3,40 | 0 | 3,1 | 77 % | 53 % | 19 |
| **Sur rotation, ≥ 5** | **43 %** | 14,6 | 3,54 | 60 % | **3,96** | 1,8 | 1,5 | 72 % | 63 % | 15 |
| Sur rotation, ≥ 4 | 38 % | 13,0 | 3,44 | 40 % | 4,25 | 3,6 | 1,4 | 63 % | 63 % | 10 |
| Après chaque chute, ≥ 5 | 42 % | 14,1 | 3,38 | 63 % | 4,17 | 2,6 | 0,8 | 75 % | 60 % | 15 |
| Après chaque chute, ≥ 4 | 34 % | 11,5 | 3,12 | 43 % | 4,63 | 6,0 | 0,6 | 64 % | 60 % | 9 |

\* Avec cascades, « productive » est mesurée après les vagues : un groupe soufflé par la cascade ne compte plus (artefact de mesure, à corriger si D24 est adoptée — évaluer avant les vagues).

Lecture : **sur rotation seulement, seuil 5** est le seul réglage qui gagne sur tous les fronts (runs complets, chaînes, Pendule) sans effondrer la grille. Prix à payer, quel que soit le réglage : les gros taps du joueur (5-7) sont divisés par 2 — la cascade **prend les groupes que le joueur aurait tapés** —, et Tempête perd 5 points (grille plus vide : 19 → 15 billes en fin de salle). Seuil 4 ou cascades après chaque chute vident la grille (Tempête 63-64 %, 9-10 billes) : « une bille est une munition ».

## Sonde par effet (`tools/_sonde_effets.mjs`, 800 runs avisée, contrefactuel = proposé mais non pris, ±4 points)

Effets de palier 3 : Dernier arrivage +7,0 · Renfort doré +3,3 · Dette +2,5 · Apesanteur +2,4 · Danse des couleurs +0,3 · Mise en jeu −0,6 · Jackpot −2,7 · Foyer −3,7 · Débridé −3,8 · Avalanche −3,9 · Dernière danse −4,1 · Synchronisation −5,4 · Ascension −5,7 · Absorption −7,3 · Dernier mot −9,2.

Lecture : les seuls effets nettement positifs **ajoutent des billes** ; ceux qui détruisent plus (y compris Ascension et Dernier mot, gains mécaniquement purs) sortent négatifs chez un bot qui ne gère pas une grille qui se vide. Dans VERTIGE, **une bille est une munition** : à retenir avant les cascades (feuille de route, étape 2).
