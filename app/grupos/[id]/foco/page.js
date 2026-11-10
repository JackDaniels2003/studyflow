import { Suspense } from "react";
import { Bloco } from "@/components/esqueletos";
import { contexto, listarMembros } from "@/lib/dados";
import Foco from "./foco";

export default function FocoPage({ params }) {
  return (
    <Suspense fallback={<Bloco className="h-[520px]" />}>
      <ConteudoFoco params={params} />
    </Suspense>
  );
}

async function ConteudoFoco({ params }) {
  const { id } = await params;
  const { supabase, userId } = await contexto();

  const [{ data: tarefas }, membros] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titulo")
      .eq("group_id", id)
      .neq("status", "done")
      .order("prazo", { ascending: true, nullsFirst: false }),
    listarMembros(supabase, id),
  ]);

  const eu = membros.find((m) => m.id === userId) ?? { id: userId, nome: "Você" };

  return <Foco grupoId={id} eu={eu} membros={membros} tarefas={tarefas ?? []} />;
}
