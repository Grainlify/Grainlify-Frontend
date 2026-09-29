import { useTheme } from '../../../shared/contexts/ThemeContext';
import { videoUrl } from '../media';

// A narrated walkthrough, in the reader's theme, with captions. Nothing
// downloads until the reader presses play (preload="none"); the poster is a
// frame of the video itself.
export function VideoFrame({ slug, title, duration }: { slug: string; title: string; duration?: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <figure className="my-8">
      <video
        key={theme}
        controls
        preload="none"
        playsInline
        poster={videoUrl(slug, theme, 'poster.webp')}
        aria-label={`${title}, narrated walkthrough${duration ? `, ${duration}` : ''}`}
        className="block w-full aspect-video rounded-[16px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] bg-black/20"
      >
        <source src={videoUrl(slug, theme, 'mp4')} type="video/mp4" />
        <track kind="captions" src={videoUrl(slug, theme, 'vtt')} srcLang="en" label="English" default />
      </video>
      <figcaption className={`mt-3 text-center text-[13px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
        Narrated walkthrough{duration ? ` · ${duration}` : ''}, with captions
      </figcaption>
    </figure>
  );
}
