# Recherche — Niveaux de salle : plus de cartes, plus d'enjeu

Constat de Martin : le choix de niveau (1→10, 2 cartes proposées, §6.1) est plat. Ce document croise 6 références du genre, diagnostique les 13 effets actuels, propose un système à raretés/paris/évolutions, catalogue 36 nouveaux effets prêts à coder, et esquisse leur mise en scène à l'écran.

## 1. Ce que font les références

**Vampire Survivors** — *Rareté pondérée* : chaque arme/passif a un poids de tirage (~1473 pts côté armes, ~1250 côté passifs) donc les objets forts sont rares et attendus. *Évolution* : arme au niveau max + passif dédié + un coffre = fusion en forme supérieure — un pick anodin (le passif) prend un sens caché révélé plus tard. *Banish/Reroll* : ressource limitée pour écarter un choix indésirable — jamais gratuite, le joueur compose surtout avec l'imparfait. Enjeu : engagement sans retour la plupart du temps, patience récompensée par l'évolution différée.

**Hades** — *Boons à rareté* (commun→légendaire), boostée dans les salles à risque (Érèbe, mini-boss) : le risque optionnel achète littéralement du meilleur loot. *Duo boons* : combo entre deux dieux qui exige d'avoir déjà investi dans les deux, récompense la cohérence du build plus que la puissance brute isolée. *Pom of Power* : dilemme largeur (nouveau boon) vs profondeur (améliorer un boon déjà pris) à chaque salle. Enjeu : « la cohérence bat la décoration » — un boon plus faible qui complète la route bat souvent un Épique hors-sujet.

**Balatro** — *Jokers + vouchers* : 150+ Jokers aux synergies explicites, vouchers qui changent une règle pour tout le run — le choix n'est jamais isolé, il s'inscrit dans une main lisible d'un coup d'œil. *Stakes cumulables* : Jokers « éternels » (increvables) vs « périssables » (expirent après 5 manches) — la fragilité volontaire crée l'enjeu. *Paris explicites* (Skip Blind contre un tag) : risquer une manche entière pour une récompense. Enjeu : le pari est toujours visible et chiffré à l'écran, l'audace paie plus que la prudence.

**Peglin** — *Orbes + reliques* : flot constant de petits upgrades d'orbes, mais peu de reliques, rares et transformantes — ça hiérarchise clairement mineur/majeur. *Élite et salle mystère optionnels* : le joueur choisit lui-même son niveau de risque avant d'y entrer. Enjeu : contraste entre l'abondance des petits gains et la rareté du gros morceau — pertinent pour nos paliers 1/2/3.

**Luck be a Landlord** — *Synergies thématiques explicites* entre symboles adjacents (abeille + fleur, chat + lait) : la relation se lit sans calcul. *Symboles rares* = valeur de base haute OU comportement unique qui réclame du support — distingue « fort seul » de « pari de build ». Enjeu : la lisibilité de la synergie transforme un choix abstrait en choix de composition visible sur le plateau.

**Slay the Spire** — *Rareté par type de combat* (normal/élite/boss) + *pitié* : un offset caché monte à chaque commune tirée, retombe à 0 sur une rare — progression perçue sans rendre le rare trivial. *Events à risque* : accepter une malédiction ou des dégâts contre une carte forte ou une relique, hors combat, isolé dans un évènement dédié. *Malédictions* : occupent une vraie carte du deck, coût structurel et pas juste un chiffre négatif. Enjeu : le risque est spatialement séparé de la boucle normale, ce qui le rend spécial plutôt que dilué.

## 2. Diagnostic des 13 effets actuels

Franchement : aucun des 13 n'a de contrepartie (tous strictement positifs), aucune rareté, aucune synergie entre deux effets pris dans la même salle, aucun palier 3 en jeu (niveaux 8-10 verrouillés, `NIVEAU_MAX = 7`). Les choix se comparent en ampleur, jamais en nature — ce n'est pas un dilemme, c'est un calcul.

| id | nom | verdict | pourquoi |
|---|---|---|---|
| coups_2 | Second souffle | plat, dominant | +2 coups sans condition ; bat presque tout dès que les coups sont serrés, zéro risque |
| prochaine_bombe | Amorce | invisible | usage unique caché : rien à l'écran n'indique le groupe concerné avant de taper |
| dominante_3 | Teinture rapide | plat, marginal | 3 billes sur ~80 cases, effet quasi insignifiant en grille pleine |
| rotation_gratuite | Pivot libre | plat | correct mais mineur, aucune tension, nommé « salle » alors qu'il est à usage unique |
| nettoyage_bas | Coup de balai | lisible, bon | impact spatial immédiat et visible |
| elements_avances | Coup de pouce | invisible, inégal | nul si aucun élément en salle, pick à vide non signalé au choix |
| trois_vaut_quatre | Petits groupes | lisible | bonne base mais isolé, aucune évolution possible |
| chaines_double | Résonance | invisible | dépend d'un futur enchaînement de spéciales, rien ne l'indique au moment du choix |
| colonne_monochrome | Coulée | lisible, bon | un des meilleurs : spatial, satisfaisant, lié à la gravité actuelle |
| rayon_plus | Surcharge | invisible, inégal | nul si aucune spéciale présente au moment du choix |
| pierres_fondent | Dégel | invisible, inégal | nul si aucune pierre (message d'échec silencieux en jeu) |
| demi_tour | Volte-face | lisible, bon | fort, spatial, immédiat |
| teinte_prochaine | Pinceau | invisible | dépend entièrement du tap suivant, imprévisible au moment du choix |

Trois effets sont conditionnés à un état du plateau invisible au moment de la proposition (elements_avances, rayon_plus, pierres_fondent) : le joueur peut prendre un pick mort sans le savoir. Aucun des 13 n'interagit avec le renfort (grille sous 40 %) ni avec la rareté d'une couleur qui s'épuise — la moitié de l'identité du jeu (grille qui se vide) est absente du système de niveau.

## 3. Proposition de système

**Nombre de cartes** : passer de 2 à **3 propositions** par défaut — 2 cartes « sûres » tirées du pool pondéré par rareté, + 1 carte « à risque » toujours distincte visuellement (liseré rouge/or), tirée du sous-pool des effets à enjeu (partie 4). *Mentor* (compétence existante, §6.2) passe de « 3 propositions » à « une 4e carte sûre » pour rester utile sans dévaluer le 3e slot.

**Raretés par palier** (probabilité de la carte tirée) :

| Palier | Niveaux | Commun | Rare | Épique |
|---|---|---|---|---|
| 1 | 1-3 | 70 % | 25 % | 5 % |
| 2 | 4-6 | 50 % | 35 % | 15 % |
| 3 | 7-9 | 25 % | 40 % | 35 % |

Pitié façon StS : +5 % Épique par proposition sans Épique depuis le début de la salle, remis à 0 dès qu'un Épique sort. Niveau 10 : pas de tirage, l'Ultime du personnage (§8), voir partie 5.

**Reroll** : coûte 1 point de la jauge de rotation actuelle — ressource déjà existante, pas de monnaie nouvelle ; exclut les cartes déjà vues lors de ce reroll. Dilemme réel : tourner le plateau maintenant, ou retenter sa chance sur les cartes. **Bannissement** : retire une carte du pool pour le **reste du run** (pas la salle), débloqué par une compétence de run rare ou acheté en boutique méta — précieux par construction, jamais gratuit.

**Cartes à enjeu** : toujours dans le 3e slot, jamais parmi les 2 sûres. Trois familles (détaillées au catalogue, partie 4) : **pari** (gain fort contre risque immédiat, ex. Va-tout), **double ou rien** (amplifie un effet déjà actif ou le perd), **malédiction rémunératrice** (malus permanent-salle contre récompense disproportionnée, ex. Marée noire). 7 des 36 nouveaux effets appartiennent à cette famille.

**Durée** : *tours* (1-3, pics tendus, à jouer tout de suite — trois_vaut_quatre) ; *salle* (ossature d'un build, à réserver aux effets qui durent vraiment jusqu'à la sortie — corriger rotation_gratuite qui est en fait un usage unique) ; *plateau* (nouveau — mur temporaire, colonne verrouillée, chute qui glisse : change la grille elle-même durablement, matérialise le choix dans l'espace plutôt que dans un multiplicateur caché).

**Évolutions** : quand 2 effets d'une même famille ont déjà été pris dans la salle (table de recettes 2 ids → 1 id évolué), la 3e proposition de cette famille se transforme automatiquement, icône « ÉVOLUTION ». S'appuie sur `etat.effetsVus`, déjà suivi par le moteur (`progression.js`). Exemple : Teinture rapide + Pinceau déjà pris → « Déluge » (toute la grille se teinte par vagues, 2 tours).

**Ultime niveau 10** : rupture de rythme assumée — pas de choix, un seul effet massif lié au personnage (§8), jamais banni ni rerollable, mise en scène plein écran (partie 5).

**Dialogue avec les compétences de run** : chaque effet du catalogue déclare `synergies: [idCompétence, ...]`. Si le joueur possède la compétence, la carte affiche un bandeau « Synergie : Domino » et son texte se met à jour avec le chiffre réel (ex. « +1 activation sur les éléments, +2 avec Apprentissage »).

**Chiffrage.** Courbe actuelle (`SEUILS_NIVEAU`) : cumuls 0/100/250/450/700/1000/1350/1800/2300/2900, delta croissant de 100 à 600 XP. `NIVEAU_MAX` vaut aujourd'hui **7** (phase 1) : les niveaux 8-10 existent dans `palierPour` mais ne sont pas atteignables. À ~10-16 XP/bille selon la taille des groupes, une salle normale (grille 8×10 = 80 billes + renfort) plafonne vers 1000-1350 XP cumulés, soit **5-6 niveaux** — cohérent avec le calage de Martin. Proposition : déverrouiller `NIVEAU_MAX = 10` maintenant que le palier 3 a 12 effets (partie 4), garder les seuils tels quels, et ajouter deux multiplicateurs d'XP dans l'esprit du hook `xpGain` déjà utilisé par Cascade/Apprentissage : ×1.3 en salle d'élite, et un bonus sur les billes de renfort (rares, elles doivent compter plus — proposé comme carte, *Renfort doré*, plutôt qu'en règle globale, à trancher avec Martin). Cible : **7-8 niveaux/salle normale**, **9-10 en élite/boss**.

## 4. Catalogue de 36 nouveaux effets

14 communs, 15 rares, 7 épiques ; 7 marqués **PARI** (carte à enjeu, malus réel). Tous utilisent les hooks du bus existant (§ contrat) ; « immédiat » = application directe à la sélection, comme nettoyage_bas ou demi_tour aujourd'hui.

| id | palier | rareté | nom | description | hook(s) | enjeu / malus | synergie |
|---|---|---|---|---|---|---|---|
| jauge_max | 1 | commun | Jauge gonflée | La jauge de rotation démarre pleine pour la salle. | jaugeInitiale | aucun | Vertige |
| renfort_dore | 1 | rare | Renfort doré | Les billes de renfort valent le double d'XP tant qu'elles sont rares. | remplissage, xpGain | dépend de l'état du plateau (peut être mineur en début de salle) | Apprentissage |
| rotation_marquee | 1 | commun | Rotation marquée | La prochaine rotation qui forme un groupe de 6+ le change en bombe. | apresRotation, specialeCreee | usage unique, il faut tourner pour en profiter | Seuil abaissé |
| lanterne_elargie | 1 | commun | Grand halo | Les lanternes éclairent un rayon +1 pour toute la salle. | immédiat (drapeau salle) | pick à vide sans lanterne | — |
| coup_gratuit_rotation | 1 | rare | Économe | La 2e rotation de chaque tour ne coûte pas de jauge. | coutRotation, debutTour | rentable seulement si on tourne deux fois | Inertie |
| bombe_apprivoisee | 1 | commun | Amorce longue | Les 2 prochains groupes de 3+ créent une bombe (au lieu d'un seul). | seuils, specialeCreee | aucun | Double amorce |
| glace_fond_bord | 1 | commun | Dégel de bordure | Tous les glaçons de la grille perdent une couche. | immédiat | nul si aucun glaçon | — |
| spirale_xp | 1 | commun | Spirale | Rotations consécutives dans le même sens : +10 % d'XP cumulé (max +50 %), reset au changement de sens ou au tap. | avantRotation, apresRotation, xpGain | pousse à moins taper, plus tourner | Vertige, Plateau instable |
| renfort_previsible | 1 | rare | Prévision | Révèle la couleur des 3 prochaines billes de renfort. | remplissage | aucun, purement informatif | Prévoyance |
| mur_provisoire | 1 | rare | Cloison | Une colonne au choix bloque la chute pendant 2 tours. | debutTour, finTour | peut gêner le joueur si mal placée | Aimant de gravité |
| coups_epuises_sursis | 1 | épique | Sursis | Au prochain 0 coup, +3 coups au lieu de rien (une fois par salle). | coupsEpuises | fort mais unique, utile seulement en danger | Coup de trop |
| taille_generosite | 1 | commun | Débutant chanceux | Les groupes de 2 comptent comme 3 pendant 2 tours. | tailleGroupe | aucun | Petits groupes |
| rotation_double_tranchant | 2 | rare | Fuite en avant | **PARI** : rotations gratuites, mais chaque rotation fait tomber 2 billes de renfort même au-dessus de 40 %. | coutRotation, remplissage | dilue la rareté des billes pour tout le reste de la salle | anti-synergie Vertige |
| bombe_instable | 2 | rare | Bombe instable | **PARI** : bombes +1 rayon, mais elles explosent 1 tour après leur création. | specialeCreee, finTour, zoneExplosion | timing imprévisible, peut punir | Retardée |
| verrou_colonne | 2 | commun | Colonne verrouillée | Une colonne au choix n'est jamais vidée par le renfort. | remplissage | ignorée aussi par les effets de teinture | — |
| chute_diagonale_courte | 2 | épique | Glissade | 3 tours : la chute glisse en diagonale d'une case vers le dernier mur touché. | avantChute, apresChute | peut désorganiser un groupe en construction | Inertie, Tourbillon |
| ruches_apaisees | 2 | commun | Apaisement | Les ruches ne pondent plus de billes-pierre pendant 3 tours. | finTour | pick à vide sans ruche | Fossoyeur |
| jauge_stockee | 2 | rare | Réserve de jauge | La jauge non utilisée en fin de tour est reportée au tour suivant. | finTour, jaugeInitiale | aucun, change le rythme des manœuvres | Vertige, Aimant de gravité |
| explosion_en_chaine_couleur | 2 | rare | Réaction | Une explosion qui touche une bille de sa couleur la transforme en spéciale du même type. | explosion, specialeCreee | chaînes potentiellement incontrôlables | Fusion, Rotation détonante |
| renfort_cible | 2 | commun | Renfort ciblé | Les billes de renfort n'apparaissent que dans la couleur la plus rare de la grille. | remplissage | concentre le risque sur une seule couleur | Propagation, Monochrome tournant |
| croix_partagee | 2 | rare | Partage | Une croix relance une ligne dans l'axe perpendiculaire à son explosion. | zoneExplosion, typeSpeciale | aucun | Ligne rotative |
| pari_jauge | 2 | épique | Va-tout | **PARI** : vide toute la jauge de rotation d'un coup, chaque point détruit une bille aléatoire de la couleur la plus fréquente. | jaugeInitiale, explosion | irréversible, plus aucune rotation gratuite ensuite | anti-synergie Vertige |
| magnetisme_provisoire | 2 | commun | Attraction | 3 tours : chaque rotation regroupe d'une case la couleur la plus rare vers le centre. | apresRotation | aucun | Bille magnétique, Aimant de gravité |
| sacrifice_coups | 2 | rare | Sacrifice | **PARI** : -3 coups immédiats, en échange +1 rayon aux spéciales et +1 activation aux éléments adjacents. | coupsInitiaux, zoneExplosion | malus direct et mesurable | — |
| gravite_libre_prolongee | 3 | rare | Apesanteur | 5 tours de rotation gratuite, mais le sens est aléatoire à chaque tour. | coutRotation, avantRotation | peut désorganiser un plan en cours | Plateau instable, anti Aimant de gravité |
| ligne_devient_croix | 3 | épique | Ascension | Toutes les spéciales-ligne, présentes et futures, deviennent des croix pour la salle. | typeSpeciale | aucun | Ligne rotative, Double amorce |
| renfort_final | 3 | commun | Dernier arrivage | Déclenche immédiatement un renfort complet, une seule fois. | remplissage (déclenché) | aucun, relance le rythme de fin de salle | Grande faim, Cascade |
| mise_en_jeu | 3 | épique | Mise en jeu | **PARI** : ×2 XP jusqu'à la fin de la salle, mais 0 coup = échec immédiat (aucun sursis, aucun coup de trop). | xpGain, coupsEpuises | retire tous les filets de sécurité pour le reste de la salle | anti-synergie Coup de trop, Sursis |
| colonne_sacrifiee | 3 | commun | Table rase | La grille perd une colonne entière (au lieu d'une ligne), définitif pour la salle. | immédiat | réduit l'espace de jeu restant | — |
| spéciales_synchrones | 3 | rare | Synchronisation | Toutes les spéciales présentes explosent au prochain changement de sens de rotation, pas immédiatement. | apresRotation, explosion | demande d'orchestrer la rotation | Rotation détonante, Fusion |
| jauge_infinie_3 | 3 | rare | Débridé | 3 tours de rotations illimitées et gratuites. | coutRotation | aucun seul, très fort combiné | Inertie, Tourbillon |
| bombe_couleur_partagee | 3 | épique | Déflagration | La prochaine bombe de couleur touche aussi les pierres, qui deviennent des billes normales. | sortPierre, zoneExplosion | redondant si Fossoyeur déjà pris (garde-fou à l'affichage) | Fossoyeur |
| dette_de_coups | 3 | rare | Dette | **PARI** : +5 coups immédiats, la moitié (arrondi haut) est retirée des coups de la salle suivante. | coupsInitiaux (salle suivante) | déplace le risque hors de la salle actuelle | — |
| zone_permanente | 3 | commun | Foyer | Une case au centre transforme la première bille qui y tombe chaque tour en bombe, pour le reste de la salle. | apresChute, specialeCreee | dépend du hasard de la chute | Double amorce, Seuil abaissé |
| renfort_empoisonne | 3 | épique | Marée noire | **PARI** : seuil de renfort monté à 60 % (la grille reste rarement pauvre), mais chaque bille de renfort vaut +100 % d'XP. | remplissage, xpGain | sacrifie la tension de rareté contre un flux d'XP généreux | Apprentissage |
| dernier_mot | 3 | rare | Dernier mot | Au dernier coup, toutes les spéciales présentes explosent avant la fin de la salle. | coupsEpuises, explosion | ne sauve pas l'objectif si non atteint | Rotation détonante |

## 5. Présentation à l'écran

- Barre de niveau toujours visible (segments 1-10), remplissage continu avec l'XP gagnée — jamais de saut brutal, le joueur voit venir le seuil.
- À ~80 % du segment : léger pulse sur la barre + aperçu flouté des cartes à venir (juste leur couleur de rareté, pas le texte) pour créer l'attente.
- Montée de niveau : bref freeze-frame, flash de la couleur de la rareté la plus haute proposée, cartes qui glissent depuis le bas avec un son distinct par rareté.
- La carte « à risque » (3e slot) a une arrivée différenciée (léger tremblement, liseré qui pulse) reconnaissable avant même la lecture du texte.
- Sélection : la carte s'envole vers le plateau et déclenche son effet visuellement sur les cases concernées (teinte qui se propage, colonne qui s'illumine, mur qui apparaît) — jamais un simple texte qui disparaît.
- Effets actifs : rangée de pilules sous la barre de coups, icône + compte à rebours en tours (ou sablier pour « salle »), qui clignotent au dernier tour.
- Niveau 10 : mise en scène dédiée plein écran, sans choix, couleur et musique du personnage — un climax, pas un niveau de plus.
- Bandeau de synergie sur une carte : liseré de la couleur de la compétence concernée + icône, visible sans survol.
