// Robot de validation : examine une action à la fois, sans connaissance des futurs tirages.
import { chargerRun } from '../src/moteur/run.js';
import { tousGroupes } from '../src/moteur/grille.js';

function potentielBalises(e) {
  const g = e.grille, sortie = e.objectif.sortie?.gravite;
  if (sortie == null) return 0;
  let score = 0;
  for (let i = 0; i < g.cellules.length; i++) {
    if (g.cellules[i]?.element?.type !== 'relique') continue;
    const x = i % g.w, y = Math.floor(i / g.w);
    const distance = [g.h - 1 - y, g.w - 1 - x, y, x][sortie];
    score -= distance * 9;
    const pas = [g.w, 1, -g.w, -1][sortie];
    for (let d = 1; d <= distance; d++) {
      const c = g.cellules[i + pas * d];
      if (c) score -= c.type === 'pierre' ? 8 : 4;
    }
  }
  return score;
}

export function choisirAction(run) {
  const e = run.etat, attente = e.enAttente;
  if (attente) {
    if (attente.type === 'finRun') return null;
    if (attente.propositions?.length) {
      // Option sûre en priorité pour ne pas imputer au plateau une prise de risque du bot.
      const p = attente.propositions.find(p => !p.malus || /aucun|sans malus/i.test(p.malus)) ?? attente.propositions[0];
      return { type: 'choix', id: p.id };
    }
    return { type: 'choix', id: null };
  }
  const g = e.grille;
  const candidats = [];
  const positions = new Set(tousGroupes(g).map(gr => gr[0]));
  g.cellules.forEach((c, i) => { if (c?.speciale) positions.add(i); });
  for (const i of positions) if (run.peutTaper(i % g.w, Math.floor(i / g.w))) candidats.push({ type:'tap', x:i % g.w, y:Math.floor(i / g.w) });
  for (const sens of [-1,1,2]) if (run.peutTourner(sens)) candidats.push({ type:'rotation', sens });
  const json = run.serialiser(), avant = potentielBalises(e);
  let meilleur = null, valeur = -Infinity;
  for (const action of candidats) {
    const copie = chargerRun(json);
    if (!copie) throw new Error('Le robot ne peut pas reprendre la sauvegarde');
    const evenements = appliquerAction(copie, action), n = copie.etat;
    const progression = n.objectif.progres - e.objectif.progres;
    let score = progression * (e.objectif.type === 'reliques' ? 1000 : e.objectif.type === 'score' ? .04 : e.objectif.type === 'pierres' ? 35 : 3);
    score += (n.xpSalle - e.xpSalle) * .01;
    score += potentielBalises(n) - avant;
    score += evenements.filter(v => v.t === 'speciale').length * 10;
    score += evenements.some(v => v.t === 'combo') ? 12 : 0;
    if (n.enAttente?.type === 'finSalle') score += n.enAttente.victoire ? 10000 : -10000;
    // Ne pas tourner indéfiniment à énergie gratuite pour un gain purement visuel.
    score -= action.type === 'rotation' ? 7 : 1;
    if (action.type === 'rotation') {
      const avantG = tousGroupes(g).reduce((m, gr) => Math.max(m, gr.length), 0);
      const apresG = tousGroupes(n.grille).reduce((m, gr) => Math.max(m, gr.length), 0);
      score += Math.max(0, apresG - avantG) * 3;
    }
    if (score > valeur) { valeur = score; meilleur = action; }
  }
  return meilleur;
}
export function appliquerAction(run, a) {
  if (a.type === 'tap') return run.tap(a.x, a.y);
  if (a.type === 'rotation') return run.tourner(a.sens);
  return run.choisir(a.id);
}
