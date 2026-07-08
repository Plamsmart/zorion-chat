import Link from "next/link";
import { notFound } from "next/navigation";
import { getConversacion, getMensajes } from "@/lib/conversaciones";

function formatearHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ConversacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversacion = await getConversacion(id);

  if (!conversacion) {
    notFound();
  }

  const mensajes = await getMensajes(id);

  return (
    <div>
      <nav className="mb-2 text-sm text-gray-500">
        <Link href="/admin/conversaciones" className="hover:text-gray-900">
          Conversaciones
        </Link>
        <span className="mx-2">→</span>
        <span className="text-gray-900">{conversacion.identificador}</span>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {conversacion.bots?.nombre ?? "Bot"}
          </h1>
          <p className="text-sm text-gray-500">{conversacion.identificador}</p>
        </div>
        <Link
          href="/admin/conversaciones"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          ← Volver
        </Link>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
        {mensajes.map((mensaje) => (
          <div
            key={mensaje.id}
            className={`flex ${
              mensaje.rol === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                mensaje.rol === "user"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p>{mensaje.contenido}</p>
              <p
                className={`mt-1 text-xs ${
                  mensaje.rol === "user" ? "text-white/60" : "text-gray-400"
                }`}
              >
                {formatearHora(mensaje.created_at)}
              </p>
            </div>
          </div>
        ))}
        {mensajes.length === 0 && (
          <p className="text-center text-gray-400">
            Esta conversación no tiene mensajes.
          </p>
        )}
      </div>
    </div>
  );
}
