// Le passage orbital couvre le jeu jusqu'à la disponibilité réelle du décor.
// Aucun pourcentage simulé : le chargement est terminé lorsque charger() aboutit.
export function creerTransit(racine) {
  const doc = racine.ownerDocument || document;
  const couche = doc.createElement('section');
  couche.className = 'transit-planete';
  couche.hidden = true;
  couche.tabIndex = -1;
  couche.setAttribute('role', 'dialog');
  couche.setAttribute('aria-modal', 'true');
  couche.setAttribute('aria-labelledby', 'transit-titre');
  couche.setAttribute('aria-describedby', 'transit-recit');
  couche.innerHTML = `
    <div class="transit-contenu">
      <div class="transit-repere" aria-hidden="true"><span></span></div>
      <p class="transit-kicker">VERTIGE · APPROCHE ORBITALE</p>
      <h1 id="transit-titre"></h1>
      <p id="transit-recit" class="transit-recit"></p>
      <div class="transit-etat" role="status" aria-live="polite">
        <span class="transit-spinner" aria-hidden="true"></span>
        <span class="transit-statut"></span>
      </div>
      <button type="button" class="touche touche-accent transit-action" disabled>Commencer</button>
    </div>`;
  racine.append(couche);
  const titre = couche.querySelector('h1');
  const recit = couche.querySelector('.transit-recit');
  const statut = couche.querySelector('.transit-statut');
  const spinner = couche.querySelector('.transit-spinner');
  const bouton = couche.querySelector('button');
  let courant = null;
  let detruit = false;

  const focus = () => (bouton.disabled || bouton.hidden ? couche : bouton).focus({ preventScroll: true });
  const retenirFocus = (evt) => {
    if (courant && !couche.contains(evt.target)) focus();
  };
  const clavier = (evt) => {
    if (!courant) return;
    if (evt.key === 'Tab') { evt.preventDefault(); focus(); }
    if (evt.key === 'Escape') { evt.preventDefault(); evt.stopPropagation(); }
  };

  function fermer(session, resultat) {
    if (courant !== session) return;
    clearTimeout(session.minuteur);
    courant = null;
    couche.hidden = true;
    doc.removeEventListener('focusin', retenirFocus);
    doc.removeEventListener('keydown', clavier, true);
    for (const [el, inert] of session.inertes) el.inert = inert;
    if (session.focusAvant?.isConnected && !session.focusAvant.closest('[inert]')) {
      session.focusAvant.focus({ preventScroll: true });
    }
    session.resoudre(resultat);
  }

  async function chargerSession(session) {
    if (courant !== session || session.charge) return;
    session.charge = true;
    session.erreur = false;
    session.pret = false;
    bouton.disabled = true;
    bouton.hidden = !session.narratif;
    bouton.textContent = 'Commencer';
    spinner.hidden = false;
    statut.textContent = 'Préparation du décor…';
    try {
      await session.charger();
      if (courant !== session) return;
      session.pret = true;
      spinner.hidden = true;
      statut.textContent = 'Orbite atteinte · Décor prêt';
      bouton.disabled = false;
      const restant = session.narratif ? Math.max(0, 4000 - (performance.now() - session.debut)) : 0;
      if (restant === 0) fermer(session, true);
      else session.minuteur = setTimeout(() => fermer(session, true), restant);
    } catch {
      if (courant !== session) return;
      session.erreur = true;
      spinner.hidden = true;
      statut.textContent = 'Le décor n’a pas pu être chargé. Vérifie ta connexion, puis réessaie.';
      bouton.textContent = 'Réessayer';
      bouton.hidden = false;
      bouton.disabled = false;
    } finally {
      session.charge = false;
    }
  }

  bouton.addEventListener('click', () => {
    const session = courant;
    if (!session) return;
    if (session.erreur) void chargerSession(session);
    else if (session.pret) fermer(session, true);
  });

  return {
    get actif() { return courant !== null; },
    attendre({ nom, texte = '', narratif = true, charger }) {
      if (detruit) return Promise.resolve(false);
      if (courant) fermer(courant, false);
      return new Promise((resoudre) => {
        const inertes = new Map();
        // Les autres couches UI sont également neutralisées pendant le transit.
        const elements = [
          ...doc.querySelectorAll('#hud, #commandes, #scene'),
          ...Array.from(racine.children).filter((el) => el !== couche),
        ];
        const focusAvant = doc.activeElement;
        for (const el of elements) { inertes.set(el, el.inert); el.inert = true; }
        const session = { resoudre, inertes, focusAvant, charger, narratif,
          debut: performance.now(), minuteur: null, charge: false, pret: false, erreur: false };
        courant = session;
        titre.textContent = nom;
        recit.textContent = texte;
        recit.hidden = !texte;
        couche.hidden = false;
        doc.addEventListener('focusin', retenirFocus);
        doc.addEventListener('keydown', clavier, true);
        void chargerSession(session);
        couche.focus({ preventScroll: true });
      });
    },
    detruire() {
      detruit = true;
      if (courant) fermer(courant, false);
      couche.remove();
    },
  };
}
