import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="flex w-64 shrink-0 flex-col bg-gray-950 text-white">
        <div className="px-6 py-6 text-lg font-semibold">Zorion Chat</div>

        <nav className="flex-1 space-y-1 px-3">
          <Link
            href="/admin/bots"
            className="block rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            Bots
          </Link>
          <Link
            href="/admin/conversaciones"
            className="block rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            Conversaciones
          </Link>
        </nav>

        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          <Link
            href="/widget"
            className="block rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            Ver demo
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
