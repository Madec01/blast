// Paliers de feel (F08, feuille de route de Martin) : 3 / 5 / 8 / 10+. Une seule table, lue par le
// rendu (anticipation, particules, flash, onde, secousse, squash du plateau, hitstop, taille du +XP)
// et par l'audio, pour qu'un groupe de 6 soit visiblement plus fort qu'un 3, et un 10+ hors norme.
// Pur : ni DOM ni moteur, testable avec node --test.
export const PALIERS_GROUPE = [3, 5, 8, 10];

/** Palier d'une salve selon sa taille : 0 = 2 billes · 1 = 3-4 · 2 = 5-7 · 3 = 8-9 · 4 = 10+. */
export function palierGroupe(taille) {
  let p = 0;
  for (const s of PALIERS_GROUPE) if (taille >= s) p++;
  return p;
}

/**
 * Amplitudes par palier (indexées par `palierGroupe`) :
 *   particules : confettis par bille détruite · rafale : confettis en plus au barycentre
 *   impact : multiplicateur du flash/halo (impact.js) · onde : force de l'anneau (0 = aucun)
 *   shake : secousse (0..1, plafonnée par le rendu)
 *   anticipation : durée (s) du pré-squash avant l'explosion · squash : amplitude x/y · recul : recul vers le barycentre (case)
 *   plateau : squash élastique du plateau entier à l'explosion (0 = aucun)
 *   hitstop : micro-pause (s) juste avant l'explosion — 60-90 ms dès 8 (feuille de Martin, étape 1)
 *   xp : taille du texte +XP en multiple de case
 */
export const FEEL = [
  { particules: 5, rafale: 0, impact: 0.75, onde: 0, shake: 0.1, anticipation: 0.06, squash: 0.05, recul: 0.04, plateau: 0, hitstop: 0, xp: 0.42 },
  { particules: 6, rafale: 0, impact: 1.0, onde: 0, shake: 0.25, anticipation: 0.08, squash: 0.08, recul: 0.055, plateau: 0, hitstop: 0, xp: 0.45 },
  { particules: 8, rafale: 12, impact: 1.35, onde: 1.0, shake: 0.45, anticipation: 0.1, squash: 0.11, recul: 0.07, plateau: 0.03, hitstop: 0, xp: 0.55 },
  { particules: 10, rafale: 24, impact: 1.8, onde: 1.4, shake: 0.7, anticipation: 0.12, squash: 0.14, recul: 0.09, plateau: 0.05, hitstop: 0.06, xp: 0.65 },
  { particules: 12, rafale: 40, impact: 2.3, onde: 2.0, shake: 1.0, anticipation: 0.14, squash: 0.17, recul: 0.11, plateau: 0.07, hitstop: 0.09, xp: 0.8 },
];
