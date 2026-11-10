import { Timer, Trophy } from "lucide-react";
import { Avatar, cartao } from "@/components/ui";

function horas(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

const MEDALHAS = ["🥇", "🥈", "🥉"];

// Ranking de minutos de foco (pomodoro) dos ultimos 7 dias.
export default function FocoSemana({ sessoes, membros }) {
  const porPessoa = {};
  for (const s of sessoes) porPessoa[s.user_id] = (porPessoa[s.user_id] ?? 0) + s.minutos;

  const ranking = membros
    .map((m) => ({ ...m, minutos: porPessoa[m.id] ?? 0 }))
    .filter((m) => m.minutos > 0)
    .toSorted((a, b) => b.minutos - a.minutos);
  const total = ranking.reduce((soma, m) => soma + m.minutos, 0);
  const maior = ranking[0]?.minutos ?? 1;

  return (
    <section className={`${cartao} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Timer className="size-4" /> Foco da semana
        </h2>
        <p className="text-sm text-zinc-500">
          {total > 0 ? (
            <>
              <strong className="text-zinc-900 tabular-nums dark:text-zinc-100">{horas(total)}</strong> de estudo
              em {sessoes.length} {sessoes.length === 1 ? "sessão" : "sessões"}
            </>
          ) : (
            "últimos 7 dias"
          )}
        </p>
      </div>

      {ranking.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Ninguém concluiu uma sessão de foco nesta semana. Abra a aba <strong>Foco</strong> e comece um pomodoro!
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {ranking.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3">
              <span className="w-6 text-center text-lg" aria-label={`${i + 1}º lugar`}>
                {MEDALHAS[i] ?? <span className="text-sm text-zinc-400">{i + 1}º</span>}
              </span>
              <Avatar nome={m.nome} cor={m.cor} tamanho="size-7" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{m.nome}</span>
                  <span className="shrink-0 text-zinc-500 tabular-nums">{horas(m.minutos)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(m.minutos / maior) * 100}%`, backgroundColor: m.cor ?? "#4f46e5" }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {ranking.length > 1 && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
          <Trophy className="size-3.5 text-amber-500" /> {ranking[0].nome.split(" ")[0]} lidera a semana
        </p>
      )}
    </section>
  );
}
