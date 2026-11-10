import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  FolderUp,
  MessagesSquare,
  Timer,
  ListChecks,
} from "lucide-react";
import Logo from "@/components/logo";
import SeletorTema from "@/components/seletor-tema";
import { botaoPrimario, botaoSecundario } from "@/components/ui";

const RECURSOS = [
  {
    icone: ListChecks,
    titulo: "Tarefas por matéria",
    texto: "Quadro com A fazer, Fazendo e Concluído, prioridade e checklist.",
  },
  {
    icone: CalendarClock,
    titulo: "Contagem regressiva",
    texto: "Cada entrega mostra quanto falta, ao vivo, e vai para o calendário.",
  },
  {
    icone: MessagesSquare,
    titulo: "Chat em tempo real",
    texto: "Veja quem está online, reaja com emoji e chame alguém com @.",
  },
  {
    icone: Timer,
    titulo: "Modo foco em grupo",
    texto: "Pomodoro com sala de estudo: saiba quem do grupo está focando agora.",
  },
  {
    icone: FolderUp,
    titulo: "Mural e arquivos",
    texto: "Post-its para links e combinados, e uma pasta para PDFs e slides.",
  },
  {
    icone: BarChart3,
    titulo: "Progresso em gráficos",
    texto: "Andamento por matéria e por pessoa, com o histórico do grupo.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo className="text-lg" />
        <div className="flex items-center gap-2">
          <SeletorTema />
          <Link href="/login" className={botaoSecundario}>
            Entrar
          </Link>
          <Link href="/cadastro" className={`${botaoPrimario} hidden sm:inline-flex`}>
            Criar conta
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-16 text-center sm:py-24">
          <p className="mx-auto w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            Organização de estudos em grupo
          </p>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Seu grupo de estudos, sem perder nenhum prazo.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600 text-pretty dark:text-zinc-400">
            Tarefas, chat, arquivos e o progresso do grupo num lugar só, com
            contagem regressiva para cada entrega.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/cadastro" className={`${botaoPrimario} px-6 py-3 text-base`}>
              Começar agora
            </Link>
            <Link href="/login" className={`${botaoSecundario} px-6 py-3 text-base`}>
              Já tenho conta
            </Link>
          </div>
        </section>

        <PreviaApp />

        <section className="pb-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Como funciona</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["Crie o grupo", "Dê um nome, escolha um emoji e pronto. Ou comece com o modelo de Projeto Integrador."],
              ["Convide a turma", "Mande o link de convite no grupo do WhatsApp: quem abrir já entra."],
              ["Organize e acompanhe", "Tarefas com prazo, chat, mural e foco, tudo atualizando ao vivo para todos."],
            ].map(([titulo, texto], i) => (
              <li key={titulo} className="relative text-center">
                <span className="mx-auto inline-flex size-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-500/30">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{titulo}</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
            <div
              key={titulo}
              className="rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Icone className="size-5" />
              </span>
              <h2 className="mt-4 font-semibold">{titulo}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        StudyFlow · Projeto Integrador ·{" "}
        <Link href="/sobre" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100">
          Como funciona por dentro
        </Link>
      </footer>
    </div>
  );
}

// Ilustracao estatica do app (so decorativa) para a pagina inicial.
const COLUNAS_PREVIA = [
  {
    titulo: "A fazer",
    cor: "var(--status-todo)",
    cartoes: [
      { t: "Slides da apresentação", m: "#db2777", p: "Faltam 2d 14h" },
      { t: "Revisar referências", m: "#0891b2", p: "Faltam 5d 3h" },
    ],
  },
  {
    titulo: "Fazendo",
    cor: "var(--status-doing)",
    cartoes: [{ t: "Modelagem do banco", m: "#4f46e5", p: "Faltam 9h 20m", urgente: true }],
  },
  {
    titulo: "Concluído",
    cor: "var(--status-done)",
    cartoes: [
      { t: "Protótipo das telas", m: "#059669", feito: true },
      { t: "Escolher o tema", m: "#ca8a04", feito: true },
    ],
  },
];

function PreviaApp() {
  return (
    <div aria-hidden="true" className="relative mx-auto mb-20 max-w-4xl select-none">
      <div className="absolute inset-x-10 -top-6 bottom-0 -z-10 rounded-[3rem] bg-gradient-to-r from-indigo-400/30 via-violet-400/30 to-pink-400/30 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-1.5 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-zinc-400">studyflow · Projeto Integrador 🚀</span>
        </div>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
            <div>
              <p className="text-xs text-white/80">⏰ Próxima entrega</p>
              <p className="font-semibold">Modelagem do banco</p>
            </div>
            <div className="flex gap-1.5 font-semibold tabular-nums">
              {[
                ["00", "dias"],
                ["09", "horas"],
                ["20", "min"],
                ["41", "seg"],
              ].map(([v, r]) => (
                <span key={r} className="flex w-12 flex-col items-center rounded-lg bg-white/15 py-1">
                  <span className="text-lg">{v}</span>
                  <span className="text-[9px] text-white/75 uppercase">{r}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {COLUNAS_PREVIA.map((col) => (
              <div key={col.titulo} className="flex flex-col gap-2 rounded-xl bg-zinc-100/70 p-2.5 dark:bg-zinc-800/50">
                <p className="flex items-center gap-1.5 px-1 text-xs font-semibold">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: col.cor }} />
                  {col.titulo}
                </p>
                {col.cartoes.map((c) => (
                  <div
                    key={c.t}
                    className="rounded-lg bg-white p-2.5 text-left shadow-sm dark:bg-zinc-900"
                    style={{ borderLeft: `3px solid ${c.m}` }}
                  >
                    <p className={`text-xs font-medium ${c.feito ? "text-zinc-400 line-through" : ""}`}>{c.t}</p>
                    {c.p && (
                      <span
                        className={`mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          c.urgente
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                        }`}
                      >
                        {c.p}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
