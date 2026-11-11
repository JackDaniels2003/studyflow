"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Janela, botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/ui";
import { isoParaInputLocal } from "@/lib/formatos";
import { novoId } from "@/lib/id";
import { PRIORIDADES, STATUS } from "@/lib/tarefas";
import Anexos from "./anexos";
import Comentarios from "./comentarios";

export default function FormTarefa({
  tarefa,
  materias,
  membros,
  userId,
  comChecklist,
  comComentarios,
  grupoId,
  onMudouComentarios,
  comAnexos,
  onMudouAnexos,
  materiaPadrao,
  onSalvar,
  onFechar,
}) {
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const campoResponsavel = useRef(null);
  const [itens, setItens] = useState(() =>
    Array.isArray(tarefa?.checklist) ? tarefa.checklist : [],
  );

  async function enviar(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const titulo = String(form.get("titulo")).trim();
    if (!titulo) return;

    const prazo = String(form.get("prazo"));
    setSalvando(true);
    const falha = await onSalvar({
      titulo,
      descricao: String(form.get("descricao")).trim() || null,
      subject_id: form.get("subject_id") || null,
      responsavel: form.get("responsavel") || null,
      prazo: prazo ? new Date(prazo).toISOString() : null,
      status: form.get("status"),
      prioridade: form.get("prioridade"),
      ...(comChecklist && {
        checklist: itens
          .map((i) => ({ ...i, texto: i.texto.trim() }))
          .filter((i) => i.texto),
      }),
    });
    if (falha) {
      setErro(falha);
      setSalvando(false);
    }
  }

  return (
    <Janela titulo={tarefa ? "Editar tarefa" : "Nova tarefa"} onFechar={onFechar}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label className={rotulo}>
          Título
          <input
            name="titulo"
            required
            autoFocus
            maxLength={120}
            defaultValue={tarefa?.titulo}
            placeholder="Ex.: Escrever a introdução do relatório"
            className={campo}
          />
        </label>

        <label className={rotulo}>
          <span>
            Descrição <span className="font-normal text-zinc-400">(opcional)</span>
          </span>
          <textarea
            name="descricao"
            rows={3}
            maxLength={1000}
            defaultValue={tarefa?.descricao ?? ""}
            placeholder="Detalhes, links, o que precisa ser entregue..."
            className={`${campo} resize-y`}
          />
        </label>

        {comChecklist && <EditorChecklist itens={itens} onMudar={setItens} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={rotulo}>
            Matéria
            <select
              name="subject_id"
              defaultValue={tarefa ? (tarefa.subject_id ?? "") : (materiaPadrao ?? "")}
              className={campo}
            >
              <option value="">Sem matéria</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>

          <div className={rotulo}>
            <span className="flex items-center justify-between">
              <label htmlFor="campo-responsavel">Responsável</label>
              {membros.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    // Sorteia alguem diferente de quem ja esta escolhido.
                    const atual = campoResponsavel.current.value;
                    const opcoes = membros.filter((m) => m.id !== atual);
                    campoResponsavel.current.value = opcoes[Math.floor(Math.random() * opcoes.length)].id;
                  }}
                  title="Sortear um responsável"
                  className="text-xs font-normal text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  🎲 Sortear
                </button>
              )}
            </span>
            <select
              ref={campoResponsavel}
              id="campo-responsavel"
              name="responsavel"
              defaultValue={tarefa ? (tarefa.responsavel ?? "") : userId}
              className={campo}
            >
              <option value="">Ninguém</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === userId ? `${m.nome} (você)` : m.nome}
                </option>
              ))}
            </select>
          </div>

          <label className={rotulo}>
            Prazo
            <input
              name="prazo"
              type="datetime-local"
              defaultValue={isoParaInputLocal(tarefa?.prazo)}
              className={campo}
            />
          </label>

          <label className={rotulo}>
            Prioridade
            <select name="prioridade" defaultValue={tarefa?.prioridade ?? "media"} className={campo}>
              {PRIORIDADES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}
                </option>
              ))}
            </select>
          </label>

          <fieldset className={`${rotulo} sm:col-span-2`}>
            <legend className="mb-1.5">Status</legend>
            <div className="grid grid-cols-3 gap-2">
              {STATUS.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal transition has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:font-medium dark:border-zinc-700 dark:has-[:checked]:bg-indigo-500/10"
                >
                  <input
                    type="radio"
                    name="status"
                    value={s.id}
                    defaultChecked={(tarefa?.status ?? "todo") === s.id}
                    className="sr-only"
                  />
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.cor }} />
                  {s.titulo}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={botaoSecundario}>
            Cancelar
          </button>
          <button disabled={salvando} className={botaoPrimario}>
            {salvando ? "Salvando..." : tarefa ? "Salvar" : "Criar tarefa"}
          </button>
        </div>
      </form>

      {tarefa && comAnexos && (
        <Anexos tarefaId={tarefa.id} grupoId={grupoId} userId={userId} onMudouTotal={onMudouAnexos} />
      )}

      {tarefa && comComentarios && (
        <Comentarios
          tarefaId={tarefa.id}
          grupoId={grupoId}
          userId={userId}
          membros={membros}
          onMudouTotal={onMudouComentarios}
        />
      )}
    </Janela>
  );
}

// Subtarefas: marcar, editar o texto, remover e adicionar (Enter adiciona a proxima).
function EditorChecklist({ itens, onMudar }) {
  const [novo, setNovo] = useState("");
  const campoNovo = useRef(null);
  const feitos = itens.filter((i) => i.feito).length;

  function adicionar() {
    const texto = novo.trim();
    if (!texto) return;
    onMudar([...itens, { id: novoId(), texto, feito: false }]);
    setNovo("");
  }

  const mudar = (id, campo) =>
    onMudar(itens.map((i) => (i.id === id ? { ...i, ...campo } : i)));

  return (
    <fieldset className={rotulo}>
      <legend className="mb-1.5 flex w-full items-center justify-between">
        <span>Checklist</span>
        {itens.length > 0 && (
          <span className="text-xs font-normal text-zinc-500 tabular-nums">
            {feitos}/{itens.length} feitos
          </span>
        )}
      </legend>

      {itens.length > 0 && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${(feitos / itens.length) * 100}%`, backgroundColor: "var(--status-done)" }}
          />
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {itens.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded-lg px-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <input
              type="checkbox"
              checked={item.feito}
              onChange={(e) => mudar(item.id, { feito: e.target.checked })}
              aria-label={`Marcar "${item.texto}"`}
              className="size-4 shrink-0 accent-emerald-600"
            />
            <input
              value={item.texto}
              onChange={(e) => mudar(item.id, { texto: e.target.value })}
              onKeyDown={(e) => {
                // Enter num item ja existente vai para o campo de novo item (nao envia o formulario).
                if (e.key === "Enter") {
                  e.preventDefault();
                  campoNovo.current?.focus();
                }
              }}
              maxLength={200}
              aria-label="Texto do item"
              className={`flex-1 bg-transparent py-1.5 text-sm font-normal outline-none ${
                item.feito ? "text-zinc-400 line-through" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => onMudar(itens.filter((i) => i.id !== item.id))}
              aria-label={`Remover "${item.texto}"`}
              className="text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600 focus:opacity-100"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          ref={campoNovo}
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          maxLength={200}
          placeholder="Adicionar item (Enter)"
          aria-label="Novo item do checklist"
          className={`${campo} py-1.5 font-normal`}
        />
        <button type="button" onClick={adicionar} aria-label="Adicionar item" className={botaoSecundario}>
          <Plus className="size-4" />
        </button>
      </div>
    </fieldset>
  );
}
