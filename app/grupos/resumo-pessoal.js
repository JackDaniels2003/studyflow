"use client";

import Link from "next/link";
import { CircleCheckBig } from "lucide-react";
import Prazo from "@/components/prazo";
import { cartao } from "@/components/ui";
import { useAgora } from "@/lib/use-agora";

function saudacao(agora) {
  if (!agora) return "Olá";
  const hora = new Date(agora).getHours();
  if (hora < 5) return "Boa madrugada";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

// Cabecalho da area logada: saudacao pelo horario e as entregas do usuario em todos os grupos.
export default function ResumoPessoal({ nome, tarefas }) {
  const agora = useAgora();
  const atrasadas = agora ? tarefas.filter((t) => t.prazo && new Date(t.prazo).getTime() < agora).length : 0;
  const primeiroNome = nome?.split(" ")[0] ?? "";

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {saudacao(agora)}
        {primeiroNome && `, ${primeiroNome}`} 👋
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {tarefas.length === 0
          ? "Nenhuma tarefa com o seu nome por enquanto."
          : `Você tem ${tarefas.length} ${tarefas.length === 1 ? "tarefa pendente" : "tarefas pendentes"}`}
        {atrasadas > 0 && (
          <span className="font-medium text-red-600 dark:text-red-400">
            {" "}
            · {atrasadas} {atrasadas === 1 ? "atrasada" : "atrasadas"}
          </span>
        )}
        {tarefas.length > 0 && "."}
      </p>

      {tarefas.length > 0 ? (
        <div className={`${cartao} mt-6 overflow-hidden`}>
          <h2 className="border-b border-zinc-200/80 px-5 py-3 text-sm font-semibold dark:border-zinc-800">
            Suas próximas entregas
          </h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tarefas.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/grupos/${t.group_id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: `${t.groups?.cor ?? "#4f46e5"}26` }}
                    title={t.groups?.nome}
                  >
                    {t.groups?.emoji ?? "📚"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.titulo}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {t.groups?.nome}
                      {t.status === "doing" && " · em andamento"}
                    </p>
                  </div>
                  {t.prazo ? <Prazo prazo={t.prazo} /> : <span className="text-xs text-zinc-400">sem prazo</span>}
                </Link>
              </li>
            ))}
          </ul>
          {tarefas.length > 5 && (
            <p className="border-t border-zinc-100 px-5 py-2 text-xs text-zinc-500 dark:border-zinc-800">
              + {tarefas.length - 5} {tarefas.length - 5 === 1 ? "outra" : "outras"} nos seus grupos
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CircleCheckBig className="size-4" /> Tudo em dia
        </p>
      )}
    </section>
  );
}
