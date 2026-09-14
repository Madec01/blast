# Recherche — boucle de jeu et rétention

Objectif : comprendre ce qui rend les meilleurs match-3 et roguelites « addictifs dans le bon sens », et ce qu'il faut en garder pour VERTIGE. Vérifié par recherche web, pas juste du souvenir.

---

## 1. Anatomie de la satisfaction (match-3 : Dream Blast, Royal Match, Candy Crush, Toon Blast)

**30 secondes (tap → feedback).** Objectif toujours visible en haut d'écran (compteur qui descend), feedback immédiat et disproportionné : cascades, particules, son qui monte avec la taille du groupe. Dream Blast fait toute sa réputation là-dessus : physique de chute + éléments qui réagissent à la proximité plutôt qu'au tap. C'est le habit loop au sens strict, pas cosmétique.

**3 minutes (niveau).** Le mécanisme le plus documenté et le plus efficace : la **quasi-victoire**. Royal Match et Candy Crush calibrent volontairement une majorité de niveaux pour se terminer à 1-2 coups de la victoire — un joueur qui échoue à 1-2 coups près retente ou paie bien plus qu'un joueur qui échoue à 10 coups. C'est un « golden rule » du level design puzzle. **Problème** : dans ces jeux, la quasi-victoire sert surtout à vendre des coups supplémentaires à l'écran d'échec.

**20 minutes (session).** Boosters choisis avant le niveau (agency avant l'échec plutôt que pendant), enchaînement « encore un niveau » sans coupure forcée, carte de progression (saga map) qui matérialise où on en est, chapitres qui changent le décor tous les 10-15 niveaux pour casser la monotonie.

**Plusieurs jours.** Carte visible avec chapitres et jalons, événements limités dans le temps, streaks de connexion, équipes (Toon Blast : débloquées niveau 20, tournois d'équipe, coffres d'équipe, demande de vies à 5 coéquipiers).

**Ce qui relève de la manipulation — à NE PAS copier :**
- Vies/énergie qui expirent et bloquent l'accès au jeu (Candy Crush : 5 vies, régénération 30 min, ou payer) — 367 dark patterns temporels recensés pour ce seul mécanisme.
- Quasi-victoire utilisée comme hameçon payant : niveau calibré pour qu'acheter des coups semble être la seule issue.
- Timers qui coupent le jeu net puis proposent de payer pour les annuler.
- Pression sociale : demander des vies aux amis/à l'équipe pour continuer à jouer.
- Notifications de culpabilisation, streak qui punit l'absence par une perte sèche.

---

## 2. Le « encore un run » des roguelites (Balatro, Slay the Spire, Hades, Vampire Survivors, Peglin, Luck be a Landlord)

- **Slay the Spire** — Daily Climb : seed et modificateurs identiques pour tout le monde ce jour-là, classement quotidien. Score final basé sur profondeur/cartes/reliques : un échec produit toujours un chiffre comparable. Paliers d'Ascension = courbe de difficulté visible et choisie par le joueur.
- **Hades** — Mirror of Night : les ressources (Darkness, clés) sont gardées **même en cas de mort**, respec quasi gratuit. God Mode réduit les dégâts de 2 % par mort : filet de rattrapage pour qui échoue en boucle, sans jamais forcer à payer. La mort fait avancer l'histoire : l'échec n'est jamais une impasse.
- **Balatro** — chaque Joker déclenché s'anime dans l'ordre avec son gain affiché : la synergie se *voit* se construire coup par coup (habillage à copier pour nos compétences). 150 Jokers = variété de builds, pas juste de puissance.
- **Vampire Survivors** — une Arcana ramassée en run peut se débloquer **définitivement pour tous les runs futurs** (Randomazzo). Run calibrée à 30 minutes, le jeu se durcit avec le temps ; le farm reste une voie légitime pour progresser.
- **Peglin / Luck be a Landlord** — synergies émergentes entre objets simples (symboles qui s'activent entre eux) qui produisent des combos explosifs perçus comme « je casse le jeu », pas juste un gros chiffre.

**Ce qui s'applique à un run de 20 min sur mobile :**
- Un défi à seed fixe + classement (même sans serveur, un classement personnel/local suffit à créer le rituel quotidien).
- Un écran de fin de run qui transforme même un échec en résultat lisible et comparable.
- Des ressources et déblocages qui survivent à l'échec (notre monnaie méta le fait déjà, §3.4 — à mettre en scène).
- Une courbe de puissance *visible* pendant le run, pas seulement calculée en interne.
- Un échec qui raconte quelque chose (cause précise) plutôt qu'un simple « perdu ».

---

## 3. Diagnostic VERTIGE — franc

**Ce qui existe (Phase 1, quasi terminée).** La boucle de 30 secondes est déjà travaillée et c'est le point fort actuel : textes flottants d'XP, mots de combo, confettis, ondes de choc, squash du plateau — exactement le registre Dream Blast/Candy Crush. Niveau en salle 1→10 avec 2 effets proposés à chaque palier (paliers 1-2 seulement, 8-10 pas encore débloquables). 10 compétences de run choisies entre les salles. 5 salles **linéaires fixes** (Vestibule, Puits, Marée haute, Tempête, Pendule) — pas encore la carte de nœuds à choix prévue en §3.3/§7. Sauvegarde du run et « profil méta minimal » en localStorage, sans boutique méta ni personnages implémentés.

**Ce qui manque, échelle par échelle :**
- **30 s** : quasi complet. Reste à faire scaler le son/le texte avec la taille du groupe au-delà de l'existant.
- **3 min (salle)** : aucune mise en scène de quasi-victoire à l'échec — l'objectif §3.1 point 6 vérifie juste succès/échec, rien n'est montré au joueur sur *à quel point* il était proche.
- **20 min (run)** : c'est le trou le plus net. Pas d'écran de fin de run (item explicitement en tête de ROADMAP « À faire maintenant »/Phase 1 polish, non fait). Pas de carte à choix (run = ordre imposé de 5 salles). Pas de « moment je casse le jeu » mis en scène, même si le pool de compétences le permet déjà en théorie (Cascade + Rotation détonante + Seuil abaissé).
- **Plusieurs jours** : quasiment rien. Pas de défi quotidien, pas de streak, pas de boutique méta (Phase 2, non commencée), pas de personnages (§8, Phase 3, non commencé). Le « profil méta minimal » ne semble tracker que des stats basiques.

VERTIGE a un excellent instinct sur le micro (le pilier 2 « satisfaction physique » est déjà tenu) et un méso en construction correcte (niveau/salle/compétences). Le macro — tout ce qui donne une raison de revenir demain — n'existe quasiment pas encore. C'est cohérent avec l'état des phases (1 presque close, 2 et 3 non commencées), mais c'est précisément là que se joue la rétention « dans le bon sens ».

---

## 4. Plan priorisé (15 items)

| # | Mécanisme précis | Échelle | Pourquoi ça fait revenir | Effort | Phase |
|---|---|---|---|---|---|
| 1 | **Écran de fin de run** : durée, salles franchies, XP totale, monnaie méta gagnée, plus grosse chaîne, spéciales créées, mini-graphe en escalier de l'XP salle par salle | 20 min | Ferme la boucle même en cas d'échec ; condition du « encore un run » | Moyen | 1 |
| 2 | **Défi quotidien à seed fixe** : mêmes salles/propositions pour tout le monde ce jour-là, classement **local** (ses propres records, historique 7 jours) | jours | Rendez-vous quotidien sans vie qui expire ; base extensible vers un classement en ligne | Moyen | 2 |
| 3 | **Déblocages méta ordonnés** : d'abord élargir les choix (pool commun complet, 3e proposition), puis seulement la puissance brute (effets 8-10) ; rythme ~1 déblocage toutes les 2-3 runs en début, ralenti ensuite | jours | Chaque run rapporte quelque chose de visible, y compris en échec (§3.4 déjà prévu) | Petit-moyen | 2 |
| 4 | **Quasi-victoires montrées** : à l'échec, figer la grille et afficher « à 3 billes de l'objectif » / « 2 coups auraient suffi », sans rien vendre derrière | 3 min | Le déclencheur de retry le plus documenté (Royal Match) — gardé sans la manipulation | Petit | 1 |
| 5 | **Moment « je casse le jeu »** : au moins une combinaison garantie une fois par run (ex. Cascade + Rotation détonante) mise en scène : ralenti, son qui monte, texte « RÉACTION EN CHAÎNE » | 20 min | La puissance doit se voir et s'entendre, pas juste se calculer (Balatro) | Moyen | 2 |
| 6 | **Durée cible** : 45-90 s/salle normale, 2-3 min/élite, 12-18 min pour un run à 3 actes | salle/run | Format court = friction basse pour « encore une » ; trop long tue la boucle quotidienne | Petit | 1 |
| 7 | **Streak sans punition** : compteur de jours joués avec un jour de grâce automatique par semaine, jamais de rachat payant ; débloque un cosmétique par palier | jours | Un streak réparable retient mieux qu'un streak fragile, sans honte au décrochage | Petit | 2 |
| 8 | Feedback de combo qui scale en taille de texte + hauteur de son avec le groupe (déjà amorcé, à pousser) | 30 s | Renforce l'action la plus fréquente du jeu | Petit | 1 |
| 9 | Carte de nœuds à choix de chemin (§3.3/§7, remplace les 5 salles fixes) | 20 min | Le choix entre les salles est une décision engageante, pas juste avant/pendant | Gros | 2 |
| 10 | Titre de build généré en fin de run depuis les compétences dominantes (« Pyromane à bombes ») | 20 min | Donne une identité à la run qu'on vient de vivre, se raconte | Petit | 2 |
| 11 | Échec informatif nommé : « grille bloquée » / « ruche a tout rempli » / « plus de coups », pas un « Perdu » sec | 3-20 min | Un échec qui explique enseigne la tentative suivante | Petit | 1 |
| 12 | Personnages méta (§8) débloqués un par un, chacun avec une rotation de base différente | jours | Un nouveau verbe de jeu, pas juste plus de stats | Gros | 3 |
| 13 | Cosmétiques débloqués par streak/palier méta (traînées, thèmes) — jamais vendus, jamais nécessaires | jours | Récompense identitaire à faible coût de dev, zéro pression | Petit | 3 |
| 14 | Palier de difficulté façon Ascension, débloqué après une première victoire avec un personnage | jours | Plafond de progression pour les joueurs qui maîtrisent déjà le jeu | Moyen | 3 |
| 15 | Salles spéciales tournantes (atelier, repos, mystère, §7.6) dont le contenu change d'un run à l'autre | 20 min | Casse la prévisibilité du chemin sans casser la lisibilité de la rotation | Moyen | 2 |

---

## 5. Ce qu'il ne faut PAS faire

**Dark patterns à proscrire** : vies/énergie qui expirent et bloquent le jeu, timers qui coupent l'accès puis proposent de payer pour les annuler, niveau calibré pour vendre des coups à l'écran d'échec, notification de culpabilisation, streak qui punit l'absence par une remise à zéro sèche, pression sociale pour obtenir des vies.

**3 erreurs classiques des roguelites mobiles :**
1. Runs calibrées comme sur PC (30-60 min) au lieu du format court qui fait la session mobile.
2. Progression méta qui remplace la maîtrise au lieu de l'enrichir — le joueur gagne en force sans gagner en compétence, la difficulté perçue devient artificielle.
3. Échec sec sans cause nommée : ça décourage au lieu d'inviter à retenter.
