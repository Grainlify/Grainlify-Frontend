import type { ReactNode } from 'react';
import { ShieldOff } from 'lucide-react';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/** Roles that can be passed to the `allow` prop. */
export type AllowedRole = Exclude<UserRole, null>;

export interface RoleGuardProps {
  /**
   * Roles that are permitted to view the children.
   * @example allow={['admin']}
   * @example allow={['admin', 'maintainer']}
   */
  allow: AllowedRole[];
  /** Content rendered when the user has an allowed role. */
  children: ReactNode;
  /**
   * Optional custom fallback rendered when access is denied.
   * When omitted the built-in themed "Unauthorized" state is shown.
   */
  fallback?: ReactNode;
}

/**
 * RoleGuard — client-side role boundary component.
 *
 * Reads `userRole` from {@link AuthContext} and renders `children` only when
 * the current role is listed in `allow`. All other roles (and `null`) are
 * shown the themed unauthorized state (or a custom `fallback`).
 *
 * ⚠️ This is a **UX guard only**. The backend must independently enforce
 * authorization on every admin/maintainer endpoint. Never rely solely on
 * client-side checks for security.
 */
export function RoleGuard({ allow, children, fallback }: RoleGuardProps) {
  const { userRole } = useAuth();

  if (userRole !== null && allow.includes(userRole as AllowedRole)) {
    return <>{children}</>;
  }

  return fallback !== undefined ? <>{fallback}</> : <UnauthorizedState />;
}

function UnauthorizedState() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-6 transition-colors ${
        dark
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
      }`}
    >
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#c9983a]/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md backdrop-blur-[40px] border rounded-[28px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
          dark
            ? 'bg-white/[0.08] border-white/15'
            : 'bg-white/[0.15] border-white/25'
        }`}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#c9983a]/20 flex items-center justify-center">
            <ShieldOff className="w-8 h-8 text-[#c9983a]" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center mb-8">
          <h2
            className={`text-2xl font-bold mb-2 transition-colors ${
              dark ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}
          >
            Access Restricted
          </h2>
          <p
            className={`text-sm transition-colors ${
              dark ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
            }`}
          >
            You don't have permission to view this page. Contact an administrator if you believe this is a mistake.
          </p>
        </div>

        {/* Action */}
        <button
          onClick={() => window.history.back()}
          className={`w-full py-3 rounded-[12px] font-medium transition-all flex items-center justify-center ${
            dark
              ? 'bg-white/[0.08] hover:bg-white/[0.12] text-[#f5efe5] border border-white/15'
              : 'bg-white/[0.15] hover:bg-white/[0.2] text-[#2d2820] border border-white/25'
          }`}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
