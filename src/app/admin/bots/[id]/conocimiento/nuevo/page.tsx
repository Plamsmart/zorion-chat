import { notFound } from "next/navigation";
import { ConocimientoForm } from "@/components/admin/ConocimientoForm";
import { createConocimientoAction } from "@/lib/actions/conocimiento";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bot } from "@/types";

export default async function NuevoConocimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", id)
    .maybeSingle<Bot>();

  if (!bot) {
    notFound();
  }

  const crearConocimiento = createConocimientoAction.bind(null, bot.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Añadir conocimiento — {bot.nombre}
      </h1>
      <ConocimientoForm action={crearConocimiento} botId={bot.id} />
    </div>
  );
}
