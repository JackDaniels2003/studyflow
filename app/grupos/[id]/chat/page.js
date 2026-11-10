import { Suspense } from "react";
import { Bloco } from "@/components/esqueletos";
import { contexto, listarMembros, recursos } from "@/lib/dados";
import { LIMITE_INICIAL } from "@/lib/chat";
import Chat from "./chat";

export default function ChatPage({ params }) {
  return (
    <Suspense fallback={<Bloco className="h-[440px]" />}>
      <ConteudoChat params={params} />
    </Suspense>
  );
}

async function ConteudoChat({ params }) {
  const { id } = await params;
  const { supabase, userId } = await contexto();

  const [{ data: recentes }, membros, { reacoes: comReacoes }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, user_id, texto, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: false })
      .limit(LIMITE_INICIAL),
    listarMembros(supabase, id),
    recursos(supabase, "reacoes"),
  ]);

  const mensagens = (recentes ?? []).toReversed();
  const reacoes =
    comReacoes && mensagens.length
      ? ((
          await supabase
            .from("message_reactions")
            .select("message_id, user_id, emoji")
            .eq("group_id", id)
            .in("message_id", mensagens.map((m) => m.id))
        ).data ?? [])
      : [];

  return (
    <Chat
      grupoId={id}
      userId={userId}
      membros={membros}
      mensagensIniciais={mensagens}
      comReacoes={comReacoes}
      reacoesIniciais={reacoes}
    />
  );
}
