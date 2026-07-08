import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const { texto } = await request.json();

  if (!texto || typeof texto !== "string") {
    return NextResponse.json(
      { error: "Falta el campo requerido: texto" },
      { status: 400 }
    );
  }

  const speech = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: texto,
    response_format: "mp3",
  });

  const audioBuffer = await speech.arrayBuffer();

  return new Response(audioBuffer, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
