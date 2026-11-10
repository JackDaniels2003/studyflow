"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, LogOut, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { Avatar, Janela, botaoSecundario } from "@/components/ui";

// Pilha de avatares que abre a lista de membros (criador remove; os demais saem).
export default function Membros({ grupo, membros, userId }) {
  const router = useRouter();
  const { avisar, confirmar } = useAvisos();
  const [aberto, setAberto] = useState(false);
  const [online, setOnline] = useState([]);
  const souCriador = grupo.criado_por === userId;

  // Presenca do grupo inteiro: quem esta com qualquer aba do grupo aberta agora.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase.channel(`online-${grupo.id}`, { config: { presence: { key: userId } } });
    canal
      .on("presence", { event: "sync" }, () => setOnline(Object.keys(canal.presenceState())))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") canal.track({ desde: new Date().toISOString() });
      });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupo.id, userId]);

  const estaOnline = (id) => id === userId || online.includes(id);
  const outrosOnline = membros.filter((m) => m.id !== userId && online.includes(m.id)).length;

  async function remover(membro) {
    const sim = await confirmar({
      titulo: `Remover ${membro.nome.split(" ")[0]}?`,
      texto: "A pessoa perde o acesso ao grupo. Ela pode voltar com um convite novo.",
      botao: "Remover",
      perigo: true,
    });
    if (!sim) return;
    const { error, count } = await createClient()
      .from("group_members")
      .delete({ count: "exact" })
      .eq("group_id", grupo.id)
      .eq("user_id", membro.id);
    if (error || count === 0) {
      avisar("Não foi possível remover. Rode o supabase/schema.sql atualizado no Supabase.", "erro");
      return;
    }
    avisar(`${membro.nome.split(" ")[0]} foi removido do grupo`, "info");
    router.refresh();
  }

  async function sair() {
    const sim = await confirmar({
      titulo: "Sair do grupo?",
      texto: "Você pode voltar depois com o link ou o código de convite.",
      botao: "Sair",
      perigo: true,
    });
    if (!sim) return;
    const { error } = await createClient()
      .from("group_members")
      .delete()
      .eq("group_id", grupo.id)
      .eq("user_id", userId);
    if (error) {
      avisar("Não foi possível sair agora.", "erro");
      return;
    }
    router.push("/grupos");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="mt-1.5 flex items-center gap-2 rounded-full py-0.5 pr-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="Ver membros"
      >
        <span className="flex -space-x-2">
          {membros.slice(0, 6).map((m) => (
            <span key={m.id} className="relative rounded-full ring-2 ring-[var(--background)]">
              <Avatar nome={m.nome} cor={m.cor} tamanho="size-6" texto="text-[10px]" />
              {m.id !== userId && online.includes(m.id) && (
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--background)]" />
              )}
            </span>
          ))}
        </span>
        <span className="text-sm text-zinc-500">
          {membros.length} {membros.length === 1 ? "membro" : "membros"}
          {outrosOnline > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400"> · {outrosOnline} online</span>
          )}
        </span>
      </button>

      {aberto && (
        <Janela titulo="Membros do grupo" onFechar={() => setAberto(false)} largura="max-w-md">
          <ul className="-mx-2 flex flex-col">
            {membros.map((m) => {
              const criador = m.id === grupo.criado_por;
              const eu = m.id === userId;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <span className="relative">
                    <Avatar nome={m.nome} cor={m.cor} tamanho="size-9" texto="text-xs" />
                    {estaOnline(m.id) && (
                      <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.nome}
                      {eu && <span className="font-normal text-zinc-400"> (você)</span>}
                    </p>
                    {!eu && estaOnline(m.id) && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">online agora</p>
                    )}
                    {criador && (
                      <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <Crown className="size-3" /> Criou o grupo
                      </p>
                    )}
                  </div>
                  {souCriador && !eu && (
                    <button
                      onClick={() => remover(m)}
                      title={`Remover ${m.nome}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <UserMinus className="size-3.5" /> Remover
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {!souCriador && (
            <button onClick={sair} className={`${botaoSecundario} mt-4 w-full hover:text-red-600`}>
              <LogOut className="size-4" /> Sair do grupo
            </button>
          )}
        </Janela>
      )}
    </>
  );
}
