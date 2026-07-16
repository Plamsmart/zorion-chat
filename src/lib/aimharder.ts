import { createAdminClient } from "@/lib/supabase/admin";

const AIMHARDER_BASE_URL = "https://api.aimharder.com";
const AIMHARDER_TOKENS_ID = "ekin";

// El fetch nativo de Node (undici) solo negocia HTTP/2 cuando se habilita
// explícitamente `allowH2` en un Agent/Dispatcher propio; por defecto ya
// usa HTTP/1.1, que es el comportamiento equivalente a `curl --http1.1`
// que requiere la API de Aimharder.

let accessTokenActual = process.env.AIMHARDER_ACCESS_TOKEN ?? "";
let refreshTokenActual = process.env.AIMHARDER_REFRESH_TOKEN ?? "";

/**
 * Forma de una clase del calendario. Los nombres de campo son una
 * estimación basada en integraciones conocidas de Aimharder; ajustar si
 * la respuesta real de la API difiere.
 */
export interface ClaseAimharder {
  schedule_id: number;
  name: string;
  time: string;
  timeid: number;
  limit: number;
  ocupation: number;
  coach?: string;
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

interface RespuestaRefresh {
  access_token: string;
  refresh_token?: string;
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
  refreshToken: string
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

  if (!accessTokenActual || !refreshTokenActual) {
    accessTokenActual = process.env.AIMHARDER_ACCESS_TOKEN ?? "";
    refreshTokenActual = process.env.AIMHARDER_REFRESH_TOKEN ?? "";

    if (accessTokenActual && refreshTokenActual) {
      await guardarTokensEnSupabase(accessTokenActual, refreshTokenActual);
    }
  }
}

async function peticionAimharder<T>(
  ruta: string,
  init: RequestInit = {},
  reintentando = false
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

  if (respuesta.status === 410 && !reintentando) {
    await refrescarToken();
    return peticionAimharder<T>(ruta, init, true);
  }

  if (!respuesta.ok) {
    const cuerpoError = await respuesta.text();

    if (
      respuesta.status === 400 &&
      !reintentando &&
      cuerpoError.toLowerCase().includes("expired")
    ) {
      await refrescarToken();
      return peticionAimharder<T>(ruta, init, true);
    }

    throw new Error(
      `Error en la petición a Aimharder (${respuesta.status}): ${cuerpoError}`
    );
  }

  return (await respuesta.json()) as T;
}

export async function getCalendario(fecha: string): Promise<ClaseAimharder[]> {
  const respuesta = await peticionAimharder<{ data?: ClaseAimharder[] }>(
    `/calendar/${fecha}`,
    { method: "GET" }
  );

  return respuesta.data ?? [];
}

export async function crearReservaInvitado(
  datos: DatosReservaInvitado
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

export async function cancelarReserva(bookingId: number): Promise<void> {
  await peticionAimharder<unknown>("/classes/booking/cancel", {
    method: "POST",
    body: JSON.stringify({ id: bookingId }),
  });
}

export async function refrescarToken(): Promise<void> {
  const respuesta = await fetch(`${AIMHARDER_BASE_URL}/auth/tokens/refresh`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${refreshTokenActual}`,
    },
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo refrescar el token de Aimharder (${respuesta.status})`
    );
  }

  const datos = (await respuesta.json()) as RespuestaRefresh;
  accessTokenActual = datos.access_token;
  if (datos.refresh_token) {
    refreshTokenActual = datos.refresh_token;
  }

  await guardarTokensEnSupabase(accessTokenActual, refreshTokenActual);
}
