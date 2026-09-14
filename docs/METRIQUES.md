# Métriques de référence (baseline)

Étape 0 de la feuille de route de Martin (`docs/FEUILLE_DE_ROUTE_MARTIN.md`) : mesurer avant de modifier. Chaque itération de feel / cascades / spéciales se compare à cette ligne. Source : `node tools/sim.mjs --runs 200 --politique avisee|gourmande` (seeds 1-200, sortie « métriques »), plus `npm test` (17 tests) et `npm run smoke` (fumée Playwright).

| Métrique (200 runs) | Bot avisé (lit le télégraphe) | Bot gourmand (rotation au hasard) | Tendance attendue |
|---|---|---|---|
| Runs complets (5 salles) | 38 % | 7 % | monter doucement, pas de mur |
| Victoires par salle | 100 / 100 / 93 / 77 / 53 % | — | la marche Tempête → Pendule reste la plus dure |
| Tours par salle (durée) | 16,2 | 20,8 | stable après le juice |
| Taps par rotation | 6,4 | 0,3 | la rotation reste utile, pas décorative |
| Rotations utiles (groupe ≥3 juste après) | 84 % | 5 % | ne pas baisser |
| Groupe tapé moyen | 3,86 billes | 3,85 | ne pas baisser fortement |
| Spéciales explosées / créées | 60 % | 57 % | monter (une spéciale stockée est perdue) |
| Chaîne max moyenne par run (max) | 3,4 (6) | 2,8 (6) | monter avec les cascades |
| Premier gros moment (groupe 6+ ou chaîne) | tap 3,6 (100 % des runs) | tap 3,7 (98 %) | rester ≤ 5 |
| XP moyenne par run | 7 396 | 4 333 | — |

Mesurées le 2026-09-14 après D19, D20 et les 5 épiques de palier 3. Le ressenti (durée réelle d'une salle, juice) se mesure en jouant : Martin.

## Sonde par effet (`tools/_sonde_effets.mjs`, 800 runs avisée, contrefactuel = proposé mais non pris, ±4 points)

Effets de palier 3 : Dernier arrivage +7,0 · Renfort doré +3,3 · Dette +2,5 · Apesanteur +2,4 · Danse des couleurs +0,3 · Mise en jeu −0,6 · Jackpot −2,7 · Foyer −3,7 · Débridé −3,8 · Avalanche −3,9 · Dernière danse −4,1 · Synchronisation −5,4 · Ascension −5,7 · Absorption −7,3 · Dernier mot −9,2.

Lecture : les seuls effets nettement positifs **ajoutent des billes** ; ceux qui détruisent plus (y compris Ascension et Dernier mot, gains mécaniquement purs) sortent négatifs chez un bot qui ne gère pas une grille qui se vide. Dans VERTIGE, **une bille est une munition** : à retenir avant les cascades (feuille de route, étape 2).
