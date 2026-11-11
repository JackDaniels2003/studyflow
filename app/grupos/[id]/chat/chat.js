"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing, MessagesSquare, SendHorizontal, SmilePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { Avatar, botaoIcone, cartao } from "@/components/ui";
import { LIMITE_INICIAL, POR_PAGINA } from "@/lib/chat";
import { chaveDoDia, formatarDia, formatarHora } from "@/lib/formatos";

const CINCO_MINUTOS = 5 * 60 * 1000;
const AVISO_DIGITANDO = 2000; // intervalo minimo entre avisos enviados
const EXPIRA_DIGITANDO = 3500; // some se a pessoa parar de digitar
const EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];

// Para comparar nomes em mencoes sem ligar para acento e maiuscula.
const simples = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Chat({
  grupoId,
  userId,
  membros,
  mensagensIniciais,
  comReacoes,
  reacoesIniciais,
}) {
  const { confirmar } = useAvisos();
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [reacoes, setReacoes] = useState(reacoesIniciais);
  const [perfis, setPerfis] = useState(() =>
    Object.fromEntries(membros.map((m) => [m.id, m])),
  );
  const [online, setOnline] = useState([]);
  const [digitando, setDigitando] = useState([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [temMais, setTemMais] = useState(mensagensIniciais.length >= LIMITE_INICIAL);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const fim = useRef(null);
  const rolagem = useRef(null);
  const canalRef = useRef(null);
  const ultimoAviso = useRef(0);
  const timersDigitando = useRef({});
  const conhecidos = useRef(new Set(membros.map((m) => m.id)));

  // Realtime: mensagens novas, presenca (quem esta online) e aviso de digitacao.
  useEffect(() => {
    const supabase = createClient();
    const timers = timersDigitando.current;
    const canal = supabase.channel(`chat-${grupoId}`, {
      config: { presence: { key: userId } },
    });
    canalRef.current = canal;

    function parouDeDigitar(id) {
      clearTimeout(timers[id]);
      setDigitando((atual) => atual.filter((d) => d !== id));
    }

    canal
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${grupoId}` },
        ({ new: nova }) => {
          setMensagens((atual) =>
            atual.some((m) => m.id === nova.id) ? atual : [...atual, nova],
          );
          parouDeDigitar(nova.user_id);
          if (!conhecidos.current.has(nova.user_id)) {
            conhecidos.current.add(nova.user_id);
            buscarPerfil(supabase, nova.user_id).then((perfil) =>
              setPerfis((atual) => ({ ...atual, [nova.user_id]: perfil })),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        ({ old }) => setMensagens((atual) => atual.filter((m) => m.id !== old.id)),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions", filter: `group_id=eq.${grupoId}` },
        ({ new: r }) =>
          setReacoes((atual) =>
            atual.some((x) => mesmaReacao(x, r)) ? atual : [...atual, r],
          ),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        ({ old }) => setReacoes((atual) => atual.filter((x) => !mesmaReacao(x, old))),
      )
      .on("broadcast", { event: "digitando" }, ({ payload }) => {
        const id = payload?.id;
        if (!id || id === userId) return;
        setDigitando((atual) => (atual.includes(id) ? atual : [...atual, id]));
        clearTimeout(timers[id]);
        timers[id] = setTimeout(() => parouDeDigitar(id), EXPIRA_DIGITANDO);
      })
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(canal.presenceState()));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") canal.track({ entrou: new Date().toISOString() });
      });

    return () => {
      Object.values(timers).forEach(clearTimeout);
      canalRef.current = null;
      supabase.removeChannel(canal);
    };
  }, [grupoId, userId]);

  // Rola para o fim so quando chega mensagem nova (nao ao carregar as antigas).
  const ultimaId = mensagens.at(-1)?.id;
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [ultimaId]);

  async function carregarAnteriores() {
    const primeira = mensagens[0];
    if (!primeira) return;
    setCarregandoMais(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, user_id, texto, created_at")
      .eq("group_id", grupoId)
      .lt("created_at", primeira.created_at)
      .order("created_at", { ascending: false })
      .limit(POR_PAGINA);
    const antigas = (data ?? []).toReversed();

    if (comReacoes && antigas.length) {
      const { data: rs } = await supabase
        .from("message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", antigas.map((m) => m.id));
      setReacoes((atual) => [...atual, ...(rs ?? [])]);
    }

    // Mantem a mensagem que estava no topo no mesmo lugar da tela.
    const caixa = rolagem.current;
    const alturaAntes = caixa?.scrollHeight ?? 0;
    setMensagens((atual) => [...antigas, ...atual]);
    setTemMais(antigas.length === POR_PAGINA);
    setCarregandoMais(false);
    requestAnimationFrame(() => {
      if (caixa) caixa.scrollTop += caixa.scrollHeight - alturaAntes;
    });
  }

  function mudarTexto(valor) {
    setTexto(valor);
    const agora = Date.now();
    if (valor && agora - ultimoAviso.current > AVISO_DIGITANDO) {
      ultimoAviso.current = agora;
      canalRef.current?.send({ type: "broadcast", event: "digitando", payload: { id: userId } });
    }
  }

  async function enviar(event) {
    event?.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo) return;

    setTexto("");
    setErro("");
    ultimoAviso.current = 0;
    const { data, error } = await createClient()
      .from("messages")
      .insert({ group_id: grupoId, texto: conteudo })
      .select("id, user_id, texto, created_at")
      .single();

    if (error) {
      console.error("Erro ao enviar mensagem:", error);
      setTexto(conteudo);
      setErro("Mensagem não enviada. Tente de novo.");
      return;
    }
    setMensagens((atual) => (atual.some((m) => m.id === data.id) ? atual : [...atual, data]));
  }

  async function apagar(id) {
    const sim = await confirmar({
      titulo: "Apagar mensagem?",
      texto: "Ela some para todo o grupo.",
      botao: "Apagar",
      perigo: true,
    });
    if (!sim) return;
    setMensagens((atual) => atual.filter((m) => m.id !== id));
    await createClient().from("messages").delete().eq("id", id);
  }

  async function reagir(mensagemId, emoji) {
    const minha = { message_id: mensagemId, user_id: userId, emoji };
    const supabase = createClient();
    if (reacoes.some((r) => mesmaReacao(r, minha))) {
      setReacoes((atual) => atual.filter((r) => !mesmaReacao(r, minha)));
      await supabase.from("message_reactions").delete().match(minha);
    } else {
      setReacoes((atual) => [...atual, minha]);
      await supabase.from("message_reactions").insert({ message_id: mensagemId, group_id: grupoId, emoji });
    }
  }

  const primeiroNome = (id) => perfis[id]?.nome?.split(" ")[0] ?? "Alguém";
  const outrosOnline = online.filter((id) => id !== userId);
  const primeirosNomes = new Set(Object.values(perfis).map((p) => simples(p.nome.split(" ")[0])));
  const meuNome = simples(perfis[userId]?.nome?.split(" ")[0] ?? "\u0000");

  return (
    <div className={`${cartao} flex h-[calc(100dvh-20rem)] min-h-[440px] flex-col overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium">Conversa do grupo</p>
          <BotaoNotificacoes />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="flex -space-x-1.5">
            {outrosOnline.slice(0, 4).map((id) => (
              <span key={id} className="rounded-full ring-2 ring-white dark:ring-zinc-900">
                <Avatar nome={perfis[id]?.nome} cor={perfis[id]?.cor} tamanho="size-5" texto="text-[9px]" />
              </span>
            ))}
          </div>
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          {outrosOnline.length === 0
            ? "Só você online"
            : `${outrosOnline.map(primeiroNome).join(", ")} e você online`}
        </div>
      </div>

      <div ref={rolagem} className="flex-1 overflow-y-auto px-4 py-4">
        {temMais && (
          <div className="mb-2 flex justify-center">
            <button
              onClick={carregarAnteriores}
              disabled={carregandoMais}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              {carregandoMais ? "Carregando..." : "Carregar mensagens anteriores"}
            </button>
          </div>
        )}
        {mensagens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
            <MessagesSquare className="size-10 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">Nenhuma mensagem ainda</p>
            <p className="text-sm">Diga oi para o grupo!</p>
          </div>
        ) : (
          mensagens.map((m, i) => {
            const anterior = mensagens[i - 1];
            const novoDia = !anterior || chaveDoDia(anterior.created_at) !== chaveDoDia(m.created_at);
            const agrupada =
              !novoDia &&
              anterior.user_id === m.user_id &&
              new Date(m.created_at) - new Date(anterior.created_at) < CINCO_MINUTOS;

            return (
              <Fragment key={m.id}>
                {novoDia && (
                  <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
                    <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    {formatarDia(m.created_at)}
                    <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                )}
                <Mensagem
                  mensagem={m}
                  perfil={perfis[m.user_id]}
                  minha={m.user_id === userId}
                  agrupada={agrupada}
                  onApagar={() => apagar(m.id)}
                  reacoes={comReacoes ? reacoes.filter((r) => r.message_id === m.id) : null}
                  userId={userId}
                  perfis={perfis}
                  onReagir={(emoji) => reagir(m.id, emoji)}
                  nomes={primeirosNomes}
                  meuNome={meuNome}
                />
              </Fragment>
            );
          })
        )}
        <div ref={fim} />
      </div>

      <p aria-live="polite" className="h-5 px-4 text-xs text-zinc-500 italic">
        {digitando.length > 0 &&
          `${digitando.map(primeiroNome).join(", ")} ${digitando.length === 1 ? "está" : "estão"} digitando...`}
      </p>

      <form onSubmit={enviar} className="border-t border-zinc-200/80 p-3 dark:border-zinc-800">
        {erro && <p className="mb-2 text-xs text-red-600">{erro}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => mudarTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                enviar();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Escreva uma mensagem... use @nome para chamar alguém"
            aria-label="Mensagem"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none [field-sizing:content] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            disabled={!texto.trim()}
            aria-label="Enviar"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            <SendHorizontal className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Mensagem({
  mensagem,
  perfil,
  minha,
  agrupada,
  onApagar,
  reacoes,
  userId,
  perfis,
  onReagir,
  nomes,
  meuNome,
}) {
  const [escolhendo, setEscolhendo] = useState(false);
  const nome = perfil?.nome ?? "Membro";
  const meMencionou = !minha && mencoes(mensagem.texto).some((n) => n === meuNome);

  // Agrupa as reacoes por emoji: { "👍": [userIds...] }
  const porEmoji = {};
  for (const r of reacoes ?? []) (porEmoji[r.emoji] ??= []).push(r.user_id);

  return (
    <div className={`animar-surgir group flex gap-2 ${minha ? "flex-row-reverse" : ""} ${agrupada ? "mt-0.5" : "mt-3"}`}>
      {!minha && (
        <div className="w-7 shrink-0">{!agrupada && <Avatar nome={nome} cor={perfil?.cor} />}</div>
      )}
      <div className={`flex max-w-[75%] flex-col ${minha ? "items-end" : "items-start"}`}>
        {!agrupada && (
          <p className="mb-1 px-1 text-xs text-zinc-500">
            {minha ? "Você" : nome} · {formatarHora(mensagem.created_at)}
          </p>
        )}
        <div className={`relative flex items-center gap-1 ${minha ? "flex-row-reverse" : ""}`}>
          <p
            title={formatarHora(mensagem.created_at)}
            className={`rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap ${
              minha
                ? "rounded-tr-md bg-indigo-600 text-white"
                : `rounded-tl-md bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 ${
                    meMencionou ? "ring-2 ring-amber-400" : ""
                  }`
            }`}
          >
            <TextoComMencoes texto={mensagem.texto} nomes={nomes} minha={minha} />
          </p>

          <div className="flex items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            {reacoes && (
              <button
                onClick={() => setEscolhendo((v) => !v)}
                aria-label="Reagir"
                aria-expanded={escolhendo}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <SmilePlus className="size-3.5" />
              </button>
            )}
            {minha && (
              <button
                onClick={onApagar}
                aria-label="Apagar mensagem"
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {escolhendo && (
            <div
              className={`animar-surgir absolute -top-10 z-10 flex gap-0.5 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 ${
                minha ? "right-0" : "left-0"
              }`}
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReagir(emoji);
                    setEscolhendo(false);
                  }}
                  aria-label={`Reagir com ${emoji}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-lg transition hover:scale-125 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {Object.keys(porEmoji).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(porEmoji).map(([emoji, quem]) => {
              const minhaReacao = quem.includes(userId);
              const nomesQuem = quem.map((id) =>
                id === userId ? "você" : (perfis[id]?.nome?.split(" ")[0] ?? "alguém"),
              );
              return (
                <button
                  key={emoji}
                  onClick={() => onReagir(emoji)}
                  title={nomesQuem.join(", ")}
                  aria-pressed={minhaReacao}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                    minhaReacao
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="tabular-nums">{quem.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Nomes mencionados com @ no texto (ja normalizados).
function mencoes(texto) {
  return [...texto.matchAll(/@([\p{L}\d_]+)/gu)].map((m) => simples(m[1]));
}

// Destaca @mencoes de membros e transforma URLs em links (so texto e <a>, sem HTML).
function TextoComMencoes({ texto, nomes, minha }) {
  const partes = texto.split(/(@[\p{L}\d_]+|https?:\/\/[^\s]+)/u);
  return partes.map((parte, i) => {
    if (/^https?:\/\//.test(parte)) {
      return (
        <a
          key={i}
          href={parte}
          target="_blank"
          rel="noopener noreferrer"
          className={`break-all underline underline-offset-2 ${
            minha ? "decoration-white/60 hover:decoration-white" : "text-indigo-700 decoration-indigo-300 dark:text-indigo-300"
          }`}
        >
          {parte.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
        </a>
      );
    }
    if (parte.startsWith("@") && nomes.has(simples(parte.slice(1)))) {
      return (
        <span
          key={i}
          className={`rounded px-0.5 font-semibold ${
            minha ? "bg-white/20" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
          }`}
        >
          {parte}
        </span>
      );
    }
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

const mesmaReacao = (a, b) =>
  a.message_id === b.message_id && a.user_id === b.user_id && a.emoji === b.emoji;

// Liga as notificacoes do navegador para mensagens novas (quando a aba esta em segundo plano).
function BotaoNotificacoes() {
  const sistema = useSyncExternalStore(
    () => () => {},
    // Notification só funciona em contexto seguro (HTTPS/localhost); em HTTP o botão some.
    () =>
      typeof Notification === "undefined" || !window.isSecureContext
        ? "indisponivel"
        : Notification.permission,
    () => "default",
  );
  const [pedido, setPedido] = useState(null);
  const permissao = pedido ?? sistema;
  if (permissao === "indisponivel") return null;

  const textos = {
    granted: "Notificações ativadas",
    denied: "Notificações bloqueadas (libere nas configurações do navegador)",
    default: "Ativar notificações de mensagens",
  };
  const Icone = permissao === "granted" ? BellRing : permissao === "denied" ? BellOff : Bell;

  return (
    <button
      onClick={async () => permissao === "default" && setPedido(await Notification.requestPermission())}
      title={textos[permissao]}
      aria-label={textos[permissao]}
      className={`${botaoIcone} ${permissao === "granted" ? "text-indigo-600 dark:text-indigo-400" : ""}`}
    >
      <Icone className="size-4" />
    </button>
  );
}


async function buscarPerfil(supabase, id) {
  const { data } = await supabase.from("profiles").select("nome, cor").eq("id", id).single();
  return { id, nome: data?.nome ?? "Membro", cor: data?.cor };
}
