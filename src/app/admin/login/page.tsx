"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    router.replace("/admin/bots");
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-950 px-6">
      <h1 className="mb-8 font-serif text-3xl text-white">Zorion Chat</h1>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-8"
      >
        <div>
          <label htmlFor="email" className="block text-sm text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-300">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-gray-200 disabled:opacity-50"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
