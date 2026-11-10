"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  FilePlus2,
  History,
  ListPlus,
  MessageCircle,
  MoveRight,
  StickyNote,
  Timer,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, cartao } from "@/components/ui";
import { formatarRelativo } from "@/lib/formatos";
import { useAgora } from "@/lib/use-agora";

const TIPOS = {
  tarefa_criada: { icone: ListPlus, cor: "text-sky-600 bg-sky-50 dark:bg-sky-500/10" },
  tarefa_concluida: { icone: CircleCheck, cor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
  tarefa_movida: { icone: MoveRight, cor: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
  arquivo: { icone: FilePlus2, cor: "text-pink-600 bg-pink-50 dark:bg-pink-500/10" },
  membro: { icone: UserPlus, cor: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
  nota: { icone: StickyNote, cor: "text-orange-600 bg-orange-50 dark:bg-orange-500/10" },
  foco: { icone: Timer, cor: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" },
  comentario: { icone: MessageCircle, cor: "text-sky-600 bg-sky-50 dark:bg-sky-500/10" },
};

// Linha do tempo do grupo (preenchida por gatilhos no banco), atualizando ao vivo.
export default function Atividade({ grupoId, membros, iniciais }) {
  const agora = useAgora();
  const [itens, setItens] = useState(iniciais);
  const [perfis, setPerfis] = useState(() => Object.fromEntries(membros.map((m) => [m.id, m])));
  const conhecidos = useRef(new Set(membros.map((m) => m.id)));

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`atividade-${grupoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity", filter: `group_id=eq.${grupoId}` },
        ({ new: item }) => {
          setItens((atual) => [item, ...atual.filter((i) => i.id !== item.id)].slice(0, 40));
          if (item.user_id && !conhecidos.current.has(item.user_id)) {
            conhecidos.current.add(item.user_id);
            supabase
              .from("profiles")
              .select("id, nome, cor")
              .eq("id", item.user_id)
              .single()
              .then(({ data }) => data && setPerfis((p) => ({ ...p, [data.id]: data })));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupoId]);

  return (
    <section className={`${cartao} flex flex-col p-5`}>
      <h2 className="flex items-center gap-2 font-semibold">
        <History className="size-4" /> Atividade recente
      </h2>
      {itens.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          O que o grupo fizer (tarefas, arquivos, notas) aparece aqui.
        </p>
      ) : (
        <ol className="relative mt-4 max-h-96 overflow-y-auto pr-1">
          {itens.map((item, i) => {
            const tipo = TIPOS[item.tipo] ?? TIPOS.tarefa_criada;
            const Icone = tipo.icone;
            const pessoa = perfis[item.user_id];
            return (
              <li key={item.id} className="animar-surgir relative flex gap-3 pb-4">
                {i < itens.length - 1 && (
                  <span className="absolute top-8 bottom-0 left-[15px] w-px bg-zinc-200 dark:bg-zinc-800" />
                )}
                <span className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-full ${tipo.cor}`}>
                  <Icone className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm break-words">
                    <span className="inline-flex items-center gap-1 align-middle font-medium">
                      {pessoa && <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho="size-4" texto="text-[8px]" />}
                      {pessoa?.nome?.split(" ")[0] ?? "Alguém"}
                    </span>{" "}
                    <span className="text-zinc-600 dark:text-zinc-400">{item.texto}</span>
                  </p>
                  <p className="text-xs text-zinc-400">{formatarRelativo(item.created_at, agora)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
