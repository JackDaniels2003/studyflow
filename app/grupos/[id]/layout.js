import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EsqueletoCabecalhoGrupo } from "@/components/esqueletos";
import { contexto } from "@/lib/dados";
import Abas from "./abas";
import CopiarCodigo from "./copiar-codigo";
import Membros from "./membros";
import PersonalizarGrupo from "./personalizar-grupo";
import SairDoGrupo from "./sair-do-grupo";

export default function GrupoLayout({ children, params }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Suspense fallback={<EsqueletoCabecalhoGrupo />}>
        <CabecalhoGrupo params={params} />
      </Suspense>
      <div className="mt-6">{children}</div>
    </main>
  );
}

async function CabecalhoGrupo({ params }) {
  const { id } = await params;
  const { supabase, userId } = await contexto();

  // A RLS faz quem nao e membro receber null aqui.
  const { data: grupo } = await supabase
    .from("groups")
    .select("id, nome, codigo, emoji, cor, criado_por, group_members(user_id, created_at, profiles(nome, cor))")
    .eq("id", id)
    .maybeSingle();

  if (!grupo) notFound();

  const membros = grupo.group_members
    .toSorted((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => ({ id: m.user_id, nome: m.profiles?.nome ?? "Membro", cor: m.profiles?.cor }));
  const criador = grupo.criado_por === userId;
  const { group_members: _, ...dadosGrupo } = grupo;

  return (
    <>
      <Link
        href="/grupos"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 print:hidden dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" /> Meus grupos
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: `${grupo.cor}26` }}
          >
            {grupo.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {grupo.nome}
            </h1>
            <Membros grupo={dadosGrupo} membros={membros} userId={userId} />
          </div>
        </div>

        <div className="flex items-center gap-1 print:hidden">
          {criador && <PersonalizarGrupo grupo={dadosGrupo} />}
          {criador && <SairDoGrupo grupoId={grupo.id} nome={grupo.nome} />}
          <span className="w-1" />
          <CopiarCodigo grupoId={grupo.id} codigo={grupo.codigo} criador={criador} />
        </div>
      </div>

      <Abas grupoId={grupo.id} userId={userId} nomeGrupo={grupo.nome} cor={grupo.cor} />
    </>
  );
}
