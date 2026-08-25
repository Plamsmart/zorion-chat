import { cancelarReserva, getCalendario, getMemberships } from "@/lib/aimharder";
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
  plazasLibres: number;
  plazasTotales: number;
  entrenador: string | null;
}

function obtenerBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const FORMATEADOR_FECHA_MADRID = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatearFechaISO(fecha: Date) {
  // "en-CA" formatea como YYYY-MM-DD. Usamos la zona horaria de España
  // explícitamente porque el servidor corre en UTC y `toISOString()` podía
  // devolver el día equivocado (p. ej. de madrugada en Madrid, cuando en
  // UTC todavía es el día anterior).
  return FORMATEADOR_FECHA_MADRID.format(fecha);
}

function sumarDias(fecha: Date, dias: number) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

async function obtenerClasesCalendario(
  fecha: string,
): Promise<ClaseCalendarioBot[]> {
  try {
    const clases = await getCalendario(fecha);

    return clases.map((clase) => ({
      id: clase.schedule_id,
      nombre: clase.name,
      hora: clase.time,
      plazasLibres: Math.max(clase.limit - clase.ocupation, 0),
      plazasTotales: clase.limit,
      entrenador: clase.coach ?? null,
    }));
  } catch {
    return [];
  }
}

function formatearClasesParaPrompt(
  fecha: string,
  clases: ClaseCalendarioBot[],
) {
  if (clases.length === 0) {
    return `${fecha}: no hay clases programadas.`;
  }

  const lineas = clases.map(
    (c) =>
      `- ${c.hora} ${c.nombre} (${c.plazasLibres}/${c.plazasTotales} plazas libres)${
        c.entrenador ? ` — ${c.entrenador}` : ""
      }`,
  );

  return `${fecha}:\n${lineas.join("\n")}`;
}

export async function obtenerCalendarioHoy(): Promise<string> {
  const fecha = formatearFechaISO(new Date());
  const clases = await obtenerClasesCalendario(fecha);
  return formatearClasesParaPrompt(fecha, clases);
}

function precioConIva(precio: number, taxes: number): number {
  return Math.round((precio + (precio * taxes) / 100) * 100) / 100;
}

export async function obtenerTarifas(): Promise<string> {
  const tarifas = await getMemberships();

  if (tarifas.length === 0) {
    return "";
  }

  return tarifas
    .map((t) => {
      const precioFinal = precioConIva(t.price, t.taxes);
      return `- ${t.name} (${t.type}): ${precioFinal}€ (IVA incluido)${
        t.description ? ` — ${t.description}` : ""
      }`;
    })
    .join("\n");
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

  // ─── CORREGIDO: await porque ahora es async ───
  if (await aimharderEstaConfigurado()) {
    const hoy = new Date();
    const fechas = Array.from({ length: 7 }, (_, i) =>
      formatearFechaISO(sumarDias(hoy, i)),
    );

    const clasesPorFecha = await Promise.all(
      fechas.map((fecha) => obtenerClasesCalendario(fecha)),
    );

    contextoCalendario = fechas
      .map((fecha, i) => formatearClasesParaPrompt(fecha, clasesPorFecha[i]))
      .join("\n\n");

    contextoTarifas = await obtenerTarifas();
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
const PALABRAS_CLAVE_EXCLUSION_RESERVA =
  /puedo reservar|se puede reservar|es posible reservar|con cuántos días|antelación/i;
const REGEX_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const REGEX_TELEFONO = /\+?\d[\d\s-]{7,}\d/;

function contieneDatosReserva(texto: string): boolean {
  return REGEX_EMAIL.test(texto) || REGEX_TELEFONO.test(texto);
}

export async function detectarIntencionReserva(
  texto: string,
  conversacionId?: string,
): Promise<boolean> {
  if (PALABRAS_CLAVE_EXCLUSION_RESERVA.test(texto)) {
    return false;
  }

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
  const hoy = formatearFechaISO(new Date());

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

async function buscarClaseCoincidente(
  claseTexto: string,
  horaTexto?: string,
  fechaTexto?: string,
): Promise<ClaseCalendarioBot | null> {
  const hoy = new Date();
  const fechas = fechaTexto
    ? [fechaTexto]
    : [formatearFechaISO(hoy), formatearFechaISO(sumarDias(hoy, 1))];
  const claseNormalizada = claseTexto.trim().toLowerCase();
  const horaNormalizada = horaTexto?.trim().toLowerCase();

  for (const fecha of fechas) {
    const clases = await obtenerClasesCalendario(fecha);

    const encontrada = clases.find((c) => {
      const nombreNormalizado = c.nombre.trim().toLowerCase();
      const horaClaseNormalizada = c.hora.trim().toLowerCase();
      const nombreCoincide = nombreNormalizado.includes(claseNormalizada);
      const horaCoincide =
        !horaNormalizada || horaClaseNormalizada.includes(horaNormalizada);

      // TODO(debug-clase-matching): quitar una vez confirmado el origen del problema.
      console.log("[debug-clase-matching] comparando ->", {
        claseTexto,
        claseNormalizada,
        horaTexto,
        horaNormalizada,
        nombreCalendario: c.nombre,
        nombreNormalizado,
        horaCalendario: c.hora,
        horaClaseNormalizada,
        nombreCoincide,
        horaCoincide,
      });

      return nombreCoincide && horaCoincide;
    });
    if (encontrada) return encontrada;
  }

  return null;
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

  if (datos.fecha) {
    const fechaSolicitada = new Date(`${datos.fecha}T00:00:00Z`);
    const fechaHoy = new Date(`${formatearFechaISO(new Date())}T00:00:00Z`);
    const diasDeAntelacion = Math.round(
      (fechaSolicitada.getTime() - fechaHoy.getTime()) / (1000 * 60 * 60 * 24),
    );

    // TODO(debug-antelacion-reserva): quitar una vez confirmado que OpenAI extrae bien la fecha.
    console.log("[debug-antelacion-reserva] fecha extraída ->", {
      mensaje,
      "datos.fecha": datos.fecha,
      diasDeAntelacion,
    });

    if (diasDeAntelacion > 10) {
      return `Solo podemos gestionar reservas con un máximo de 10 días de antelación. La fecha que indicas (${datos.fecha}) está fuera de ese margen — escríbeme de nuevo más cerca de esa fecha para reservar.`;
    }
  }

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
  const clase = await buscarClaseCoincidente(
    datos.clase!,
    datos.hora,
    fechaReserva,
  );

  if (!clase) {
    return `No encontré ninguna clase que coincida con "${datos.clase} a las ${datos.hora}" en el calendario del ${fechaReserva}. ¿Puedes indicarme el nombre u horario exacto tal como aparece en el calendario?`;
  }

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
