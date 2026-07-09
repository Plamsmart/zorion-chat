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

export function construirSystemPrompt(bot: Bot, conocimiento: Conocimiento[]) {
  const contextoConocimiento = conocimiento
    .map((c) => (c.titulo ? `${c.titulo}:\n${c.contenido}` : c.contenido))
    .join("\n\n");

  return [
    `Eres el asistente virtual de "${bot.empresa}"${
      bot.nombre ? ` llamado ${bot.nombre}` : ""
    }.`,
    bot.descripcion ? `Descripción del bot: ${bot.descripcion}` : null,
    contextoConocimiento
      ? `Base de conocimiento:\n${contextoConocimiento}`
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

  const systemPrompt = construirSystemPrompt(bot, conocimiento);

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
