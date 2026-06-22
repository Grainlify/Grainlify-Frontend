import { useTheme } from '../../../../shared/contexts/ThemeContext';

/**
 * Props for the accessible settings toggle switch.
 */
interface ToggleSwitchProps {
  /** Current on/off state exposed through `aria-checked`. */
  enabled: boolean;
  /** Called with the next state when the switch is toggled. */
  onChange: (value: boolean) => void;
  /** Accessible name when no visible label owns the switch. */
  'aria-label'?: string;
  /** ID of visible text that labels the switch. */
  'aria-labelledby'?: string;
}

export function ToggleSwitch({
  enabled,
  onChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: ToggleSwitchProps) {
  const { theme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
        theme === 'dark' ? 'focus-visible:ring-offset-[#2d2820]' : 'focus-visible:ring-offset-[#e8dfd0]'
      } ${
        enabled 
          ? 'bg-gradient-to-r from-[#c9983a] to-[#a67c2e] shadow-[0_2px_8px_rgba(162,121,44,0.4)]' 
          : 'bg-white/[0.15] border border-white/25'
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
          enabled ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
