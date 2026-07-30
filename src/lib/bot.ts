import {
  cancelarReserva,
  getCalendario,
  getMemberships,
  type ClaseAimharder,
  type TarifaAimharder,
} from "@/lib/aimharder";
import { openai } from "@/lib/openai";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bot, Canal, Conocimiento, Conversacion, Mensaje } from "@/types";

export interface MensajeParaOpenAI {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function buscarBotActivoPorId(botId: string) {
  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", botId)
    .eq("activo", true)
    .maybeSingle<Bot>();

  return bot;
}

export async function buscarBotActivoPorWhatsapp(numeroWhatsapp: string) {
  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("whatsapp_numero", numeroWhatsapp)
    .eq("activo", true)
    .maybeSingle<Bot>();

  return bot;
}

export async function buscarOCrearConversacion(
  botId: string,
  canal: Canal,
  identificador: string,
) {
  const supabase = createAdminClient();

  const { data: existente } = await supabase
    .from("conversaciones")
    .select("*")
    .eq("bot_id", botId)
    .eq("canal", canal)
    .eq("identificador", identificador)
    .maybeSingle<Conversacion>();

  if (existente) {
    return existente;
  }

  const { data: nueva, error } = await supabase
    .from("conversaciones")
    .insert({ bot_id: botId, canal, identificador })
    .select()
    .single<Conversacion>();

  if (error || !nueva) {
    throw new Error("No se pudo crear la conversación");
  }

  return nueva;
}

export async function obtenerHistorial(conversacionId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("mensajes")
    .select("*")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true })
    .returns<Mensaje[]>();

  return data ?? [];
}

export async function obtenerConocimientoActivo(botId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("conocimiento")
    .select("*")
    .eq("bot_id", botId)
    .eq("activo", true)
    .returns<Conocimiento[]>();

  return data ?? [];
}

interface ClaseCalendarioBot {
  id: number;
  nombre: string;
  hora: string;
  plazasLibres: number | null;
  plazasTotales: number;
  entrenador: string | null;
}

type ResultadoCalendario =
  | { ok: true; clases: ClaseCalendarioBot[] }
  | { ok: false };

type ResultadoTarifas = { ok: true; texto: string } | { ok: false };

function obtenerBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function formatearFechaISO(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: Date, dias: number) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

// La ocupación no aparece en la respuesta documentada de GET
// /calendar/:date_str (docs/architecture/aimharder-api-hallazgos.md §1.1).
// Se acepta cualquiera de las dos grafías observadas y ninguna otra; si no
// llega, se trata como dato ausente, no como cero.
function leerOcupacion(clase: ClaseAimharder): number | null {
  const candidato = clase.ocupation ?? clase.occupation;
  return typeof candidato === "number" && Number.isFinite(candidato)
    ? candidato
    : null;
}

export function calcularPlazasLibres(clase: ClaseAimharder): number | null {
  const ocupacion = leerOcupacion(clase);
  if (ocupacion === null || !Number.isFinite(clase.limit)) {
    return null;
  }
  return Math.max(clase.limit - ocupacion, 0);
}

async function obtenerClasesCalendario(
  fecha: string,
): Promise<ResultadoCalendario> {
  let clases: ClaseAimharder[];

  try {
    clases = await getCalendario(fecha);
  } catch {
    return { ok: false };
  }

  return {
    ok: true,
    clases: clases.map((clase) => ({
      id: clase.schedule_id,
      nombre: clase.name,
      hora: clase.time,
      plazasLibres: calcularPlazasLibres(clase),
      plazasTotales: clase.limit,
      entrenador: clase.staff_name ?? null,
    })),
  };
}

function formatearClasesParaPrompt(
  fecha: string,
  clases: ClaseCalendarioBot[],
) {
  if (clases.length === 0) {
    return `${fecha}: no hay clases programadas.`;
  }

  const lineas = clases.map((c) => {
    const coartadaPlazas =
      c.plazasLibres !== null
        ? ` (${c.plazasLibres}/${c.plazasTotales} plazas libres)`
        : "";
    const coartadaEntrenador = c.entrenador ? ` — ${c.entrenador}` : "";
    return `- ${c.hora} ${c.nombre}${coartadaPlazas}${coartadaEntrenador}`;
  });

  const notaPlazas = clases.some((c) => c.plazasLibres === null)
    ? "\nNota: no dispongo del número de plazas libres. Si te preguntan por disponibilidad, indica que hay que confirmarlo en la app de AimHarder."
    : "";

  return `${fecha}:\n${lineas.join("\n")}${notaPlazas}`;
}

export async function obtenerCalendarioHoy(): Promise<string> {
  const fecha = formatearFechaISO(new Date());
  const resultado = await obtenerClasesCalendario(fecha);

  if (!resultado.ok) {
    return `${fecha}: no he podido consultar el calendario en este momento.`;
  }

  return formatearClasesParaPrompt(fecha, resultado.clases);
}

function comoNumeroFinito(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : null;
  }
  if (typeof valor === "string" && valor.trim() !== "") {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }
  return null;
}

// Umbral provisional de cordura para un precio con IVA: un resultado fuera
// de aquí es más probable que sea un fallo de parseo que un precio real, así
// que se omite en lugar de mostrarlo (ver docs/tasks/02-nan-y-degradacion.md
// §4). No es un parámetro de un cliente concreto — es un límite genérico
// hasta que exista configuración por bot para esto (CLAUDE.md §0).
const RANGO_PRECIO_PLAUSIBLE = { min: 0, max: 2000 };

// La documentación de AimHarder define `taxes` como "porcentaje o importe"
// sin garantizarlo por contrato (docs/architecture/aimharder-api-hallazgos.md
// §1.3). Se asume porcentaje, respaldado por el ejemplo oficial ("21.0").
// Confirmarlo con datos reales es objeto de la tarea 01; no cambiar esta
// fórmula sin esa confirmación.
function precioConIva(precio: unknown, taxes: unknown): number | null {
  const precioNumerico = comoNumeroFinito(precio);
  const taxesNumerico = comoNumeroFinito(taxes);

  if (precioNumerico === null || taxesNumerico === null) {
    return null;
  }

  const resultado =
    Math.round((precioNumerico + (precioNumerico * taxesNumerico) / 100) * 100) /
    100;

  if (!Number.isFinite(resultado)) {
    return null;
  }

  if (
    resultado < RANGO_PRECIO_PLAUSIBLE.min ||
    resultado > RANGO_PRECIO_PLAUSIBLE.max
  ) {
    console.warn(
      `precioConIva: resultado fuera de rango plausible (${resultado}€), se omite la tarifa`,
    );
    return null;
  }

  return resultado;
}

async function obtenerTarifas(): Promise<ResultadoTarifas> {
  let tarifas: TarifaAimharder[];

  try {
    tarifas = await getMemberships();
  } catch {
    return { ok: false };
  }

  if (tarifas.length === 0) {
    return { ok: true, texto: "" };
  }

  const lineas = tarifas
    .map((t) => {
      const precioFinal = precioConIva(t.price, t.taxes);
      if (precioFinal === null) return null;
      return `- ${t.name} (${t.type}): ${precioFinal}€ (IVA incluido)${
        t.description ? ` — ${t.description}` : ""
      }`;
    })
    .filter((linea): linea is string => linea !== null);

  return { ok: true, texto: lineas.join("\n") };
}

// ─── CORREGIDO: verifica tokens en Supabase, no en variables de entorno ───
export async function aimharderEstaConfigurado(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("aimharder_tokens")
    .select("id")
    .eq("id", "ekin")
    .maybeSingle();

  return Boolean(data);
}

export async function construirSystemPrompt(
  bot: Bot,
  conocimiento: Conocimiento[],
) {
  const contextoConocimiento = conocimiento
    .map((c) => (c.titulo ? `${c.titulo}:\n${c.contenido}` : c.contenido))
    .join("\n\n");

  let contextoCalendario = "";
  let contextoTarifas = "";

  // Un fallo al consultar AimHarder degrada el prompt (bloques explícitos
  // de "no he podido consultar"); nunca debe cancelar la conversación.
  try {
    // ─── CORREGIDO: await porque ahora es async ───
    if (await aimharderEstaConfigurado()) {
      const hoy = new Date();
      const fechas = Array.from({ length: 7 }, (_, i) =>
        formatearFechaISO(sumarDias(hoy, i)),
      );

      const resultadosCalendario = await Promise.all(
        fechas.map((fecha) => obtenerClasesCalendario(fecha)),
      );

      contextoCalendario = fechas
        .map((fecha, i) => {
          const resultado = resultadosCalendario[i];
          return resultado.ok
            ? formatearClasesParaPrompt(fecha, resultado.clases)
            : null;
        })
        .filter((bloque): bloque is string => bloque !== null)
        .join("\n\n");

      if (resultadosCalendario.some((r) => !r.ok)) {
        const avisoCalendario =
          "Calendario de clases: no he podido consultarlo en este momento.\nNo afirmes horarios ni disponibilidad; ofrece consultarlo en la app.";
        contextoCalendario = contextoCalendario
          ? `${contextoCalendario}\n\n${avisoCalendario}`
          : avisoCalendario;
      }

      const resultadoTarifas = await obtenerTarifas();
      contextoTarifas = resultadoTarifas.ok
        ? resultadoTarifas.texto
        : "Tarifas: no he podido consultarlas en este momento. No inventes precios; indica que hay que confirmarlos en la app de AimHarder o contactando con el centro.";
    }
  } catch {
    contextoCalendario =
      "Calendario de clases y tarifas: no he podido consultar AimHarder en este momento.\nNo afirmes horarios, disponibilidad ni precios; ofrece consultarlo en la app.";
    contextoTarifas = "";
  }

  return [
    `Eres el asistente virtual de "${bot.empresa}"${
      bot.nombre ? ` llamado ${bot.nombre}` : ""
    }.`,
    bot.descripcion ? `Descripción del bot: ${bot.descripcion}` : null,
    contextoConocimiento
      ? `Base de conocimiento:\n${contextoConocimiento}`
      : null,
    contextoCalendario
      ? `Calendario de clases en tiempo real:\n${contextoCalendario}`
      : null,
    contextoTarifas
      ? `Tarifas disponibles en EKIN:\n${contextoTarifas}`
      : null,
    "Responde de forma clara, concisa y amable, basándote únicamente en la información anterior. Si no sabes la respuesta, dilo honestamente.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function construirMensajesParaOpenAI(
  bot: Bot,
  conversacionId: string,
  mensajeUsuario: string,
): Promise<MensajeParaOpenAI[]> {
  const [historial, conocimiento] = await Promise.all([
    obtenerHistorial(conversacionId),
    obtenerConocimientoActivo(bot.id),
  ]);

  const systemPrompt = await construirSystemPrompt(bot, conocimiento);

  return [
    { role: "system", content: systemPrompt },
    ...historial.map((m) => ({
      role: m.rol,
      content: m.contenido,
    })),
    { role: "user", content: mensajeUsuario },
  ];
}

export async function guardarMensaje(
  conversacionId: string,
  rol: "user" | "assistant",
  contenido: string,
) {
  const supabase = createAdminClient();

  await supabase.from("mensajes").insert({
    conversacion_id: conversacionId,
    rol,
    contenido,
  });
}

interface DatosReservaDetectados {
  nombre?: string;
  email?: string;
  telefono?: string;
  clase?: string;
  hora?: string;
  fecha?: string;
}

const PALABRAS_CLAVE_RESERVA =
  /reserv|apuntar|apuntarme|inscrib|agendar|clase de prueba|prueba|quiero ir|me gustaría ir|puedo ir|puedo asistir|me anoto/i;
const REGEX_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const REGEX_TELEFONO = /\+?\d[\d\s-]{7,}\d/;

function contieneDatosReserva(texto: string): boolean {
  return REGEX_EMAIL.test(texto) || REGEX_TELEFONO.test(texto);
}

export async function detectarIntencionReserva(
  texto: string,
  conversacionId?: string,
): Promise<boolean> {
  if (PALABRAS_CLAVE_RESERVA.test(texto)) {
    return true;
  }

  if (!conversacionId) {
    return false;
  }

  const historial = await obtenerHistorial(conversacionId);
  return historial.some(
    (m) => m.rol === "user" && PALABRAS_CLAVE_RESERVA.test(m.contenido),
  );
}

function construirPromptExtraccionReserva() {
  const hoy = new Date().toISOString().split("T")[0];

  return `Extrae del siguiente mensaje y del historial de conversación estos datos para una reserva: nombre completo, email, teléfono, nombre de la clase, hora y fecha. La fecha debe devolverse en formato YYYY-MM-DD, interpretando expresiones relativas como "mañana", "el martes" o "el 14 de julio" tomando como referencia que hoy es ${hoy}. Responde SOLO con un JSON con estos campos: { nombre, email, telefono, clase, hora, fecha }. Si algún campo no está disponible ponlo como null.`;
}

interface DatosExtraidosIA {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  clase: string | null;
  hora: string | null;
  fecha: string | null;
}

async function extraerDatosReservaConIA(
  mensaje: string,
  historial: Mensaje[],
): Promise<DatosReservaDetectados> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: construirPromptExtraccionReserva() },
      ...historial.map((m) => ({ role: m.rol, content: m.contenido })),
      { role: "user", content: mensaje },
    ],
  });

  const contenido = completion.choices[0]?.message?.content ?? "{}";

  try {
    const datos = JSON.parse(contenido) as DatosExtraidosIA;
    return {
      nombre: datos.nombre ?? undefined,
      email: datos.email ?? undefined,
      telefono: datos.telefono ?? undefined,
      clase: datos.clase ?? undefined,
      hora: datos.hora ?? undefined,
      fecha: datos.fecha ?? undefined,
    };
  } catch {
    return {};
  }
}

type ResultadoBusquedaClase =
  | { estado: "encontrada"; clase: ClaseCalendarioBot }
  | { estado: "no_encontrada" }
  | { estado: "fallo_consulta" };

async function buscarClaseCoincidente(
  claseTexto: string,
  horaTexto?: string,
  fechaTexto?: string,
): Promise<ResultadoBusquedaClase> {
  const hoy = new Date();
  const fechas = fechaTexto
    ? [fechaTexto]
    : [formatearFechaISO(hoy), formatearFechaISO(sumarDias(hoy, 1))];
  const claseNormalizada = claseTexto.toLowerCase();
  const horaNormalizada = horaTexto?.toLowerCase();

  let huboFalloConsulta = false;

  for (const fecha of fechas) {
    const resultado = await obtenerClasesCalendario(fecha);
    if (!resultado.ok) {
      huboFalloConsulta = true;
      continue;
    }

    const encontrada = resultado.clases.find((c) => {
      const nombreCoincide = c.nombre.toLowerCase().includes(claseNormalizada);
      const horaCoincide =
        !horaNormalizada || c.hora.toLowerCase().includes(horaNormalizada);
      return nombreCoincide && horaCoincide;
    });
    if (encontrada) return { estado: "encontrada", clase: encontrada };
  }

  return huboFalloConsulta
    ? { estado: "fallo_consulta" }
    : { estado: "no_encontrada" };
}

/**
 * Detecta intención de reserva a lo largo de la conversación (historial +
 * mensaje actual), acumula los datos necesarios y, cuando están completos,
 * llama al endpoint de reserva. Devuelve `null` si no hay intención de
 * reserva, o el texto que el bot debe responder (petición de datos
 * faltantes, error, o confirmación con booking_id).
 */
export async function procesarIntencionReserva(
  mensaje: string,
  conversacionId: string,
): Promise<string | null> {
  if (!PALABRAS_CLAVE_RESERVA.test(mensaje) && !contieneDatosReserva(mensaje)) {
    return null;
  }

  const historial = await obtenerHistorial(conversacionId);
  const datos = await extraerDatosReservaConIA(mensaje, historial);

  const faltantes: string[] = [];
  if (!datos.nombre) faltantes.push("tu nombre completo");
  if (!datos.email) faltantes.push("tu email");
  if (!datos.telefono) faltantes.push("tu teléfono");
  if (!datos.clase)
    faltantes.push("el nombre de la clase que quieres reservar");
  if (!datos.hora) faltantes.push("la hora de la clase");

  if (faltantes.length > 0) {
    return `Para completar tu reserva necesito que me indiques: ${faltantes.join(
      ", ",
    )}.`;
  }

  const fechaReserva = datos.fecha ?? formatearFechaISO(new Date());
  const resultadoBusqueda = await buscarClaseCoincidente(
    datos.clase!,
    datos.hora,
    fechaReserva,
  );

  if (resultadoBusqueda.estado === "fallo_consulta") {
    return "No he podido consultar el calendario en este momento, así que no puedo confirmar tu reserva. Vuelve a intentarlo en unos minutos o resérvala directamente en la app de AimHarder.";
  }

  if (resultadoBusqueda.estado === "no_encontrada") {
    return `No encontré ninguna clase que coincida con "${datos.clase} a las ${datos.hora}" en el calendario del ${fechaReserva}. ¿Puedes indicarme el nombre u horario exacto tal como aparece en el calendario?`;
  }

  const clase = resultadoBusqueda.clase;

  const payload = {
    fecha: fechaReserva,
    claseId: clase.id,
    nombre: datos.nombre,
    email: datos.email,
    telefono: datos.telefono,
  };

  try {
    const respuesta = await fetch(`${obtenerBaseUrl()}/api/aimharder/reserva`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const cuerpo = (await respuesta.json()) as {
      bookingId?: number;
      error?: unknown;
    };

    if (!respuesta.ok) {
      const detalleError =
        typeof cuerpo.error === "string"
          ? cuerpo.error
          : cuerpo.error !== undefined
            ? JSON.stringify(cuerpo.error)
            : undefined;

      return `No se pudo completar la reserva${
        detalleError ? `: ${detalleError}` : ""
      }. Por favor, inténtalo de nuevo más tarde.`;
    }

    return `¡Listo, ${datos.nombre}! Tu reserva para "${clase.nombre}" (${clase.hora}) ha sido confirmada. Número de reserva: ${cuerpo.bookingId}.`;
  } catch (error) {
    const detalleError =
      error instanceof Error ? error.message : JSON.stringify(error);

    return `Ocurrió un error al procesar tu reserva: ${detalleError}. Por favor, inténtalo de nuevo más tarde.`;
  }
}

const PALABRAS_CLAVE_CANCELACION =
  /cancelar|anular|borrar reserva|quitar reserva|darme de baja de la clase/i;
const REGEX_BOOKING_ID = /\b\d{5,}\b/;

export async function detectarIntencionCancelacion(
  texto: string,
  conversacionId?: string
): Promise<boolean> {
  if (PALABRAS_CLAVE_CANCELACION.test(texto)) {
    return true;
  }

  if (!conversacionId) {
    return false;
  }

  const historial = await obtenerHistorial(conversacionId);
  return historial.some(
    (m) => m.rol === "user" && PALABRAS_CLAVE_CANCELACION.test(m.contenido)
  );
}

/**
 * Detecta intención de cancelación en el mensaje actual, pide el número de
 * booking si falta y, cuando lo tiene, cancela la reserva en Aimharder.
 * Devuelve `null` si el mensaje actual no tiene intención de cancelación ni
 * un número de booking reconocible.
 */
export async function procesarIntencionCancelacion(
  mensaje: string,
  conversacionId: string
): Promise<string | null> {
  if (
    !PALABRAS_CLAVE_CANCELACION.test(mensaje) &&
    !REGEX_BOOKING_ID.test(mensaje)
  ) {
    return null;
  }

  const bookingIdTexto = mensaje.match(REGEX_BOOKING_ID)?.[0];

  if (!bookingIdTexto) {
    return "Para cancelar tu reserva necesito el número de booking (te lo enviaron por email cuando reservaste). ¿Me lo puedes indicar?";
  }

  const bookingId = Number(bookingIdTexto);

  try {
    await cancelarReserva(bookingId);
    return `Listo, tu reserva con número de booking ${bookingId} ha sido cancelada.`;
  } catch (error) {
    const detalleError =
      error instanceof Error ? error.message : JSON.stringify(error);

    return `No se pudo cancelar la reserva: ${detalleError}. Por favor, inténtalo de nuevo más tarde.`;
  }
}
