import { ChatWidget } from "@/components/chat/ChatWidget";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bot } from "@/types";

export default async function WidgetEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const { bot: botId } = await searchParams;
  const fondoTransparente = (
    <style>{`html, body { background: transparent !important; }`}</style>
  );

  if (!botId) {
    return fondoTransparente;
  }

  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("nombre, color_primario, logo_url")
    .eq("id", botId)
    .maybeSingle<Pick<Bot, "nombre" | "color_primario" | "logo_url">>();

  return (
    <>
      {fondoTransparente}
      <ChatWidget
        botId={botId}
        botNombre={bot?.nombre ?? "Asistente"}
        colorPrimario={bot?.color_primario ?? "#000000"}
        logoUrl={bot?.logo_url}
      />
    </>
  );
}
