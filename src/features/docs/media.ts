// Where the docs' screenshots and videos are served from. One constant, so
// moving them (from the app's own public/ folder to Vercel Blob) is one change.
export const MEDIA_BASE = '/docs-media';

export const shotUrl = (id: string, theme: 'light' | 'dark', width: 1440 | 390) => `${MEDIA_BASE}/shots/${id}.${theme}.${width}.webp`;
export const videoUrl = (slug: string, theme: 'light' | 'dark', ext: 'mp4' | 'vtt' | 'poster.webp') =>
  `${MEDIA_BASE}/videos/${slug.replace(/\//g, '__')}.${theme}.${ext}`;
