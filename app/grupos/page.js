import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Users } from "lucide-react";
import { EsqueletoGrade } from "@/components/esqueletos";
import { cartao } from "@/components/ui";
import { contexto } from "@/lib/dados";
import AcoesGrupo from "./acoes-grupo";
import NaoLidas from "./nao-lidas";
import ResumoPessoal from "./resumo-pessoal";

export const metadata = { title: "Meus grupos | StudyFlow" };

export default function GruposPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Suspense fallback={<div className="h-16" />}>
        <Resumo />
      </Suspense>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Meus grupos</h2>
          <p className="text-sm text-zinc-500">
            Crie um grupo para o trabalho ou entre com o código que te passaram.
          </p>
        </div>
      </div>

      <AcoesGrupo />

      <Suspense fallback={<div className="mt-6"><EsqueletoGrade itens={3} /></div>}>
        <MeusGrupos />
      </Suspense>
    </main>
  );
}

async function Resumo() {
  const { supabase, userId } = await contexto();
  const [{ data: perfil }, { data: tarefas }] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", userId).single(),
    supabase
      .from("tasks")
      .select("id, titulo, prazo, status, group_id, groups(nome, emoji, cor)")
      .eq("responsavel", userId)
      .neq("status", "done")
      .order("prazo", { ascending: true, nullsFirst: false })
      .limit(30),
  ]);

  return <ResumoPessoal nome={perfil?.nome} tarefas={tarefas ?? []} />;
}

async function MeusGrupos() {
  const { supabase, userId } = await contexto();
  const { data: participacoes } = await supabase
    .from("group_members")
    .select("created_at, groups(id, nome, emoji, cor, group_members(count), tasks(status))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const grupos = (participacoes ?? []).map((p) => p.groups).filter(Boolean);

  if (grupos.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
        <Users className="mx-auto size-10 text-zinc-400" />
        <p className="mt-3 font-medium">Nenhum grupo ainda</p>
        <p className="mt-1 text-sm text-zinc-500">
          Crie o primeiro grupo acima e compartilhe o código com a turma.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {grupos.map((grupo) => {
        const membros = grupo.group_members?.[0]?.count ?? 0;
        const total = grupo.tasks.length;
        const feitas = grupo.tasks.filter((t) => t.status === "done").length;
        const pct = total ? Math.round((feitas / total) * 100) : 0;

        return (
          <li key={grupo.id}>
            <Link
              href={`/grupos/${grupo.id}`}
              className={`${cartao} group relative flex h-full flex-col overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: grupo.cor }} />
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${grupo.cor}26` }}
                >
                  {grupo.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{grupo.nome}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500">
                    <Users className="size-3.5" />
                    {membros} {membros === 1 ? "membro" : "membros"}
                    <NaoLidas grupoId={grupo.id} userId={userId} />
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
              </div>

              <div className="mt-auto pt-6">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>
                    {total
                      ? `${feitas} de ${total} tarefas concluídas`
                      : "Nenhuma tarefa ainda"}
                  </span>
                  {total > 0 && <span className="font-medium">{pct}%</span>}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: grupo.cor }}
                  />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
