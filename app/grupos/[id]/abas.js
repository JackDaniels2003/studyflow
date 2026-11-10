"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  FolderOpen,
  ListChecks,
  MessagesSquare,
  StickyNote,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { contarNaoLidas, lerLido, marcarLido } from "@/lib/lido";

const ABAS = [
  { rota: "", titulo: "Tarefas", icone: ListChecks },
  { rota: "/calendario", titulo: "Calendário", icone: CalendarDays },
  { rota: "/chat", titulo: "Chat", icone: MessagesSquare },
  { rota: "/mural", titulo: "Mural", icone: StickyNote },
  { rota: "/arquivos", titulo: "Arquivos", icone: FolderOpen },
  { rota: "/foco", titulo: "Foco", icone: Timer },
  { rota: "/painel", titulo: "Progresso", icone: BarChart3 },
];

// A aba ativa usa a cor do grupo; o Chat mostra quantas mensagens chegaram desde a ultima visita.
export default function Abas({ grupoId, userId, nomeGrupo, cor }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/grupos/${grupoId}`;
  const noChat = pathname === `${base}/chat`;
  const [contador, setContador] = useState(0);
  const noChatRef = useRef(noChat);

  // Ao sair do chat (ou abrir o grupo), conta o que chegou depois da ultima leitura.
  useEffect(() => {
    noChatRef.current = noChat;
    if (noChat) {
      marcarLido(grupoId);
      return;
    }
    const lido = lerLido(grupoId);
    if (!lido) {
      marcarLido(grupoId);
      return;
    }
    let ativo = true;
    contarNaoLidas(createClient(), grupoId, userId, lido).then((n) => ativo && setContador(n));
    return () => {
      ativo = false;
    };
  }, [noChat, grupoId, userId]);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`avisos-${grupoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${grupoId}` },
        ({ new: msg }) => {
          if (msg.user_id === userId) return;
          if (noChatRef.current) marcarLido(grupoId);
          else setContador((c) => c + 1);

          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            (document.hidden || !noChatRef.current)
          ) {
            const aviso = new Notification(`Nova mensagem em ${nomeGrupo}`, {
              body: msg.texto.slice(0, 120),
              tag: `studyflow-${grupoId}`,
            });
            aviso.onclick = () => {
              window.focus();
              router.push(`/grupos/${grupoId}/chat`);
            };
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupoId, userId, nomeGrupo, router]);

  const naoLidas = noChat ? 0 : contador;

  return (
    <nav className="mt-6 flex gap-1 print:hidden overflow-x-auto border-b border-zinc-200 [scrollbar-width:none] max-lg:pr-8 max-lg:[mask-image:linear-gradient(to_right,black_85%,transparent)] dark:border-zinc-800">
      {ABAS.map(({ rota, titulo, icone: Icone }) => {
        const href = base + rota;
        const ativa = pathname === href;
        const badge = rota === "/chat" && naoLidas > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativa ? "page" : undefined}
            style={ativa ? { borderColor: cor, color: cor } : undefined}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              ativa
                ? "dark:brightness-150"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Icone className="size-4" />
            {titulo}
            {badge && (
              <span
                aria-label={`${naoLidas} mensagens não lidas`}
                className="animar-surgir inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] leading-5 font-semibold text-white tabular-nums"
              >
                {naoLidas > 99 ? "99+" : naoLidas}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
