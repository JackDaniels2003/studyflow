"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Paperclip, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { LIMITE_ARQUIVO, baixarArquivo, enviarArquivo, explicarErro } from "@/lib/arquivos";
import { formatarTamanho } from "@/lib/formatos";

// Arquivos ligados a uma tarefa (aparecem tambem na aba Arquivos).
export default function Anexos({ tarefaId, grupoId, userId, onMudouTotal }) {
  const { avisar, confirmar } = useAvisos();
  const [anexos, setAnexos] = useState(null);
  const [enviando, setEnviando] = useState(0);
  const input = useRef(null);

  useEffect(() => {
    let ativo = true;
    createClient()
      .from("files")
      .select("*")
      .eq("task_id", tarefaId)
      .order("created_at")
      .then(({ data }) => ativo && setAnexos(data ?? []));
    return () => {
      ativo = false;
    };
  }, [tarefaId]);

  const total = anexos?.length;
  useEffect(() => {
    if (total !== undefined) onMudouTotal?.(total);
  }, [total, onMudouTotal]);

  async function enviar(lista) {
    const supabase = createClient();
    for (const arquivo of [...lista]) {
      if (arquivo.size > LIMITE_ARQUIVO) {
        avisar(`"${arquivo.name}" passa de 50 MB.`, "erro");
        continue;
      }
      setEnviando((n) => n + 1);
      const { data, error } = await enviarArquivo(supabase, { grupoId, arquivo, taskId: tarefaId });
      setEnviando((n) => n - 1);
      if (error) avisar(`Não foi possível anexar "${arquivo.name}". ${explicarErro(error)}`, "erro");
      else setAnexos((atual) => [...(atual ?? []), data]);
    }
  }

  async function remover(anexo) {
    const sim = await confirmar({
      titulo: "Excluir anexo?",
      texto: `"${anexo.nome}" será apagado para todo o grupo.`,
      botao: "Excluir",
      perigo: true,
    });
    if (!sim) return;
    const supabase = createClient();
    const { error } = await supabase.storage.from("arquivos").remove([anexo.path]);
    if (error) {
      avisar("Não foi possível excluir o anexo.", "erro");
      return;
    }
    await supabase.from("files").delete().eq("id", anexo.id);
    setAnexos((atual) => atual.filter((a) => a.id !== anexo.id));
  }

  return (
    <section className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4" /> Anexos
          {total > 0 && <span className="font-normal text-zinc-400">{total}</span>}
        </h3>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <Plus className="size-3.5" /> Anexar arquivo
        </button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            enviar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {anexos === null && <li className="text-sm text-zinc-400">Carregando...</li>}
        {anexos?.length === 0 && enviando === 0 && (
          <li className="text-sm text-zinc-500">Nenhum anexo. Coloque aqui o entregável, rascunhos ou referências.</li>
        )}
        {anexos?.map((a) => (
          <li key={a.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <Paperclip className="size-3.5 shrink-0 text-zinc-400" />
            <button
              type="button"
              onClick={() => baixarArquivo(createClient(), a)}
              className="min-w-0 flex-1 truncate text-left text-sm hover:text-indigo-600 hover:underline"
            >
              {a.nome}
            </button>
            <span className="shrink-0 text-xs text-zinc-400">{formatarTamanho(a.tamanho)}</span>
            <button
              type="button"
              onClick={() => baixarArquivo(createClient(), a)}
              aria-label={`Baixar ${a.nome}`}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <Download className="size-3.5" />
            </button>
            {a.user_id === userId && (
              <button
                type="button"
                onClick={() => remover(a)}
                aria-label={`Excluir ${a.nome}`}
                className="text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600 focus:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {enviando > 0 && (
          <li className="flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-500">
            <span className="size-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
            Enviando {enviando} {enviando === 1 ? "arquivo" : "arquivos"}...
          </li>
        )}
      </ul>
    </section>
  );
}
