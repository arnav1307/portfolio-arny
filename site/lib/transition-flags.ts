/**
 * Home ↔ /about transition experiment flags (2026-08-11).
 *
 * Flip any to `false` to revert that piece to the pre-experiment behaviour
 * without deleting code. All three `false` = classic vertical curtain only,
 * no about entrance, no hover prefetch.
 */
export const USE_DIRECTIONAL_WIPE = true;
export const USE_ABOUT_ENTRANCE = true;
export const USE_ROUTE_PREFETCH = true;
