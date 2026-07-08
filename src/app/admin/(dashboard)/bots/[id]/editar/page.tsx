import { notFound } from "next/navigation";
import { BotForm } from "@/components/admin/BotForm";
import { updateBotAction } from "@/lib/actions/bots";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bot } from "@/types";

export default async function EditarBotPage({
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

  const actualizarBot = updateBotAction.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Editar bot
      </h1>
      <BotForm action={actualizarBot} bot={bot} />
    </div>
  );
}
