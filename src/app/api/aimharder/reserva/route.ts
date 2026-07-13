import { NextRequest, NextResponse } from "next/server";
import { crearReservaInvitado } from "@/lib/aimharder";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fecha, claseId, nombre, email, telefono } = body ?? {};

  if (!fecha || !claseId || !nombre) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: fecha, claseId, nombre" },
      { status: 400 }
    );
  }

  try {
    const bookingId = await crearReservaInvitado({
      fecha,
      claseId,
      nombre,
      email,
      telefono,
    });

    return NextResponse.json({ bookingId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
