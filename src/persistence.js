// Le stockage est facultatif : navigation privée/quota ne doivent jamais bloquer une partie.
export function lire(cle) { try { return localStorage.getItem(cle); } catch { return null; } }
export function lireJson(cle, defaut) { try { return JSON.parse(lire(cle)) ?? defaut; } catch { return defaut; } }
export function ecrire(cle, valeur) { try { localStorage.setItem(cle, JSON.stringify(valeur)); return true; } catch { return false; } }
export function effacer(cle) { try { localStorage.removeItem(cle); } catch { /* stockage indisponible */ } }
export function normaliserProfil(valeur) {
  const p = valeur && typeof valeur === 'object' && !Array.isArray(valeur) ? valeur : {};
  const profil = {};
  for (const k of ['runs', 'victoires', 'meilleureSalle', 'planetesSauvees', 'monnaieMeta', 'xpTotale']) profil[k] = Number.isFinite(p[k]) && p[k] >= 0 ? Math.floor(p[k]) : 0;
  profil.effets = typeof p.effets === 'boolean' ? p.effets : !p.muet;
  profil.musique = p.musique === true;
  profil.vibrations = p.vibrations !== false;
  profil.muet = !profil.effets;
  profil.derniereRecompense = typeof p.derniereRecompense === 'string' ? p.derniereRecompense.slice(0, 128) : null;
  return profil;
}

// Identifiant stable : une reprise du même résultat ne crédite jamais deux fois.
export function appliquerRecompense(profil, etat) {
  const att = etat.enAttente;
  if (att?.type !== 'finRun') return profil;
  const id = `${etat.seed}:${etat.stats.debut}:${etat.stats.fin}`;
  if (profil.derniereRecompense === id) return profil;
  return { ...profil, derniereRecompense: id,
    runs: profil.runs + 1, victoires: profil.victoires + (att.victoire ? 1 : 0),
    planetesSauvees: Math.max(profil.planetesSauvees??0, att.planetesSauvees??0),
    meilleureSalle: Math.max(profil.meilleureSalle, att.salleIndex + 1),
    monnaieMeta: profil.monnaieMeta + att.monnaieMeta, xpTotale: profil.xpTotale + att.xpTotale };
}
