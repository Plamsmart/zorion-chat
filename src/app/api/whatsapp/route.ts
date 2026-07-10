import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import {
  buscarBotActivoPorWhatsapp,
  buscarOCrearConversacion,
  construirMensajesParaOpenAI,
  guardarMensaje,
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
