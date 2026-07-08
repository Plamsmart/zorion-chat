import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { comoCookieDeSesion } from "./cookies";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = parse(document.cookie);
          return Object.entries(cookies)
            .filter((entry): entry is [string, string] => entry[1] !== undefined)
            .map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = serialize(
              name,
              value,
              comoCookieDeSesion(options)
            );
          });
        },
      },
    }
  );
}
