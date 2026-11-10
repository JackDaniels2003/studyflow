"use client";

import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { contarNaoLidas, lerLido } from "@/lib/lido";

// Selo no cartao do grupo: mensagens novas desde a ultima visita ao chat.
export default function NaoLidas({ grupoId, userId }) {
  const [quantas, setQuantas] = useState(0);

  useEffect(() => {
    const lido = lerLido(grupoId);
    if (!lido) return;
    let ativo = true;
    contarNaoLidas(createClient(), grupoId, userId, lido).then((n) => ativo && setQuantas(n));
    return () => {
      ativo = false;
    };
  }, [grupoId, userId]);

  if (!quantas) return null;
  return (
    <span
      title={`${quantas} ${quantas === 1 ? "mensagem nova" : "mensagens novas"} no chat`}
      className="animar-surgir inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums"
    >
      <MessagesSquare className="size-3" />
      {quantas > 99 ? "99+" : quantas}
    </span>
  );
}
