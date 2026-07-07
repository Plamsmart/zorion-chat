"use client";

import { useState } from "react";

interface CopyableIdProps {
  id: string;
}

export function CopyableId({ id }: CopyableIdProps) {
  const [copiado, setCopiado] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin acceso al portapapeles; no hacemos nada más.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={id}
      className="font-mono text-xs text-gray-500 hover:text-gray-900"
    >
      {copiado ? "Copiado" : `${id.slice(0, 8)}...`}
    </button>
  );
}
