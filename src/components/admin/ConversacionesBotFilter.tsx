"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import type { Bot } from "@/types";

interface ConversacionesBotFilterProps {
  bots: Pick<Bot, "id" | "nombre">[];
}

export function ConversacionesBotFilter({
  bots,
}: ConversacionesBotFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const botSeleccionado = searchParams.get("bot") ?? "";

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    router.push(
      valor ? `/admin/conversaciones?bot=${valor}` : "/admin/conversaciones"
    );
  };

  return (
    <select
      value={botSeleccionado}
      onChange={handleChange}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
    >
      <option value="">Todos los bots</option>
      {bots.map((bot) => (
        <option key={bot.id} value={bot.id}>
          {bot.nombre}
        </option>
      ))}
    </select>
  );
}
