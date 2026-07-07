import { BotForm } from "@/components/admin/BotForm";
import { createBotAction } from "@/lib/actions/bots";

export default function NuevoBotPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Nuevo bot
      </h1>
      <BotForm action={createBotAction} />
    </div>
  );
}
