"use client";

import { useState } from "react";
import { Check, Link2, ListPlus, Sparkles, Tags, Wand2 } from "lucide-react";
import { useAvisos } from "@/components/avisos";
import { botaoPrimario, botaoSecundario, cartao } from "@/components/ui";
import { copiarTexto } from "@/lib/copiar";

// Guia para grupos novos: aparece enquanto o quadro esta vazio.
export default function PrimeirosPassos({ codigo, temMembros, temMaterias, onNovaTarefa, onUsarModelo }) {
  const { avisar } = useAvisos();
  const [preenchendo, setPreenchendo] = useState(false);

  async function copiarLink() {
    if (await copiarTexto(`${window.location.origin}/convite/${codigo}`)) {
      avisar("Link de convite copiado. Mande no grupo da turma!");
    } else {
      avisar(`Código do grupo: ${codigo}`, "info");
    }
  }

  const passos = [
    {
      feito: temMembros,
      icone: Link2,
      titulo: "Chame o seu grupo",
      texto: "Mande o link de convite. Quem abrir entra direto no grupo.",
      acao: (
        <button onClick={copiarLink} className={botaoSecundario}>
          <Link2 className="size-4" /> Copiar link
        </button>
      ),
    },
    {
      feito: temMaterias,
      icone: Tags,
      titulo: "Cadastre as matérias",
      texto: "Use o botão “+ Matéria” logo abaixo. Cada uma ganha uma cor.",
    },
    {
      feito: false,
      icone: ListPlus,
      titulo: "Crie a primeira tarefa",
      texto: "Com prazo, a contagem regressiva começa na hora.",
      acao: (
        <button onClick={onNovaTarefa} className={botaoPrimario}>
          Criar tarefa
        </button>
      ),
    },
  ];

  return (
    <section className={`${cartao} overflow-hidden`}>
      <div className="flex items-center gap-3 border-b border-zinc-200/80 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-4 dark:border-zinc-800 dark:from-indigo-500/10 dark:to-violet-500/10">
        <Sparkles className="size-5 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h2 className="font-semibold">Primeiros passos</h2>
          <p className="text-sm text-zinc-500">Três coisas para o grupo começar a andar.</p>
        </div>
      </div>
      <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {passos.map(({ feito, icone: Icone, titulo, texto, acao }, i) => (
          <li key={titulo} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                feito
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
              }`}
            >
              {feito ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`flex items-center gap-2 font-medium ${feito ? "text-zinc-400 line-through" : ""}`}>
                <Icone className="size-4 text-zinc-400" /> {titulo}
              </p>
              <p className="text-sm text-zinc-500">{texto}</p>
            </div>
            {!feito && acao}
          </li>
        ))}
      </ol>
      {!temMaterias && (
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200/80 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <Wand2 className="size-5 shrink-0 text-violet-500" />
          <p className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
            <strong className="text-zinc-900 dark:text-zinc-100">Atalho:</strong> preencha com um modelo de
            Projeto Integrador (3 matérias e 9 tarefas com prazos nas próximas 2 semanas). Dá para editar tudo depois.
          </p>
          <button
            disabled={preenchendo}
            onClick={async () => {
              setPreenchendo(true);
              await onUsarModelo();
              setPreenchendo(false);
            }}
            className={botaoSecundario}
          >
            {preenchendo ? "Criando..." : "Usar modelo"}
          </button>
        </div>
      )}
    </section>
  );
}
