"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Coffee, Pause, Play, RotateCcw, SkipForward, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { soltarConfete } from "@/components/confete";
import { Avatar, botaoIcone, botaoPrimario, botaoSecundario, campo, cartao } from "@/components/ui";
import { useAgora } from "@/lib/use-agora";

const MINUTO = 60000;
const MODOS = [
  { id: "pomodoro", nome: "Pomodoro", foco: 25, pausa: 5 },
  { id: "longo", nome: "Longo", foco: 50, pausa: 10 },
  { id: "curto", nome: "Curto", foco: 15, pausa: 3 },
];
const CHAVE = "studyflow:foco";
const hojeChave = () => new Date().toLocaleDateString("en-CA");

const duracao = (estado, fase = estado.fase) =>
  (MODOS.find((m) => m.id === estado.modo) ?? MODOS[0])[fase] * MINUTO;

const ESTADO_INICIAL = {
  modo: "pomodoro",
  fase: "foco", // "foco" | "pausa"
  fim: null, // timestamp quando esta rodando
  restante: 25 * MINUTO, // quando pausado ou parado
  tarefaId: "",
  sessoes: { dia: "", total: 0 },
};

// O cronometro fica salvo no navegador: trocar de aba ou recarregar nao zera.
function carregar() {
  try {
    return { ...ESTADO_INICIAL, ...JSON.parse(localStorage.getItem(CHAVE) ?? "{}") };
  } catch {
    return ESTADO_INICIAL;
  }
}

export default function Foco({ grupoId, eu, membros, tarefas }) {
  const agora = useAgora();
  const { avisar } = useAvisos();
  const [estado, setEstado] = useState(carregar);
  const [outros, setOutros] = useState([]);
  const canalRef = useRef(null);
  const estadoRef = useRef(estado);

  const rodando = estado.fim !== null;
  const total = duracao(estado);
  const restante = rodando ? Math.max(0, estado.fim - (agora ?? estado.fim - estado.restante)) : estado.restante;
  const sessoesHoje = estado.sessoes.dia === hojeChave() ? estado.sessoes.total : 0;
  const tarefa = tarefas.find((t) => t.id === estado.tarefaId);

  useEffect(() => {
    estadoRef.current = estado;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      // Sem armazenamento: o cronometro so vale nesta aba.
    }
    canalRef.current?.track(presenca(eu, estado, tarefas));
  }, [estado, eu, tarefas]);

  // Quando o tempo acaba: som, notificacao e troca de fase.
  useEffect(() => {
    if (estado.fim === null) return;
    const espera = setTimeout(() => {
      const fase = estadoRef.current.fase;
      tocarSino();
      notificar(fase === "foco" ? "Sessão de foco concluída! Hora da pausa." : "Pausa acabou. Bora voltar?");
      if (fase === "foco") {
        soltarConfete();
        avisar("Sessão concluída! Aproveite a pausa ☕");
        registrarSessao(estadoRef.current, grupoId, tarefas);
      } else {
        avisar("Pausa encerrada. Pronto para mais uma?", "info");
      }
      setEstado((e) => proximaFase(e, fase === "foco"));
    }, Math.max(0, estado.fim - Date.now()));
    return () => clearTimeout(espera);
  }, [estado.fim, avisar, grupoId, tarefas]);

  // Mostra o tempo na aba do navegador enquanto roda.
  useEffect(() => {
    if (!rodando) return;
    const anterior = document.title;
    document.title = `${relogio(restante)} · ${estado.fase === "foco" ? "Foco" : "Pausa"}`;
    return () => {
      document.title = anterior;
    };
  }, [rodando, restante, estado.fase]);

  // Presenca: quem do grupo esta nesta tela e em que ponto do cronometro.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase.channel(`foco-${grupoId}`, { config: { presence: { key: eu.id } } });
    canal
      .on("presence", { event: "sync" }, () => {
        const estados = Object.entries(canal.presenceState())
          .filter(([id]) => id !== eu.id)
          .map(([, lista]) => lista.at(-1));
        setOutros(estados);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          canalRef.current = canal;
          canal.track(presenca(eu, estadoRef.current, tarefas));
        }
      });
    return () => {
      canalRef.current = null;
      supabase.removeChannel(canal);
    };
  }, [grupoId, eu, tarefas]);

  function iniciar() {
    pedirPermissaoNotificacao();
    setEstado((e) => ({ ...e, grupoId, fim: Date.now() + e.restante }));
  }
  const pausar = () => setEstado((e) => ({ ...e, restante: Math.max(0, e.fim - Date.now()), fim: null }));
  const reiniciar = () => setEstado((e) => ({ ...e, fim: null, restante: duracao(e) }));
  const pular = () => setEstado((e) => proximaFase(e, false));
  const trocarModo = (modo) =>
    setEstado((e) => ({ ...e, modo, fase: "foco", fim: null, restante: duracao({ ...e, modo }, "foco") }));

  if (!agora) return <div className={`${cartao} h-[520px] animate-pulse`} />;

  const progresso = 1 - restante / total;
  const pausa = estado.fase === "pausa";
  const corAnel = pausa ? "var(--status-done)" : "#4f46e5";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className={`${cartao} flex flex-col items-center px-6 py-10`}>
        <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" role="radiogroup" aria-label="Duração">
          {MODOS.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={estado.modo === m.id}
              disabled={rodando}
              onClick={() => trocarModo(m.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed ${
                estado.modo === m.id
                  ? "bg-white shadow-sm dark:bg-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 disabled:hover:text-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              {m.nome} <span className="text-xs text-zinc-400">{m.foco}/{m.pausa}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-10 size-64 sm:size-72">
          <svg viewBox="0 0 240 240" className="size-full -rotate-90">
            <circle cx="120" cy="120" r="108" fill="none" strokeWidth="10" className="stroke-zinc-100 dark:stroke-zinc-800" />
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke={corAnel}
              strokeDasharray={2 * Math.PI * 108}
              strokeDashoffset={2 * Math.PI * 108 * (1 - progresso)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                pausa
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
              }`}
            >
              {pausa ? <Coffee className="size-3.5" /> : <Bell className="size-3.5" />}
              {pausa ? "Pausa" : "Foco"}
            </span>
            <span className="mt-3 font-mono text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
              {relogio(restante)}
            </span>
            <span className="mt-2 text-sm text-zinc-500">
              {rodando ? (pausa ? "respira um pouco" : "modo foco ligado") : "pronto quando você estiver"}
            </span>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <button onClick={reiniciar} title="Reiniciar" aria-label="Reiniciar" className={botaoIcone}>
            <RotateCcw className="size-4" />
          </button>
          {rodando ? (
            <button onClick={pausar} className={`${botaoSecundario} px-8 py-3 text-base`}>
              <Pause className="size-5" /> Pausar
            </button>
          ) : (
            <button onClick={iniciar} className={`${botaoPrimario} px-8 py-3 text-base`}>
              <Play className="size-5" /> {restante < total ? "Continuar" : pausa ? "Começar pausa" : "Começar foco"}
            </button>
          )}
          <button onClick={pular} title={pausa ? "Pular pausa" : "Pular para a pausa"} aria-label="Pular fase" className={botaoIcone}>
            <SkipForward className="size-4" />
          </button>
        </div>

        <label className="mt-8 flex w-full max-w-sm flex-col gap-1.5 text-sm font-medium">
          No que você vai focar?
          <select
            value={estado.tarefaId}
            onChange={(e) => setEstado((s) => ({ ...s, tarefaId: e.target.value }))}
            className={campo}
          >
            <option value="">Estudo livre</option>
            {tarefas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-6 text-sm text-zinc-500">
          {"🍅".repeat(Math.min(sessoesHoje, 8))}
          {sessoesHoje > 8 && ` +${sessoesHoje - 8}`}
          {sessoesHoje === 0 ? "Nenhuma sessão hoje ainda" : ` ${sessoesHoje} ${sessoesHoje === 1 ? "sessão" : "sessões"} hoje`}
          {tarefa && <> · focando em <strong className="text-zinc-700 dark:text-zinc-300">{tarefa.titulo}</strong></>}
        </p>
      </section>

      <aside className={`${cartao} h-fit p-5`}>
        <h2 className="flex items-center gap-2 font-semibold">
          <Users className="size-4" /> Estudando agora
        </h2>
        <p className="mt-1 text-xs text-zinc-500">Quem do grupo está nesta tela, ao vivo.</p>

        <ul className="mt-4 flex flex-col gap-3">
          <PessoaFocando pessoa={presenca(eu, estado, tarefas)} agora={agora} voce />
          {outros.map((p) => (
            <PessoaFocando key={p.id} pessoa={p} agora={agora} />
          ))}
        </ul>

        {outros.length === 0 && (
          <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/50">
            Chame o grupo para abrir esta aba: estudar junto, mesmo à distância, ajuda a manter o ritmo.
          </p>
        )}
        {membros.length > 1 && (
          <p className="mt-4 text-xs text-zinc-400">
            {outros.length} de {membros.length - 1} {membros.length - 1 === 1 ? "colega" : "colegas"} por aqui
          </p>
        )}
      </aside>
    </div>
  );
}

function PessoaFocando({ pessoa, agora, voce }) {
  const rodando = pessoa.fim !== null;
  const restante = rodando ? Math.max(0, pessoa.fim - agora) : pessoa.restante;
  const pausa = pessoa.fase === "pausa";

  return (
    <li className="flex items-center gap-3">
      <span className="relative">
        <Avatar nome={pessoa.nome} cor={pessoa.cor} tamanho="size-9" texto="text-xs" />
        {rodando && (
          <span
            className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
              pausa ? "bg-emerald-500" : "bg-indigo-500"
            }`}
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {pessoa.nome}
          {voce && <span className="font-normal text-zinc-400"> (você)</span>}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {!rodando ? "parado" : pausa ? "em pausa" : pessoa.tarefa ? `focando em ${pessoa.tarefa}` : "focando"}
        </p>
      </div>
      <span className="font-mono text-sm text-zinc-600 tabular-nums dark:text-zinc-400">{relogio(restante)}</span>
    </li>
  );
}

function proximaFase(e, contarSessao) {
  const fase = e.fase === "foco" ? "pausa" : "foco";
  const hoje = hojeChave();
  const sessoes =
    contarSessao && e.fase === "foco"
      ? { dia: hoje, total: (e.sessoes.dia === hoje ? e.sessoes.total : 0) + 1 }
      : e.sessoes;
  const restante = duracao(e, fase);
  // A pausa comeca sozinha depois do foco; o proximo foco espera o clique.
  const fim = contarSessao && fase === "pausa" ? Date.now() + restante : null;
  return { ...e, fase, restante, fim, sessoes };
}

// Guarda a sessao concluida no grupo onde ela comecou (vai para o ranking e o historico).
// Se o banco ainda nao tiver a tabela, so nao registra.
function registrarSessao(e, grupoAtual, tarefas) {
  const tarefaDoGrupo = e.grupoId === grupoAtual && tarefas.some((t) => t.id === e.tarefaId);
  createClient()
    .from("focus_sessions")
    .insert({
      group_id: e.grupoId ?? grupoAtual,
      minutos: duracao(e, "foco") / MINUTO,
      task_id: tarefaDoGrupo ? e.tarefaId : null,
    })
    .then(({ error }) => error && console.warn("Sessão de foco não registrada:", error.message));
}

function presenca(eu, estado, tarefas) {
  return {
    id: eu.id,
    nome: eu.nome,
    cor: eu.cor,
    fase: estado.fase,
    fim: estado.fim,
    restante: estado.restante,
    tarefa: tarefas.find((t) => t.id === estado.tarefaId)?.titulo ?? null,
  };
}

function relogio(ms) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function pedirPermissaoNotificacao() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notificar(texto) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
    new Notification("StudyFlow · Foco", { body: texto, tag: "studyflow-foco" });
  }
}

// Tres notas curtas (sem arquivo de audio).
function tocarSino() {
  try {
    const ctx = new AudioContext();
    [880, 1108.7, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const inicio = ctx.currentTime + i * 0.18;
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.6);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.65);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Sem audio disponivel: segue so com o aviso visual.
  }
}
