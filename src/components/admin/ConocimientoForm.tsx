"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { Conocimiento } from "@/types";

interface ConocimientoFormProps {
  action: (formData: FormData) => void | Promise<void>;
  conocimiento?: Conocimiento;
  botId: string;
}

function SubmitButton({ esEdicion }: { esEdicion: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 disabled:opacity-50"
    >
      {pending
        ? "Guardando..."
        : esEdicion
          ? "Guardar cambios"
          : "Añadir conocimiento"}
    </button>
  );
}

export function ConocimientoForm({
  action,
  conocimiento,
  botId,
}: ConocimientoFormProps) {
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <div>
        <label
          htmlFor="titulo"
          className="block text-sm font-medium text-gray-700"
        >
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          defaultValue={conocimiento?.titulo ?? ""}
          placeholder="Ej. Horarios, Precios, Clases disponibles"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
        />
      </div>

      <div>
        <label
          htmlFor="contenido"
          className="block text-sm font-medium text-gray-700"
        >
          Contenido
        </label>
        <p className="mt-1 text-xs text-gray-400">
          Pega aquí la información que el bot debe conocer y utilizar para
          responder.
        </p>
        <textarea
          id="contenido"
          name="contenido"
          rows={14}
          required
          defaultValue={conocimiento?.contenido ?? ""}
          placeholder="Horario de atención: lunes a viernes de 9:00 a 18:00..."
          className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton esEdicion={Boolean(conocimiento)} />
        <Link
          href={`/admin/bots/${botId}/conocimiento`}
          className="rounded-full px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
