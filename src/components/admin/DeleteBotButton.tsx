"use client";

import { useTransition } from "react";
import { deleteBotAction } from "@/lib/actions/bots";

interface DeleteBotButtonProps {
  botId: string;
  botNombre: string;
}

export function DeleteBotButton({ botId, botNombre }: DeleteBotButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmado = window.confirm(
      `¿Eliminar el bot "${botNombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    startTransition(() => {
      deleteBotAction(botId);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
