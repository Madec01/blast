# Recherche VFX — juice « Cartoon pop »

Contexte : Martin juge le juice actuel (§2/§5 CONTRATS.md) trop simple/sec. Objectif : niveau Candy Crush / Dream Blast / Royal Match, sans dépendance réseau, < 5 Mo, Canvas 2D. Sources citées entre parenthèses ; vérifiées par recherche web le 2026-09-14.

## 1. Ce que font les références, vs VERTIGE aujourd'hui

**1. Tap sur un groupe**
- Candy Crush/Toon Blast/Royal Match : pré-squash ~60-100 ms avant l'éclatement, flash bref au centre, morceaux qui volent avec une vraie trajectoire (rebond sur les bords), son « pop » dont le pitch monte avec la taille.
- Dream Blast : plus « mou » — poof rond sans angle, halo de couleur qui s'étend puis se dissipe, léger zoom in/out caméra.
- Satisfaisant : anticipation (pré-squash) + impact (flash) + résolution physique (morceaux qui rebondissent, pas un simple fade) + son calé à la frame exacte.
- VERTIGE : `detruit` retire la bille instantanément (`billes.delete`), confettis+étoiles partent en éventail (`source-over`), pas de pré-squash, pas de flash, onde de choc seulement si `cause` est explosive.

**2. Chute / rebond**
- Candy Crush : accélération constante, rebond mou à l'arrivée, colonnes en cascade légèrement décalée, petit son par bille.
- Toon Blast : rebond plus marqué (overshoot), squash 15-20 % au sol, nuage de poussière ovale.
- Dream Blast : ressort amorti (spring), quasi pas de rebond dur, jiggle résiduel.
- Royal Match : chute rapide, overshoot + poussière, son « thud » groupé (pas un son par bille).
- Satisfaisant : overshoot qui casse la linéarité + poussière qui ancre l'impact au décor + son groupé.
- VERTIGE : `avancerChute` intègre déjà accel 78 cases/s² + restitution 0,25 (bon sur le papier) mais zéro poussière, squash uniquement vertical (`bv.squashX/Y`), un son « rebond » par bille individuelle (peut spammer).

**3. Activation d'une spéciale**
- Candy Crush : bombe/rayé = flash blanc 2-3 frames + onde qui repousse visuellement les voisins ; ligne = double explosion qui balaie toute la rangée en ~150-200 ms avec une traînée lumineuse continue (pas instantanée) ; couleur = éclairs qui vont chercher chaque bonbon ciblé en cascade (délai visible entre chacun).
- Royal Match : rocket = traînée qui suit la trajectoire en temps fixe (feel constant, quelle que soit la distance) ; bombe = flash + squash de proximité sur les cases voisines.
- Satisfaisant : flash+onde donnent le poids avant même la disparition ; la traînée rend la trajectoire lisible ; le ciblage en cascade crée une petite narration (un pic par bonbon touché).
- VERTIGE : `surSpeciale` ne fait qu'un `pulse` d'échelle (+18 %, 220 ms) sur la bille — rien à l'activation, aucune distinction visuelle bombe/ligne/couleur, l'onde générique n'arrive qu'à `detruit`.

**4. Combo de spéciales**
- Candy Crush : flash plein écran, zoom-in caméra ~10 %, ralenti perceptible ~200-300 ms avant l'explosion massive, fanfare + mot énorme (« DELICIOUS! ») qui rebondit.
- Toon Blast/Royal Match : combo bombe+bombe ou rocket+rocket = secousse forte + zoom léger + double traînée.
- Satisfaisant : le ralenti+zoom créent une fenêtre d'anticipation qui rend l'explosion suivante disproportionnée ; le texte géant confirme socialement l'exploit.
- VERTIGE : les mots de combo existent (4/6/8/10+, rebond back-out) mais liés à la *taille du groupe tapé*, pas aux combinaisons de spéciales ; aucun ralenti, aucun zoom, chaque `detruit`/`speciale` du journal joue séquentiellement sans traitement spécial.

**5. Fin de niveau (« Sugar Crush »)**
- Candy Crush : séquence dédiée — les bonbons restants explosent un par un (balayage), le score grimpe visiblement à chaque explosion, musique qui monte, confettis + trophée en fin. Plusieurs secondes.
- Royal Match/Toon Blast : équivalent plus court, même principe (reste converti en score animé).
- Satisfaisant : transformer le « reste » en récompense comptée un par un fait « durer le plaisir » et donne un sentiment de contrôle sur le score final.
- VERTIGE : rien — `finSalle` est listé au journal (§4) mais absent du `switch` de `jouer()` dans rendu.js : aucun traitement visuel, c'est géré ailleurs (hors périmètre lu).

**6. Entrée du plateau**
- Candy Crush/Toon Blast : cascade de billes depuis le haut à l'ouverture, décalage diagonal/colonne, léger rebond, respiration finale du plateau.
- Satisfaisant : la cascade donne l'impression que le plateau « prend vie » au lieu d'un pop instantané.
- VERTIGE : `surSalle` fait déjà tomber toutes les billes avec un décalage de 3 cases et un retard proportionnel à `(x+y)*0.015` (cascade diagonale, 450 ms) — c'est le point le plus proche d'une référence déjà présent ; pas de respiration finale distincte au-delà du `squashPlateau` générique.

**7. Échec (plus de coups)**
- Candy Crush : plateau grisé, panneau « Plus de coups ! », mascotte triste, option de continuer contre pièces.
- Royal Match : mascotte anime une déception, fond flouté.
- Satisfaisant : contraste net (extinction du plateau) + personnification qui adoucit l'échec.
- VERTIGE : aucun événement d'échec séparé de `finSalle{victoire:false}` dans le journal lu — pas comparable côté rendu Canvas, à vérifier côté UI (hors périmètre).

**8. Écran de niveau réussi**
- Candy Crush : étoiles (1-3) qui tombent une par une avec un « ding » + flash, confettis, score qui défile, carte suivante qui se déverrouille.
- Royal Match : cartes de récompense qui volent du centre vers leurs emplacements avec traînée (« whoosh »).
- Satisfaisant : score incrémenté (pas un chiffre statique) + étoiles rythmées par un accent sonore chacune.
- VERTIGE : hors périmètre du rendu Canvas lu (§7 UI non lu) — le contrat ne mentionne aucune animation de cartes dans rendu.js.

## 2. Bibliothèques vendorables (hors ligne, sans CDN)

| Bibliothèque | Taille min+gz | Licence | Apport pour notre Canvas 2D | Coût d'intégration | Verdict |
|---|---|---|---|---|---|
| GSAP (core+plugins) | ~50 Ko complet / ~22 Ko core tree-shaké | 100 % gratuite tout usage commercial depuis avril 2025 (rachat Webflow, plugins « Club » historiques inclus) — gsap.com/blog/webflow-GSAP, webflow.com/blog/gsap-becomes-free | Moteur de tweening/Timeline pro (eases elastic/back/bounce prêts, séquencement) ; ne dessine rien, vient EN PLUS du Canvas | Faible — 1 fichier UMD vendoré, remplace nos `easeBackOut`/timers maison | Bon candidat pour enrichir juice.js (eases + orchestration), pas pour le rendu |
| anime.js v4 | ~17 Ko | MIT | Easing spring/bounce physiques natifs — pile ce qu'il faut pour rebonds/squash | Faible, mais API v4 récente (2025), à figer une version exacte | Alternative plus légère à GSAP si on ne veut que les courbes, sans les plugins inutiles ici |
| tsParticles | 20 à 100+ Ko selon bundle (slim/confetti/all) | MIT | Système de particules déclaratif, pensé fond de page, pas sprites positionnés en coordonnées plateau | Moyen-élevé — double moteur de particules en plus du nôtre | Redondant avec particules.js (800 particules zéro-alloc déjà en place) |
| PixiJS + @pixi/particle-emitter | ~120-150 Ko gzip (bundle complet, moins en tree-shaking) + emitter léger | MIT | Rendu WebGL avec vrais filtres (glow/bloom/blur) impossibles en Canvas 2D sans `filter` par frame (interdit §5) | Gros — réécriture du renderer (sprites, transform, boucle) | Seule option qui débloque un vrai glow additif ; changement d'architecture, pas un ajout |
| matter.js | ~87 Ko minifié (gzip non confirmé, ~25 Ko estimé) | MIT | Vraie physique 2D (collisions bille-bille) | Élevé — résout un problème qu'on n'a pas (notre chute est un intégrateur par axe, sans collision) | Hors sujet pour une chute stylisée en grille |
| rough.js | < 9 Ko gzip | MIT | Contours « tracés main » (style croquis) | Faible | Hors style — VERTIGE veut des aplats nets cerclés d'encre, pas un croquis |

## 3. Packs d'assets libres (CC0 sauf mention)

| Pack | Licence | Contenu utile | Poids | Verdict |
|---|---|---|---|---|
| Kenney Particle Pack (kenney.nl/assets/particle-pack) | CC0 | 80 sprites : étincelles, éclats, fumée, glows/« light cookies », feu, magie | ~9,8 Mo en bloc (OpenGameArt) — sélectionner 15-20 PNG individuels (quelques dizaines de Ko chacun) | Excellent pour glow/fumée/éclats, absents de particules.js (rectangles+étoiles vectoriels uniquement) |
| Kenney Puzzle Pack 1/2 | CC0 | 75 puis 795 assets, pièces/formes génériques | Variable | Peu pertinent pour notre style billes/match |
| Kenney UI Pack (430 assets) | CC0 | Boutons, cadres, barres | Quelques Mo | Notre UI cartoon est déjà codée en CSS (§7) — utile en référence visuelle seulement |
| Kenney Board Game Icons (250) | CC0 | Dés, cartes, jetons, icônes d'action | Faible | Utile pour icônes HUD/compétences, hors rendu Canvas des billes |
| Kenney Emotes Pack (480, 16 styles) | CC0 | Étoiles, cœurs, éclairs, faces, style « ballon » brillant | Faible-moyen | Bonne source d'étoiles/éclats cohérente avec le look « gomme brillante », à tester en remplacement de l'étoile vectorielle |
| Kenney Interface Sounds (100 sons) | CC0 | Clics, confirmations, snaps | Faible | Bonne base pour les sons UI, pas pour les pops/chimes de match |
| Freesound.org | Mixte, filtrable CC0 (~moitié des 730 000+ sons) | Pops, chimes, fanfares, whoosh cherchables par mot-clé | À la pièce (dizaines-centaines de Ko/son) | Meilleure source pour sons de match-3 précis ; vérifier la licence CC0 exacte fichier par fichier |
| OpenGameArt.org | Accepte CC0/CC-BY/CC-BY-SA/OGA-BY/GPL, à vérifier par item | Relaie une bonne partie du catalogue Kenney + packs indépendants | Variable | Bon point d'entrée, mais tout n'y est pas CC0 (contrairement à Kenney, 100 % CC0) |

**Sprites pré-dessinés vs formes codées** : pour glow/étoile/éclat/fumée/traînée, les sprites PNG gagnent. Un halo doux avec anti-aliasing propre ne s'obtient en Canvas 2D qu'avec `filter: blur()` recalculé par frame — explicitement interdit (§5, « jamais de `filter` par frame »). Un sprite pré-rendu (comme sprites.js le fait déjà pour les billes) donne ce flou en simple `drawImage`, à coût CPU nul. Nos formes actuelles (`ctx.fillStyle` uni, sans dégradé) sont plates ; recalculer un `createRadialGradient` par particule et par frame (jusqu'à 800) serait trop coûteux. Fumée et traînées de vitesse (alpha dégradé complexe, bord flou) sont quasi impossibles à dessiner proprement au path. À l'inverse, garder les confettis/étoiles codés pour ce qui reste net et anguleux (cohérence avec le contour encre du reste du style) : mélanger sprite (glow/fumée/traînée) et code (confettis/éclats nets).

## 4. Plan concret, priorisé (12 items max)

| # | Quoi (technique) | Pourquoi (référence) | Effort | Fichier |
|---|---|---|---|---|
| 1 | Anticipation : au `tap` valide, squash du groupe (x1,08/y0,92, 80 ms ease-out) + recul 2-3 px vers le centre avant d'envoyer `detruit` | Candy Crush/Toon Blast pré-squashent 50-100 ms avant l'éclatement | Petit | rendu.js (surTap/surDetruit), juice.js |
| 2 | Impact : flash radial blanc (alpha 0,6→0, 90 ms, `lighter` sur le cœur 40 ms puis `source-over`) + halo sprite PNG glow (64×64, Kenney Particle Pack, échelle x1,5→x2,5, alpha 1→0, 150 ms) sous les confettis existants | Manque actuel : confettis seuls, aucun flash/halo | Moyen | juice.js (nouvel émetteur), sprites PNG vendorés dans src/assets/ |
| 3 | Résolution : à l'atterrissage (`avancerChute`, `rebondFait`), 4-6 particules poussière (ovales beige translucides, vie 0,25-0,35 s) + overshoot horizontal amplifié (ampli 0,10→0,14 sur `bv.squashX/Y`) | Royal Match/Toon Blast ancrent l'impact au sol | Petit | rendu.js (avancerChute), particules.js |
| 4 | Activation spéciales différenciée : bombe = flash + onde élargie + 6-8 particules fumée montante ; ligne = traînée dégradée blanc→transparent qui balaie la rangée en 180 ms puis fade 60 ms ; couleur = 8-12 rayons + billes ciblées glissées vers la sucette (`demarrerGlisse`), cascade 40 ms/bille | Candy Crush distingue nettement chaque spéciale | Gros | rendu.js (surSpeciale/surElement), juice.js, particules.js |
| 5 | Chaîne : si `evt.profondeur >= 2`, ralenti (dt ×0,5 sur 150 ms) + zoom caméra (échelle ×1,04, aller-retour 200 ms) centré sur le barycentre | Candy Crush ralentit+zoome avant une résolution massive | Moyen | rendu.js (majAnimations, surDetruit) |
| 6 | Rotation : 8-10 particules « vent » tangentielles pendant `angleTween` (traits fins, vie 0,2 s, toutes les ~40 ms) ; motion blur simulé (plateau redessiné avec décalage d'angle ε et alpha 0,3 sur la frame précédente, sans `filter`) ; second rebond sur `squashPlateau` (overshoot + contre-rebond ×0,4) | Royal Match/Toon Blast font « sentir » la vitesse de rotation | Moyen | rendu.js (surRotation, dessinerFrame), particules.js |
| 7 | Fin de salle façon « Sugar Crush » : nouveau cas `finSalle` dans `jouer()` (absent aujourd'hui) — billes restantes explosées une à une (balayage), espacement 35-60 ms en accélérant, score affiché qui grimpe à chaque explosion, plafonné ~2-3 s | Signature Candy Crush : transforme le surplus en récompense comptée | Gros | rendu.js (nouveau handler), juice.js (compteur animé) |
| 8 | Écran de niveau : cartes de proposition qui glissent depuis le bas, rotation ±8°, rebond back-out 350 ms, délai 60 ms entre cartes | Royal Match anime l'arrivée des récompenses par trajectoire physique | Moyen | src/ui/ui.js (hors périmètre lu — à coordonner) |
| 9 | Texte flottant avec traînée : 3-4 « fantômes » du texte à alpha décroissant (0,4/0,2/0,1) légèrement en retard sous le texte principal | Toon Blast/Candy Crush donnent du poids aux popups XP | Petit | juice.js (dessinerTextes) |
| 10 | Halo pulsé sur les spéciales au repos : cercle radial alpha 0,15↔0,35, période 1,2 s sinusoïdale, dessiné même hors animation | Candy Crush/Royal Match font scintiller les spéciales pour attirer l'œil avant le tap | Petit | rendu.js (dessinerBilleCouleur) |
| 11 | Combo de spéciales : détection de deux causes explosives sur le même point/tour → flash 1,5× plus grand, shake +40 %, mot de combo forcé « VERTIGE ! » | Candy Crush/Toon Blast traitent la combinaison de spéciales comme le pic de gratification | Moyen | rendu.js (surDetruit), juice.js |
| 12 | Passe son synchronisée : pitch qui monte avec `profondeur` sur `detruit`, layer « whoosh » sur les traînées de ligne, son distinct par type de spéciale à l'activation (aujourd'hui un seul `audio.jouer('speciale', {type})` générique déjà appelé, juste sous-exploité) | Candy Crush accorde un son distinct et un pitch croissant à chaque étape de chaîne | Petit-moyen | rendu.js (appels courantAudio.jouer), src/audio/audio.js (hors périmètre lu) |

## 5. Verdict

Garder Canvas 2D maison : le plan §4 comble l'essentiel du manque de juice (anticipation, impact, traînées, chaîne, Sugar Crush) sans changer d'architecture, et couvre 80 % du besoin visuel via `globalCompositeOperation='lighter'` ponctuel + sprites glow pré-rendus (Kenney), sans violer l'interdit `filter` par frame (§5). PixiJS n'apporterait qu'un vrai bloom/glow WebGL additif propre (façon Royal Match sur fond sombre) — gain réel mais ponctuel, pas structurant pour le reste du juice listé. Coût de migration estimé : rendu.js+sprites.js+particules.js+juice.js+decor.js pèsent ~1170 lignes aujourd'hui, à réécrire quasi intégralement (sprites offscreen → Textures/Sprites Pixi, transform manuelle → Container, pools → ParticleContainer) — estimation 1500-2000 lignes de réécriture + tests pour 2-3 effets de gain net. Ne reconsidérer PixiJS que si un futur objectif artistique exige du bloom additif à grande échelle (ex. un mode « frénésie » très lumineux).
