import { useEffect, useMemo, useState } from "react";

const defaultDeps = [];

/**
 * Client-side pagination for arrays (tables, card grids).
 * @param {unknown[]} items
 * @param {{ pageSize?: number, resetDeps?: unknown[] }} options
 */
export function useListPagination(items, options = {}) {
  const { pageSize = 10, resetDeps = defaultDeps } = options;
  const [page, setPage] = useState(1);

  const list = useMemo(
    () => (Array.isArray(items) ? items : []),
    [items]
  );
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when filter deps change
  }, resetDeps);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const start = (page - 1) * pageSize;
  const pageItems = useMemo(
    () => list.slice(start, start + pageSize),
    [list, start, pageSize]
  );

  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, total);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    pageSize,
    from,
    to,
  };
}
