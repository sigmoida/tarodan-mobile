import { parseListingParam } from '@/types';

/**
 * The listing id inside a route param or a URL path segment.
 *
 * A listing is addressed as `/listings/<slug>-<uuid>` (ADR 0017), and expo-router hands the
 * whole segment to the screen. The uuid is the key and the slug is decoration, so every screen
 * and deep-link mapper takes the id from here before it calls the API or builds a route:
 * a bare uuid, an upper-case uuid and a stale or edited slug all resolve to the same lower-case
 * uuid. Anything else is `null` (the caller shows "not found"; no request is made).
 *
 * Accepts what `useLocalSearchParams` returns (`string | string[]`) and percent-encoded
 * segments (a Turkish title in a universal link).
 */
export function listingIdFromParam(param: string | readonly string[] | null | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (typeof raw !== 'string') return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return parseListingParam(decoded);
}
