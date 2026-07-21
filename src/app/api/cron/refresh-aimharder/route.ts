import { NextRequest, NextResponse } from "next/server";
import { inicializarTokens, refrescarToken } from "@/lib/aimharder";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await inicializarTokens();
  await refrescarToken();

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
}
