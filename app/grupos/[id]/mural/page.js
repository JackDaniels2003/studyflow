import { Suspense } from "react";
import RecursoPendente from "@/components/recurso-pendente";
import { EsqueletoGrade } from "@/components/esqueletos";
import { contexto, listarMembros, recursos } from "@/lib/dados";
import Mural from "./mural";

export default function MuralPage({ params }) {
  return (
    <Suspense fallback={<EsqueletoGrade />}>
      <ConteudoMural params={params} />
    </Suspense>
  );
}

async function ConteudoMural({ params }) {
  const { id } = await params;
  const { supabase, userId } = await contexto();

  const { mural, enquete } = await recursos(supabase, "mural", "enquete");
  if (!mural) return <RecursoPendente nome="O mural" />;

  const [{ data: notas }, membros, votos] = await Promise.all([
    supabase.from("notes").select("*").eq("group_id", id),
    listarMembros(supabase, id),
    enquete ? supabase.from("poll_votes").select("note_id, user_id, opcao").eq("group_id", id) : { data: [] },
  ]);

  return (
    <Mural
      grupoId={id}
      userId={userId}
      membros={membros}
      notasIniciais={notas ?? []}
      comEnquete={enquete}
      votosIniciais={votos.data ?? []}
    />
  );
}
