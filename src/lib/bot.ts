import { cancelarReserva, getCalendario, getMemberships } from "@/lib/aimharder";
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
      return nombreCoincide && horaCoincide;
    });
    if (encontrada) return encontrada;
  }

  return null;
}

export interface DatosHacerReserva {
  nombre: string;
  email: string;
  telefono: string;
  clase: string;
  fecha: string;
  hora: string;
}

export interface DatosCancelarReserva {
  booking_id: number;
}

/**
 * Herramientas (function calling) que se le pasan a OpenAI para que pueda
 * gestionar reservas y cancelaciones en Aimharder directamente, en vez de
 * detectar la intención por palabras clave.
 */
export function obtenerHerramientasReserva() {
  return [
    {
      type: "function" as const,
      function: {
        name: "hacer_reserva",
        description:
          "Reserva una clase para el usuario en Aimharder. Solo debe llamarse cuando ya se tienen todos los datos necesarios (nombre, email, teléfono, clase, fecha y hora).",
        parameters: {
          type: "object",
          properties: {
            nombre: {
              type: "string",
              description: "Nombre completo del usuario",
            },
            email: { type: "string", description: "Email del usuario" },
            telefono: { type: "string", description: "Teléfono del usuario" },
            clase: {
              type: "string",
              description:
                "Nombre de la clase a reservar, tal como aparece en el calendario",
            },
            fecha: {
              type: "string",
              description: "Fecha de la clase en formato YYYY-MM-DD",
            },
            hora: {
              type: "string",
              description: "Hora de la clase en formato HH:MM",
            },
          },
          required: ["nombre", "email", "telefono", "clase", "fecha", "hora"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "cancelar_reserva",
        description:
          "Cancela una reserva existente del usuario en Aimharder usando su número de booking.",
        parameters: {
          type: "object",
          properties: {
            booking_id: {
              type: "number",
              description: "Número de booking de la reserva a cancelar",
            },
          },
          required: ["booking_id"],
        },
      },
    },
  ];
}

const MENSAJE_RESERVA_FALLIDA =
  "Lo siento, no pude completar tu reserva en este momento. Por favor intenta de nuevo o contacta directamente con Ekin: https://ekinwellnesstraining.aimharder.com/boxmemberships";

/** Ejecuta la herramienta `hacer_reserva` con los argumentos que devolvió OpenAI. */
export async function ejecutarHacerReserva(
  args: DatosHacerReserva,
): Promise<string> {
  const fechaSolicitada = new Date(`${args.fecha}T00:00:00Z`);
  const fechaHoy = new Date(`${formatearFechaISO(new Date())}T00:00:00Z`);
  const diasDeAntelacion = Math.round(
    (fechaSolicitada.getTime() - fechaHoy.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diasDeAntelacion > 10) {
    return `Solo podemos gestionar reservas con un máximo de 10 días de antelación. La fecha que indicas (${args.fecha}) está fuera de ese margen — escríbeme de nuevo más cerca de esa fecha para reservar.`;
  }

  const clase = await buscarClaseCoincidente(
    args.clase,
    args.hora,
    args.fecha,
  );

  if (!clase) {
    return `No encontré ninguna clase que coincida con "${args.clase} a las ${args.hora}" en el calendario del ${args.fecha}. ¿Puedes indicarme el nombre u horario exacto tal como aparece en el calendario?`;
  }

  const payload = {
    fecha: args.fecha,
    claseId: clase.id,
    nombre: args.nombre,
    email: args.email,
    telefono: args.telefono,
  };

  try {
    const respuesta = await fetch(`${obtenerBaseUrl()}/api/aimharder/reserva`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const cuerpo = (await respuesta.json()) as {
      bookingId?: number | null;
      error?: unknown;
    };

    if (!respuesta.ok) {
      return MENSAJE_RESERVA_FALLIDA;
    }

    const bookingId = cuerpo.bookingId;
    const bookingIdValido =
      typeof bookingId === "number" &&
      Number.isFinite(bookingId) &&
      bookingId > 0;

    if (!bookingIdValido) {
      throw new Error(
        `Respuesta de reserva sin bookingId numérico válido: ${JSON.stringify(cuerpo)}`,
      );
    }

    return `¡Listo, ${args.nombre}! Tu reserva para "${clase.nombre}" (${clase.hora}) ha sido confirmada. Número de reserva: ${bookingId}.`;
  } catch {
    return MENSAJE_RESERVA_FALLIDA;
  }
}

/** Ejecuta la herramienta `cancelar_reserva` con los argumentos que devolvió OpenAI. */
export async function ejecutarCancelarReserva(
  args: DatosCancelarReserva,
): Promise<string> {
  try {
    await cancelarReserva(args.booking_id);
    return `Listo, tu reserva con número de booking ${args.booking_id} ha sido cancelada.`;
  } catch (error) {
    const detalleError =
      error instanceof Error ? error.message : JSON.stringify(error);

    return `No se pudo cancelar la reserva: ${detalleError}. Por favor, inténtalo de nuevo más tarde.`;
  }
}
