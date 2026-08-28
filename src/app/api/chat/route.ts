import { NextRequest, NextResponse } from "next/server";
import { inicializarTokens } from "@/lib/aimharder";
import { openai } from "@/lib/openai";
import {
  aimharderEstaConfigurado,
  buscarBotActivoPorId,
  buscarOCrearConversacion,
  construirMensajesParaOpenAI,
  ejecutarCancelarReserva,
  ejecutarHacerReserva,
  guardarMensaje,
  obtenerHerramientasReserva,
  type DatosCancelarReserva,
  type DatosHacerReserva,
} from "@/lib/bot";

async function ejecutarHerramienta(
  nombre: string,
  argumentosJSON: string
): Promise<string> {
  try {
    const args = JSON.parse(argumentosJSON || "{}");

    if (nombre === "hacer_reserva") {
      return await ejecutarHacerReserva(args as DatosHacerReserva);
    }

    if (nombre === "cancelar_reserva") {
      return await ejecutarCancelarReserva(args as DatosCancelarReserva);
    }

    return "No he podido procesar esa solicitud. ¿Puedes intentarlo de otra forma?";
  } catch {
    return "Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo.";
  }
}

export async function POST(request: NextRequest) {
  await inicializarTokens();

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

  const messages = await construirMensajesParaOpenAI(
    bot,
    conversacion.id,
    mensaje
  );

  await guardarMensaje(conversacion.id, "user", mensaje);

  const tools = (await aimharderEstaConfigurado())
    ? obtenerHerramientasReserva()
    : undefined;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
    stream: true,
  });

  const encoder = new TextEncoder();
  let respuestaCompleta = "";
  let herramienta: { nombre: string; argumentos: string } | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta;
          const toolCallDelta = delta?.tool_calls?.[0];

          if (toolCallDelta) {
            const actual = herramienta ?? { nombre: "", argumentos: "" };
            if (toolCallDelta.function?.name) {
              actual.nombre = toolCallDelta.function.name;
            }
            if (toolCallDelta.function?.arguments) {
              actual.argumentos += toolCallDelta.function.arguments;
            }
            herramienta = actual;
            continue;
          }

          const contenido = delta?.content ?? "";
          if (contenido) {
            respuestaCompleta += contenido;
            controller.enqueue(encoder.encode(contenido));
          }
        }

        if (herramienta?.nombre) {
          const resultado = await ejecutarHerramienta(
            herramienta.nombre,
            herramienta.argumentos
          );
          respuestaCompleta = resultado;
          controller.enqueue(encoder.encode(resultado));
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
