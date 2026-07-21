"use client";

import { useCallback, useState } from "react";

export interface ChatMessage {
  id: string;
  rol: "user" | "assistant";
  contenido: string;
}

export function useChatSession(botId: string) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviarMensaje = useCallback(
    async (contenido: string) => {
      const texto = contenido.trim();
      if (!texto || !sessionId || enviando) return;

      setError(null);
      setMensajes((prev) => [
        ...prev,
        { id: crypto.randomUUID(), rol: "user", contenido: texto },
      ]);
      setEnviando(true);
      setEscribiendo(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mensaje: texto,
            bot_id: botId,
            session_id: sessionId,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Error al contactar al asistente");
        }

        const asistenteId = crypto.randomUUID();
        let primerToken = true;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          if (primerToken) {
            primerToken = false;
            setEscribiendo(false);
            setMensajes((prev) => [
              ...prev,
              { id: asistenteId, rol: "assistant", contenido: chunk },
            ]);
          } else {
            setMensajes((prev) =>
              prev.map((m) =>
                m.id === asistenteId
                  ? { ...m, contenido: m.contenido + chunk }
                  : m
              )
            );
          }
        }
      } catch {
        setError("No se pudo enviar el mensaje. Inténtalo de nuevo.");
      } finally {
        setEnviando(false);
        setEscribiendo(false);
      }
    },
    [botId, sessionId, enviando]
  );

  return { mensajes, enviando, escribiendo, error, enviarMensaje };
}
