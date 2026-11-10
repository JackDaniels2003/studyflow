"use client";

import { CalendarClock } from "lucide-react";
import { formatarDataHora, formatarRestante } from "@/lib/formatos";
import { useAgora } from "@/lib/use-agora";

const UM_DIA = 24 * 3600 * 1000;

// Selo de prazo com contagem regressiva ao vivo (vermelho atrasada, ambar < 24h).
export default function Prazo({ prazo, concluida }) {
  const agora = useAgora();
  if (!prazo) return null;

  const data = formatarDataHora(prazo);
  let estilo = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  let texto = data;

  if (concluida) {
    texto = data;
  } else if (agora) {
    const restante = new Date(prazo).getTime() - agora;
    if (restante < 0) {
      estilo = "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
      texto = `Atrasada há ${formatarRestante(restante)}`;
    } else {
      if (restante < UM_DIA) {
        estilo = "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
      }
      texto = `Faltam ${formatarRestante(restante)}`;
    }
  }

  return (
    <span
      title={`Prazo: ${data}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums ${estilo}`}
    >
      <CalendarClock className="size-3" />
      {texto}
    </span>
  );
}
