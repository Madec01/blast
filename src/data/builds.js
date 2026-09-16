// Le rang (1–3) est la puissance acquise, non une durée. Les compromis s'appliquent par rang.
export const CARTES_BUILD = [
  {id:'artificier',nom:'Artificier',archetype:'Artificier',bonus:'Bombes : +1 de rayon par rang.',malus:'−2 coups par salle et par rang.',desc:'Bombes +1 de rayon · −2 coups par salle, par rang.',risque:true},
  {id:'amorce_sure',nom:'Amorce précise',archetype:'Artificier',bonus:'Seuil de création des boosters −1 par rang (minimum 3).',malus:null,desc:'Seuils des boosters −1 par rang, sans contrepartie.'},
  {id:'navigateur',nom:'Navigateur',archetype:'Navigateur',bonus:'+2 rotations par salle et par rang.',malus:null,desc:'+2 rotations par salle et par rang, sans contrepartie.'},
  {id:'orbite_risquee',nom:'Orbite audacieuse',archetype:'Navigateur',bonus:'Rotations productives : +12 de résonance par rang.',malus:'−1 coup par salle et par rang.',desc:'Rotations productives : +12 résonance · −1 coup par salle, par rang.',risque:true},
  {id:'chromaticien',nom:'Chromaticien',archetype:'Chromaticien',bonus:'Les groupes de 4+ teintent jusqu’à 1 voisine par rang.',malus:null,desc:'Groupes de 4+ : teinte jusqu’à 1 voisine par rang à leur couleur.'},
  {id:'spectre_instable',nom:'Spectre instable',archetype:'Chromaticien',bonus:'Après une rotation productive, teinte 2 voisines par rang du plus grand groupe.',malus:'−10 % d’XP par rang.',desc:'Rotation productive : étend le meilleur groupe de 2 gemmes par rang · −10 % d’XP par rang.',risque:true},
];
export const carteBuildParId = (id) => CARTES_BUILD.find((c) => c.id===id);
export const SEUILS_BUILD = [0,1600,2800];
export const plafondBuild = (planeteIndex) => planeteIndex == null ? 3 : planeteIndex < 2 ? 1 : planeteIndex < 5 ? 2 : 3;
export const palierBuild = (xp, planeteIndex) => Math.min(plafondBuild(planeteIndex),xp>=SEUILS_BUILD[2]?3:xp>=SEUILS_BUILD[1]?2:1);
