import { createAdminClient } from "@/lib/supabase/admin";
import type { Bot, Conversacion, Mensaje } from "@/types";

export interface ConversacionConBot extends Conversacion {
  bots: Pick<Bot, "nombre"> | null;
}

export async function getConversaciones(botId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("conversaciones")
    .select("*, bots(nombre)")
    .order("created_at", { ascending: false });

  if (botId) {
    query = query.eq("bot_id", botId);
  }

  const { data, error } = await query.returns<ConversacionConBot[]>();

  if (error) {
    throw new Error(
      `No se pudieron obtener las conversaciones: ${error.message}`
    );
  }

  return data ?? [];
}

export async function getConversacion(id: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("conversaciones")
    .select("*, bots(nombre)")
    .eq("id", id)
    .maybeSingle<ConversacionConBot>();

  if (error) {
    throw new Error(`No se pudo obtener la conversación: ${error.message}`);
  }

  return data;
}

export async function getMensajes(conversacionId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("mensajes")
    .select("*")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true })
    .returns<Mensaje[]>();

  if (error) {
    throw new Error(`No se pudieron obtener los mensajes: ${error.message}`);
  }

  return data ?? [];
}
