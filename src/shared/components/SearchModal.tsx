import { useState, useEffect, useId, useRef } from 'react';
import { Search, ArrowRight, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusTrap } from '../utils/focusTrap';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the user submits a valid (non-empty, non-whitespace) query. */
  onSearch?: (query: string) => Promise<void> | void;
}

/**
 * Full-screen search overlay.
 *
 * Accessibility contract:
 * - Renders `role="dialog"` with `aria-modal="true"` and an `aria-labelledby`
 *   pointing at the heading.
 * - On open, focus moves to the search input; <kbd>Tab</kbd> cycles within the
 *   overlay and <kbd>Escape</kbd> closes it.
 * - On close, focus is restored to the element that opened the overlay.
 * - Submit button is disabled (with `aria-disabled`) while a search is in
 *   flight or the query is empty/whitespace-only.
 *
 * @param props.isOpen - Whether the modal is visible.
 * @param props.onClose - Callback to close the modal.
 * @param props.onSearch - Optional async callback invoked with the trimmed
 *   query on submit. The button remains disabled until the returned promise
 *   settles.
 */
export function SearchModal({ isOpen, onClose, onSearch }: SearchModalProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, setIsPending] = useState(false);
  const darkTheme = theme === 'dark';
  const headingId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, {
    onEscape: onClose,
    initialFocusRef: inputRef,
  });

  const searchSuggestions = [
    "Terminal-based markdown editors worth checking out",
    "Unity projects for procedural terrain generation",
    "Find the best GraphQL clients for TypeScript",
    "AI-powered tools for reviewing pull requests",
  ];

  const handleSubmit = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || isPending) return;
    setIsPending(true);
    try {
      await onSearch?.(trimmed);
    } catch {
      // Swallow — onSearch errors should not crash the UI.
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh]"
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 transition-colors ${
          darkTheme 
            ? 'bg-black/70' 
            : 'bg-black/40'
        }`}
        onClick={onClose}
        style={{ backdropFilter: 'blur(12px)' }}
      />

      {/* Modal Content */}
      <div 
        className={`relative w-full max-w-[900px] mx-4 rounded-[32px] border shadow-2xl transition-colors ${
          darkTheme
            ? 'bg-[#1a1512]/95 border-white/10'
            : 'bg-white/95 border-white/30'
        }`}
        style={{ backdropFilter: 'blur(90px)' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9983a] ${
            darkTheme
              ? 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80'
              : 'bg-black/5 hover:bg-black/10 text-black/60 hover:text-black/80'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-12">
          {/* Main Heading */}
          <h1 id={headingId} className={`text-[42px] font-bold text-center mb-4 leading-tight transition-colors ${
            darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>
            Search Open Source Projects and<br />Build Your Confidence
          </h1>

          {/* Subtitle */}
          <p className={`text-center text-[15px] mb-8 transition-colors ${
            darkTheme ? 'text-[#b8a898]/80' : 'text-[#6b5d4d]/80'
          }`}>
            Build your open source portfolio to optimize your chances of getting funded.<br />
            Explore projects that help you stand out.
          </p>

          {/* Search Input */}
          <div 
            className={`relative h-[64px] rounded-[32px] mb-12 transition-colors ${
              darkTheme 
                ? 'bg-[#2d2820]/60 border border-white/10' 
                : 'bg-white/60 border border-black/10'
            }`}
            style={{ backdropFilter: 'blur(40px)' }}
          >
            <div className="absolute inset-0 flex items-center px-6">
              <Search className={`w-5 h-5 mr-4 flex-shrink-0 transition-colors ${
                darkTheme ? 'text-white/50' : 'text-black/50'
              }`} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
                placeholder="Search projects, topics, or keywords..."
                aria-label="Search open source projects"
                className={`flex-1 bg-transparent outline-none text-[16px] transition-colors ${
                  darkTheme
                    ? 'text-white placeholder:text-white/40'
                    : 'text-[#2d2820] placeholder:text-black/40'
                }`}
              />
              <button
                type="button"
                aria-label="Submit search"
                disabled={isPending || !searchQuery.trim()}
                aria-disabled={isPending || !searchQuery.trim()}
                onClick={handleSubmit}
                className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 flex-shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9983a] ${
                  isPending || !searchQuery.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105'
                } ${
                  darkTheme
                    ? 'bg-[#c9983a] hover:bg-[#d4a645]'
                    : 'bg-[#c9983a] hover:bg-[#e8c571]'
                }`}
              >
                {isPending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Search Suggestions */}
          <div>
            <h2 className={`font-semibold mb-2 transition-colors ${
              darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}>
              Search suggestions
            </h2>
            <p className={`text-[13px] mb-4 transition-colors ${
              darkTheme ? 'text-[#b8a898]/70' : 'text-[#6b5d4d]/70'
            }`}>
              Discover interesting projects across different technologies
            </p>

            {/* Suggestion Pills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSearchQuery(suggestion)}
                  className={`group flex items-center justify-between px-5 py-4 rounded-[16px] transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] ${
                    darkTheme
                      ? 'bg-[#2d2820]/40 hover:bg-[#2d2820]/60 border border-white/5 hover:border-white/10'
                      : 'bg-white/40 hover:bg-white/60 border border-black/5 hover:border-black/10'
                  }`}
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  <span className={`text-left text-[14px] transition-colors ${
                    darkTheme ? 'text-[#d4c5b0]' : 'text-[#6b5d4d]'
                  }`}>
                    {suggestion}
                  </span>
                  <ArrowRight className={`w-4 h-4 ml-3 flex-shrink-0 transition-all group-hover:translate-x-1 ${
                    darkTheme ? 'text-[#c9983a]' : 'text-[#a2792c]'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
