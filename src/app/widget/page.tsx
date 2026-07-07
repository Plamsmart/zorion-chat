import { ChatWidget } from "@/components/chat/ChatWidget";

const BOT_ID_DEMO = "bb5dc8b8-4651-4a81-bd3d-03a890187020";

export default function WidgetPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Demo del widget</h1>
      <p className="max-w-md text-sm text-gray-500">
        Esta página muestra el widget de chat embebible tal como se vería en
        el sitio de un cliente. Haz clic en la burbuja de la esquina inferior
        derecha para probarlo.
      </p>

      <ChatWidget
        botId={BOT_ID_DEMO}
        nombre="Zorion Demo"
        colorPrimario="#4f46e5"
      />
    </div>
  );
}
