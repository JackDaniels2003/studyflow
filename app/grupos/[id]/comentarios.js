"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, SendHorizontal, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import { formatarRelativo } from "@/lib/formatos";
import { useAgora } from "@/lib/use-agora";

// Conversa de uma tarefa (dentro da janela de edicao), ao vivo.
export default function Comentarios({ tarefaId, grupoId, userId, membros, onMudouTotal }) {
  const agora = useAgora();
  const [comentarios, setComentarios] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef(null);
  const membroPorId = Object.fromEntries(membros.map((m) => [m.id, m]));

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;
    supabase
      .from("task_comments")
      .select("id, user_id, texto, created_at")
      .eq("task_id", tarefaId)
      .order("created_at")
      .then(({ data }) => ativo && setComentarios(data ?? []));

    const canal = supabase
      .channel(`comentarios-${tarefaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${tarefaId}` },
        ({ new: c }) => setComentarios((atual) => (atual?.some((x) => x.id === c.id) ? atual : [...(atual ?? []), c])),
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "task_comments" }, ({ old }) =>
        setComentarios((atual) => atual?.filter((x) => x.id !== old.id) ?? atual),
      )
      .subscribe();
    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [tarefaId]);

  // Mantem o selo 💬 do cartao em dia e rola para o comentario mais novo.
  const total = comentarios?.length;
  useEffect(() => {
    if (total === undefined) return;
    onMudouTotal?.(total);
    fim.current?.scrollIntoView({ block: "nearest" });
  }, [total, onMudouTotal]);

  async function enviar(event) {
    event.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo) return;
    setEnviando(true);
    const { data, error } = await createClient()
      .from("task_comments")
      .insert({ task_id: tarefaId, group_id: grupoId, texto: conteudo })
      .select("id, user_id, texto, created_at")
      .single();
    setEnviando(false);
    if (error) return;
    setTexto("");
    setComentarios((atual) => (atual.some((x) => x.id === data.id) ? atual : [...atual, data]));
  }

  async function apagar(id) {
    setComentarios((atual) => atual.filter((c) => c.id !== id));
    await createClient().from("task_comments").delete().eq("id", id);
  }

  return (
    <section className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="size-4" /> Comentários
        {total > 0 && <span className="font-normal text-zinc-400">{total}</span>}
      </h3>

      <ul className="mt-3 flex max-h-64 flex-col gap-3 overflow-y-auto">
        {comentarios === null && <li className="text-sm text-zinc-400">Carregando...</li>}
        {comentarios?.length === 0 && (
          <li className="text-sm text-zinc-500">Nenhum comentário. Combine detalhes da tarefa aqui.</li>
        )}
        {comentarios?.map((c) => {
          const autor = membroPorId[c.user_id];
          const meu = c.user_id === userId;
          return (
            <li key={c.id} className="group flex gap-2.5">
              <Avatar nome={autor?.nome ?? "Membro"} cor={autor?.cor} tamanho="size-7" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {meu ? "Você" : (autor?.nome ?? "Membro")}
                  </span>{" "}
                  · {formatarRelativo(c.created_at, agora)}
                  {meu && (
                    <button
                      onClick={() => apagar(c.id)}
                      aria-label="Apagar comentário"
                      className="ml-2 align-middle text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600 focus:opacity-100"
                    >
                      <Trash2 className="inline size-3" />
                    </button>
                  )}
                </p>
                <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{c.texto}</p>
              </div>
            </li>
          );
        })}
        <li ref={fim} aria-hidden="true" />
      </ul>

      <form onSubmit={enviar} className="mt-3 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={2000}
          placeholder="Escreva um comentário..."
          aria-label="Novo comentário"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          disabled={enviando || !texto.trim()}
          aria-label="Enviar comentário"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </section>
  );
}
