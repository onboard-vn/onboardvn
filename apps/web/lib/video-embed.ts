export type VideoEmbed = { type: 'youtube'; embedUrl: string } | { type: 'facebook'; url: string };

function extractYoutubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
  if (url.hostname.endsWith('youtube.com')) {
    const v = url.searchParams.get('v');
    if (v) return v;
    const match = /\/(?:embed|shorts)\/([^/?]+)/.exec(url.pathname);
    if (match) return match[1] ?? null;
  }
  return null;
}

export function parseVideoEmbed(rawUrl: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be') {
    const id = extractYoutubeId(url);
    if (!id) return null;
    return { type: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === 'facebook.com' || host === 'www.facebook.com' || host === 'fb.watch') {
    return { type: 'facebook', url: rawUrl };
  }
  return null;
}
