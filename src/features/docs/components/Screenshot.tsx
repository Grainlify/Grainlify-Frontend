import { useTheme } from '../../../shared/contexts/ThemeContext';
import { shotUrl } from '../media';

// A screenshot captured by the docs capture tool in four variants: light and
// dark, at 1440 and 390. The reader sees the one matching their theme and
// screen width, so a phone reader in dark mode sees the phone layout in dark.
// Captured by capture/run.mjs; see capture/shots.mjs for what each id shows.
//
// A shot written as shot:<id>?desktop exists at 1440 only (the product tour,
// which a phone never shows); phones then see the desktop capture.
export function Screenshot({ id: ref, alt, caption }: { id: string; alt: string; caption?: string }) {
  const { theme } = useTheme();
  const [id, flag] = ref.split('?');
  const desktopOnly = flag === 'desktop';
  const src = (w: 1440 | 390) => shotUrl(id, theme, w);
  return (
    <figure className="my-7">
      <picture>
        {!desktopOnly && <source media="(max-width: 639px)" srcSet={src(390)} />}
        <img
          src={src(1440)}
          alt={alt}
          loading="lazy"
          className={`mx-auto block w-full ${desktopOnly ? 'max-w-[520px]' : 'max-w-[260px] sm:max-w-[520px]'} rounded-[16px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]`}
        />
      </picture>
      {caption && (
        <figcaption className={`mt-3 text-center text-[13px] ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
