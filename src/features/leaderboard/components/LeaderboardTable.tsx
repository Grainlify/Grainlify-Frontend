import type { ReactNode } from "react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

/**
 * The ranked-table shell shared by the contributors board, the projects board
 * and the bounty ledger.
 *
 * It was two near-identical copies (ContributorsTable, ProjectsTable) with the
 * columns written inline, so nothing else could show a table in this style
 * without a third copy. The class strings below are the ones those two files
 * carried, moved here unchanged: at 640px and up this renders exactly what
 * they rendered, and the before/after screenshots at 1440 are pixel-identical.
 *
 * ## Phones (below 640px)
 *
 * The 12-column desktop grid kept its 32px padding and 16px gaps at 390px,
 * which left the rank column 5px wide: rank chips drew 8-11px wide instead of
 * 28px and "RANK" ran into "CONTRIBUTOR". Every phone rule here uses
 * `max-sm:`, which only exists below 640px, so it cannot reach the desktop
 * layout. Columns place themselves on the phone grid through their own
 * `max-sm:` classes.
 */

/** Rank | main | value. Columns use `max-sm:col-start-*` / `max-sm:row-start-*` to sit on it. */
export const PHONE_GRID = "max-sm:grid-cols-[40px_minmax(0,1fr)_auto] max-sm:gap-x-3 max-sm:gap-y-1.5 max-sm:px-4";

/**
 * A column that only makes sense with a mouse (hover-revealed buttons) is
 * hidden on phones and on any device that cannot hover: there it was an
 * invisible, still-tappable target.
 */
export const HOVER_ONLY = "max-sm:hidden [@media(hover:none)]:hidden";

export interface LeaderboardColumn<Row> {
  key: string;
  header: ReactNode;
  headerClassName: string;
  cellClassName: string;
  render: (row: Row, index: number) => ReactNode;
}

interface LeaderboardTableProps<Row> {
  columns: LeaderboardColumn<Row>[];
  rows: Row[];
  getKey: (row: Row, index: number) => string | number;
  isLoaded: boolean;
  onRowClick?: (row: Row) => void;
  /** Rows look clickable. Kept separate from onRowClick because the projects board has always shown a pointer without a click handler. */
  interactive?: boolean;
  ariaLabel?: string;
}

export function LeaderboardTable<Row>({
  columns,
  rows,
  getKey,
  isLoaded,
  onRowClick,
  interactive = true,
  ariaLabel,
}: LeaderboardTableProps<Row>) {
  return (
    <div
      aria-label={ariaLabel}
      // A 150ms fade, with no delay and no translate: see the history in git.
      className={`bg-white/[0.12] rounded-[24px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden transition-opacity duration-150 ${
        isLoaded ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Table Header */}
      <div className={`grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/10 bg-white/[0.08] ${PHONE_GRID} max-sm:py-3`}>
        {columns.map((c) => (
          <div key={c.key} className={c.headerClassName}>
            {c.header}
          </div>
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/10">
        {rows.map((row, index) => (
          <div
            key={getKey(row, index)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`grid grid-cols-12 gap-4 px-8 py-2.5 hover:bg-white/[0.08] transition-all duration-300 ${interactive ? "cursor-pointer " : ""}group ${PHONE_GRID} max-sm:py-3 max-sm:items-center`}
          >
            {columns.map((c) => (
              <div key={c.key} className={c.cellClassName}>
                {c.render(row, index)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Header label text, as the boards have always drawn it. */
export function useHeaderText() {
  const { theme } = useTheme();
  return `text-[12px] font-bold uppercase tracking-wider transition-colors ${
    theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
  }`;
}

export function RankChip({ rank }: { rank: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-[9px] bg-gradient-to-br from-white/[0.15] to-white/[0.08] border border-white/20 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
      <span
        className={`text-[13px] font-bold transition-colors ${
          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
        }`}
      >
        {rank}
      </span>
    </div>
  );
}

export function ScorePill({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="relative px-4 py-1.5 rounded-[10px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/40 shadow-sm group-hover:shadow-lg group-hover:border-[#c9983a]/70 group-hover:from-[#c9983a]/35 group-hover:to-[#d4af37]/25 group-hover:scale-110 transition-all duration-300">
      <div
        className={`text-[14px] font-black transition-colors ${
          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
