import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeleteConocimientoButton } from "@/components/admin/DeleteConocimientoButton";
import type { Bot, Conocimiento } from "@/types";

function truncar(texto: string, maxLength = 80) {
  return texto.length > maxLength ? `${texto.slice(0, maxLength)}...` : texto;
}

export default async function ConocimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", id)
    .maybeSingle<Bot>();

  if (!bot) {
    notFound();
  }

  const { data: conocimiento } = await supabase
    .from("conocimiento")
    .select("*")
    .eq("bot_id", id)
    .order("created_at", { ascending: false })
    .returns<Conocimiento[]>();

  return (
    <div>
      <nav className="mb-2 text-sm text-gray-500">
        <Link href="/admin/bots" className="hover:text-gray-900">
          Bots
        </Link>
        <span className="mx-2">→</span>
        <Link
          href={`/admin/bots/${bot.id}/editar`}
          className="hover:text-gray-900"
        >
          {bot.nombre}
        </Link>
        <span className="mx-2">→</span>
        <span className="text-gray-900">Conocimiento</span>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Base de conocimiento
        </h1>
        <Link
          href={`/admin/bots/${bot.id}/conocimiento/nuevo`}
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80"
        >
          Añadir conocimiento
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Contenido</th>
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(conocimiento ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {item.titulo || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {truncar(item.contenido)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/admin/bots/${bot.id}/conocimiento/${item.id}/editar`}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Editar
                    </Link>
                    <DeleteConocimientoButton
                      botId={bot.id}
                      conocimientoId={item.id}
                      titulo={item.titulo || "este contenido"}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {(conocimiento ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Todavía no hay conocimiento cargado. Añade el primero.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
