import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold">Zorion Chat</h1>
      <p className="max-w-xl text-gray-500">
        Chatbots con IA, listos para instalar en cualquier sitio web. Configura
        el bot de tu empresa, dale su propia base de conocimiento y ofrece
        soporte conversacional 24/7 a tus clientes.
      </p>
      <Link
        href="/widget"
        className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-black/80"
      >
        Ver demo del widget
      </Link>
    </div>
  );
}
