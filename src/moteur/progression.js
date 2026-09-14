// XP et niveau en salle (§6.1). Seuils cumulés : index = niveau − 1.
// Lot D (2026-09-14, validé par Martin) : 3 cartes (2 sûres + 1 à risque), raretés par palier avec pitié,
// relance payée en jauge de rotation, évolutions, synergies, niveau 10 = apogée (3 épiques).
// D19 (2026-09-14) : la première relance de chaque salle est gratuite, les suivantes coûtent 1 point de jauge.
import * as donnees from '../data/effets.js';
import { COMPETENCES } from '../data/competences.js';

const EFFETS = donnees.EFFETS;
const EVOLUTIONS = donnees.EVOLUTIONS ?? [];

// Recalés le 2026-09-11 pour ~1 000 XP par salle (la grille ne se remplit plus).
export const SEUILS_NIVEAU = [0, 100, 250, 450, 700, 1000, 1350, 1800, 2300, 2900];
export const NIVEAU_MAX = 10;
export const COUT_RELANCE = 1; // en points de jauge de rotation, après la relance gratuite de la salle (D19)

/** Palier d'effets : 1 = niveaux 2-3, 2 = niveaux 4-6, 3 = niveaux 7-10. */
export function palierPour(niveau) { return niveau <= 3 ? 1 : niveau <= 6 ? 2 : 3; }

const POIDS = { 1: { commun: 70, rare: 25, epique: 5 }, 2: { commun: 50, rare: 35, epique: 15 }, 3: { commun: 25, rare: 40, epique: 35 } };

function tirerRarete(ctx, palier) {
  const p = { ...POIDS[palier] };
  p.epique += 5 * (ctx.etat.pitie ?? 0); // pitié : +5 % d'épique par proposition sans épique
  const total = p.commun + p.rare + p.epique;
  let r = ctx.rng.suivant() * total;
  for (const k of ['commun', 'rare', 'epique']) { if ((r -= p[k]) < 0) return k; }
  return 'commun';
}

function nomCompetence(id) { return COMPETENCES.find((c) => c.id === id)?.nom ?? null; }

function presenter(ctx, e, extra = {}) {
  const synergie = (e.synergies ?? []).find((id) => ctx.etat.competences.includes(id));
  return { id: e.id, nom: e.nom, desc: e.desc, rarete: e.rarete ?? 'commun', risque: !!e.risque, palier: e.palier,
    synergie: synergie ? nomCompetence(synergie) : null, evolution: false, ...extra };
}

/** Effets proposables : du palier (sinon des autres), jamais vus dans la salle, dont la condition tient. */
function candidats(ctx, palier, { risque, exclure }) {
  const vus = new Set(ctx.etat.effetsVus);
  const ok = (e) => !vus.has(e.id) && !exclure.has(e.id) && !!e.risque === risque && (!e.condition || e.condition(ctx))
    && !EVOLUTIONS.some((ev) => ev.vers === e.id); // les évolués n'arrivent que par recette
  let pool = EFFETS.filter((e) => e.palier === palier && ok(e));
  if (pool.length < 3) pool = pool.concat(EFFETS.filter((e) => e.palier !== palier && ok(e)));
  return pool;
}

function piocher(ctx, pool, rarete) {
  const memeRarete = pool.filter((e) => (e.rarete ?? 'commun') === rarete);
  const source = memeRarete.length ? memeRarete : pool;
  const e = source[ctx.rng.entier(source.length)];
  pool.splice(pool.indexOf(e), 1);
  return e;
}

/**
 * Propositions d'un niveau : 2 sûres (rareté tirée par palier) + 1 à risque ; une évolution disponible
 * remplace la première sûre ; au niveau 10, trois épiques et pas de pari.
 */
export function proposerEffets(ctx, niveau, options = {}) {
  const exclure = new Set(options.exclure ?? []);
  const palier = palierPour(niveau);
  const nbSures = ctx.bus.reduire('propositionsNiveau', 2, ctx, { niveau });
  const props = [];
  const vus = new Set(ctx.etat.effetsVus);
  const evolution = EVOLUTIONS.find((ev) => ev.de.every((id) => vus.has(id)) && !vus.has(ev.vers) && !exclure.has(ev.vers));
  const defEvo = evolution && EFFETS.find((e) => e.id === evolution.vers);
  if (defEvo) props.push(presenter(ctx, defEvo, { evolution: true }));
  const surs = candidats(ctx, palier, { risque: false, exclure });
  let epiqueSorti = false;
  while (props.length < nbSures && surs.length) {
    const rarete = niveau >= NIVEAU_MAX ? 'epique' : tirerRarete(ctx, palier);
    const e = piocher(ctx, surs, rarete);
    if ((e.rarete ?? 'commun') === 'epique') epiqueSorti = true;
    props.push(presenter(ctx, e));
  }
  if (niveau >= NIVEAU_MAX) {
    while (props.length < 3 && surs.length) props.push(presenter(ctx, piocher(ctx, surs, 'epique')));
  } else {
    const risques = candidats(ctx, palier, { risque: true, exclure });
    if (risques.length) props.push(presenter(ctx, piocher(ctx, risques, tirerRarete(ctx, palier))));
    else if (surs.length) props.push(presenter(ctx, piocher(ctx, surs, tirerRarete(ctx, palier))));
  }
  ctx.etat.pitie = epiqueSorti ? 0 : (ctx.etat.pitie ?? 0) + 1;
  return props;
}

/** Détail de l'attente « niveau » posée sur l'état. */
export function attenteNiveau(ctx, niveau, propositions) {
  const e = ctx.etat;
  const gratuite = e.relanceGratuite !== false, cout = gratuite ? 0 : COUT_RELANCE;
  return { type: 'niveau', niveau, propositions, relance: { cout, gratuite, possible: niveau < NIVEAU_MAX && e.jauge >= cout } };
}

/** Relance : retire les cartes, gratuite une fois par salle (D19) puis contre 1 point de jauge. Renvoie false si impossible. */
export function relancer(ctx) {
  const e = ctx.etat, att = e.enAttente;
  if (!att || att.type !== 'niveau' || !att.relance?.possible) return false;
  if (att.relance.cout) { e.jauge -= att.relance.cout; ctx.emettre({ t: 'coups', coups: e.coups, jauge: e.jauge }); }
  else e.relanceGratuite = false;
  const exclues = att.propositions.map((p) => p.id);
  e.effetsVus.push(...exclues); // les cartes retirées ne reviennent pas dans la salle
  const propositions = proposerEffets(ctx, att.niveau, { exclure: exclues });
  if (!propositions.length) { e.enAttente = null; ctx.emettre({ t: 'message', texte: 'Plus aucune carte : niveau passé' }); return true; }
  e.enAttente = attenteNiveau(ctx, att.niveau, propositions);
  ctx.emettre({ t: 'niveau', niveau: att.niveau, propositions, relance: true });
  return true;
}

/** Applique l'effet choisi ; les effets à durée s'inscrivent dans etat.effetsActifs. */
export function appliquerEffet(ctx, id, options = {}) {
  const e = EFFETS.find((x) => x.id === id);
  if (!e) return false;
  if (!options.reprise) {
    ctx.etat.effetsVus.push(id);
    if (e.duree) ctx.etat.effetsActifs.push({ id, nom: e.nom, restant: e.duree === 'salle' ? null : e.duree, ...(e.parTap ? { parTap: true } : {}) });
    ctx.emettre({ t: 'effet', id, nom: e.nom });
  }
  e.appliquer(ctx, options);
  return true;
}

export function retirerEffet(ctx, id) {
  ctx.bus.off('effet:' + id);
  const l = ctx.etat.effetsActifs;
  const k = l.findIndex((x) => x.id === id);
  if (k >= 0) l.splice(k, 1);
}

/** Fin de tour : décrémente les effets à durée, retire ceux qui expirent. Les effets `parTap` ignorent les tours de rotation (D20). */
export function expirerEffets(ctx, { rotation = false } = {}) {
  for (const a of ctx.etat.effetsActifs.slice()) {
    if (a.restant === null || (a.parTap && rotation)) continue;
    a.restant--;
    if (a.restant <= 0) retirerEffet(ctx, a.id);
  }
}
