import { NextRequest, NextResponse } from "next/server";
import { getCalendario, inicializarTokens } from "@/lib/aimharder";

export async function GET(request: NextRequest) {
  await inicializarTokens();

  const fecha = request.nextUrl.searchParams.get("fecha");

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json(
      { error: "Falta o es inválido el parámetro fecha (formato YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  try {
    const clases = await getCalendario(fecha);

    const clasesFormateadas = clases.map((clase) => ({
      id: clase.schedule_id,
      nombre: clase.name,
      hora: clase.time,
      plazasLibres: Math.max(clase.limit - clase.ocupation, 0),
      plazasTotales: clase.limit,
      entrenador: clase.coach ?? null,
    }));

    return NextResponse.json({ fecha, clases: clasesFormateadas });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
