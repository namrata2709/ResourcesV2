/**
 * Pagination — generic page-count/current-page component, per T3-2a's
 * genericity requirement. Knows nothing about notes/quizzes/anything —
 * just currentPage/totalPages/onPageChange.
 */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className={`pagination-bar flex items-center justify-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className="h-8 w-8 rounded-full text-sm disabled:opacity-30 hover:bg-bg-secondary"
      >
        ‹
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-label={`Page ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
          className={`h-8 w-8 rounded-full text-sm transition-colors ${
            page === currentPage ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg-secondary'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        className="h-8 w-8 rounded-full text-sm disabled:opacity-30 hover:bg-bg-secondary"
      >
        ›
      </button>
    </nav>
  );
}
