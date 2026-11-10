"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Check, Pencil, Pin, PinOff, Plus, StickyNote, Trash2, Vote, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { Avatar, botaoPrimario, botaoSecundario } from "@/components/ui";
import { formatarRelativo } from "@/lib/formatos";
import { useAgora } from "@/lib/use-agora";

// Cores de post-it: fundo suave no claro, tom escuro no modo escuro.
const CORES = {
  amarelo: { nome: "Amarelo", classe: "bg-amber-100 dark:bg-amber-500/15", bolinha: "#fbbf24" },
  rosa: { nome: "Rosa", classe: "bg-pink-100 dark:bg-pink-500/15", bolinha: "#f472b6" },
  azul: { nome: "Azul", classe: "bg-sky-100 dark:bg-sky-500/15", bolinha: "#38bdf8" },
  verde: { nome: "Verde", classe: "bg-emerald-100 dark:bg-emerald-500/15", bolinha: "#34d399" },
  roxo: { nome: "Roxo", classe: "bg-violet-100 dark:bg-violet-500/15", bolinha: "#a78bfa" },
  laranja: { nome: "Laranja", classe: "bg-orange-100 dark:bg-orange-500/15", bolinha: "#fb923c" },
};

function ordenar(a, b) {
  if (a.fixada !== b.fixada) return a.fixada ? -1 : 1;
  return b.updated_at.localeCompare(a.updated_at);
}

export default function Mural({ grupoId, userId, membros, notasIniciais, comEnquete, votosIniciais }) {
  const { avisar, confirmar } = useAvisos();
  const [notas, setNotas] = useState(notasIniciais);
  const [votos, setVotos] = useState(votosIniciais);
  const [editando, setEditando] = useState(null); // id da nota, "nova" ou "enquete"
  const membroPorId = Object.fromEntries(membros.map((m) => [m.id, m]));

  const recarregar = useCallback(async () => {
    const { data } = await createClient().from("notes").select("*").eq("group_id", grupoId);
    if (data) setNotas(data);
  }, [grupoId]);

  useEffect(() => {
    const supabase = createClient();
    const filtro = `group_id=eq.${grupoId}`;
    const canal = supabase.channel(`mural-${grupoId}`);
    canal
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notes", filter: filtro }, recarregar)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notes", filter: filtro }, recarregar)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notes" }, ({ old }) =>
        setNotas((atual) => atual.filter((n) => n.id !== old.id)),
      );
    if (comEnquete) {
      const trocarVoto = ({ new: v }) =>
        setVotos((atual) => [
          ...atual.filter((x) => !(x.note_id === v.note_id && x.user_id === v.user_id)),
          { note_id: v.note_id, user_id: v.user_id, opcao: v.opcao },
        ]);
      canal
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_votes", filter: filtro }, trocarVoto)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "poll_votes", filter: filtro }, trocarVoto)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "poll_votes" }, ({ old }) =>
          setVotos((atual) => atual.filter((x) => !(x.note_id === old.note_id && x.user_id === old.user_id))),
        );
    }
    canal.subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupoId, recarregar, comEnquete]);

  async function salvar(dados, nota) {
    const supabase = createClient();
    const agora = new Date().toISOString();
    const { data, error } = nota
      ? await supabase.from("notes").update({ ...dados, updated_at: agora }).eq("id", nota.id).select().single()
      : await supabase.from("notes").insert({ ...dados, group_id: grupoId }).select().single();

    if (error) {
      console.error("Erro ao salvar nota:", error);
      avisar("Não foi possível salvar a nota.", "erro");
      return false;
    }
    setNotas((atual) => [...atual.filter((n) => n.id !== data.id), data]);
    setEditando(null);
    if (!nota) avisar(dados.opcoes ? "Enquete aberta! Avise o grupo para votar" : "Nota fixada no mural");
    return true;
  }

  // Clicar na opcao ja votada tira o voto; em outra, troca.
  async function votar(nota, opcao) {
    const supabase = createClient();
    const meu = votos.find((v) => v.note_id === nota.id && v.user_id === userId);
    const outros = votos.filter((v) => !(v.note_id === nota.id && v.user_id === userId));
    if (meu?.opcao === opcao) {
      setVotos(outros);
      await supabase.from("poll_votes").delete().eq("note_id", nota.id).eq("user_id", userId);
      return;
    }
    setVotos([...outros, { note_id: nota.id, user_id: userId, opcao }]);
    const { error } = await supabase
      .from("poll_votes")
      .upsert({ note_id: nota.id, group_id: grupoId, user_id: userId, opcao }, { onConflict: "note_id,user_id" });
    if (error) {
      avisar("Não foi possível registrar o voto.", "erro");
      recarregar();
    }
  }

  async function alternarFixada(nota) {
    setNotas((atual) => atual.map((n) => (n.id === nota.id ? { ...n, fixada: !n.fixada } : n)));
    await createClient().from("notes").update({ fixada: !nota.fixada }).eq("id", nota.id);
  }

  async function excluir(nota) {
    const sim = await confirmar({
      titulo: "Excluir nota?",
      texto: "Ela some do mural para todo o grupo.",
      botao: "Excluir",
      perigo: true,
    });
    if (!sim) return;
    setNotas((atual) => atual.filter((n) => n.id !== nota.id));
    await createClient().from("notes").delete().eq("id", nota.id);
  }

  const ordenadas = notas.toSorted(ordenar);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Links, combinados, ideias e lembretes do grupo. Qualquer membro pode editar.
        </p>
        <div className="flex gap-2">
          {comEnquete && (
            <button onClick={() => setEditando("enquete")} className={botaoSecundario}>
              <Vote className="size-4" /> Nova enquete
            </button>
          )}
          <button onClick={() => setEditando("nova")} className={botaoPrimario}>
            <Plus className="size-4" /> Nova nota
          </button>
        </div>
      </div>

      {notas.length === 0 && !editando ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
          <StickyNote className="mx-auto size-10 text-zinc-400" />
          <p className="mt-3 font-medium">O mural está vazio</p>
          <p className="mt-1 text-sm text-zinc-500">
            Cole aqui o link do drive, as regras do trabalho ou a data da apresentação.
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {editando === "nova" && (
            <EditorNota onSalvar={(dados) => salvar(dados)} onCancelar={() => setEditando(null)} />
          )}
          {editando === "enquete" && (
            <EditorEnquete onSalvar={(dados) => salvar(dados)} onCancelar={() => setEditando(null)} />
          )}
          {ordenadas.map((nota) =>
            editando === nota.id ? (
              <EditorNota
                key={nota.id}
                nota={nota}
                onSalvar={(dados) => salvar(dados, nota)}
                onCancelar={() => setEditando(null)}
              />
            ) : (
              <CartaoNota
                key={nota.id}
                nota={nota}
                autor={membroPorId[nota.user_id]}
                minha={nota.user_id === userId}
                votos={votos.filter((v) => v.note_id === nota.id)}
                userId={userId}
                membroPorId={membroPorId}
                onVotar={(opcao) => votar(nota, opcao)}
                onEditar={Array.isArray(nota.opcoes) ? null : () => setEditando(nota.id)}
                onFixar={() => alternarFixada(nota)}
                onExcluir={() => excluir(nota)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function CartaoNota({ nota, autor, minha, votos, userId, membroPorId, onVotar, onEditar, onFixar, onExcluir }) {
  const agora = useAgora();
  const cor = CORES[nota.cor] ?? CORES.amarelo;
  const enquete = Array.isArray(nota.opcoes);

  return (
    <article
      onDoubleClick={onEditar ?? undefined}
      className={`animar-surgir group relative break-inside-avoid rounded-2xl p-5 shadow-sm ring-1 ring-black/5 transition hover:-rotate-[0.4deg] hover:shadow-md dark:ring-white/10 ${cor.classe}`}
    >
      {nota.fixada && (
        <Pin className="absolute -top-2 right-4 size-5 rotate-12 fill-red-500 text-red-600 drop-shadow" />
      )}
      {enquete && (
        <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
          <Vote className="size-3.5" /> Enquete
        </p>
      )}
      {nota.titulo && <h3 className="pr-6 font-semibold break-words">{nota.titulo}</h3>}
      {enquete && (
        <Enquete opcoes={nota.opcoes} votos={votos} userId={userId} membroPorId={membroPorId} onVotar={onVotar} />
      )}
      {!enquete && nota.conteudo && (
        <p className={`text-sm break-words whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 ${nota.titulo ? "mt-2" : ""}`}>
          <TextoComLinks texto={nota.conteudo} />
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <Avatar nome={autor?.nome ?? "Membro"} cor={autor?.cor} tamanho="size-5" texto="text-[9px]" />
          <span className="truncate">
            {minha ? "Você" : (autor?.nome?.split(" ")[0] ?? "Membro")} · {formatarRelativo(nota.updated_at, agora)}
          </span>
        </span>
        <div className="flex shrink-0 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <BotaoNota titulo={nota.fixada ? "Desafixar" : "Fixar no topo"} onClick={onFixar}>
            {nota.fixada ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </BotaoNota>
          {onEditar && (
            <BotaoNota titulo="Editar" onClick={onEditar}>
              <Pencil className="size-3.5" />
            </BotaoNota>
          )}
          <BotaoNota titulo="Excluir" onClick={onExcluir} perigo>
            <Trash2 className="size-3.5" />
          </BotaoNota>
        </div>
      </div>
    </article>
  );
}

function BotaoNota({ titulo, onClick, perigo, children }) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className={`inline-flex size-7 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10 ${
        perigo ? "hover:text-red-600" : "hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function EditorNota({ nota, onSalvar, onCancelar }) {
  const [titulo, setTitulo] = useState(nota?.titulo ?? "");
  const [conteudo, setConteudo] = useState(nota?.conteudo ?? "");
  const [cor, setCor] = useState(nota?.cor ?? "amarelo");
  const [salvando, setSalvando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    if (!titulo.trim() && !conteudo.trim()) return;
    setSalvando(true);
    const ok = await onSalvar({ titulo: titulo.trim() || null, conteudo: conteudo.trim(), cor });
    if (!ok) setSalvando(false);
  }

  return (
    <form
      onSubmit={enviar}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancelar();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar(e);
      }}
      className={`break-inside-avoid rounded-2xl p-5 shadow-md ring-2 ring-indigo-500/40 ${(CORES[cor] ?? CORES.amarelo).classe}`}
    >
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={80}
        placeholder="Título (opcional)"
        aria-label="Título da nota"
        className="w-full bg-transparent font-semibold outline-none placeholder:text-zinc-500/70"
      />
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        autoFocus
        rows={4}
        maxLength={2000}
        placeholder="Escreva a nota... links viram clicáveis"
        aria-label="Conteúdo da nota"
        className="mt-2 w-full resize-y bg-transparent text-sm outline-none placeholder:text-zinc-500/70"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Cor da nota">
          {Object.entries(CORES).map(([id, c]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={cor === id}
              aria-label={c.nome}
              onClick={() => setCor(id)}
              className={`size-5 rounded-full ring-1 ring-black/10 transition hover:scale-110 ${
                cor === id ? "ring-2 ring-zinc-700 dark:ring-zinc-200" : ""
              }`}
              style={{ backgroundColor: c.bolinha }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancelar} className={`${botaoSecundario} py-1.5`}>
            Cancelar
          </button>
          <button disabled={salvando} className={`${botaoPrimario} py-1.5`}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </form>
  );
}

// Transforma URLs do texto em links clicaveis (sem HTML: so texto e <a>).
function TextoComLinks({ texto }) {
  const partes = texto.split(/(https?:\/\/[^\s]+)/g);
  return partes.map((parte, i) =>
    /^https?:\/\//.test(parte) ? (
      <a
        key={i}
        href={parte}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 break-all hover:decoration-indigo-600 dark:text-indigo-300"
      >
        {parte.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
      </a>
    ) : (
      <Fragment key={i}>{parte}</Fragment>
    ),
  );
}

// Opcoes da enquete com barra de resultado; a opcao votada fica marcada.
function Enquete({ opcoes, votos, userId, membroPorId, onVotar }) {
  const total = votos.length;
  const meu = votos.find((v) => v.user_id === userId)?.opcao;
  const maisVotada = Math.max(0, ...opcoes.map((_, i) => votos.filter((v) => v.opcao === i).length));

  return (
    <div className="mt-3 flex flex-col gap-2">
      {opcoes.map((texto, i) => {
        const daOpcao = votos.filter((v) => v.opcao === i);
        const pct = total ? Math.round((daOpcao.length / total) * 100) : 0;
        const escolhida = meu === i;
        const nomes = daOpcao.map((v) => (v.user_id === userId ? "você" : (membroPorId[v.user_id]?.nome?.split(" ")[0] ?? "alguém")));
        return (
          <button
            key={i}
            onClick={() => onVotar(i)}
            title={nomes.length ? `Votaram: ${nomes.join(", ")}` : "Ninguém votou ainda"}
            aria-pressed={escolhida}
            className={`relative overflow-hidden rounded-xl bg-white/60 px-3 py-2 text-left text-sm ring-1 transition hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/30 ${
              escolhida ? "ring-2 ring-indigo-500" : "ring-black/5 dark:ring-white/10"
            }`}
          >
            <span
              className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
                daOpcao.length === maisVotada && maisVotada > 0 ? "bg-indigo-500/25" : "bg-zinc-500/15"
              }`}
              style={{ width: `${pct}%` }}
            />
            <span className="relative flex items-center gap-2">
              {escolhida && <Check className="size-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />}
              <span className="flex-1 break-words">{texto}</span>
              <span className="shrink-0 text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
                {daOpcao.length > 0 && `${daOpcao.length} · `}
                {pct}%
              </span>
            </span>
          </button>
        );
      })}
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {total === 0 ? "Seja o primeiro a votar" : `${total} ${total === 1 ? "voto" : "votos"}`}
        {meu !== undefined && " · clique de novo para tirar o seu"}
      </p>
    </div>
  );
}

function EditorEnquete({ onSalvar, onCancelar }) {
  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState(["", ""]);
  const [cor, setCor] = useState("azul");
  const [salvando, setSalvando] = useState(false);
  const validas = opcoes.map((o) => o.trim()).filter(Boolean);

  async function enviar(event) {
    event.preventDefault();
    if (!pergunta.trim() || validas.length < 2) return;
    setSalvando(true);
    const ok = await onSalvar({ titulo: pergunta.trim(), conteudo: "", opcoes: validas, cor });
    if (!ok) setSalvando(false);
  }

  return (
    <form
      onSubmit={enviar}
      onKeyDown={(e) => e.key === "Escape" && onCancelar()}
      className={`break-inside-avoid rounded-2xl p-5 shadow-md ring-2 ring-indigo-500/40 ${(CORES[cor] ?? CORES.azul).classe}`}
    >
      <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
        <Vote className="size-3.5" /> Nova enquete
      </p>
      <input
        value={pergunta}
        onChange={(e) => setPergunta(e.target.value)}
        autoFocus
        required
        maxLength={120}
        placeholder="Pergunta (ex.: Que dia apresentamos?)"
        aria-label="Pergunta da enquete"
        className="w-full bg-transparent font-semibold outline-none placeholder:text-zinc-500/70"
      />
      <div className="mt-3 flex flex-col gap-2">
        {opcoes.map((texto, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={texto}
              onChange={(e) => setOpcoes(opcoes.map((o, j) => (j === i ? e.target.value : o)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (i === opcoes.length - 1 && opcoes.length < 6) setOpcoes([...opcoes, ""]);
                }
              }}
              maxLength={80}
              placeholder={`Opção ${i + 1}`}
              aria-label={`Opção ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg bg-white/70 px-3 py-1.5 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-indigo-500 dark:bg-black/20 dark:ring-white/10"
            />
            {opcoes.length > 2 && (
              <button
                type="button"
                onClick={() => setOpcoes(opcoes.filter((_, j) => j !== i))}
                aria-label={`Remover opção ${i + 1}`}
                className="text-zinc-500 hover:text-red-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        {opcoes.length < 6 && (
          <button
            type="button"
            onClick={() => setOpcoes([...opcoes, ""])}
            className="inline-flex items-center gap-1 self-start text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300"
          >
            <Plus className="size-3.5" /> Adicionar opção
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Cor da enquete">
          {Object.entries(CORES).map(([id, c]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={cor === id}
              aria-label={c.nome}
              onClick={() => setCor(id)}
              className={`size-5 rounded-full ring-1 ring-black/10 transition hover:scale-110 ${
                cor === id ? "ring-2 ring-zinc-700 dark:ring-zinc-200" : ""
              }`}
              style={{ backgroundColor: c.bolinha }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancelar} className={`${botaoSecundario} py-1.5`}>
            Cancelar
          </button>
          <button disabled={salvando || validas.length < 2} className={`${botaoPrimario} py-1.5`}>
            {salvando ? "Abrindo..." : "Abrir enquete"}
          </button>
        </div>
      </div>
    </form>
  );
}
