// Where the docs' screenshots and videos are served from.
//
// media-manifest.json is written by capture/upload.mjs. Until something has
// been uploaded, `base` is empty and every file is served from the app's own
// public/docs-media/ folder (local captures). Once uploaded, each file is read
// from Vercel Blob under a name that carries its content hash, so a
// regenerated screenshot gets a new URL and no cache can serve the old one.
import manifest from './media-manifest.json';

const files: Record<string, string> = manifest.files;

export const MEDIA_BASE = manifest.base || '/docs-media';

/** Every media file the docs can use, keyed "shots/<file>" or "videos/<file>". */
export const hasMedia = (key: string) => key in files;

const url = (key: string) => (manifest.base && files[key] ? `${manifest.base}/${files[key]}` : `/docs-media/${key}`);

export const shotUrl = (id: string, theme: 'light' | 'dark', width: 1440 | 390) => url(`shots/${id}.${theme}.${width}.webp`);
export const videoUrl = (slug: string, theme: 'light' | 'dark', ext: 'mp4' | 'vtt' | 'poster.webp') =>
  url(`videos/${slug.replace(/\//g, '__')}.${theme}.${ext}`);
