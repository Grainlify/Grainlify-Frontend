import { ToggleSwitch } from '../shared/ToggleSwitch';
import { useTheme } from '../../../../shared/contexts/ThemeContext';

interface NotificationRowProps {
  title: string;
  description: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  onInAppChange: (value: boolean) => void;
  onEmailChange: (value: boolean) => void;
  showBorder?: boolean;
}

export function NotificationRow({
  title,
  description,
  inAppEnabled,
  emailEnabled,
  onInAppChange,
  onEmailChange,
  showBorder = true,
}: NotificationRowProps) {
  const { theme } = useTheme();

  return (
    <div className={`grid grid-cols-[1fr_140px_140px] gap-4 items-center py-5 ${showBorder ? 'border-b border-white/10' : ''}`}>
      <div>
        <div className={`text-[15px] font-semibold mb-1 transition-colors ${
          theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
        }`}>{title}</div>
        <div className={`text-[13px] transition-colors ${
          theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
        }`}>{description}</div>
      </div>
      <div className="flex justify-center">
        <ToggleSwitch enabled={inAppEnabled} onChange={onInAppChange} />
      </div>
      <div className="flex justify-center">
        <ToggleSwitch enabled={emailEnabled} onChange={onEmailChange} />
      </div>
    </div>
  );
}
