// Ordre de l'expédition ; les modificateurs décrits sont appliqués par les salles et hooks.
export const PLANETES = [
  { id:'mercure', nom:'Mercure', couleur:'#b7aaa0', accent:'#ffc58a', texture:'mercure', lunes:0, anneaux:false, bonus:'4 couleurs : de grands groupes plus faciles.', malus:'Croûte rocheuse : 3 rochers à contourner.' },
  { id:'venus', nom:'Vénus', couleur:'#d9aa65', accent:'#ffe3a6', texture:'venus', lunes:0, anneaux:false, bonus:'Atmosphère ionisée : +15 % d’XP.', malus:'Pression : réserve de rotation limitée à 2.', xp:1.15 },
  { id:'terre', nom:'Terre', couleur:'#318bd0', accent:'#72e5bb', texture:'terre', lunes:1, anneaux:false, bonus:'Assistance lunaire : 5 rotations au départ.', malus:'Sauver les 2 noyaux : les explosions ne suffisent pas.' },
  { id:'mars', nom:'Mars', couleur:'#c6603c', accent:'#ffb07d', texture:'mars', lunes:2, anneaux:false, bonus:'Faible gravité : 5 rotations au départ.', malus:'Champ de débris : 10 rochers à contourner.' },
  { id:'jupiter', nom:'Jupiter', couleur:'#c99877', accent:'#ffdca3', texture:'jupiter', lunes:4, anneaux:false, bonus:'Énergie géante : bombes de rayon +1.', malus:'Grande tache rouge : rotation forcée tous les 5 tours.', rayon:1 },
  { id:'saturne', nom:'Saturne', couleur:'#c8b586', accent:'#fff0b8', texture:'saturne', lunes:3, anneaux:true, bonus:'Anneaux conducteurs : résonance gagnée +50 %.', malus:'Débris des anneaux : 8 rochers protègent les noyaux.', resonance:1.5 },
  { id:'uranus', nom:'Uranus', couleur:'#86d5de', accent:'#bcfbff', texture:'uranus', lunes:2, anneaux:true, bonus:'Axe incliné : 6 rotations au départ.', malus:'Glace dense : 6 couleurs à assembler.' },
  { id:'neptune', nom:'Neptune', couleur:'#3564d5', accent:'#8bcaff', texture:'neptune', lunes:1, anneaux:false, bonus:'Dernier élan : +25 % d’XP.', malus:'Vents extrêmes : rotation forcée tous les 4 tours.', xp:1.25 },
];
export const planeteParId = (id) => PLANETES.find((p) => p.id === id) ?? null;
export const SALLES_SOLAIRES = PLANETES.map((p,i) => ({
  id:'solaire_'+p.id, planete:p.id, nom:p.nom, type:i===7?'boss':'normale', acteMin:1,
  desc:i===0?'Sauve le Système solaire, de Mercure à Neptune. Assemble les gemmes et prépare tes rotations.':p.bonus+' '+p.malus,
  grille:{w:8,h:10}, couleurs:i===0?4:i===6?6:5,
  coups:[32,34,36,36,36,38,38,40][i], jauge:[4,2,5,5,4,5,6,5][i],
  objectif:[{type:'billes',cible:95},{type:'score',cible:2000},{type:'reliques',cible:2,sortie:{gravite:1}},{type:'billes',cible:120},{type:'score',cible:3100},{type:'reliques',cible:2,sortie:{gravite:3}},{type:'billes',cible:135},{type:'score',cible:4200}][i],
  elements:[[{type:'pierre',n:3},{type:'fusee',n:1}],[{type:'bulle',n:4},{type:'fusee',n:2}],[],[{type:'pierre',n:10},{type:'fusee',n:2}],[{type:'pierre',n:4},{type:'fusee',n:2}],[{type:'pierre',n:8}], [{type:'bulle',n:4},{type:'fusee',n:2}],[{type:'pierre',n:6},{type:'fusee',n:3}]][i],
  regles:{renfort:{seuil:0.60,min:4,max:7},...([4,7].includes(i)?{rotationAuto:'pendule',rotationPeriode:i===4?5:4}:{})},
}));
// Les huit anciens identifiants restent immuables pour les expéditions déjà sauvegardées.
export const ORDRE_SOLAIRE_HISTORIQUE = SALLES_SOLAIRES.map((s) => s.id);
const TITRES = [
  ['Premier contact', 'Failles brûlantes', 'Le cœur de Mercure'],
  ['Sous les nuages', 'Pression maximale', 'Percer la fournaise'],
  ['Signal lunaire', 'Orbites encombrées', 'Le dernier refuge'],
  ['Dunes rouges', 'Le champ de débris', 'Réveiller Mars'],
  ['Bandes nuageuses', 'La grande tache rouge', 'Calmer la géante'],
  ['Poussière des anneaux', 'Passage étroit', 'Les noyaux captifs'],
  ['Lumière de glace', 'L’axe renversé', 'Dégeler le cœur'],
  ['Aux confins', 'Vents supersoniques', 'Le Système sauvé'],
];
const OBJECTIFS = [
  [{type:'billes',cible:95},{type:'score',cible:1800},{type:'reliques',cible:2,sortie:{gravite:1}}],
  [{type:'billes',cible:110},{type:'score',cible:2200},{type:'reliques',cible:2,sortie:{gravite:3}}],
  [{type:'billes',cible:110},{type:'score',cible:2200},{type:'reliques',cible:2,sortie:{gravite:2}}],
  [{type:'billes',cible:125},{type:'score',cible:2400},{type:'reliques',cible:2,sortie:{gravite:1}}],
  [{type:'billes',cible:140},{type:'score',cible:2700},{type:'reliques',cible:2,sortie:{gravite:3}}],
  [{type:'billes',cible:125},{type:'score',cible:2600},{type:'reliques',cible:2,sortie:{gravite:1}}],
  [{type:'billes',cible:120},{type:'score',cible:2500},{type:'reliques',cible:2,sortie:{gravite:2}}],
  [{type:'billes',cible:150},{type:'score',cible:3100},{type:'reliques',cible:2,sortie:{gravite:3}}],
];
export const NIVEAUX_SOLAIRES = SALLES_SOLAIRES.flatMap((base,i) => TITRES[i].map((titre,j) => ({
  ...base, id:`${base.id}_${j+1}`, nom:`${base.nom} · ${titre}`,
  planeteIndex:i, niveauPlanete:j+1, totalNiveauxPlanete:3,
  phase:['decouverte','defi','sauvetage'][j], titreNiveau:titre,
  type:j===2?'boss':'normale',
  desc:['Découvre les particularités de cette planète.', 'Prépare tes combinaisons pour franchir ce défi.', 'Libère les noyaux par la sortie pour sauver cette planète.'][j],
  coups:base.coups-2+j*2,
  objectif:OBJECTIFS[i][j],
  elements:base.elements.map(el=>({...el,n:el.type==='pierre'?el.n+(j===1?2:0):el.n})),
  // La contrainte affichée doit rester exacte même lorsque l’objectif change.
  malus:(i===2?(j===2?'Orbites fragiles : les noyaux doivent rejoindre leur sortie.':'Orbites encombrées : préparer les groupes avant de tourner.'):i===5?'Débris des anneaux : 8 rochers occupent le plateau.':PLANETES[i].malus)+(j===1&&base.elements.some(el=>el.type==='pierre')?' Deux rochers supplémentaires dans ce défi.':''),
})));
export const ORDRE_SOLAIRE = NIVEAUX_SOLAIRES.map(s=>s.id);
