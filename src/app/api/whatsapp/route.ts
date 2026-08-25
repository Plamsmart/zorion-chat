import { NextRequest, NextResponse } from "next/server";
import { inicializarTokens } from "@/lib/aimharder";
import { openai } from "@/lib/openai";
import {
  aimharderEstaConfigurado,
  buscarBotActivoPorWhatsapp,
  buscarOCrearConversacion,
  construirMensajesParaOpenAI,
  detectarIntencionCancelacion,
  detectarIntencionReserva,
  guardarMensaje,
  procesarIntencionCancelacion,
  procesarIntencionReserva,
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

export async function POST(request: NextRequest) {
  await inicializarTokens();

  const formData = await request.formData();
  const from = formData.get("From")?.toString();
  const body = formData.get("Body")?.toString();
  const to = formData.get("To")?.toString();

  // TODO(debug-whatsapp-to): quitar una vez confirmado el valor real de To.
  console.log("[debug-whatsapp-to] campo To recibido de Twilio ->", to);

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

  if (
    (await detectarIntencionCancelacion(body, conversacion.id)) &&
    (await aimharderEstaConfigurado())
  ) {
    const respuestaCancelacion = await procesarIntencionCancelacion(
      body,
      conversacion.id
    );

    if (respuestaCancelacion) {
      await guardarMensaje(conversacion.id, "user", body);
      await guardarMensaje(conversacion.id, "assistant", respuestaCancelacion);

      return new Response(construirTwiML(respuestaCancelacion), {
        headers: { "Content-Type": "text/xml" },
      });
    }
  }

  if (
    (await detectarIntencionReserva(body, conversacion.id)) &&
    (await aimharderEstaConfigurado())
  ) {
    const respuestaReserva = await procesarIntencionReserva(
      body,
      conversacion.id
    );

    if (respuestaReserva) {
      await guardarMensaje(conversacion.id, "user", body);
      await guardarMensaje(conversacion.id, "assistant", respuestaReserva);

      return new Response(construirTwiML(respuestaReserva), {
        headers: { "Content-Type": "text/xml" },
      });
    }
  }

  const messages = await construirMensajesParaOpenAI(
    bot,
    conversacion.id,
    body
  );

  await guardarMensaje(conversacion.id, "user", body);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  const respuesta = completion.choices[0]?.message?.content?.trim() ?? "";

  await guardarMensaje(conversacion.id, "assistant", respuesta);

  return new Response(construirTwiML(respuesta), {
    headers: { "Content-Type": "text/xml" },
  });
}
