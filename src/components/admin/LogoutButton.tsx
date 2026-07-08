"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  const handleClick = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
    >
      Cerrar sesión
    </button>
  );
}
