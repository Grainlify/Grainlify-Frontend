import { Users } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface MaintainerViewRequiredProps {
  onSwitch: () => void;
}

/**
 * Shown in place of the maintainer surface when the viewer is in contributor
 * mode.
 *
 * The rail entry for Maintainers was already gated on activeRole, but the page
 * itself was not - so arriving at ?tab=maintainers by any route other than the
 * rail rendered the whole maintainer dashboard while the role pill read
 * CONTRIBUTOR. Hiding the way in is not the same as gating the destination.
 *
 * This exists rather than rendering nothing for the same reason
 * AdminAccessRequired does: a blank area cannot be told apart from a crash, and
 * somebody who followed a link here has no way to learn that the content is
 * behind a mode switch. It offers the switch instead of describing it, because
 * the switch is the entire remedy and the viewer may not know the control
 * exists.
 *
 * This is a VIEW mode, not a permission - every action behind it is
 * independently authorised server-side (ownership is checked in the handler,
 * not by hiding a button). So the copy says "switch to see it", not "you do
 * not have access", which would be false.
 */
export function MaintainerViewRequired({ onSwitch }: MaintainerViewRequiredProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-[24px] border p-8 md:p-10 text-center transition-colors ${
        isDark ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
      }`}
    >
      <div
        className={`mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-[14px] ${
          isDark ? 'bg-white/[0.06]' : 'bg-white/40'
        }`}
      >
        <Users className={`w-6 h-6 ${isDark ? 'text-[#e8c77f]' : 'text-[#a2792c]'}`} />
      </div>
      <h2 className={`text-[18px] font-bold mb-2 ${isDark ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
        You’re viewing as a contributor
      </h2>
      <p className={`text-[14px] mb-6 max-w-[420px] mx-auto ${isDark ? 'text-[#b8a898]' : 'text-[#6b5d4d]'}`}>
        The maintainer dashboard — your projects, and the applications waiting on
        you — is available in maintainer view.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#c9983a] text-white text-[14px] font-semibold hover:bg-[#b8892f] transition-colors"
      >
        Switch to maintainer view
      </button>
    </div>
  );
}
