/**
 * Helper to compute the full base URL including repository subpaths
 * (vital for GitHub Pages e.g. https://user.github.io/repo-name/ and subdirectories).
 */
export function getAppBaseUrl(preferPublic = true): string {
  if (typeof window === 'undefined') return '';

  const origin = window.location.origin;
  // Strip trailing slashes and index.html if present
  const pathname = window.location.pathname
    .replace(/\/index\.html$/i, '')
    .replace(/\/+$/, '');

  let base = `${origin}${pathname}`;

  // If running in Google AI Studio development container and public is requested
  if (preferPublic && base.includes('ais-dev-')) {
    base = base.replace('ais-dev-', 'ais-pre-');
  }

  return base;
}
