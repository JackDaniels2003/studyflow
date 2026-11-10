import { Suspense } from "react";
import { EsqueletoPainel } from "@/components/esqueletos";
import { contexto, focoDaSemana, listarMembros, recursos } from "@/lib/dados";
import { CAMPOS_TAREFA } from "@/lib/tarefas";
import Painel from "./painel";

export default function PainelPage({ params }) {
  return (
    <Suspense fallback={<EsqueletoPainel />}>
      <ConteudoPainel params={params} />
    </Suspense>
  );
}

async function ConteudoPainel({ params }) {
  const { id } = await params;
  const { supabase } = await contexto();

  const [materias, tarefas, membros, { atividade, foco }] = await Promise.all([
    supabase.from("subjects").select("id, nome, cor").eq("group_id", id).order("created_at"),
    supabase.from("tasks").select(CAMPOS_TAREFA).eq("group_id", id),
    listarMembros(supabase, id),
    recursos(supabase, "atividade", "foco"),
  ]);

  const sessoesFoco = foco ? await focoDaSemana(supabase, id) : null;

  const historico = atividade
    ? (
        await supabase
          .from("activity")
          .select("*")
          .eq("group_id", id)
          .order("created_at", { ascending: false })
          .limit(40)
      ).data
    : null;

  return (
    <Painel
      grupoId={id}
      materias={materias.data ?? []}
      tarefas={tarefas.data ?? []}
      membros={membros}
      historico={historico}
      sessoesFoco={sessoesFoco}
    />
  );
}
