"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRef } from "react";
import { BarChart3, CalendarClock, Download, ListChecks, Loader, Printer, TriangleAlert } from "lucide-react";
import { formatarDataHora } from "@/lib/formatos";
import { PRIORIDADES } from "@/lib/tarefas";
import Prazo from "@/components/prazo";
import { Avatar, cartao } from "@/components/ui";
import { STATUS } from "@/lib/tarefas";
import { useAgora } from "@/lib/use-agora";
import Atividade from "./atividade";
import FocoSemana from "./foco-semana";

const SETE_DIAS = 7 * 24 * 3600 * 1000;
// Concluido primeiro: a parte "feita" de cada barra fica alinhada a esquerda.
const SERIES = STATUS.toReversed();

export default function Painel({ grupoId, materias, tarefas, membros, historico, sessoesFoco }) {
  const agora = useAgora();
  const tabela = useRef(null);
  const feed = historico && <Atividade grupoId={grupoId} membros={membros} iniciais={historico} />;
  const foco = sessoesFoco && <FocoSemana sessoes={sessoesFoco} membros={membros} />;

  if (tarefas.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
          <BarChart3 className="mx-auto size-10 text-zinc-400" />
          <p className="mt-3 font-medium">Sem dados ainda</p>
          <p className="mt-1 text-sm text-zinc-500">
            Crie tarefas na aba Tarefas e o progresso do grupo aparece aqui.
          </p>
        </div>
        {foco}
        {feed}
      </div>
    );
  }

  const feitas = tarefas.filter((t) => t.status === "done").length;
  const fazendo = tarefas.filter((t) => t.status === "doing").length;
  const pct = Math.round((feitas / tarefas.length) * 100);
  const pendentesComPrazo = tarefas.filter((t) => t.status !== "done" && t.prazo);
  const atrasadas = agora
    ? pendentesComPrazo.filter((t) => new Date(t.prazo).getTime() < agora).length
    : null;
  const semana = agora
    ? pendentesComPrazo.filter((t) => {
        const ms = new Date(t.prazo).getTime() - agora;
        return ms >= 0 && ms <= SETE_DIAS;
      }).length
    : null;

  const porMateria = agrupar(tarefas, "subject_id", [
    ...materias.map((m) => ({ id: m.id, nome: m.nome })),
    { id: null, nome: "Sem matéria" },
  ]);
  const porPessoa = agrupar(tarefas, "responsavel", [
    ...membros.map((m) => ({ id: m.id, nome: m.nome })),
    { id: null, nome: "Sem responsável" },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <p className="hidden text-sm text-zinc-600 print:block">
        Relatório de progresso gerado pelo StudyFlow em {agora ? new Date(agora).toLocaleString("pt-BR") : ""}
      </p>
      <div className="-mb-2 flex justify-end gap-4 print:hidden">
        <button
          onClick={() => {
            // Abre a tabela de numeros para ela sair no papel/PDF.
            if (tabela.current) tabela.current.open = true;
            window.print();
          }}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <Printer className="size-4" /> Imprimir / salvar PDF
        </button>
        <button
          onClick={() => exportarCsv(tarefas, materias, membros)}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <Download className="size-4" /> Baixar planilha das tarefas
        </button>
      </div>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className={`${cartao} p-6 lg:row-span-2`}>
          <p className="text-sm font-medium text-zinc-500">Progresso do grupo</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">
            {pct}
            <span className="text-2xl text-zinc-400">%</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {feitas} de {tarefas.length} tarefas concluídas
          </p>
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Tarefas concluídas"
            className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          >
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${pct}%`, backgroundColor: "var(--status-done)" }}
            />
          </div>
          <Legenda className="mt-6" />
        </div>

        <Indicador icone={ListChecks} titulo="Total de tarefas" valor={tarefas.length} />
        <Indicador icone={Loader} titulo="Em andamento" valor={fazendo} />
        <Indicador
          icone={TriangleAlert}
          titulo="Atrasadas"
          valor={atrasadas}
          alerta={atrasadas > 0}
          detalhe={atrasadas > 0 ? "Prazo já passou" : "Nenhuma atrasada"}
        />
        <Indicador
          icone={CalendarClock}
          titulo="Vencem em 7 dias"
          valor={semana}
          detalhe="Pendentes com prazo"
        />
      </section>

      {(pendentesComPrazo.length > 0 || feed) && (
        <div className={`grid gap-6 ${pendentesComPrazo.length > 0 && feed ? "lg:grid-cols-2" : ""}`}>
          <ProximasEntregas tarefas={pendentesComPrazo} materias={materias} membros={membros} />
          {feed}
        </div>
      )}

      {foco}

      <div className="grid gap-6 lg:grid-cols-2">
        <Grafico titulo="Situação por matéria" linhas={porMateria} />
        <Grafico titulo="Tarefas por pessoa" linhas={porPessoa} />
      </div>

      <details ref={tabela} className={`${cartao} group p-5 print:break-inside-avoid`}>
        <summary className="cursor-pointer text-sm font-medium text-zinc-600 select-none dark:text-zinc-400">
          Ver os números em tabela
        </summary>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <Tabela titulo="Por matéria" linhas={porMateria} />
          <Tabela titulo="Por pessoa" linhas={porPessoa} />
        </div>
      </details>
    </div>
  );
}

// Conta tarefas por status para cada grupo (materia ou pessoa); some com quem tem zero.
function agrupar(tarefas, campo, grupos) {
  return grupos
    .map(({ id, nome }) => {
      const doGrupo = tarefas.filter((t) => (t[campo] ?? null) === id);
      const linha = { nome, total: doGrupo.length };
      STATUS.forEach((s) => {
        linha[s.id] = doGrupo.filter((t) => t.status === s.id).length;
      });
      return linha;
    })
    .filter((linha) => linha.total > 0);
}

// As 6 entregas pendentes mais proximas (atrasadas aparecem primeiro, pois o prazo e menor).
function ProximasEntregas({ tarefas, materias, membros }) {
  if (tarefas.length === 0) return null;

  const materiaPorId = Object.fromEntries(materias.map((m) => [m.id, m]));
  const membroPorId = Object.fromEntries(membros.map((m) => [m.id, m]));
  const lista = tarefas.toSorted((a, b) => a.prazo.localeCompare(b.prazo)).slice(0, 6);

  return (
    <section className={`${cartao} p-5`}>
      <h2 className="font-semibold">Próximas entregas</h2>
      <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
        {lista.map((t) => {
          const materia = materiaPorId[t.subject_id];
          const pessoa = membroPorId[t.responsavel];
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: materia?.cor ?? "var(--status-todo)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.titulo}</p>
                <p className="text-xs text-zinc-500">{materia?.nome ?? "Sem matéria"}</p>
              </div>
              {pessoa && <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho="size-6" texto="text-[10px]" />}
              <Prazo prazo={t.prazo} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Indicador({ icone: Icone, titulo, valor, detalhe, alerta }) {
  return (
    <div className={`${cartao} flex items-start gap-4 p-5`}>
      <span
        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${
          alerta
            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        <Icone className="size-5" />
      </span>
      <div>
        <p className="text-sm text-zinc-500">{titulo}</p>
        <p className="text-2xl font-semibold tabular-nums">{valor ?? "–"}</p>
        {detalhe && (
          <p className={`text-xs ${alerta ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}>
            {detalhe}
          </p>
        )}
      </div>
    </div>
  );
}

function Legenda({ className = "" }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 ${className}`}>
      {SERIES.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.cor }} />
          {s.titulo}
        </li>
      ))}
    </ul>
  );
}

function Grafico({ titulo, linhas }) {
  const altura = Math.max(120, linhas.length * 44 + 40);

  return (
    <section className={`${cartao} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{titulo}</h2>
        <Legenda />
      </div>
      <div className="mt-4 text-zinc-500">
        <ResponsiveContainer width="100%" height={altura} initialDimension={{ width: 400, height: altura }}>
          <BarChart data={linhas} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.15} />
            <XAxis
              type="number"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="nome"
              width={110}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
              tickFormatter={(nome) => (nome.length > 16 ? `${nome.slice(0, 15)}…` : nome)}
            />
            <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.06 }} content={<Dica />} />
            {SERIES.map((s) => (
              <Bar
                key={s.id}
                dataKey={s.id}
                name={s.titulo}
                stackId="status"
                fill={s.cor}
                stroke="var(--superficie)"
                strokeWidth={2}
                maxBarSize={28}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Dica({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((soma, p) => soma + p.value, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <span className="size-2 rounded-sm" style={{ backgroundColor: p.fill }} />
          {p.name}
          <span className="ml-auto pl-4 font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
            {p.value}
          </span>
        </p>
      ))}
      <p className="mt-1 border-t border-zinc-100 pt-1 text-zinc-500 dark:border-zinc-800">
        Total <span className="float-right font-medium tabular-nums">{total}</span>
      </p>
    </div>
  );
}

function Tabela({ titulo, linhas }) {
  return (
    <table className="w-full text-sm">
      <caption className="mb-2 text-left font-medium">{titulo}</caption>
      <thead>
        <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
          <th className="py-2 font-medium">Nome</th>
          {SERIES.map((s) => (
            <th key={s.id} className="py-2 text-right font-medium">{s.titulo}</th>
          ))}
          <th className="py-2 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.nome} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
            <td className="py-2">{l.nome}</td>
            {SERIES.map((s) => (
              <td key={s.id} className="py-2 text-right tabular-nums">{l[s.id]}</td>
            ))}
            <td className="py-2 text-right font-medium tabular-nums">{l.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Planilha com todas as tarefas. ";" e BOM para o Excel em portugues abrir certo.
function exportarCsv(tarefas, materias, membros) {
  const materia = Object.fromEntries(materias.map((m) => [m.id, m.nome]));
  const pessoa = Object.fromEntries(membros.map((m) => [m.id, m.nome]));
  const status = Object.fromEntries(STATUS.map((s) => [s.id, s.titulo]));
  const prioridade = Object.fromEntries(PRIORIDADES.map((p) => [p.id, p.titulo]));
  const celula = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const linhas = [
    ["Tarefa", "Matéria", "Responsável", "Status", "Prioridade", "Prazo", "Descrição"],
    ...tarefas.toSorted(ordenarPorPrazo).map((t) => [
      t.titulo,
      materia[t.subject_id] ?? "",
      pessoa[t.responsavel] ?? "",
      status[t.status],
      prioridade[t.prioridade] ?? "",
      t.prazo ? formatarDataHora(t.prazo) : "",
      t.descricao ?? "",
    ]),
  ];

  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "tarefas-studyflow.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ordenarPorPrazo(a, b) {
  if (!a.prazo) return 1;
  if (!b.prazo) return -1;
  return a.prazo.localeCompare(b.prazo);
}
