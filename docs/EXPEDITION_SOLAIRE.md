# Expédition solaire — version 0.3

## Intention

Donner du temps au plateau : aucune carte ne coupe une salle de la nouvelle campagne. Les huit planètes, de Mercure à Neptune, forment une expédition pour sauver le système solaire. Les anciennes parties conservent leurs règles.

## Règles livrées

- Un choix de build entre deux planètes, avec six cartes dans trois familles : Artificier, Navigateur, Chromaticien. Les effets se cumulent jusqu'au rang III.
- L'XP gagnée pendant la salle détermine la puissance offerte : I sous 1 600 XP, II dès 1 600, III dès 2 800. L'XP de la finale automatique est exclue. Une carte déjà acquise monte de ce palier, dans la limite du rang III.
- Trois cartes ont des compromis explicites : rayon contre coups, résonance contre coups, préparation des couleurs contre XP. Une proposition sans malus reste disponible ; après saturation, une réserve donne trois coups pour la prochaine planète.
- Les niveaux d'XP rendent automatiquement de l'énergie, sans ouvrir de menu.
- Trois recettes de boosters adjacents : ligne + ligne, bombe + ligne, couleur + ligne. Maintenir une pièce prévisualise la recette ; relâcher déclenche.
- Terre et Saturne : dégager les balises et orienter la gravité vers le bord lumineux. Les balises survivent aux explosions.
- Les grands groupes, combos et rotations productives chargent la résonance. À pleine charge, les trois actions suivantes profitent de rotations gratuites et de bombes amplifiées. Aucun chronomètre.
- Chaque planète possède des règles propres : couleurs, énergie, obstacles, XP, portée des bombes, charge de résonance ou rotations imposées.

## Direction visuelle

Huit textures originales calculées localement et mises en cache : globe proche recadré, lumière solaire, étoiles, lunes et anneaux. Tout le décor suit l'angle du plateau. La grille translucide laisse voir la planète tout en gardant les gemmes contrastées. Aucun téléchargement d'image ni service tiers.

Le HUD présente la route solaire, le prochain palier de carte et la résonance. Le bouton Mission ouvre à la demande les traits de la planète, les recettes et le build. Le bilan final récapitule les cartes et leur rang.

## Validation et limites

- 55 tests automatisés : moteur historique, combos dans quatre orientations, progression solaire, balises, résonance, sauvegardes et récompenses.
- 40 expéditions déterministes, politique de recherche à un coup : 19 victoires, 5 858 actions, 184 choix de cartes et 86 combos ; aucune erreur ni interruption de niveau. Sauvegarde rechargée après chaque action.
- Tours moyens par planète, parmi les parties qui l'atteignent : Mercure 14,7 ; Vénus 24,4 ; Terre 27 ; Mars 22,2 ; Jupiter 36 ; Saturne 11,5 ; Uranus 28,5 ; Neptune 36,9.
- Chromium : 320×568, 390×844, 768×1024 et 1440×900 ; tactile/souris, sauvegarde, reprise hors ligne et récompense conservée si l'animation finale est interrompue.

Les simulations ne prédisent pas le taux de réussite humain. Terre constitue le premier obstacle marqué ; Saturne peut être rapide après plusieurs améliorations. Il faudra surtout observer la durée ressentie, la fréquence des combos et la valeur relative des cartes à malus. Les performances sur appareils physiques et les stores restent à valider.

## Reproduire

```sh
npm ci
npm test
npm run sim:solar -- 40
npm run smoke:shot
npm run qa:mobile
```

`CHROMIUM_PATH` permet d'utiliser un Chromium installé. Le smoke joue la seed 1 jusqu'à la victoire par vrais clics, avec la même politique que le simulateur solaire.
