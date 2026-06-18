import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface GlassDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

/**
 * Glassmorphic single-select dropdown.
 *
 * Accessibility contract:
 * - The trigger is a `button` exposing `aria-haspopup="listbox"`,
 *   `aria-expanded` (reflecting `isOpen`) and `aria-controls` (the menu id).
 * - The menu is a `role="listbox"`; each option is a `role="option"` with
 *   `aria-selected` reflecting the current `value`.
 * - When opened, focus moves to the selected option (or the first one).
 * - Keyboard support inside the menu: <kbd>Arrow Up</kbd>/<kbd>Arrow Down</kbd>
 *   and <kbd>Home</kbd>/<kbd>End</kbd> move focus, <kbd>Enter</kbd>/<kbd>Space</kbd>
 *   select, <kbd>Escape</kbd> (or <kbd>Tab</kbd>) closes. Closing via the
 *   keyboard returns focus to the trigger.
 * - <kbd>Arrow Down</kbd> on the closed trigger opens the menu.
 */
export function GlassDropdown<T extends string>({
  value,
  onChange,
  options,
  isOpen,
  onToggle,
  onClose,
}: GlassDropdownProps<T>) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // When the menu opens, start from the currently selected option (or the
  // first one) and move focus to it.
  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = options.indexOf(value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, options, value]);

  // Keep DOM focus in sync with the active option while the menu is open.
  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.focus();
  }, [isOpen, activeIndex]);

  const handleSelect = (option: T) => {
    onChange(option);
    onClose();
    // Return focus to the trigger after a selection.
    buttonRef.current?.focus();
  };

  const closeAndRestoreFocus = () => {
    onClose();
    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onToggle();
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + options.length) % options.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleSelect(options[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        closeAndRestoreFocus();
        break;
      case 'Tab':
        // Allow focus to leave naturally, but collapse the menu.
        onClose();
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className={`flex items-center gap-2 px-5 py-3 rounded-[14px] backdrop-blur-[25px] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9983a] ${
          isDark
            ? 'bg-white/[0.08] border-white/15 hover:bg-white/[0.12] hover:border-[#e8c571]/30'
            : 'bg-white/[0.15] border-white/25 hover:bg-white/[0.2] hover:border-[#c9983a]/30'
        }`}
        onClick={onToggle}
        onKeyDown={handleButtonKeyDown}
      >
        <span className={`text-[14px] font-semibold ${isDark ? 'text-[#e8dfd0]' : 'text-[#2d2820]'}`}>
          {value}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'} ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

          {/* Menu */}
          <div
            id={menuId}
            role="listbox"
            aria-label="Options"
            onKeyDown={handleMenuKeyDown}
            className={`absolute top-full right-0 mt-2 w-48 rounded-[16px] border z-50 overflow-hidden ${
              isDark ? 'bg-[#3a3228] border-white/30' : 'bg-[#d4c5b0] border-white/40'
            }`}
          >
            <div className="py-2">
              {options.map((option, index) => (
                <button
                  key={option}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={value === option}
                  tabIndex={-1}
                  className={`w-full px-5 py-2.5 text-left text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c9983a] ${
                    isDark ? 'text-[#e8dfd0] hover:bg-[#4a3e30]' : 'text-[#2d2820] hover:bg-[#c9b8a0]'
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
