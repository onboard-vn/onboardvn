/** Only a facebook.com URL may be embedded via the Page Plugin — never render the click-to-load
 * embed for any other host (including www./m. subdomains of other sites via lookalike paths). */
export function isFacebookFanpageUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    return hostname === 'facebook.com' || hostname.endsWith('.facebook.com');
  } catch {
    return false;
  }
}

/** Builds the Facebook Page Plugin embed URL for a given fanpage link. */
export function facebookPagePluginUrl(fanpageUrl: string): string {
  const params = new URLSearchParams({
    href: fanpageUrl,
    tabs: 'timeline',
    width: '500',
    height: '600',
    small_header: 'false',
    adapt_container_width: 'true',
    hide_cover: 'false',
    show_facepile: 'true',
  });
  return `https://www.facebook.com/plugins/page.php?${params.toString()}`;
}
