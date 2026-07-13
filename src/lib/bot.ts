import { getCalendario } from "@/lib/aimharder";
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
  identificador: string
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

function formatearFechaISO(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: Date, dias: number) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

async function obtenerClasesCalendario(
  fecha: string
): Promise<ClaseCalendarioBot[]> {
  try {
    const clases = await getCalendario(fecha);

    return clases.map((clase) => ({
      id: clase.id,
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

function formatearClasesParaPrompt(fecha: string, clases: ClaseCalendarioBot[]) {
  if (clases.length === 0) {
    return `${fecha}: no hay clases programadas.`;
  }

  const lineas = clases.map(
    (c) =>
      `- ${c.hora} ${c.nombre} (${c.plazasLibres}/${c.plazasTotales} plazas libres)${
        c.entrenador ? ` — ${c.entrenador}` : ""
      }`
  );

  return `${fecha}:\n${lineas.join("\n")}`;
}

export async function obtenerCalendarioHoy(): Promise<string> {
  const fecha = formatearFechaISO(new Date());
  const clases = await obtenerClasesCalendario(fecha);
  return formatearClasesParaPrompt(fecha, clases);
}

export function aimharderEstaConfigurado(): boolean {
  return (
    Boolean(process.env.AIMHARDER_ACCESS_TOKEN) &&
    Boolean(process.env.AIMHARDER_REFRESH_TOKEN)
  );
}

export async function construirSystemPrompt(
  bot: Bot,
  conocimiento: Conocimiento[]
) {
  const contextoConocimiento = conocimiento
    .map((c) => (c.titulo ? `${c.titulo}:\n${c.contenido}` : c.contenido))
    .join("\n\n");

  let contextoCalendario = "";
  if (aimharderEstaConfigurado()) {
    const hoy = new Date();
    const fechas = Array.from({ length: 7 }, (_, i) =>
      formatearFechaISO(sumarDias(hoy, i))
    );

    const clasesPorFecha = await Promise.all(
      fechas.map((fecha) => obtenerClasesCalendario(fecha))
    );

    contextoCalendario = fechas
      .map((fecha, i) => formatearClasesParaPrompt(fecha, clasesPorFecha[i]))
      .join("\n\n");
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
    "Responde de forma clara, concisa y amable, basándote únicamente en la información anterior. Si no sabes la respuesta, dilo honestamente.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function construirMensajesParaOpenAI(
  bot: Bot,
  conversacionId: string,
  mensajeUsuario: string
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
  contenido: string
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
}

const PALABRAS_CLAVE_RESERVA = /reserv|apuntar|apuntarme|inscrib|agendar/i;
const REGEX_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const REGEX_TELEFONO = /\+?\d[\d\s-]{7,}\d/;

export function detectarIntencionReserva(texto: string): boolean {
  return PALABRAS_CLAVE_RESERVA.test(texto);
}

function extraerDatosReserva(texto: string): DatosReservaDetectados {
  const email = texto.match(REGEX_EMAIL)?.[0];
  const telefono = texto.match(REGEX_TELEFONO)?.[0]?.replace(/[\s-]/g, "");
  const nombre = texto
    .match(/nombre(?:\s+completo)?\s*[:\-]\s*([^\n,;]+)/i)?.[1]
    ?.trim();
  const clase = texto
    .match(/(?:clase|horario)\s*[:\-]\s*([^\n,;]+)/i)?.[1]
    ?.trim();

  return { nombre, email, telefono, clase };
}

async function buscarClaseCoincidente(
  descripcion: string
): Promise<ClaseCalendarioBot | null> {
  const hoy = new Date();
  const fechas = [formatearFechaISO(hoy), formatearFechaISO(sumarDias(hoy, 1))];
  const normalizado = descripcion.toLowerCase();

  for (const fecha of fechas) {
    const clases = await obtenerClasesCalendario(fecha);
    const encontrada = clases.find(
      (c) =>
        normalizado.includes(c.hora.toLowerCase()) ||
        normalizado.includes(c.nombre.toLowerCase())
    );
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
  conversacionId: string
): Promise<string | null> {
  const historial = await obtenerHistorial(conversacionId);
  const mensajesUsuario = [
    ...historial.filter((m) => m.rol === "user").map((m) => m.contenido),
    mensaje,
  ];

  if (!mensajesUsuario.some(detectarIntencionReserva)) {
    return null;
  }

  const datos = mensajesUsuario.reduce<DatosReservaDetectados>(
    (acumulado, texto) => {
      const extraidos = extraerDatosReserva(texto);
      return {
        nombre: extraidos.nombre ?? acumulado.nombre,
        email: extraidos.email ?? acumulado.email,
        telefono: extraidos.telefono ?? acumulado.telefono,
        clase: extraidos.clase ?? acumulado.clase,
      };
    },
    {}
  );

  const faltantes: string[] = [];
  if (!datos.nombre) faltantes.push("tu nombre completo");
  if (!datos.email) faltantes.push("tu email");
  if (!datos.telefono) faltantes.push("tu teléfono");
  if (!datos.clase) {
    faltantes.push(
      "la clase y el horario exacto que quieres reservar (tal como aparece en el calendario)"
    );
  }

  if (faltantes.length > 0) {
    return `Para completar tu reserva necesito que me indiques: ${faltantes.join(
      ", "
    )}.`;
  }

  const clase = await buscarClaseCoincidente(datos.clase!);

  if (!clase) {
    return `No encontré ninguna clase que coincida con "${datos.clase}" en el calendario de hoy o mañana. ¿Puedes indicarme el nombre u horario exacto tal como aparece en el calendario?`;
  }

  try {
    const respuesta = await fetch(
      `${obtenerBaseUrl()}/api/aimharder/reserva`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: formatearFechaISO(new Date()),
          claseId: clase.id,
          nombre: datos.nombre,
          email: datos.email,
          telefono: datos.telefono,
        }),
      }
    );

    const cuerpo = (await respuesta.json()) as {
      bookingId?: number;
      error?: string;
    };

    if (!respuesta.ok) {
      return `No se pudo completar la reserva${
        cuerpo.error ? `: ${cuerpo.error}` : ""
      }. Por favor, inténtalo de nuevo más tarde.`;
    }

    return `¡Listo, ${datos.nombre}! Tu reserva para "${clase.nombre}" (${clase.hora}) ha sido confirmada. Número de reserva: ${cuerpo.bookingId}.`;
  } catch {
    return "Ocurrió un error al procesar tu reserva. Por favor, inténtalo de nuevo más tarde.";
  }
}
