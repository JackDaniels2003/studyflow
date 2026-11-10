"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CornerDownLeft,
  FolderOpen,
  Home,
  Info,
  ListChecks,
  MessagesSquare,
  Moon,
  Search,
  StickyNote,
  Sun,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ABAS = [
  { rota: "", titulo: "Tarefas", icone: ListChecks },
  { rota: "/calendario", titulo: "Calendário", icone: CalendarDays },
  { rota: "/chat", titulo: "Chat", icone: MessagesSquare },
  { rota: "/mural", titulo: "Mural", icone: StickyNote },
  { rota: "/arquivos", titulo: "Arquivos", icone: FolderOpen },
  { rota: "/foco", titulo: "Foco", icone: Timer },
  { rota: "/painel", titulo: "Progresso", icone: BarChart3 },
];

const simples = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function aplicarTema(tema) {
  try {
    localStorage.setItem("tema", tema);
  } catch {
    // sem armazenamento: vale ate recarregar
  }
  document.documentElement.dataset.tema = tema;
  window.dispatchEvent(new Event("studyflow:tema"));
}

// Ctrl+K (ou Cmd+K): busca para ir a qualquer grupo/aba e executar acoes rapidas.
export default function PaletaComandos() {
  const router = useRouter();
  const params = useParams();
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [indice, setIndice] = useState(0);
  const [grupos, setGrupos] = useState([]);
  const dialogo = useRef(null);
  const lista = useRef(null);

  useEffect(() => {
    function tecla(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta((v) => !v);
      }
    }
    const abrir = () => setAberta(true);
    window.addEventListener("keydown", tecla);
    window.addEventListener("studyflow:paleta", abrir);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("studyflow:paleta", abrir);
    };
  }, []);

  useEffect(() => {
    if (!aberta) return;
    dialogo.current?.showModal();
    createClient()
      .from("group_members")
      .select("groups(id, nome, emoji)")
      .then(({ data }) => setGrupos((data ?? []).map((m) => m.groups).filter(Boolean)));
  }, [aberta]);

  const itens = useMemo(() => {
    const atual = grupos.find((g) => g.id === params?.id);
    const todos = [
      ...(atual
        ? ABAS.map((a) => ({
            id: `aba${a.rota}`,
            secao: atual.nome,
            titulo: a.titulo,
            icone: a.icone,
            acao: () => router.push(`/grupos/${atual.id}${a.rota}`),
          }))
        : []),
      ...grupos.map((g) => ({
        id: `grupo-${g.id}`,
        secao: "Grupos",
        titulo: g.nome,
        emoji: g.emoji,
        acao: () => router.push(`/grupos/${g.id}`),
      })),
      ...grupos
        .filter((g) => g.id !== atual?.id)
        .flatMap((g) =>
          ABAS.slice(1).map((a) => ({
            id: `${g.id}${a.rota}`,
            secao: "Ir para",
            titulo: `${g.nome} › ${a.titulo}`,
            icone: a.icone,
            oculto: true, // so aparece quando a busca combina
            acao: () => router.push(`/grupos/${g.id}${a.rota}`),
          })),
        ),
      { id: "inicio", secao: "Geral", titulo: "Meus grupos", icone: Home, acao: () => router.push("/grupos") },
      { id: "sobre", secao: "Geral", titulo: "Sobre o projeto", icone: Info, acao: () => router.push("/sobre") },
      { id: "claro", secao: "Tema", titulo: "Tema claro", icone: Sun, acao: () => aplicarTema("claro") },
      { id: "escuro", secao: "Tema", titulo: "Tema escuro", icone: Moon, acao: () => aplicarTema("escuro") },
    ];
    const termo = simples(busca.trim());
    if (!termo) return todos.filter((i) => !i.oculto);
    return todos.filter((i) => simples(`${i.secao} ${i.titulo}`).includes(termo));
  }, [grupos, params?.id, busca, router]);

  function fechar() {
    setAberta(false);
    setBusca("");
    setIndice(0);
  }

  function executar(item) {
    fechar();
    item?.acao();
  }

  function navegar(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const passo = e.key === "ArrowDown" ? 1 : -1;
      const novo = (indice + passo + itens.length) % Math.max(itens.length, 1);
      setIndice(novo);
      lista.current?.querySelector(`[data-indice="${novo}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      executar(itens[indice]);
    }
  }

  if (!aberta) return null;

  let secaoAnterior = null;
  return (
    <dialog
      ref={dialogo}
      onClose={fechar}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/50 backdrop:backdrop-blur-sm dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Search className="size-4 text-zinc-400" />
        <input
          autoFocus
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setIndice(0);
          }}
          onKeyDown={navegar}
          placeholder="Ir para um grupo, aba ou ação..."
          aria-label="Buscar comando"
          className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
        <kbd className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-700">Esc</kbd>
      </div>

      <ul ref={lista} role="listbox" className="max-h-80 overflow-y-auto p-2">
        {itens.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">Nada encontrado.</li>}
        {itens.map((item, i) => {
          const Icone = item.icone;
          const novaSecao = item.secao !== secaoAnterior;
          secaoAnterior = item.secao;
          return (
            <li key={item.id} role="none">
              {novaSecao && (
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{item.secao}</p>
              )}
              <button
                role="option"
                aria-selected={i === indice}
                data-indice={i}
                onMouseMove={() => setIndice(i)}
                onClick={() => executar(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                  i === indice ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : ""
                }`}
              >
                {item.emoji ? (
                  <span className="w-4 text-center">{item.emoji}</span>
                ) : (
                  Icone && <Icone className="size-4 shrink-0 opacity-70" />
                )}
                <span className="flex-1 truncate">{item.titulo}</span>
                {i === indice && <CornerDownLeft className="size-3.5 opacity-60" />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-200 px-4 py-2.5 text-[11px] text-zinc-500 dark:border-zinc-800">
        <span><Tecla>↑</Tecla><Tecla>↓</Tecla> navegar</span>
        <span><Tecla>Enter</Tecla> abrir</span>
        <span>No quadro: <Tecla>N</Tecla> nova tarefa, <Tecla>/</Tecla> buscar</span>
      </div>
    </dialog>
  );
}

function Tecla({ children }) {
  return (
    <kbd className="mx-0.5 rounded border border-zinc-200 px-1 font-sans text-[10px] dark:border-zinc-700">{children}</kbd>
  );
}

// Botao do cabecalho que abre a paleta (para quem nao usa o atalho).
export function BotaoBusca() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("studyflow:paleta"))}
      className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white py-1.5 pr-1.5 pl-3 text-sm text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-600 md:inline-flex dark:border-zinc-800 dark:bg-zinc-900 dark:hover:text-zinc-300"
    >
      <Search className="size-3.5" />
      Buscar...
      <kbd className="rounded border border-zinc-200 px-1.5 text-[10px] dark:border-zinc-700">Ctrl K</kbd>
    </button>
  );
}
