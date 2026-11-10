"use client"; // Error boundaries precisam ser Client Components

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { botaoPrimario, botaoSecundario } from "@/components/ui";

export default function Erro({ error, retry, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Algo deu errado por aqui</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Pode ser a conexão ou o servidor demorando para acordar. Tente de novo em alguns segundos.
      </p>
      <div className="mt-6 flex gap-2">
        <button onClick={() => (retry ?? reset)?.()} className={botaoPrimario}>
          <RotateCcw className="size-4" /> Tentar de novo
        </button>
        <Link href="/grupos" className={botaoSecundario}>
          Meus grupos
        </Link>
      </div>
    </main>
  );
}
