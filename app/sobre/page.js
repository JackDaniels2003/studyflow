import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Database,
  Globe,
  HardDrive,
  KeyRound,
  Radio,
  Server,
  ShieldCheck,
} from "lucide-react";
import Logo from "@/components/logo";
import SeletorTema from "@/components/seletor-tema";
import { botaoPrimario, cartao } from "@/components/ui";

export const metadata = {
  title: "Sobre o projeto | StudyFlow",
  description: "Arquitetura, tecnologias e funcionalidades do StudyFlow.",
};

const EQUIVALENCIAS = [
  ["EC2 + Auto Scaling", "Render (Web Service com Next.js)", "Deploy automático a cada push no GitHub"],
  ["RDS (PostgreSQL)", "Supabase Postgres", "Mesmo banco, com RLS para segurança por grupo"],
  ["S3", "Supabase Storage", "Bucket privado; download por link temporário"],
  ["WebSocket próprio", "Supabase Realtime", "Chat, quadro, mural e presença ao vivo"],
  ["Cognito / login", "Supabase Auth", "E-mail e senha, recuperação por e-mail"],
  ["CloudWatch", "Logs do Render e do Supabase", "Monitoramento sem configuração extra"],
];

const FUNCOES = [
  ["Grupos com convite", "Link ou código de 6 letras; o criador personaliza e gerencia membros."],
  ["Quadro de tarefas", "A fazer, Fazendo e Concluído, com arrastar e soltar, prioridade, checklist, anexos e comentários."],
  ["Prazo em português", "Escreva “Revisar slides amanhã 18h” e a tarefa já nasce com o prazo certo."],
  ["Contagem regressiva", "Cada prazo mostra quanto falta, ao vivo, e o app avisa 1 hora antes das suas entregas."],
  ["Calendário", "Visão do mês com os prazos e exportação para Google Agenda/Outlook (.ics)."],
  ["Chat em tempo real", "Presença online, “digitando...”, reações, menções com @ e notificações."],
  ["Mural e enquetes", "Post-its para links e combinados, e votações para as decisões do grupo."],
  ["Arquivos", "Upload com arrastar e soltar, visualização e download seguros."],
  ["Modo foco", "Pomodoro com sala de estudo ao vivo e ranking de horas estudadas na semana."],
  ["Progresso", "Gráficos por matéria e por pessoa, próximas entregas e histórico de atividades."],
];

export default function SobrePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/">
          <Logo className="text-lg" />
        </Link>
        <SeletorTema />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20">
        <section className="py-10 text-center">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Projeto Integrador</p>
          <h1 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Como o StudyFlow funciona por dentro
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
            Uma aplicação web completa para grupos de estudo, construída com serviços gerenciados para
            entregar o que a arquitetura AWS do projeto propõe, com custo zero.
          </p>
        </section>

        <h2 className="text-xl font-semibold">Arquitetura</h2>
        <div className={`${cartao} mt-4 p-6`}>
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            <No icone={Globe} titulo="Navegador" texto="React no cliente: telas, tempo real e uploads" />
            <Seta />
            <No icone={Server} titulo="Render" texto="Next.js 16: páginas no servidor, proxy de sessão" destaque />
            <Seta />
            <div className="flex-1 rounded-2xl border-2 border-dashed border-emerald-300 p-3 dark:border-emerald-500/40">
              <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                Supabase
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Mini icone={Database} titulo="Postgres" texto="dados + RLS" />
                <Mini icone={KeyRound} titulo="Auth" texto="login e sessão" />
                <Mini icone={HardDrive} titulo="Storage" texto="arquivos" />
                <Mini icone={Radio} titulo="Realtime" texto="ao vivo" />
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            O navegador também fala direto com o Supabase (chat, quadro ao vivo, uploads). Isso é seguro
            porque cada consulta passa pelas regras de acesso do próprio banco.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold">Do slide para a implementação</h2>
        <div className={`${cartao} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-5 py-3 font-medium">No slide (AWS)</th>
                <th className="px-5 py-3 font-medium">No StudyFlow</th>
                <th className="px-5 py-3 font-medium">Na prática</th>
              </tr>
            </thead>
            <tbody>
              {EQUIVALENCIAS.map(([aws, nosso, pratica]) => (
                <tr key={aws} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                  <td className="px-5 py-3 text-zinc-500">{aws}</td>
                  <td className="px-5 py-3 font-medium">
                    <ArrowRight className="mr-2 inline size-3.5 text-indigo-500" />
                    {nosso}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{pratica}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-xl font-semibold">Segurança</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Regras no banco (RLS)", "Só membros de um grupo leem e escrevem os dados dele, mesmo chamando a API direto."],
            ["Arquivos privados", "O bucket não é público: cada download usa um link assinado que expira em minutos."],
            ["Sessão no servidor", "Um proxy renova a sessão a cada página e bloqueia rotas sem login."],
            ["Testado automaticamente", "O comando npm test sobe um Postgres em memória e confere cada regra de acesso do banco."],
            ["Ninguém age por outro", "Mensagens, votos, reações e comentários são sempre gravados em nome de quem está logado."],
            ["Histórico confiável", "O registro de atividades é escrito por gatilhos do banco; nenhum usuário consegue forjá-lo."],
          ].map(([titulo, texto]) => (
            <div key={titulo} className={`${cartao} p-5`}>
              <ShieldCheck className="size-5 text-emerald-600" />
              <h3 className="mt-3 font-semibold">{titulo}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold">Funcionalidades</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCOES.map(([titulo, texto]) => (
            <li key={titulo} className={`${cartao} p-4`}>
              <p className="font-medium">{titulo}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-xl font-semibold">Tecnologias</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Next.js 16", "React 19", "Tailwind CSS 4", "Supabase", "PostgreSQL", "Recharts", "Render", "GitHub"].map((t) => (
            <span key={t} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link href="/cadastro" className={`${botaoPrimario} px-6 py-3 text-base`}>
            Experimentar o StudyFlow
          </Link>
        </div>
      </main>
    </div>
  );
}

function No({ icone: Icone, titulo, texto, destaque }) {
  return (
    <div
      className={`flex flex-1 items-center gap-3 rounded-2xl border p-4 ${
        destaque
          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <Icone className="size-6 shrink-0 text-indigo-600 dark:text-indigo-400" />
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="text-xs text-zinc-500">{texto}</p>
      </div>
    </div>
  );
}

function Mini({ icone: Icone, titulo, texto }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
      <Icone className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="truncate text-[11px] text-zinc-500">{texto}</p>
      </div>
    </div>
  );
}

function Seta() {
  return (
    <span className="flex justify-center text-zinc-400" aria-hidden="true">
      <ArrowDown className="size-5 lg:hidden" />
      <ArrowRight className="hidden size-5 lg:block" />
    </span>
  );
}
