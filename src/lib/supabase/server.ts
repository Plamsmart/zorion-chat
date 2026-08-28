import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { comoCookieDeSesion } from "./cookies";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, comoCookieDeSesion(options))
            );
          } catch {
            // Se llama desde un Server Component; la sesión se refresca en el proxy.
          }
        },
      },
    }
  );
}

/** Email del super-admin: ve y gestiona los bots de todos los usuarios. */
export const EMAIL_SUPER_ADMIN = "zorionagencia@gmail.com";

/**
 * Devuelve el usuario autenticado actual (o `null` si no hay sesión).
 * Usa `getUser()` en vez de `getSession()` porque revalida el token contra
 * el servidor de Supabase en lugar de confiar en la cookie sin más.
 */
export async function getUsuarioActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/** `true` si el usuario (o su ausencia) corresponde al super-admin. */
export function esSuperAdmin(usuario: { email?: string | null } | null) {
  return usuario?.email === EMAIL_SUPER_ADMIN;
}
