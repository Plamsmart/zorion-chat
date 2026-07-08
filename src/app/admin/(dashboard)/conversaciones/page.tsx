import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversaciones } from "@/lib/conversaciones";
import { ConversacionesBotFilter } from "@/components/admin/ConversacionesBotFilter";
import type { Bot } from "@/types";

function truncar(texto: string, maxLength = 12) {
  return texto.length > maxLength ? `${texto.slice(0, maxLength)}...` : texto;
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ConversacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const { bot } = await searchParams;

  const supabase = createAdminClient();
  const { data: bots } = await supabase
    .from("bots")
    .select("id, nombre")
    .order("nombre", { ascending: true })
    .returns<Pick<Bot, "id" | "nombre">[]>();

  const conversaciones = await getConversaciones(bot);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Conversaciones
        </h1>
        <ConversacionesBotFilter bots={bots ?? []} />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Bot</th>
              <th className="px-4 py-3 font-medium">Canal</th>
              <th className="px-4 py-3 font-medium">Identificador</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {conversaciones.map((conversacion) => (
              <tr key={conversacion.id}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {conversacion.bots?.nombre ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      conversacion.canal === "whatsapp"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {conversacion.canal === "whatsapp" ? "WhatsApp" : "Web"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {truncar(conversacion.identificador)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatearFecha(conversacion.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/conversaciones/${conversacion.id}`}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
            {conversaciones.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Todavía no hay conversaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
