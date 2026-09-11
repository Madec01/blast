// Salles de la phase 1, enchaînées linéairement. Voir CLAUDE.md §7.
export const SALLES = [
  { id: 'vestibule', nom: 'Le Vestibule', type: 'normale', acteMin: 1,
    desc: 'Une salle calme pour prendre le plateau en main.',
    grille: { w: 8, h: 10 }, couleurs: 5, coups: 20, jauge: 3,
    objectif: { type: 'score', cible: 1200 },
    elements: [{ type: 'bulle', n: 2 }], regles: {} },
  { id: 'puits', nom: 'Le Puits', type: 'normale', acteMin: 1,
    desc: 'Étroit et profond : chaque rotation change tout.',
    grille: { w: 5, h: 14 }, couleurs: 5, coups: 26, jauge: 3,
    objectif: { type: 'couleur', cible: 24 },
    elements: [{ type: 'pierre', n: 6 }, { type: 'bulle', n: 2 }], regles: {} },
  { id: 'maree', nom: 'Marée haute', type: 'normale', acteMin: 1,
    desc: 'Tous les 2 tours, une ligne entre par le bas et pousse tout. Elle charrie des pierres.',
    grille: { w: 8, h: 10 }, couleurs: 5, coups: 24, jauge: 3,
    objectif: { type: 'pierres', cible: 12 },
    elements: [{ type: 'pierre', n: 3 }], regles: { maree: { periode: 2, pierres: 2 } } },
  { id: 'tempete', nom: 'Tempête', type: 'normale', acteMin: 1,
    desc: 'Le plateau tourne tout seul à chaque tour. La rotation est annoncée : oriente tes fusées.',
    grille: { w: 8, h: 10 }, couleurs: 5, coups: 20, jauge: 2,
    objectif: { type: 'ballons', cible: 5 },
    elements: [{ type: 'ballon', n: 2 }, { type: 'fusee', n: 2 }], regles: { rotationAuto: 'tempete', ballons: { min: 2 } } },
  { id: 'pendule', nom: 'Le Pendule', type: 'boss', acteMin: 1,
    desc: 'Un quart de tour à chaque tour, en balancier. Tiens jusqu’au score.',
    grille: { w: 8, h: 10 }, couleurs: 5, coups: 30, jauge: 3,
    objectif: { type: 'score', cible: 5000 },
    elements: [{ type: 'ballon', n: 2 }, { type: 'bulle', n: 2 }, { type: 'fusee', n: 1 }, { type: 'pierre', n: 4 }],
    regles: { rotationAuto: 'pendule', ballons: { min: 1 } } },
];
export const ORDRE_PHASE1 = ['vestibule', 'puits', 'maree', 'tempete', 'pendule'];
export const RECHARGE_JAUGE = 6; // taille de groupe qui rend +1 rotation

/**
 * Quand la grille retombe et se remplit (D12, retour de Martin 2026-09-11 : « la grille se remplit
 * constamment de nouvelles boules, ça rend le retournement complètement inutile »). Une grille pleine
 * ne bouge pas quand on la tourne : il faut des trous au moment de la rotation.
 *   continue : chute + remplissage après chaque coup (règle d'origine : la rotation ne déplace rien)
 *   mixte    : chute après chaque coup, les nouvelles billes n'entrent qu'à la rotation
 *   collante : les trous restent ; tout retombe et se remplit à la rotation (§7.2 « Gravité collante »)
 * Priorité : options.gravite (mode Test) > regles.gravite (salle) > MODE_GRAVITE_DEFAUT.
 */
export const MODES_GRAVITE = {
  continue: { nom: 'Continue', desc: 'Chute et remplissage à chaque coup (règle d’origine).', chuteAuTap: true, remplissageAuTap: true },
  mixte: { nom: 'Mixte', desc: 'Chute à chaque coup ; les nouvelles billes n’entrent qu’à la rotation.', chuteAuTap: true, remplissageAuTap: false },
  collante: { nom: 'Collante', desc: 'Les trous restent ; tout retombe et se remplit à la rotation.', chuteAuTap: false, remplissageAuTap: false },
};
export const MODE_GRAVITE_DEFAUT = 'collante';
/** À jauge vide : 'coup' = la rotation coûte un coup (D13), 'refus' = refusée (règle d'origine). */
export const ROTATION_HORS_JAUGE = 'coup';
