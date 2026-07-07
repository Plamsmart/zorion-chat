"use client";

import { useTransition } from "react";
import { deleteConocimientoAction } from "@/lib/actions/conocimiento";

interface DeleteConocimientoButtonProps {
  botId: string;
  conocimientoId: string;
  titulo: string;
}

export function DeleteConocimientoButton({
  botId,
  conocimientoId,
  titulo,
}: DeleteConocimientoButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmado = window.confirm(
      `¿Eliminar "${titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    startTransition(() => {
      deleteConocimientoAction(botId, conocimientoId);
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
