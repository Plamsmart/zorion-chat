import { notFound } from "next/navigation";
import { ConocimientoForm } from "@/components/admin/ConocimientoForm";
import { updateConocimientoAction } from "@/lib/actions/conocimiento";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bot, Conocimiento } from "@/types";

export default async function EditarConocimientoPage({
  params,
}: {
  params: Promise<{ id: string; kid: string }>;
}) {
  const { id, kid } = await params;
  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", id)
    .maybeSingle<Bot>();

  if (!bot) {
    notFound();
  }

  const { data: conocimiento } = await supabase
    .from("conocimiento")
    .select("*")
    .eq("id", kid)
    .eq("bot_id", id)
    .maybeSingle<Conocimiento>();

  if (!conocimiento) {
    notFound();
  }

  const actualizarConocimiento = updateConocimientoAction.bind(
    null,
    bot.id,
    conocimiento.id
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Editar conocimiento — {bot.nombre}
      </h1>
      <ConocimientoForm
        action={actualizarConocimiento}
        conocimiento={conocimiento}
        botId={bot.id}
      />
    </div>
  );
}
