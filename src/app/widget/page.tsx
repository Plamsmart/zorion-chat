import { ChatWidget } from "@/components/chat/ChatWidget";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bot } from "@/types";

const BOT_ID_DEMO = process.env.NEXT_PUBLIC_DEMO_BOT_ID;

export default async function WidgetPage() {
  const supabase = createAdminClient();

  const { data: bot } = BOT_ID_DEMO
    ? await supabase
        .from("bots")
        .select("nombre, color_primario, logo_url")
        .eq("id", BOT_ID_DEMO)
        .maybeSingle<Pick<Bot, "nombre" | "color_primario" | "logo_url">>()
    : { data: null };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Demo del widget</h1>
      <p className="max-w-md text-sm text-gray-500">
        Esta página muestra el widget de chat embebible tal como se vería en
        el sitio de un cliente. Haz clic en la burbuja de la esquina inferior
        derecha para probarlo.
      </p>

      {BOT_ID_DEMO ? (
        <ChatWidget
          botId={BOT_ID_DEMO}
          botNombre={bot?.nombre ?? "Zorion Demo"}
          colorPrimario={bot?.color_primario ?? "#4f46e5"}
          logoUrl={bot?.logo_url}
        />
      ) : (
        <p className="text-sm text-red-500">
          Configura la variable de entorno NEXT_PUBLIC_DEMO_BOT_ID para ver la
          demo del widget.
        </p>
      )}
    </div>
  );
}
