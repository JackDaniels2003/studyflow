"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  ListChecks,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { soltarConfete } from "@/components/confete";
import Prazo from "@/components/prazo";
import { Avatar, botaoIcone, botaoPrimario, campo } from "@/components/ui";
import { formatarDataHora } from "@/lib/formatos";
import { criarModeloProjeto } from "@/lib/modelo-projeto";
import { extrairPrazo } from "@/lib/prazo-escrito";
import { CAMPOS_TAREFA, STATUS, ordenarTarefas, progressoChecklist } from "@/lib/tarefas";
import BarraMaterias from "./barra-materias";
import FormTarefa from "./form-tarefa";
import PrimeirosPassos from "./primeiros-passos";
import ProximaEntrega from "./proxima-entrega";

export default function QuadroTarefas({
  grupoId,
  comChecklist,
  comComentarios,
  contagemComentarios,
  comAnexos,
  contagemAnexos,
  codigo,
  userId,
  membros,
  materiasIniciais,
  tarefasIniciais,
}) {
  const { avisar, confirmar } = useAvisos();
  const campoBusca = useRef(null);
  const [materias, setMaterias] = useState(materiasIniciais);
  const [tarefas, setTarefas] = useState(tarefasIniciais);
  const [filtroMateria, setFiltroMateria] = useState(null);
  const [soMinhas, setSoMinhas] = useState(false);
  const [busca, setBusca] = useState("");
  const [colunaCelular, setColunaCelular] = useState("todo");
  const [editando, setEditando] = useState(null); // null | "nova" | tarefa
  const [erro, setErro] = useState("");
  const [comentarios, setComentarios] = useState(contagemComentarios ?? {});
  const [anexos, setAnexos] = useState(contagemAnexos ?? {});
  const idEditando = editando && editando !== "nova" ? editando.id : null;
  const contarComentarios = useCallback(
    (total) => idEditando && setComentarios((atual) => ({ ...atual, [idEditando]: total })),
    [idEditando],
  );
  const contarAnexos = useCallback(
    (total) => idEditando && setAnexos((atual) => ({ ...atual, [idEditando]: total })),
    [idEditando],
  );

  const recarregar = useCallback(async () => {
    const supabase = createClient();
    const [m, t] = await Promise.all([
      supabase.from("subjects").select("id, nome, cor").eq("group_id", grupoId).order("created_at"),
      supabase.from("tasks").select(CAMPOS_TAREFA).eq("group_id", grupoId),
    ]);
    if (m.data) setMaterias(m.data);
    if (t.data) setTarefas(t.data);
  }, [grupoId]);

  // Mudancas feitas por outros membros chegam ao vivo. O Supabase nao entrega
  // DELETE filtrado por coluna, entao exclusoes vem sem filtro e sao tratadas pelo id.
  useEffect(() => {
    const supabase = createClient();
    const filtro = `group_id=eq.${grupoId}`;
    const canal = supabase.channel(`quadro-${grupoId}`);
    for (const tabela of ["tasks", "subjects"]) {
      for (const event of ["INSERT", "UPDATE"]) {
        canal.on("postgres_changes", { event, schema: "public", table: tabela, filter: filtro }, recarregar);
      }
    }
    canal
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, ({ old }) =>
        setTarefas((atual) => atual.filter((t) => t.id !== old.id)),
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "subjects" }, ({ old }) => {
        setMaterias((atual) => atual.filter((m) => m.id !== old.id));
        setTarefas((atual) =>
          atual.map((t) => (t.subject_id === old.id ? { ...t, subject_id: null } : t)),
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupoId, recarregar]);

  // Atalhos: N cria tarefa, / vai para a busca (ignorados enquanto se digita).
  useEffect(() => {
    function tecla(e) {
      const alvo = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey || alvo.closest?.("input, textarea, select, dialog, [contenteditable]")) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditando("nova");
      } else if (e.key === "/") {
        e.preventDefault();
        campoBusca.current?.focus();
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const materiaPorId = useMemo(
    () => Object.fromEntries(materias.map((m) => [m.id, m])),
    [materias],
  );
  const membroPorId = useMemo(
    () => Object.fromEntries(membros.map((m) => [m.id, m])),
    [membros],
  );

  const termo = normalizar(busca.trim());
  const visiveis = tarefas
    .filter((t) => !filtroMateria || t.subject_id === filtroMateria)
    .filter((t) => !soMinhas || t.responsavel === userId)
    .filter((t) => !termo || normalizar(`${t.titulo} ${t.descricao ?? ""}`).includes(termo))
    .toSorted(ordenarTarefas);

  function falhou(mensagem) {
    setErro(mensagem);
    recarregar();
  }

  // Criacao rapida pelo pe da coluna: o prazo pode vir escrito no titulo ("... amanha 18h").
  async function criarRapido(texto, status) {
    const { titulo, prazo } = extrairPrazo(texto);
    const { data, error } = await createClient()
      .from("tasks")
      .insert({
        group_id: grupoId,
        titulo,
        status,
        subject_id: filtroMateria,
        responsavel: userId,
        prazo: prazo ? prazo.toISOString() : null,
      })
      .select(CAMPOS_TAREFA)
      .single();
    if (error) {
      avisar("Não foi possível criar a tarefa.", "erro");
      return;
    }
    setTarefas((atual) => [...atual.filter((t) => t.id !== data.id), data]);
    avisar(prazo ? `Tarefa criada com prazo ${formatarDataHora(data.prazo)}` : "Tarefa criada");
  }

  async function salvarTarefa(dados) {
    const supabase = createClient();
    const novo = editando === "nova";
    const { data, error } = novo
      ? await supabase
          .from("tasks")
          .insert({ ...dados, group_id: grupoId })
          .select(CAMPOS_TAREFA)
          .single()
      : await supabase
          .from("tasks")
          .update(dados)
          .eq("id", editando.id)
          .select(CAMPOS_TAREFA)
          .single();

    if (error) {
      console.error("Erro ao salvar tarefa:", error);
      return "Não foi possível salvar a tarefa.";
    }
    setTarefas((atual) =>
      novo
        ? [...atual.filter((t) => t.id !== data.id), data]
        : atual.map((t) => (t.id === data.id ? data : t)),
    );
    setEditando(null);
    setErro("");
    avisar(novo ? "Tarefa criada" : "Tarefa atualizada");
    return null;
  }

  // "evento" (clique ou soltar) da a posicao de onde o confete sai.
  async function moverTarefa(id, status, evento) {
    const anterior = tarefas.find((t) => t.id === id);
    if (!anterior || anterior.status === status) return;

    setTarefas((atual) => atual.map((t) => (t.id === id ? { ...t, status } : t)));
    if (status === "done") {
      soltarConfete(evento ? { x: evento.clientX, y: evento.clientY } : undefined);
      const restantes = tarefas.filter((t) => t.id !== id && t.status !== "done").length;
      avisar(restantes === 0 ? "Tudo concluído! O grupo está em dia 🎉" : "Tarefa concluída");
    }
    const { error } = await createClient().from("tasks").update({ status }).eq("id", id);
    if (error) falhou("Não foi possível mover a tarefa.");
  }

  // Marca/desmarca um item do checklist direto no cartao.
  async function marcarItem(tarefa, itemId) {
    const checklist = tarefa.checklist.map((i) => (i.id === itemId ? { ...i, feito: !i.feito } : i));
    setTarefas((atual) => atual.map((t) => (t.id === tarefa.id ? { ...t, checklist } : t)));
    const { error } = await createClient().from("tasks").update({ checklist }).eq("id", tarefa.id);
    if (error) falhou("Não foi possível atualizar o checklist.");
    else if (checklist.every((i) => i.feito) && tarefa.status !== "done") {
      avisar("Checklist completo! Que tal marcar a tarefa como concluída?", "info");
    }
  }

  async function excluirTarefa(tarefa) {
    const sim = await confirmar({
      titulo: "Excluir tarefa?",
      texto: `"${tarefa.titulo}" será apagada para todo o grupo.`,
      botao: "Excluir",
      perigo: true,
    });
    if (!sim) return;
    setTarefas((atual) => atual.filter((t) => t.id !== tarefa.id));
    const { error } = await createClient().from("tasks").delete().eq("id", tarefa.id);
    if (error) falhou("Não foi possível excluir a tarefa.");
    else avisar("Tarefa excluída", "info");
  }

  async function criarMateria(nome, cor) {
    const { data, error } = await createClient()
      .from("subjects")
      .insert({ group_id: grupoId, nome, cor })
      .select("id, nome, cor")
      .single();
    if (error) {
      setErro("Não foi possível criar a matéria.");
      return false;
    }
    setMaterias((atual) => [...atual.filter((m) => m.id !== data.id), data]);
    avisar(`Matéria "${nome}" criada`);
    return true;
  }

  async function usarModelo() {
    const erroModelo = await criarModeloProjeto(createClient(), grupoId, membros, comChecklist);
    if (erroModelo) {
      console.error("Erro ao criar o modelo:", erroModelo);
      avisar("Não foi possível criar o modelo.", "erro");
      return;
    }
    await recarregar();
    soltarConfete();
    avisar("Modelo criado! Ajuste prazos e responsáveis como quiser.");
  }

  async function editarMateria(id, dados) {
    const { error } = await createClient().from("subjects").update(dados).eq("id", id);
    if (error) {
      avisar("Não foi possível salvar a matéria.", "erro");
      return false;
    }
    setMaterias((atual) => atual.map((m) => (m.id === id ? { ...m, ...dados } : m)));
    avisar("Matéria atualizada");
    return true;
  }

  async function excluirMateria(materia) {
    const sim = await confirmar({
      titulo: `Excluir "${materia.nome}"?`,
      texto: "As tarefas dessa matéria continuam no quadro, só que sem matéria.",
      botao: "Excluir matéria",
      perigo: true,
    });
    if (!sim) return;
    setMaterias((atual) => atual.filter((m) => m.id !== materia.id));
    setTarefas((atual) =>
      atual.map((t) => (t.subject_id === materia.id ? { ...t, subject_id: null } : t)),
    );
    if (filtroMateria === materia.id) setFiltroMateria(null);
    const { error } = await createClient().from("subjects").delete().eq("id", materia.id);
    if (error) falhou("Não foi possível excluir a matéria.");
  }

  return (
    <div className="flex flex-col gap-6">
      {tarefas.length === 0 ? (
        <PrimeirosPassos
          codigo={codigo}
          temMembros={membros.length > 1}
          temMaterias={materias.length > 0}
          onNovaTarefa={() => setEditando("nova")}
          onUsarModelo={usarModelo}
        />
      ) : (
        <ProximaEntrega tarefas={tarefas} materiaPorId={materiaPorId} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BarraMaterias
          materias={materias}
          tarefas={tarefas}
          selecionada={filtroMateria}
          onSelecionar={setFiltroMateria}
          onCriar={criarMateria}
          onEditar={editarMateria}
          onExcluir={excluirMateria}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={campoBusca}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar tarefa...  /"
              aria-label="Buscar tarefa"
              className={`${campo} w-48 py-1.5 pl-8`}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 select-none dark:text-zinc-400">
            <input
              type="checkbox"
              checked={soMinhas}
              onChange={(e) => setSoMinhas(e.target.checked)}
              className="size-4 accent-indigo-600"
            />
            Só as minhas
          </label>
          <button onClick={() => setEditando("nova")} title="Atalho: N" className={botaoPrimario}>
            <Plus className="size-4" /> Nova tarefa
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {erro}
        </p>
      )}

      {/* No celular: uma coluna por vez, escolhida aqui. No computador: as tres lado a lado. */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 md:hidden dark:bg-zinc-900" role="tablist" aria-label="Coluna do quadro">
        {STATUS.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={colunaCelular === s.id}
            onClick={() => setColunaCelular(s.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition ${
              colunaCelular === s.id ? "bg-white shadow-sm dark:bg-zinc-800" : "text-zinc-500"
            }`}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: s.cor }} />
            {s.titulo}
            <span className="text-xs text-zinc-400 tabular-nums">{visiveis.filter((t) => t.status === s.id).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STATUS.map((coluna, indice) => (
          <Coluna
            key={coluna.id}
            coluna={coluna}
            escondidaNoCelular={colunaCelular !== coluna.id}
            tarefas={visiveis.filter((t) => t.status === coluna.id)}
            onSoltar={(id, evento) => moverTarefa(id, coluna.id, evento)}
            onAdicionar={(texto) => criarRapido(texto, coluna.id)}
          >
            {(tarefa) => (
              <CartaoTarefa
                key={tarefa.id}
                tarefa={tarefa}
                materia={materiaPorId[tarefa.subject_id]}
                responsavel={membroPorId[tarefa.responsavel]}
                comentarios={comentarios[tarefa.id] ?? 0}
                anexos={anexos[tarefa.id] ?? 0}
                anterior={STATUS[indice - 1]?.id}
                proximo={STATUS[indice + 1]?.id}
                onMover={(status, evento) => moverTarefa(tarefa.id, status, evento)}
                onMarcarItem={(itemId) => marcarItem(tarefa, itemId)}
                onEditar={() => setEditando(tarefa)}
                onExcluir={() => excluirTarefa(tarefa)}
              />
            )}
          </Coluna>
        ))}
      </div>

      {editando && (
        <FormTarefa
          tarefa={editando === "nova" ? null : editando}
          materias={materias}
          membros={membros}
          userId={userId}
          comChecklist={comChecklist}
          comComentarios={comComentarios}
          grupoId={grupoId}
          onMudouComentarios={contarComentarios}
          comAnexos={comAnexos}
          onMudouAnexos={contarAnexos}
          materiaPadrao={filtroMateria}
          onSalvar={salvarTarefa}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function Coluna({ coluna, tarefas, escondidaNoCelular, onSoltar, onAdicionar, children }) {
  const [sobre, setSobre] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const previa = rascunho.trim() ? extrairPrazo(rascunho) : null;

  async function adicionar(event) {
    event.preventDefault();
    if (!rascunho.trim()) return;
    const texto = rascunho;
    setRascunho("");
    await onAdicionar(texto);
  }

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onSoltar(id, e);
      }}
      className={`flex min-h-48 flex-col gap-3 rounded-2xl border p-3 transition ${escondidaNoCelular ? "max-md:hidden" : ""} ${
        sobre
          ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10"
          : "border-zinc-200/80 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/50"
      }`}
    >
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
        <span className="size-2 rounded-full" style={{ backgroundColor: coluna.cor }} />
        {coluna.titulo}
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
          {tarefas.length}
        </span>
      </h2>
      {tarefas.map(children)}
      {tarefas.length === 0 && !adicionando && (
        <p className="rounded-xl border border-dashed border-zinc-300 px-1 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
          {coluna.id === "done" ? "Nada concluído ainda." : "Arraste tarefas para cá"}
        </p>
      )}

      {coluna.id !== "done" &&
        (adicionando ? (
          <form onSubmit={adicionar} className="animar-surgir flex flex-col gap-1.5">
            <input
              autoFocus
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdicionando(false)}
              onBlur={() => !rascunho.trim() && setAdicionando(false)}
              maxLength={160}
              placeholder="Ex.: Revisar slides amanhã 18h"
              aria-label={`Nova tarefa em ${coluna.titulo}`}
              className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-indigo-500/40 dark:bg-zinc-900"
            />
            <p className="px-1 text-[11px] text-zinc-500">
              {previa?.prazo ? (
                <span className="text-indigo-600 dark:text-indigo-400">
                  📅 Prazo: {formatarDataHora(previa.prazo.toISOString())}
                </span>
              ) : (
                "Enter cria · dá para escrever “hoje”, “sexta 14h”, “até 15/11”"
              )}
            </p>
          </form>
        ) : (
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Plus className="size-4" /> Adicionar tarefa
          </button>
        ))}
    </section>
  );
}

function CartaoTarefa({
  tarefa,
  materia,
  responsavel,
  anterior,
  proximo,
  onMover,
  onMarcarItem,
  comentarios,
  anexos,
  onEditar,
  onExcluir,
}) {
  const concluida = tarefa.status === "done";
  const checklist = progressoChecklist(tarefa);
  const [checklistAberto, setChecklistAberto] = useState(false);

  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", tarefa.id)}
      onDoubleClick={onEditar}
      className="animar-surgir group cursor-grab rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900"
      style={{ borderLeft: `4px solid ${materia?.cor ?? "transparent"}` }}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => onMover(concluida ? "todo" : "done", e)}
          title={concluida ? "Reabrir" : "Concluir"}
          aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
          className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
            concluida
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-zinc-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-zinc-600"
          }`}
        >
          <Check className="size-3" strokeWidth={3} />
        </button>
        <h3
          className={`flex-1 text-sm font-medium break-words ${
            concluida ? "text-zinc-400 line-through" : ""
          }`}
        >
          {tarefa.titulo}
        </h3>
      </div>

      {tarefa.descricao && !concluida && (
        <p className="mt-1 line-clamp-2 pl-7 text-xs text-zinc-500">{tarefa.descricao}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
        {tarefa.prioridade === "alta" && !concluida && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <Flag className="size-3" /> Alta
          </span>
        )}
        {materia && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${materia.cor}1f`, color: materia.cor }}
          >
            {materia.nome}
          </span>
        )}
        <Prazo prazo={tarefa.prazo} concluida={concluida} />
        {checklist.total > 0 && (
          <button
            onClick={() => setChecklistAberto((v) => !v)}
            title={checklistAberto ? "Esconder checklist" : "Ver e marcar o checklist"}
            aria-expanded={checklistAberto}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition hover:ring-1 hover:ring-zinc-300 dark:hover:ring-zinc-600 ${
              checklist.feitos === checklist.total
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <ListChecks className="size-3" />
            {checklist.feitos}/{checklist.total}
          </button>
        )}
        {anexos > 0 && (
          <button
            onClick={onEditar}
            title={`${anexos} ${anexos === 1 ? "anexo" : "anexos"}`}
            aria-label={`Ver ${anexos} ${anexos === 1 ? "anexo" : "anexos"}`}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 tabular-nums transition hover:ring-1 hover:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <Paperclip className="size-3" />
            {anexos}
          </button>
        )}
        {comentarios > 0 && (
          <button
            onClick={onEditar}
            title={`${comentarios} ${comentarios === 1 ? "comentário" : "comentários"}`}
            aria-label={`Ver ${comentarios} ${comentarios === 1 ? "comentário" : "comentários"}`}
            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 tabular-nums transition hover:ring-1 hover:ring-sky-300 dark:bg-sky-500/10 dark:text-sky-400"
          >
            <MessageCircle className="size-3" />
            {comentarios}
          </button>
        )}
      </div>

      {checklistAberto && checklist.total > 0 && (
        <ul className="animar-surgir mt-2 flex flex-col gap-1 pl-7">
          {tarefa.checklist.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={item.feito}
                  onChange={() => onMarcarItem(item.id)}
                  className="mt-0.5 size-3.5 shrink-0 accent-emerald-600"
                />
                <span className={item.feito ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"}>
                  {item.texto}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between pl-7">
        {responsavel ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Avatar nome={responsavel.nome} cor={responsavel.cor} tamanho="size-5" />
            {responsavel.nome.split(" ")[0]}
          </span>
        ) : (
          <span className="text-xs text-zinc-400">Sem responsável</span>
        )}

        <div className="flex opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            onClick={() => onMover(anterior)}
            disabled={!anterior}
            title="Voltar etapa"
            aria-label="Voltar etapa"
            className={botaoIcone}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => onMover(proximo)}
            disabled={!proximo}
            title="Avançar etapa"
            aria-label="Avançar etapa"
            className={botaoIcone}
          >
            <ChevronRight className="size-4" />
          </button>
          <button onClick={onEditar} title="Editar" aria-label="Editar tarefa" className={botaoIcone}>
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onExcluir}
            title="Excluir"
            aria-label="Excluir tarefa"
            className={`${botaoIcone} hover:text-red-600`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

// Busca sem diferenciar maiusculas e acentos ("relatorio" acha "Relatório").
function normalizar(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
