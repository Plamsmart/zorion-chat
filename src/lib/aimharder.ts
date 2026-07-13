const AIMHARDER_BASE_URL = "https://api.aimharder.com";

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
  id: number;
  className: string;
  time: string;
  timeid: number;
  limit: number;
  ocupation: number;
  coach?: string;
  [clave: string]: unknown;
}

export interface DatosReservaInvitado {
  fecha: string;
  claseId: number;
  nombre: string;
  email?: string;
  telefono?: string;
}

interface RespuestaRefresh {
  access_token: string;
  refresh_token?: string;
}

async function peticionAimharder<T>(
  ruta: string,
  init: RequestInit = {},
  reintentando = false
): Promise<T> {
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
    throw new Error(
      `Error en la petición a Aimharder (${respuesta.status}): ${await respuesta.text()}`
    );
  }

  return (await respuesta.json()) as T;
}

export async function getCalendario(fecha: string): Promise<ClaseAimharder[]> {
  const datos = await peticionAimharder<
    ClaseAimharder[] | { classes?: ClaseAimharder[] }
  >(`/calendar/${fecha}`, { method: "GET" });

  return Array.isArray(datos) ? datos : (datos.classes ?? []);
}

export async function crearReservaInvitado(
  datos: DatosReservaInvitado
): Promise<number> {
  const respuesta = await peticionAimharder<{
    bookingId?: number;
    id?: number;
  }>("/classes/booking/guest", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  const bookingId = respuesta.bookingId ?? respuesta.id;
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
}
