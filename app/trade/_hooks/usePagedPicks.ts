import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * The selection of a paged ("Show more") picker. Same rules as web `usePagedPicks`.
 *
 * A refetch reloads only the pages already loaded, so a picked row can slide onto a page that
 * is not loaded (a new row pushed it down). Absence from the loaded pages therefore means
 * "gone" only once every page is loaded (`complete`): then the pick is pruned (sold,
 * deactivated, offered elsewhere), so it is never sent and rejected by the API. While more pages
 * exist, the pick is kept with its last seen row and pinned at the top of `rows`, so it stays
 * visible, checked and sent; the API is the final check. A pick that is still listed is
 * refreshed from the latest row.
 *
 * `loaded`: the rows of every loaded page, flattened and de-duplicated (keep the reference
 * stable between renders). `ready`: the list has settled (not on its first load); picks refresh
 * and prune only then.
 */
export function usePagedPicks<T extends { id: string }>({
  loaded,
  complete,
  ready,
}: {
  loaded: readonly T[];
  complete: boolean;
  ready: boolean;
}) {
  const [picked, setPicked] = useState<T[]>([]);

  useEffect(() => {
    if (!ready) return;
    setPicked((prev) => {
      if (prev.length === 0) return prev;
      const byId = new Map(loaded.map((row) => [row.id, row]));
      let changed = false;
      const next: T[] = [];
      for (const pick of prev) {
        const fresh = byId.get(pick.id);
        if (fresh) {
          next.push(fresh);
          if (fresh !== pick) changed = true;
        } else if (!complete) {
          next.push(pick);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [loaded, complete, ready]);

  const pickedIds = useMemo(() => picked.map((p) => p.id), [picked]);

  /** Picks that are not on a loaded page first, then the loaded rows. */
  const rows = useMemo(() => {
    const loadedIds = new Set(loaded.map((row) => row.id));
    return [...picked.filter((p) => !loadedIds.has(p.id)), ...loaded];
  }, [picked, loaded]);

  const toggle = useCallback(
    (id: string) =>
      setPicked((prev) => {
        if (prev.some((p) => p.id === id)) return prev.filter((p) => p.id !== id);
        const row = rows.find((r) => r.id === id);
        return row ? [...prev, row] : prev;
      }),
    [rows],
  );

  /** Add a row to the selection (no-op when it is already picked). */
  const add = useCallback(
    (row: T) => setPicked((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row])),
    [],
  );

  /** Replace the selection with these ids (unknown ids are ignored). */
  const select = useCallback(
    (ids: readonly string[]) => {
      const byId = new Map(rows.map((row) => [row.id, row]));
      setPicked(ids.flatMap((id) => byId.get(id) ?? []));
    },
    [rows],
  );

  return { rows, picked, pickedIds, toggle, add, select };
}
