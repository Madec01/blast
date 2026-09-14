# Idées d'effets épiques — palier 3 (niveaux 7-10)

Lot de 14 idées, dont **6 paris** (risque réel, jamais gratuit) et **7 liées à la rotation**
(elles changent *quand* on tourne — pilier n°1). Aucune ne reprend un effet existant de
`src/data/effets.js` / `effets2.js`.

Format par idée : `nom` — carte — pourquoi c'est majeur (3-5 tours, ordre de grandeur) —
implémentation (hooks, ~lignes) — référence.

---

### 1. Surtension *(pari, rotation)*
« Chaque tap sans rotation empile +1 de rayon (max +4) sur la prochaine spéciale créée ; la
rotation qui suit vide la jauge entière. »
Majeur : après 4-5 tours sans tourner, une simple bombe passe de rayon 3×3 à ~9×9 — un seul
tap peut nettoyer 60-70 % de la grille — mais on paie les 2 points de jauge d'un coup au lieu
de 1. Force un vrai choix « je patiente ou je tourne maintenant ».
Implémentation : `avantTap` (compteur memo), `apresRotation` (reset + `ctx.etat.jauge=0`),
réducteur sur la création de spéciale pour le rayon. ~20 lignes.
Référence : Peglin (orbes à charge), Balatro (jokers à charge/décharge type Ride the Bus).

### 2. Dernière danse *(rotation)*
« La rotation qui vide complètement la jauge détruit toute la ligne ou colonne où elle
atterrit. »
Majeur : rend le moment « jauge à 0 » (aujourd'hui anodin) payant — ~1 proc toutes les 2-3
rotations, et le choix de l'axe (90° vs 180°) devient stratégique juste avant de taper le fond
de jauge, au lieu d'un réflexe.
Implémentation : `avantRotation` (lire la jauge avant décrément) + `apresRotation` (si jauge
tombée à 0, détruire la colonne/ligne de sortie via `colonnes()`). ~15 lignes.
Référence : Slay the Spire (payoff sur ressource épuisée), Luck be a Landlord (jackpot sur la
dernière pièce).

### 3. Point de rupture *(pari, rotation)*
« La jauge peut monter à 5, mais au-delà de 2 chaque rotation détruit 1 bille aléatoire de la
couleur dominante. »
Majeur : permet de banquer jusqu'à 3 charges normalement perdues au plafond, pour un tour
explosif plus tard — au prix d'environ 3-5 billes perdues sur la durée. Deal ressource contre
tempo, jamais neutre.
Implémentation : réducteur `jaugeInitiale` (+3) + `apresRotation` (si jauge avant tourner > 2,
détruire 1 bille dominante). ~15 lignes.
Référence : Balatro (stockage au-delà du max), Vampire Survivors (surcharge).

### 4. Écho *(spéciales)*
« Chaque case où une spéciale explose reste marquée 2 tours : le premier groupe qui la
traverse devient spéciale du même type. »
Majeur : crée une seconde vague de spéciales gratuites sur les zones déjà nettoyées — 2 à 4
spéciales « fantômes » en plus sur 3-5 tours, sans qu'on les fabrique soi-même.
Implémentation : `explosion` (marquer les indices, compteur 2 tours en memo), `apresChute`
(vérifier marquage, convertir la case en spéciale). ~25 lignes.
Référence : Toon Blast/Dream Blast (cases à débloquer en cascade), Peglin (ricochet).

### 5. Jackpot *(pari)*
« 1 tap sur 5 (aléatoire) vaut ×5 XP ; les 4 autres valent ×0,5. »
Majeur : transforme un flux d'XP linéaire en variance pure — total attendu à peine positif
(~1,8× sur 5 taps au lieu de 1×), mais un tap peut valoir autant que 10 taps normaux, et 4
tours peuvent sembler presque à vide avant le proc.
Implémentation : réducteur `xpGain` + compteur/tirage 20 % en memo. ~10 lignes.
Référence : Luck be a Landlord (symboles jackpot), Peglin (Coin Flip Orb).

### 6. Supernova différée *(pari, rotation)*
« Marque les spéciales présentes ; à la 3ᵉ rotation suivante elles explosent toutes (rayon
+1), mais chaque rotation d'ici là coûte 1 coup de plus. »
Majeur : avec 3+ spéciales sur le plateau, l'explosion combinée peut raser 30-50 billes d'un
coup — mais coûte ~3 coups supplémentaires (15-20 % du budget d'un tour moyen) à l'attente, et
le sens de la 3ᵉ rotation devient décisif pour maximiser la chute.
Implémentation : activation (marquer indices), `avantRotation` (compteur), réducteur
`coutRotation` (+1 pendant le décompte), `apresRotation` (détruire + `retomber()` au décompte
zéro). ~25 lignes.
Référence : Slay the Spire (relique à retardement), Balatro (Blueprint/Brainstorm différé).

### 7. Danse des couleurs *(spéciales)*
« Chaque bombe de couleur détruite en fait apparaître une seconde, sur une autre couleur au
hasard. »
Majeur : la bombe de couleur (seuil 10, déjà rare) devient un mini-moteur en chaîne — une
seule fabrication peut déclencher 2-3 bombes en cascade sur 3-4 tours, chacune valant
15-20 % de la grille.
Implémentation : `explosion` (si `cause==='couleur'`, créer une 2ᵉ bombe couleur sur une case
aléatoire d'une autre couleur). ~15 lignes.
Référence : Candy Crush/Toon Blast (double color bomb), Vampire Survivors (arme qui se
duplique à l'évolution).

### 8. Ceinture d'astéroïdes *(renfort)*
« Chaque pierre détruite laisse tomber 2 billes de renfort de la couleur la plus rare au lieu
d'une case vide. »
Majeur : sur une salle à pierres ou à objectif couleur, transforme chaque pierre cassée en
carburant ciblé — accélère d'environ ×2 la constitution des gros groupes de la couleur rare
sur 4-5 tours.
Implémentation : `groupeDetruit`/`explosion` (détecter la cause pierre) + insertion locale de
billes ciblées façon `renfort_cible`. ~20 lignes.
Référence : Vampire Survivors (ressources qui deviennent XP), Balatro (Pierre philosophale).

### 9. Vertige final *(rotation, xp)*
« Chaque rotation dans le même sens que la précédente donne +1 coup, jusqu'à 3 fois par
tour. »
Majeur : jusqu'à +3 coups par tour en enchaînant le même sens, soit potentiellement +9-12
coups sur 3-4 tours — pousse à planifier une série de rotations identiques plutôt qu'une par
tour au hasard.
Implémentation : `apresRotation` (comparer au sens précédent en memo, compteur par tour,
`ctx.etat.coups+=1`), `finTour` (reset compteur). ~15 lignes.
Référence : Balatro (combo « même type »), Luck be a Landlord (série identique = bonus).

### 10. Roulette russe *(pari, rotation)*
« Chaque rotation a 1 chance sur 3 de détruire une ligne aléatoire gratuitement, sinon elle
coûte 1 coup de plus. »
Majeur : sur 6 rotations dans la salle, ~2 destructions de ligne gratuites en moyenne, mais
~4 coups supplémentaires perdus sur les ratés — risque net négatif en coups, compensé par un
potentiel de score en pointe.
Implémentation : `apresRotation` (tirage 1/3 → détruire une ligne aléatoire + `retomber()`),
réducteur `coutRotation` (+1 sinon). ~20 lignes.
Référence : Peglin (orbe chanceux), Luck be a Landlord (roue de la fortune).

### 11. Comète noire *(coups)*
« Le premier tap de chaque tour impair détruit aussi les voisins directs du groupe tapé. »
Majeur : sur une salle de 8-10 tours, 4-5 procs garantis, chacun ajoutant l'équivalent d'un
petit groupe de 4-5 billes gratuites — gain de score et de progression d'objectif régulier,
sans toucher à la rotation (contrepoids volontaire du lot).
Implémentation : `avantTap` (vérifier tour impair + 1er tap via memo), `groupeDetruit`
(étendre via `voisins()`). ~20 lignes.
Référence : Vampire Survivors (proc périodique garanti), Candy Crush (bonus premier coup).

### 12. Dette cosmique *(pari, xp)*
« ×3 XP pour les 3 prochains tours ; ensuite, 0 XP pendant 1 tour. »
Majeur : 3 tours à triple XP peuvent valoir 6-9 tours normaux (souvent 1-2 niveaux de palier
d'un coup) si on garde ses gros combos pour la fenêtre — au prix d'un tour entier « mort » en
XP juste après. Pari à haute variance, jamais gratuit.
Implémentation : réducteur `xpGain` (compteur memo : 3 tours ×3 puis 1 tour ×0), `finTour`
pour décrémenter. ~15 lignes.
Référence : Balatro (buff temporaire à contrecoup), Slay the Spire (Combustion).

### 13. Horizon des événements *(rotation)*
« Chaque rotation à 180° convertit toutes les pierres visibles en billes de la couleur
dominante. »
Majeur : donne au 180° (souvent choisi pour la seule gravité) un rôle offensif direct — sur
une salle à pierres, ça peut en convertir 3-6 par utilisation, soit une bonne partie de
l'objectif en 2-3 rotations bien choisies.
Implémentation : `apresRotation` (si `e.sens===2`, convertir les pierres visibles via
`convertir()`). ~15 lignes.
Référence : Toon Blast/Dream Blast (obstacles transformés par un combo spécial), Peglin
(relique liée à un tir précis).

### 14. Rafale *(éléments)*
« Les fusées, présentes et futures, tirent une seconde fois dans l'axe perpendiculaire avant
de disparaître. »
Majeur : double la portée effective de chaque fusée produite pour le reste de la salle — une
fusée qui nettoyait une ligne (~8 billes) en nettoie désormais une ligne et une colonne
(~15 billes), sur les 2-4 fusées généralement produites en fin de run.
Implémentation : `apresChute`/résolution d'élément fusée (détecter la résolution, relancer un
second tir perpendiculaire via `trajetFusee()`). ~20 lignes.
Référence : Vampire Survivors (évolution d'arme qui se double), Peglin (multi-tir).

---

## Top 6 (priorité d'implémentation)

1. **Dernière danse** — un seul hook, un payoff net et lisible, remet du sens au « jauge à 0 ».
2. **Danse des couleurs** — ~15 lignes, effet spectaculaire (double color bomb) sans risque
   d'exploit, très lisible à l'écran.
3. **Comète noire** — implémentation triviale, gain régulier et prévisible, contrepoids sûr
   aux idées à variance du lot.
4. **Horizon des événements** — donne enfin un usage stratégique au 180°, coût d'implé faible,
   forte lisibilité (pierres → billes, visible instantanément).
5. **Surtension** — la plus fidèle au pilier « la rotation est une décision », au prix d'une
   logique un peu plus lourde (charge + coût variable) à bien télégraphier à l'écran.
6. **Jackpot** — le pari le plus simple à coder (~10 lignes) et le plus proche de l'inspiration
   Luck be a Landlord / Peglin ; sa variance pure comble un vide du pool actuel (aucun pari
   « par tap »).

## Critique du pool palier 3 actuel

Sur les 9 effets déjà en place, seuls 2 sont réellement épiques (Ascension, Mise en jeu) — le
reste (Apesanteur, Dette, Foyer, Débridé, Synchronisation, Dernier mot, Renfort final) est du
rare/commun à un seul déclenchement, et le duo Synchronisation/Dernier mot est quasi redondant
(même « toutes les spéciales explosent », seul le déclencheur change) ; pire, les deux effets
de rotation existants (Apesanteur, Débridé) rendent la rotation gratuite et automatique — ils
*suppriment* la décision de rotation au lieu de la rendre plus intéressante, à l'inverse du
pilier n°1.
