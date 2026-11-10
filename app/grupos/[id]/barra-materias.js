"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import {
  CORES,
  Janela,
  SeletorCor,
  botaoPrimario,
  botaoSecundario,
  campo,
  rotulo,
} from "@/components/ui";

export default function BarraMaterias({
  materias,
  tarefas,
  selecionada,
  onSelecionar,
  onCriar,
  onEditar,
  onExcluir,
}) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [cor, setCor] = useState(CORES[materias.length % CORES.length]);

  async function criar(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const nome = String(new FormData(form).get("nome")).trim();
    if (!nome) return;
    if (await onCriar(nome, cor)) {
      form.reset();
      setCor(CORES[(materias.length + 1) % CORES.length]);
      setCriando(false);
    }
  }

  const contagem = (id) => tarefas.filter((t) => t.subject_id === id).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip ativo={!selecionada} onClick={() => onSelecionar(null)}>
        Todas <span className="text-zinc-400">{tarefas.length}</span>
      </Chip>

      {materias.map((m) => (
        <span key={m.id} className="group relative">
          <Chip ativo={selecionada === m.id} onClick={() => onSelecionar(m.id)}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: m.cor }} />
            {m.nome} <span className="text-zinc-400">{contagem(m.id)}</span>
          </Chip>
          <span className="absolute -top-2 -right-1.5 hidden gap-0.5 group-hover:flex group-focus-within:flex">
            <button
              onClick={() => setEditando(m)}
              title={`Editar ${m.nome}`}
              aria-label={`Editar matéria ${m.nome}`}
              className="inline-flex size-5 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-indigo-600"
            >
              <Pencil className="size-2.5" />
            </button>
            <button
              onClick={() => onExcluir(m)}
              title={`Excluir ${m.nome}`}
              aria-label={`Excluir matéria ${m.nome}`}
              className="inline-flex size-5 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-red-600"
            >
              <X className="size-3" />
            </button>
          </span>
        </span>
      ))}

      {editando && (
        <EditarMateria materia={editando} onSalvar={onEditar} onFechar={() => setEditando(null)} />
      )}

      {criando ? (
        <form onSubmit={criar} className="flex flex-wrap items-center gap-2">
          <input
            name="nome"
            autoFocus
            required
            maxLength={40}
            placeholder="Nome da matéria"
            aria-label="Nome da matéria"
            onKeyDown={(e) => e.key === "Escape" && setCriando(false)}
            className={`${campo} w-44 py-1.5`}
          />
          <SeletorCor valor={cor} onMudar={setCor} rotulo="Cor da matéria" />
          <button className={`${botaoPrimario} py-1.5`}>Adicionar</button>
          <button
            type="button"
            onClick={() => setCriando(false)}
            className="text-sm text-zinc-500 hover:underline"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setCriando(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-3 py-1 text-sm text-zinc-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700"
        >
          <Plus className="size-3.5" /> Matéria
        </button>
      )}
    </div>
  );
}

function Chip({ ativo, children, ...props }) {
  return (
    <button
      {...props}
      aria-pressed={ativo}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
        ativo
          ? "border-indigo-600 bg-indigo-600 text-white [&_.text-zinc-400]:text-indigo-200"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

function EditarMateria({ materia, onSalvar, onFechar }) {
  const [nome, setNome] = useState(materia.nome);
  const [cor, setCor] = useState(materia.cor);
  const [salvando, setSalvando] = useState(false);

  async function salvar(event) {
    event.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    if (await onSalvar(materia.id, { nome: nome.trim(), cor })) onFechar();
    else setSalvando(false);
  }

  return (
    <Janela titulo="Editar matéria" onFechar={onFechar} largura="max-w-sm">
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <label className={rotulo}>
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={40} autoFocus className={campo} />
        </label>
        <div className={rotulo}>
          Cor
          <SeletorCor valor={cor} onMudar={setCor} rotulo="Cor da matéria" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={botaoSecundario}>
            Cancelar
          </button>
          <button disabled={salvando} className={botaoPrimario}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Janela>
  );
}
