"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { Bot } from "@/types";

interface BotFormProps {
  action: (formData: FormData) => void | Promise<void>;
  bot?: Bot;
}

function SubmitButton({ esEdicion }: { esEdicion: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 disabled:opacity-50"
    >
      {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear bot"}
    </button>
  );
}

export function BotForm({ action, bot }: BotFormProps) {
  const [colorPrimario, setColorPrimario] = useState(
    bot?.color_primario ?? "#4f46e5"
  );

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <div>
        <label
          htmlFor="nombre"
          className="block text-sm font-medium text-gray-700"
        >
          Nombre del bot
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          defaultValue={bot?.nombre}
          placeholder="Ej. Asistente de Soporte"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
        />
      </div>

      <div>
        <label
          htmlFor="empresa"
          className="block text-sm font-medium text-gray-700"
        >
          Empresa
        </label>
        <input
          id="empresa"
          name="empresa"
          type="text"
          required
          defaultValue={bot?.empresa}
          placeholder="Ej. Zorion S.A."
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
        />
      </div>

      <div>
        <label
          htmlFor="descripcion"
          className="block text-sm font-medium text-gray-700"
        >
          Descripción / instrucciones del sistema
        </label>
        <p className="mt-1 text-xs text-gray-400">
          Define aquí la personalidad del bot: cómo debe comportarse, qué tono
          usar y qué información conoce.
        </p>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={10}
          defaultValue={bot?.descripcion ?? ""}
          placeholder="Eres un asistente amable que ayuda a los clientes de Zorion S.A. con..."
          className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
        />
      </div>

      <div>
        <label
          htmlFor="color_primario"
          className="block text-sm font-medium text-gray-700"
        >
          Color primario
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="color_primario"
            name="color_primario"
            type="color"
            value={colorPrimario}
            onChange={(e) => setColorPrimario(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-gray-300"
          />
          <span className="text-sm text-gray-500">{colorPrimario}</span>
        </div>
      </div>

      <div>
        <label
          htmlFor="whatsapp_numero"
          className="block text-sm font-medium text-gray-700"
        >
          Número de WhatsApp
        </label>
        <input
          id="whatsapp_numero"
          name="whatsapp_numero"
          type="text"
          defaultValue={bot?.whatsapp_numero ?? ""}
          placeholder="+34 600 000 000"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="activo"
          name="activo"
          type="checkbox"
          defaultChecked={bot?.activo ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="activo" className="text-sm text-gray-700">
          Bot activo
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton esEdicion={Boolean(bot)} />
        <Link
          href="/admin/bots"
          className="rounded-full px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
