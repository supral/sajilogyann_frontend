import React from "react";
import "../styles/ListPagination.css";

/**
 * Prev / next + range text. Hidden when total is 0 or a single page.
 */
export default function ListPaginationBar({
  page,
  totalPages,
  onPageChange,
  from,
  to,
  total,
  className = "",
  flushTop = false,
}) {
  if (total === 0) return null;
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`list-pagination${flushTop ? " list-pagination--flush-top" : ""} ${className}`.trim()}
      aria-label="List pagination"
    >
      <span className="list-pagination__info">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </span>
      <div className="list-pagination__controls">
        <button
          type="button"
          className="list-pagination__btn"
          disabled={page <= 1}
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="list-pagination__page" aria-current="page">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="list-pagination__btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
