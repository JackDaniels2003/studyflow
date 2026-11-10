"use client";

import { AlarmClock, PartyPopper } from "lucide-react";
import { formatarDataHora, partesDoTempo } from "@/lib/formatos";
import { useAgora } from "@/lib/use-agora";

// Destaque com a contagem regressiva da entrega pendente mais proxima.
export default function ProximaEntrega({ tarefas, materiaPorId }) {
  const agora = useAgora();

  const pendentes = tarefas.filter((t) => t.status !== "done" && t.prazo);
  const atrasadas = agora
    ? pendentes.filter((t) => new Date(t.prazo).getTime() < agora).length
    : 0;
  const proxima = agora
    ? pendentes
        .filter((t) => new Date(t.prazo).getTime() >= agora)
        .toSorted((a, b) => a.prazo.localeCompare(b.prazo))[0]
    : null;

  // Antes do relogio do navegador comecar, so o contorno (evita piscar um cartao vazio).
  if (!agora) {
    return <div className="h-[116px] animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />;
  }

  if (!proxima) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
          <PartyPopper className="size-5" />
        </span>
        <div>
          <p className="font-medium">Nenhuma entrega pela frente</p>
          <p className="text-sm text-zinc-500">
            {atrasadas
              ? `Mas há ${atrasadas} ${atrasadas === 1 ? "tarefa atrasada" : "tarefas atrasadas"}.`
              : "Adicione prazos às tarefas para ver a contagem regressiva aqui."}
          </p>
        </div>
      </div>
    );
  }

  const partes = partesDoTempo(proxima && agora ? new Date(proxima.prazo).getTime() - agora : 0);
  const materia = proxima && materiaPorId[proxima.subject_id];
  const urgente = partes.dias === 0 && proxima;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-sm ${
        urgente ? "bg-gradient-to-br from-orange-500 to-rose-600" : "bg-gradient-to-br from-indigo-600 to-violet-600"
      }`}
    >
      <div className="absolute -top-16 -right-16 size-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-white/80">
            <AlarmClock className="size-4" /> Próxima entrega
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold">
            {proxima?.titulo ?? " "}
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {proxima && formatarDataHora(proxima.prazo)}
            {materia && ` · ${materia.nome}`}
            {atrasadas > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                {atrasadas} {atrasadas === 1 ? "atrasada" : "atrasadas"}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2 tabular-nums" aria-live="off">
          <Bloco valor={partes.dias} rotulo="dias" />
          <Bloco valor={partes.horas} rotulo="horas" />
          <Bloco valor={partes.minutos} rotulo="min" />
          <Bloco valor={partes.segundos} rotulo="seg" />
        </div>
      </div>
    </div>
  );
}

function Bloco({ valor, rotulo }) {
  return (
    <div className="flex w-16 flex-col items-center rounded-xl bg-white/15 py-2 backdrop-blur">
      <span className="text-2xl font-semibold">{String(valor).padStart(2, "0")}</span>
      <span className="text-[11px] tracking-wide text-white/75 uppercase">{rotulo}</span>
    </div>
  );
}
