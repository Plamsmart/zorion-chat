import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { openai } from "@/lib/openai";
import type { Bot, Conocimiento, Mensaje } from "@/types";

export async function POST(request: NextRequest) {
  const { mensaje, bot_id, session_id } = await request.json();

  if (!mensaje || !bot_id || !session_id) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: mensaje, bot_id, session_id" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", bot_id)
    .eq("activo", true)
    .maybeSingle<Bot>();

  if (!bot) {
    return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
  }

  let { data: conversacion } = await supabase
    .from("conversaciones")
    .select("*")
    .eq("bot_id", bot_id)
    .eq("canal", "web")
    .eq("identificador", session_id)
    .maybeSingle();

  if (!conversacion) {
    const { data: nuevaConversacion, error: conversacionError } =
      await supabase
        .from("conversaciones")
        .insert({ bot_id, canal: "web", identificador: session_id })
        .select()
        .single();

    if (conversacionError || !nuevaConversacion) {
      return NextResponse.json(
        { error: "No se pudo crear la conversación" },
        { status: 500 }
      );
    }
    conversacion = nuevaConversacion;
  }

  const { data: historial } = await supabase
    .from("mensajes")
    .select("*")
    .eq("conversacion_id", conversacion.id)
    .order("created_at", { ascending: true })
    .returns<Mensaje[]>();

  const { data: conocimiento } = await supabase
    .from("conocimiento")
    .select("*")
    .eq("bot_id", bot_id)
    .eq("activo", true)
    .returns<Conocimiento[]>();

  const contextoConocimiento = (conocimiento ?? [])
    .map((c) => (c.titulo ? `${c.titulo}:\n${c.contenido}` : c.contenido))
    .join("\n\n");

  const systemPrompt = [
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

  const messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[] = [
    { role: "system", content: systemPrompt },
    ...(historial ?? []).map((m) => ({
      role: m.rol,
      content: m.contenido,
    })),
    { role: "user", content: mensaje },
  ];

  await supabase.from("mensajes").insert({
    conversacion_id: conversacion.id,
    rol: "user",
    contenido: mensaje,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  let respuestaCompleta = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const contenido = chunk.choices[0]?.delta?.content ?? "";
          if (contenido) {
            respuestaCompleta += contenido;
            controller.enqueue(encoder.encode(contenido));
          }
        }
      } catch (error) {
        console.error("Error en el stream de OpenAI:", error);
      } finally {
        controller.close();

        if (respuestaCompleta) {
          await supabase.from("mensajes").insert({
            conversacion_id: conversacion.id,
            rol: "assistant",
            contenido: respuestaCompleta,
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
