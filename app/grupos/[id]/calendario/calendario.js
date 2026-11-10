"use client";

import { useState } from "react";
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import Prazo from "@/components/prazo";
import { Avatar, botaoIcone, botaoSecundario, cartao } from "@/components/ui";
import { formatarHora } from "@/lib/formatos";
import { STATUS } from "@/lib/tarefas";
import { useAgora } from "@/lib/use-agora";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const nomeDia = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// Chave "aaaa-m-d" no horario local do navegador.
const chave = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function Calendario({ grupoId, userId, nomeGrupo, materias, tarefas: iniciais, membros }) {
  const agora = useAgora();
  const { avisar } = useAvisos();
  const [tarefas, setTarefas] = useState(iniciais);
  const [novo, setNovo] = useState("");
  const [deslocamento, setDeslocamento] = useState(0); // meses a partir do atual
  const [selecionado, setSelecionado] = useState(null); // chave do dia

  const materiaPorId = Object.fromEntries(materias.map((m) => [m.id, m]));
  const membroPorId = Object.fromEntries(membros.map((m) => [m.id, m]));

  if (!agora) {
    return <div className={`${cartao} h-[560px] animate-pulse`} />;
  }

  const hoje = new Date(agora);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() + deslocamento, 1);
  const primeiraCelula = new Date(inicioMes);
  primeiraCelula.setDate(1 - inicioMes.getDay());
  const dias = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(primeiraCelula);
    d.setDate(primeiraCelula.getDate() + i);
    return d;
  });

  const porDia = {};
  for (const t of tarefas.toSorted((a, b) => a.prazo.localeCompare(b.prazo))) {
    (porDia[chave(new Date(t.prazo))] ??= []).push(t);
  }

  const chaveHoje = chave(hoje);
  const diaAberto = selecionado ?? chaveHoje;
  const tarefasDoDia = porDia[diaAberto] ?? [];
  const dataAberta = dias.find((d) => chave(d) === diaAberto) ?? hoje;
  const doMes = tarefas.filter((t) => {
    const d = new Date(t.prazo);
    return d.getMonth() === inicioMes.getMonth() && d.getFullYear() === inicioMes.getFullYear();
  }).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className={`${cartao} overflow-hidden`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold capitalize">{nomeMes.format(inicioMes)}</h2>
            <p className="text-xs text-zinc-500">
              {doMes} {doMes === 1 ? "entrega" : "entregas"} neste mês
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setDeslocamento((d) => d - 1)} aria-label="Mês anterior" className={botaoIcone}>
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => {
                setDeslocamento(0);
                setSelecionado(null);
              }}
              className={`${botaoSecundario} py-1`}
            >
              Hoje
            </button>
            <button onClick={() => setDeslocamento((d) => d + 1)} aria-label="Próximo mês" className={botaoIcone}>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-zinc-200/80 text-center text-xs font-medium text-zinc-500 dark:border-zinc-800">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const k = chave(d);
            const doDia = porDia[k] ?? [];
            const foraDoMes = d.getMonth() !== inicioMes.getMonth();
            const ehHoje = k === chaveHoje;
            const aberto = k === diaAberto;

            return (
              <button
                key={k}
                onClick={() => setSelecionado(k)}
                aria-label={`${nomeDia.format(d)}: ${doDia.length} entregas`}
                aria-pressed={aberto}
                className={`flex min-h-20 flex-col items-stretch gap-1 border-r border-b border-zinc-100 p-1.5 text-left transition last:border-r-0 sm:min-h-24 dark:border-zinc-800/70 [&:nth-child(7n)]:border-r-0 ${
                  aberto ? "bg-indigo-50/70 dark:bg-indigo-500/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                } ${foraDoMes ? "text-zinc-300 dark:text-zinc-600" : ""}`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center self-end rounded-full text-xs font-medium tabular-nums ${
                    ehHoje ? "bg-indigo-600 text-white" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
                {doDia.slice(0, 2).map((t) => (
                  <EtiquetaTarefa key={t.id} tarefa={t} materia={materiaPorId[t.subject_id]} />
                ))}
                {doDia.length > 2 && (
                  <span className="px-1 text-[10px] font-medium text-zinc-500">+{doDia.length - 2} mais</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className={`${cartao} p-4`}>
          <h3 className="font-semibold capitalize">{nomeDia.format(dataAberta)}</h3>
          {tarefasDoDia.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
              <CalendarDays className="size-4" /> Nenhuma entrega neste dia.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {tarefasDoDia.map((t) => {
                const materia = materiaPorId[t.subject_id];
                const pessoa = membroPorId[t.responsavel];
                const status = STATUS.find((s) => s.id === t.status);
                return (
                  <li key={t.id} className="rounded-xl border border-zinc-200/80 p-3 dark:border-zinc-800">
                    <p className={`text-sm font-medium ${t.status === "done" ? "text-zinc-400 line-through" : ""}`}>
                      {t.titulo}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span className="tabular-nums">{formatarHora(t.prazo)}</span>
                      {materia && (
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full" style={{ backgroundColor: materia.cor }} />
                          {materia.nome}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full" style={{ backgroundColor: status?.cor }} />
                        {status?.titulo}
                      </span>
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      {pessoa ? (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho="size-5" texto="text-[9px]" />
                          {pessoa.nome.split(" ")[0]}
                        </span>
                      ) : (
                        <span />
                      )}
                      {t.status === "done" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Check className="size-3.5" /> Entregue
                        </span>
                      ) : (
                        <Prazo prazo={t.prazo} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const criada = await criarNoDia(novo, dataAberta, grupoId, userId);
            if (!criada) {
              avisar("Não foi possível criar a tarefa.", "erro");
              return;
            }
            setTarefas((atual) => [...atual, criada]);
            setNovo("");
            avisar(`Tarefa criada para ${formatarHora(criada.prazo)}`);
          }}
          className={`${cartao} flex flex-col gap-1.5 p-3`}
        >
          <label htmlFor="nova-no-dia" className="text-xs font-medium text-zinc-500">
            Adicionar neste dia
          </label>
          <div className="flex gap-2">
            <input
              id="nova-no-dia"
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              maxLength={160}
              placeholder="Ex.: Prova de redes 14h"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button disabled={!novo.trim()} aria-label="Criar tarefa neste dia" className={`${botaoSecundario} px-2.5`}>
              <Plus className="size-4" />
            </button>
          </div>
        </form>

        <button
          onClick={() => exportarIcs(nomeGrupo, tarefas, materiaPorId)}
          disabled={tarefas.length === 0}
          className={botaoSecundario}
        >
          <CalendarPlus className="size-4" /> Exportar para minha agenda
        </button>
        <p className="-mt-2 text-center text-xs text-zinc-500">
          Arquivo .ics para Google Agenda, Outlook ou celular, com lembrete 1 dia antes.
        </p>
      </aside>
    </div>
  );
}

function EtiquetaTarefa({ tarefa, materia }) {
  const feita = tarefa.status === "done";
  const cor = materia?.cor ?? "#71717a";
  return (
    <span
      title={tarefa.titulo}
      className={`truncate rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium sm:text-[11px] ${
        feita ? "line-through opacity-60" : ""
      }`}
      style={{ backgroundColor: `${cor}22`, color: cor, boxShadow: `inset 2px 0 0 ${cor}` }}
    >
      {tarefa.titulo}
    </span>
  );
}

// Gera um .ics (padrao de calendario) com os prazos pendentes e baixa no navegador.
function exportarIcs(nomeGrupo, tarefas, materiaPorId) {
  const utc = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapar = (s) => String(s).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const carimbo = utc(new Date());

  const eventos = tarefas
    .filter((t) => t.status !== "done")
    .map((t) => {
      const fim = new Date(t.prazo);
      const inicio = new Date(fim.getTime() - 30 * 60000);
      const materia = materiaPorId[t.subject_id];
      return [
        "BEGIN:VEVENT",
        `UID:${t.id}@studyflow`,
        `DTSTAMP:${carimbo}`,
        `DTSTART:${utc(inicio)}`,
        `DTEND:${utc(fim)}`,
        `SUMMARY:${escapar(`[${nomeGrupo}] ${t.titulo}`)}`,
        `DESCRIPTION:${escapar([materia && `Matéria: ${materia.nome}`, t.descricao].filter(Boolean).join("\n"))}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapar(`Amanhã: ${t.titulo}`)}`,
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n");
    });

  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StudyFlow//PT-BR", "CALSCALE:GREGORIAN", ...eventos, "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeGrupo.replace(/[^\w\- ]+/g, "").trim() || "studyflow"}-prazos.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

// Cria a tarefa no dia escolhido; um horario no fim ("14h", "às 9:30") vira a hora do prazo.
async function criarNoDia(texto, dia, grupoId, userId) {
  const hora = /s+(?:[aà]ss+)?(d{1,2})(?:h(d{2})?|:(d{2}))s*$/i.exec(texto);
  const h = hora ? Math.min(23, Number(hora[1])) : 23;
  const m = hora ? Math.min(59, Number(hora[2] ?? hora[3] ?? 0)) : 59;
  const titulo = (hora ? texto.slice(0, hora.index) : texto).trim();
  if (!titulo) return null;
  const prazo = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m);
  const { data, error } = await createClient()
    .from("tasks")
    .insert({ group_id: grupoId, titulo, prazo: prazo.toISOString(), responsavel: userId })
    .select("*")
    .single();
  return error ? null : data;
}
