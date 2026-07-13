import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import {
  aimharderEstaConfigurado,
  buscarBotActivoPorId,
  buscarOCrearConversacion,
  construirMensajesParaOpenAI,
  detectarIntencionReserva,
  guardarMensaje,
  procesarIntencionReserva,
} from "@/lib/bot";

function respuestaComoStream(texto: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(texto));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const { mensaje, bot_id, session_id } = await request.json();

  if (!mensaje || !bot_id || !session_id) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: mensaje, bot_id, session_id" },
      { status: 400 }
    );
  }

  const bot = await buscarBotActivoPorId(bot_id);

  if (!bot) {
    return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
  }

  const conversacion = await buscarOCrearConversacion(
    bot_id,
    "web",
    session_id
  );

  if (detectarIntencionReserva(mensaje) && aimharderEstaConfigurado()) {
    const respuestaReserva = await procesarIntencionReserva(
      mensaje,
      conversacion.id
    );

    if (respuestaReserva) {
      await guardarMensaje(conversacion.id, "user", mensaje);
      await guardarMensaje(conversacion.id, "assistant", respuestaReserva);
      return respuestaComoStream(respuestaReserva);
    }
  }

  const messages = await construirMensajesParaOpenAI(
    bot,
    conversacion.id,
    mensaje
  );

  await guardarMensaje(conversacion.id, "user", mensaje);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
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
          await guardarMensaje(conversacion.id, "assistant", respuestaCompleta);
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
