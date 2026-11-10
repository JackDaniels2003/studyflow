"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { botaoPrimario, botaoSecundario, cartao } from "@/components/ui";

export default function AceitarConvite({ codigo, previa }) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setErro("");
    setEntrando(true);
    const { data, error } = await createClient().rpc("join_group", { p_codigo: codigo });
    if (error) {
      setErro(
        /codigo invalido/.test(error.message)
          ? "Este convite não vale mais. Peça um link novo para o grupo."
          : "Não foi possível entrar agora. Tente de novo.",
      );
      setEntrando(false);
      return;
    }
    router.push(`/grupos/${data}`);
  }

  const cor = previa?.cor ?? "#4f46e5";

  return (
    <div className={`${cartao} animar-surgir mt-8 w-full max-w-sm overflow-hidden text-center`}>
      <div className="h-2" style={{ backgroundColor: cor }} />
      <div className="p-8">
        <span
          className="mx-auto inline-flex size-16 items-center justify-center rounded-2xl text-4xl"
          style={{ backgroundColor: `${cor}26` }}
        >
          {previa?.emoji ?? "📚"}
        </span>
        <p className="mt-5 text-sm text-zinc-500">Você foi convidado para o grupo</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {previa?.nome ?? `Código ${codigo}`}
        </h1>
        {previa && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-zinc-500">
            <Users className="size-4" />
            {previa.membros} {previa.membros === 1 ? "membro" : "membros"}
          </p>
        )}

        {erro && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {erro}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <button onClick={entrar} disabled={entrando} className={`${botaoPrimario} py-2.5`}>
            {entrando ? "Entrando..." : "Entrar no grupo"}
          </button>
          <Link href="/grupos" className={botaoSecundario}>
            Agora não
          </Link>
        </div>
      </div>
    </div>
  );
}
