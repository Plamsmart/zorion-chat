import { createAdminClient } from "@/lib/supabase/admin";

const AIMHARDER_BASE_URL = "https://api.aimharder.com";
const AIMHARDER_TOKENS_ID = "ekin";

// El fetch nativo de Node (undici) solo negocia HTTP/2 cuando se habilita
// explícitamente `allowH2` en un Agent/Dispatcher propio; por defecto ya
// usa HTTP/1.1, que es el comportamiento equivalente a `curl --http1.1`
// que requiere la API de Aimharder.

let accessTokenActual = "";
let refreshTokenActual = "";

// ─── BLOQUEO PARA EVITAR REFRESCOS SIMULTÁNEOS ───
let estaRefrescando = false;
let promesaRefresco: Promise<void> | null = null;

/**
 * Forma de una clase del calendario según GET /calendar/:date_str
 * (docs/architecture/aimharder-api-hallazgos.md §1.1). El entrenador es
 * `staff_name`, no `coach`. La ocupación no está en la respuesta
 * documentada; `ocupation`/`occupation` quedan declarados como opcionales
 * por si la API los envía sin documentar, y se leen de forma tolerante en
 * src/lib/bot.ts (`leerOcupacion`) — no dar por hecho que llegan.
 */
export interface ClaseAimharder {
  schedule_id: number;
  name: string;
  time: string;
  timeid: number;
  limit: number;
  ocupation?: number;
  occupation?: number;
  staff_id?: number;
  staff_name?: string;
  waitlist_count?: number;
  [clave: string]: unknown;
}

export interface DatosReservaInvitado {
  schedule_id: number;
  booking_date: string;
  name: string;
  first_surname: string;
  second_surname: string;
  email: string;
  phone: string;
  booking_notes: string;
}

// ─── CORREGIDO: kebab-case según la documentación de AimHarder ───
interface RespuestaRefresh {
  "access-token": string;
  "access-token-expires-at"?: string;
  "refresh-token"?: string;
  "refresh-token-expires-at"?: string;
}

interface AimharderTokensRow {
  id: string;
  access_token: string;
  refresh_token: string;
  updated_at: string;
}

async function cargarTokensDeSupabase(): Promise<void> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("aimharder_tokens")
    .select("*")
    .eq("id", AIMHARDER_TOKENS_ID)
    .maybeSingle<AimharderTokensRow>();

  if (data) {
    accessTokenActual = data.access_token;
    refreshTokenActual = data.refresh_token;
  }
}

async function guardarTokensEnSupabase(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("aimharder_tokens").upsert({
    id: AIMHARDER_TOKENS_ID,
    access_token: accessToken,
    refresh_token: refreshToken,
    updated_at: new Date().toISOString(),
  });
}

export async function inicializarTokens(): Promise<void> {
  await cargarTokensDeSupabase();
}

// ─── CORREGIDO: detecta token expirado en status 400, 401 y 410 ───
// ─── Y lee el body ANTES de decidir si reintentar ───
async function peticionAimharder<T>(
  ruta: string,
  init: RequestInit = {},
  reintentando = false,
): Promise<T> {
  if (!accessTokenActual) {
    await cargarTokensDeSupabase();
  }

  const respuesta = await fetch(`${AIMHARDER_BASE_URL}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessTokenActual}`,
    },
  });

  // Leer el body ANTES de decidir si reintentar o no
  const cuerpoTexto = await respuesta.text();
  const cuerpoJson = cuerpoTexto ? JSON.parse(cuerpoTexto) : null;

  // Detectar token expirado: 400 con "expired" en el body, o 401, o 410
  const esTokenExpirado =
    (respuesta.status === 400 &&
      cuerpoTexto.toLowerCase().includes("expired")) ||
    respuesta.status === 401 ||
    respuesta.status === 410;

  if (esTokenExpirado && !reintentando) {
    console.log("🔄 Token expirado detectado. Refrescando...");
    await refrescarToken();
    return peticionAimharder<T>(ruta, init, true);
  }

  if (!respuesta.ok) {
    throw new Error(
      `Error en la petición a Aimharder (${respuesta.status}): ${cuerpoTexto}`,
    );
  }

  return cuerpoJson as T;
}

export async function getCalendario(fecha: string): Promise<ClaseAimharder[]> {
  const respuesta = await peticionAimharder<{ data?: ClaseAimharder[] }>(
    `/calendar/${fecha}`,
    { method: "GET" },
  );

  return respuesta.data ?? [];
}

/**
 * GET /memberships documenta `price` y `taxes` como Number, pero el
 * ejemplo oficial los devuelve como string ("10.00", "21.0"). Se tipan
 * como number | string para reflejar la realidad; normalizar al leerlos
 * (ver precioConIva en src/lib/bot.ts).
 */
export interface TarifaAimharder {
  id: number;
  name: string;
  description: string;
  type: string;
  price: number | string;
  taxes: number | string;
  deactivation_date: string | null;
  online_sale: string;
  registration_fee: number;
  order: number;
}

export async function getMemberships(): Promise<TarifaAimharder[]> {
  const respuesta = await peticionAimharder<{ data?: TarifaAimharder[] }>(
    "/memberships",
    { method: "GET" },
  );

  const tarifas = respuesta.data ?? [];

  return tarifas.filter(
    (tarifa) => !tarifa.deactivation_date && tarifa.online_sale === "activada",
  );
}

export async function crearReservaInvitado(
  datos: DatosReservaInvitado,
): Promise<number> {
  const respuesta = await peticionAimharder<{
    data?: { message?: string; id?: number };
  }>("/classes/booking/guest", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  const bookingId = respuesta.data?.id;
  if (bookingId === undefined) {
    throw new Error("Aimharder no devolvió un booking_id en la reserva");
  }

  return bookingId;
}

// ─── CORREGIDO: booking_id en lugar de id ───
export async function cancelarReserva(bookingId: number): Promise<void> {
  await peticionAimharder<unknown>("/classes/booking/cancel", {
    method: "POST",
    body: JSON.stringify({ booking_id: bookingId }),
  });
}

// ─── CORREGIDO: bloqueo de concurrencia + Content-Type + kebab-case + data wrapper ───
export async function refrescarToken(): Promise<void> {
  // Si ya hay un refresco en curso, esperar a que termine
  if (estaRefrescando && promesaRefresco) {
    console.log("⏳ Refresco ya en curso, esperando...");
    return promesaRefresco;
  }

  estaRefrescando = true;

  promesaRefresco = (async () => {
    try {
      console.log("🔄 Refrescando token de AimHarder...");

      const respuesta = await fetch(
        `${AIMHARDER_BASE_URL}/auth/tokens/refresh`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshTokenActual}`,
          },
        },
      );

      if (!respuesta.ok) {
        const cuerpoError = await respuesta.text();
        throw new Error(
          `No se pudo refrescar el token de Aimharder (${respuesta.status}): ${cuerpoError}`,
        );
      }

      // ─── CORREGIDO: los tokens vienen dentro de "data" en la respuesta ───
      const jsonCompleto = (await respuesta.json()) as {
        data: RespuestaRefresh;
        info: { version: string; copyright: string };
      };

      const datos = jsonCompleto.data;

      accessTokenActual = datos["access-token"];
      if (datos["refresh-token"]) {
        refreshTokenActual = datos["refresh-token"];
      }

      console.log(
        "✅ Token refrescado. Expira:",
        datos["access-token-expires-at"],
      );
      await guardarTokensEnSupabase(accessTokenActual, refreshTokenActual);
    } catch (error) {
      console.error("❌ Error en refrescarToken:", error);
      throw error;
    } finally {
      estaRefrescando = false;
      promesaRefresco = null;
    }
  })();

  return promesaRefresco;
}
