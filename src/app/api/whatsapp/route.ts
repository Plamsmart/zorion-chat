import { NextRequest, NextResponse } from "next/server";
import { inicializarTokens } from "@/lib/aimharder";
import { openai } from "@/lib/openai";
import {
  aimharderEstaConfigurado,
  buscarBotActivoPorWhatsapp,
  buscarOCrearConversacion,
  construirMensajesParaOpenAI,
  ejecutarCancelarReserva,
  ejecutarHacerReserva,
  guardarMensaje,
  obtenerHerramientasReserva,
  type DatosCancelarReserva,
  type DatosHacerReserva,
} from "@/lib/bot";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const challenge = searchParams.get("hub.challenge");

  if (!challenge) {
    return new Response("Falta hub.challenge", { status: 400 });
  }

  return new Response(challenge, { status: 200 });
}

function escaparXml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function construirTwiML(mensaje: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${escaparXml(
    mensaje
  )}</Message>\n</Response>`;
}

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

  const formData = await request.formData();
  const from = formData.get("From")?.toString();
  const body = formData.get("Body")?.toString();
  const to = formData.get("To")?.toString();

  if (!from || !body || !to) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: From, Body, To" },
      { status: 400 }
    );
  }

  const numeroTo = to.replace(/^whatsapp:/, "").trim();

  const bot = await buscarBotActivoPorWhatsapp(numeroTo);

  if (!bot) {
    return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
  }

  const conversacion = await buscarOCrearConversacion(
    bot.id,
    "whatsapp",
    from
  );

  const messages = await construirMensajesParaOpenAI(
    bot,
    conversacion.id,
    body
  );

  await guardarMensaje(conversacion.id, "user", body);

  const tools = (await aimharderEstaConfigurado())
    ? obtenerHerramientasReserva()
    : undefined;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
  });

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];

  if (toolCall && toolCall.type === "function") {
    const resultado = await ejecutarHerramienta(
      toolCall.function.name,
      toolCall.function.arguments
    );

    await guardarMensaje(conversacion.id, "assistant", resultado);

    return new Response(construirTwiML(resultado), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const respuesta = completion.choices[0]?.message?.content?.trim() ?? "";

  await guardarMensaje(conversacion.id, "assistant", respuesta);

  return new Response(construirTwiML(respuesta), {
    headers: { "Content-Type": "text/xml" },
  });
}
