import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteBotButton } from "@/components/admin/DeleteBotButton";
import { CopyableId } from "@/components/admin/CopyableId";
import type { Bot } from "@/types";

export default async function BotsPage() {
  // Cliente con la sesión del usuario (no el admin/service role): las RLS
  // policies de la tabla `bots` filtran automáticamente por owner_id,
  // salvo para el super-admin, que las ve todas.
  const supabase = await createClient();

  const { data: bots } = await supabase
    .from("bots")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Bot[]>();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Bots</h1>
        <Link
          href="/admin/bots/nuevo"
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80"
        >
          Nuevo bot
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(bots ?? []).map((bot) => (
              <tr key={bot.id}>
                <td className="px-4 py-3">
                  <CopyableId id={bot.id} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {bot.nombre}
                </td>
                <td className="px-4 py-3 text-gray-600">{bot.empresa}</td>
                <td className="px-4 py-3 text-gray-600">
                  {bot.whatsapp_numero || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      bot.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {bot.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/admin/bots/${bot.id}/conocimiento`}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Conocimiento
                    </Link>
                    <Link
                      href={`/admin/bots/${bot.id}/editar`}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Editar
                    </Link>
                    <DeleteBotButton botId={bot.id} botNombre={bot.nombre} />
                  </div>
                </td>
              </tr>
            ))}
            {(bots ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Todavía no hay bots. Crea el primero.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
