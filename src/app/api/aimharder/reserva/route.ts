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

  const espacioIndex = nombre.indexOf(" ");
  const name = espacioIndex === -1 ? nombre : nombre.slice(0, espacioIndex);
  const first_surname =
    espacioIndex === -1 ? "" : nombre.slice(espacioIndex + 1).trim();

  try {
    const bookingId = await crearReservaInvitado({
      schedule_id: claseId,
      booking_date: fecha,
      name,
      first_surname,
      second_surname: "",
      email,
      phone: telefono,
      booking_notes: "Reserva desde chatbot Kassandra",
    });

    return NextResponse.json({ bookingId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 502 }
    );
  }
}
