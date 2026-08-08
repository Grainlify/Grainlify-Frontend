import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface PaginationProps {
  currentPage: number;
  /** Highest page number known to exist. For a fully-loaded, client-sliced
   * list this is the real total page count. For a server-paginated list
   * where the total isn't known upfront, pass the highest page confirmed
   * reachable so far - the bar grows as the user pages forward instead of
   * claiming a total it doesn't actually know. */
  maxKnownPage: number;
  /** True once we've confirmed there's nothing past maxKnownPage. */
  isMaxPageFinal: boolean;
  onPageChange: (page: number) => void;
}

// Windowed page numbers with ellipses, e.g. for page 7 of 20: 1 … 5 6 [7] 8 9 … 20
function getPageWindow(current: number, max: number): (number | 'ellipsis')[] {
  const window = 2;
  const pages = new Set<number>([1, max]);
  for (let p = current - window; p <= current + window; p++) {
    if (p >= 1 && p <= max) pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis');
    result.push(sorted[i]);
  }
  return result;
}

export function Pagination({ currentPage, maxKnownPage, isMaxPageFinal, onPageChange }: PaginationProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (maxKnownPage <= 1 && isMaxPageFinal) return null;

  const pages = getPageWindow(currentPage, maxKnownPage);
  const canGoNext = currentPage < maxKnownPage || !isMaxPageFinal;

  const baseBtn = `min-w-[36px] h-9 px-2 rounded-[10px] text-[13px] font-semibold transition-all flex items-center justify-center`;
  const inactive = isDark
    ? 'text-[#d4c5b0] hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent'
    : 'text-[#7a6b5a] hover:bg-black/[0.05] disabled:opacity-30 disabled:hover:bg-transparent';
  const active = 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_4px_14px_rgba(162,121,44,0.4)]';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-6 flex-wrap">
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`${baseBtn} ${inactive}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className={`px-1 text-[13px] ${isDark ? 'text-[#8a7d6f]' : 'text-[#a89685]'}`}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={`${baseBtn} ${p === currentPage ? active : inactive}`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={!canGoNext}
        onClick={() => onPageChange(currentPage + 1)}
        className={`${baseBtn} ${inactive}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
