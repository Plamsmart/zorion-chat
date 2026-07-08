"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useChatSession, type ChatMessage } from "./useChatSession";

interface ChatWidgetProps {
  botId: string;
  nombre?: string;
  colorPrimario?: string;
}

export function ChatWidget({
  botId,
  nombre = "Asistente",
  colorPrimario = "#000000",
}: ChatWidgetProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const { mensajes, enviando, escribiendo, error, enviarMensaje } =
    useChatSession(botId);
  const mensajesRef = useRef<HTMLDivElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUrlsRef = useRef<Map<string, string>>(new Map());
  const [reproduciendoId, setReproduciendoId] = useState<string | null>(null);
  const [cargandoAudioId, setCargandoAudioId] = useState<string | null>(null);

  useEffect(() => {
    mensajesRef.current?.scrollTo({
      top: mensajesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensajes, escribiendo]);

  useEffect(() => {
    const urls = audioUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    enviarMensaje(texto);
    setTexto("");
  };

  const handleTogglePlay = async (mensaje: ChatMessage) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (reproduciendoId === mensaje.id) {
      audio.pause();
      setReproduciendoId(null);
      return;
    }

    audio.pause();
    setReproduciendoId(null);

    const cacheada = audioUrlsRef.current.get(mensaje.id);
    if (cacheada) {
      audio.src = cacheada;
      await audio.play();
      setReproduciendoId(mensaje.id);
      return;
    }

    setCargandoAudioId(mensaje.id);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: mensaje.contenido }),
      });

      if (!res.ok) throw new Error("Error al generar el audio");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlsRef.current.set(mensaje.id, url);

      audio.src = url;
      await audio.play();
      setReproduciendoId(mensaje.id);
    } catch {
      // El botón simplemente vuelve a su estado de reproducir.
    } finally {
      setCargandoAudioId(null);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {abierto && (
        <div className="flex h-[32rem] w-80 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
          <header
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: colorPrimario }}
          >
            <span className="font-semibold">{nombre}</span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar chat"
              className="rounded-full p-1 transition hover:bg-white/20"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div
            ref={mensajesRef}
            className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4"
          >
            {mensajes.length === 0 && (
              <p className="text-center text-sm text-gray-400">
                ¡Hola! ¿En qué puedo ayudarte?
              </p>
            )}
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.rol === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.rol === "user"
                      ? "text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                  style={
                    m.rol === "user"
                      ? { backgroundColor: colorPrimario }
                      : undefined
                  }
                >
                  {m.contenido}
                  {m.rol === "assistant" && (
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(m)}
                      aria-label={
                        reproduciendoId === m.id
                          ? "Pausar audio"
                          : "Reproducir audio"
                      }
                      className="mt-1.5 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:text-gray-700"
                    >
                      {cargandoAudioId === m.id ? (
                        <svg
                          className="h-3 w-3 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : reproduciendoId === m.id ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <rect x="6" y="5" width="4" height="14" />
                          <rect x="14" y="5" width="4" height="14" />
                        </svg>
                      ) : (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {escribiendo && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-200 px-3 py-2 text-sm text-gray-500">
                  escribiendo...
                </div>
              </div>
            )}
            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}
          </div>

          <audio
            ref={audioRef}
            onEnded={() => setReproduciendoId(null)}
            className="hidden"
          />

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-black/10 p-3"
          >
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 rounded-full border border-black/10 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black/30"
            />
            <button
              type="submit"
              disabled={!texto.trim() || enviando}
              aria-label="Enviar mensaje"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
              style={{ backgroundColor: colorPrimario }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar chat" : "Abrir chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105"
        style={{ backgroundColor: colorPrimario }}
      >
        {abierto ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
