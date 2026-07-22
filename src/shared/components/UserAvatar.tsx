import { useEffect, useState } from 'react';

export function getUserInitials(name?: string, login?: string): string {
  const label = name?.trim() || login?.trim() || '?';
  const parts = label.split(/[\s_-]+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  src?: string;
  name?: string;
  login?: string;
  size: 'small' | 'large';
}

/**
 * GitHub avatar with an initials fallback. White on #2d2820 has a WCAG
 * contrast ratio greater than 14:1, comfortably exceeding AA requirements.
 */
export function UserAvatar({ src, name, login, size }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getUserInitials(name, login);
  const sizeClass = size === 'small' ? 'w-7 h-7 text-[10px]' : 'w-12 h-12 text-sm';
  const shadowClass = size === 'large' ? 'shadow-[0_0_12px_rgba(201,152,58,0.4)]' : '';
  const accessibleName = name?.trim() || login?.trim() || 'User';

  useEffect(() => setImageFailed(false), [src]);

  if (!src || imageFailed) {
    return (
      <span
        aria-label={`${accessibleName} avatar fallback`}
        className={`${sizeClass} ${shadowClass} rounded-full border-2 border-[#c9983a] bg-[#2d2820] text-white relative z-10 flex flex-shrink-0 items-center justify-center font-semibold uppercase`}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`${accessibleName} avatar`}
      onError={() => setImageFailed(true)}
      className={`${sizeClass} ${shadowClass} rounded-full border-2 border-[#c9983a] relative z-10 flex-shrink-0`}
    />
  );
}
