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
// Small groups stay crisp. Only exceptional discharges briefly accent the whole matrix.
export const FEEL = [
  { particules: 3, rafale: 0, impact: .55, onde: 0, shake: 0, anticipation: .025, squash: .018, recul: .008, plateau: 0, hitstop: 0, xp: .42 },
  { particules: 4, rafale: 0, impact: .7, onde: 0, shake: 0, anticipation: .035, squash: .022, recul: .012, plateau: 0, hitstop: 0, xp: .45 },
  { particules: 5, rafale: 6, impact: 1, onde: .7, shake: .08, anticipation: .045, squash: .028, recul: .018, plateau: 0, hitstop: 0, xp: .55 },
  { particules: 7, rafale: 12, impact: 1.35, onde: 1, shake: .22, anticipation: .06, squash: .035, recul: .025, plateau: 0, hitstop: 0, xp: .65 },
  { particules: 9, rafale: 22, impact: 1.8, onde: 1.5, shake: .5, anticipation: .075, squash: .045, recul: .035, plateau: .012, hitstop: .025, xp: .8 },
];
