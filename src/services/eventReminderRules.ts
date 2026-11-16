/**
 * Règles pures des alertes « nouvelles dates ».
 * Isolées du client Supabase pour rester testables sans navigateur.
 */

/** Artistes et organisations (festivals) suivis, dédoublonnés. */
export function collectFollowTargets(
  artistIds: Iterable<string>,
  organizerIds: Iterable<string>
): Set<string> {
  const targets = new Set<string>();
  for (const id of artistIds) {
    if (id) targets.add(id);
  }
  for (const id of organizerIds) {
    if (id) targets.add(id);
  }
  return targets;
}

/** Liste bornée pour un filtre `.in()` PostgREST. */
export function uniqueFollowIds(ids: Iterable<string>, limit = 80): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}
