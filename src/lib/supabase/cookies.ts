import type { CookieOptions } from "@supabase/ssr";

/**
 * Supabase's default cookie options set maxAge to 400 days. We strip
 * maxAge/expires so every auth cookie is session-only and disappears
 * when the browser closes, instead of persisting long-term.
 */
export function comoCookieDeSesion(options: CookieOptions): CookieOptions {
  const resultado = { ...options };
  delete resultado.maxAge;
  delete resultado.expires;
  return resultado;
}
