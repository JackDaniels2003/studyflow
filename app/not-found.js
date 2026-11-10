import Link from "next/link";
import { botaoPrimario } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-medium text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Esse endereço não existe, ou é de um grupo do qual você não participa.
      </p>
      <Link href="/grupos" className={`${botaoPrimario} mt-6`}>
        Voltar para meus grupos
      </Link>
    </main>
  );
}
