import { logger } from '../../shared/utils/logger';
import { useState, useRef, useEffect, useId, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Searchable filter dropdown rendered through a portal.
 *
 * Accessibility contract:
 * - The trigger exposes `aria-haspopup="listbox"`, `aria-expanded` and
 *   `aria-controls` (the listbox id).
 * - The options container is a `role="listbox"`; each option is a
 *   `role="option"` with `aria-selected` reflecting the current `value`.
 * - On open, focus moves to the search input.
 * - <kbd>Arrow Down</kbd>/<kbd>Arrow Up</kbd> move through the (filtered)
 *   options, <kbd>Enter</kbd> selects the active option, and <kbd>Escape</kbd>
 *   closes the menu and returns focus to the trigger.
 * - The outside-click `mousedown` listener is removed on unmount/close, so no
 *   listeners leak.
 */
export function FilterDropdown({ label, options, value, onChange, placeholder }: FilterDropdownProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = useId();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  logger.debug('FilterDropdown render:', { label, isOpen, value, optionsCount: options.length });

  // Update dropdown position when opened and move focus to the search input.
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const position = {
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      };
      logger.debug('Setting dropdown position:', position);
      setDropdownPosition(position);
      setActiveIndex(-1);
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keep the active option in sync with focus while navigating with the keyboard.
  useEffect(() => {
    if (activeIndex >= 0) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  const closeAndRestoreFocus = () => {
    setIsOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
    buttonRef.current?.focus();
  };

  const handleSelect = (option: string) => {
    logger.debug('Option selected:', option);
    onChange(option);
    closeAndRestoreFocus();
  };

  const handleButtonClick = () => {
    logger.debug('Button clicked, toggling isOpen from', isOpen, 'to', !isOpen);
    setIsOpen(!isOpen);
  };

  // Map a filtered option back to the value passed to `onChange`.
  const toOptionValue = (option: string) =>
    option.toLowerCase().startsWith('all ') ? 'all' : option;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeAndRestoreFocus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (filteredOptions.length > 0) {
          setActiveIndex((index) => (index + 1) % filteredOptions.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (filteredOptions.length > 0) {
          setActiveIndex((index) =>
            index <= 0 ? filteredOptions.length - 1 : index - 1,
          );
        }
        break;
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          event.preventDefault();
          handleSelect(toOptionValue(filteredOptions[activeIndex]));
        }
        break;
      default:
        break;
    }
  };

  const displayValue = value === 'all' ? label : value;

  logger.debug('Rendering dropdown portal:', { isOpen, dropdownPosition });

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        className={`w-full px-4 py-3 rounded-[12px] backdrop-blur-[30px] border text-[14px] font-medium transition-all flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9983a] ${
          theme === 'dark'
            ? 'bg-[#1a1512]/[0.6] border-white/15 text-[#e8dfd0] hover:bg-[#1a1512]/[0.8] hover:border-[#c9983a]/30'
            : 'bg-white/[0.25] border-white/35 text-[#2d2820] hover:bg-white/[0.35] hover:border-[#c9983a]/40'
        }`}
      >
        <span className={value === 'all' ? 'opacity-60' : ''}>{displayValue}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          onKeyDown={handleKeyDown}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 9999,
          }}
          className={`rounded-[16px] backdrop-blur-[40px] border shadow-xl overflow-hidden ${
            theme === 'dark'
              ? 'bg-[#1a1512]/[0.95] border-white/15'
              : 'bg-[#2d2820]/[0.95] border-white/30'
          }`}
        >
          {/* Search Input */}
          <div className="p-3 border-b border-white/10">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-[10px] backdrop-blur-[20px] border ${
              theme === 'dark'
                ? 'bg-white/[0.06] border-white/10'
                : 'bg-white/[0.08] border-white/15'
            }`}>
              <Search className="w-4 h-4 text-[#b8a898]" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder || `Search ${label.toLowerCase()}...`}
                aria-label={placeholder || `Search ${label.toLowerCase()}`}
                aria-controls={listboxId}
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#e8dfd0] placeholder:text-[#b8a898]/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-0.5 hover:bg-white/10 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a]"
                >
                  <X className="w-3 h-3 text-[#b8a898]" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="max-h-[280px] overflow-y-auto custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[#b8a898]">No options found.</p>
              </div>
            ) : (
              <div className="py-2">
                {filteredOptions.map((option, index) => {
                  // Convert "All Languages" -> "all", otherwise keep the option as-is
                  const optionValue = toOptionValue(option);

                  return (
                    <button
                      key={option}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      type="button"
                      role="option"
                      aria-selected={value === optionValue}
                      tabIndex={-1}
                      onClick={() => handleSelect(optionValue)}
                      className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c9983a] ${
                        value === optionValue
                          ? theme === 'dark'
                            ? 'bg-[#c9983a]/20 text-[#c9983a] font-semibold'
                            : 'bg-[#c9983a]/30 text-[#c9983a] font-semibold'
                          : theme === 'dark'
                            ? 'text-[#d4c5b0] hover:bg-white/[0.08]'
                            : 'text-[#e8dfd0] hover:bg-white/[0.1]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}