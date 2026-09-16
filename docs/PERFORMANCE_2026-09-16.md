# Cadence de rendu — 0.5.1

Le retour de Martin a été reproduit avec Chromium headless, viewport 390 × 844, densité native 3. Le temps JavaScript restait faible, mais les images arrivaient trop lentement : coût du dessin et de la composition, distinct de la durée des animations.

## Corrections

- Planète, soleil et étoiles rasterisés uniquement au chargement ou au redimensionnement dans un calque séparé. Sa rotation CSS suit exactement celle du plateau. La vignette est fixe et pré-calculée.
- Plus de remplissage du canvas de jeu par un grand décor ni de nouveaux dégradés radiaux à chaque image.
- Suppression des filtres de flou derrière les commandes, compteurs et notifications ; transparence et contours conservés.
- Survols et aperçus regroupés dans le prochain requestAnimationFrame, sans dessins synchrones supplémentaires.
- Canvas de jeu plafonné à une densité de 2 et environ deux mégapixels ; coordonnées tactiles et souris adaptées au rapport réel CSS/pixels. Le texte HTML conserve sa densité native.
- Fond plafonné à deux mégapixels, vignette à un mégapixel. Calques libérés à la destruction et protégés contre les chargements tardifs.

Aucune bibliothèque ajoutée, aucune règle de jeu modifiée. Les textures réalistes sont conservées ; la résolution de rasterisation est bornée pour limiter le coût GPU.

## Mesure reproductible

`CHROMIUM_PATH=/chemin/chromium node tools/perf.mjs [racine]`

Le script utilise une sauvegarde seed 112, attend le chargement puis mesure le repos, huit rotations du rendu et quarante déplacements du pointeur. Les intervalles sont ceux des callbacks requestAnimationFrame, pas une mesure matérielle de présentation à l’écran. Ancienne version : commit 146e7ff.

| Densité native | Avant : médiane / p95 | Après : médiane / p95 |
|---|---:|---:|
| 1 | 16,7 / 16,7 ms | 16,7 / 16,8 ms |
| 3 | 50 / 83,3 ms | 16,7 / 16,7 ms |

Sur la première comparaison à densité 3, cela représente environ 20 → 60 images/s en cadence médiane. Les dégradés radiaux créés pendant la fenêtre mesurée passent à zéro. Le temps JavaScript de dessin reste inférieur à 1 ms au p95 dans ces essais ; il ne comptabilise pas tout le travail différé du navigateur/GPU.

## Vérification et limites

61 tests Node passent. Le scénario navigateur vérifie quatre formats, avec densités 1/3/2/2 : canvas plein écran, plafond de pixels, clic/tap, rotation puis nouveau clic, sauvegarde, reprise hors ligne et récompense persistée avant fin d’animation. Aucun calque dupliqué et aucune erreur navigateur.

Ces résultats ne garantissent pas 60 fps sur tout téléphone physique. Prochaine validation : ressenti sur l’appareil de Martin, puis profilage des longues chaînes si elles seules restent lentes.
