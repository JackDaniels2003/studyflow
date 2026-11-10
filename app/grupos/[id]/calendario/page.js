import { Suspense } from "react";
import { Bloco } from "@/components/esqueletos";
import { contexto, listarMembros } from "@/lib/dados";
import { CAMPOS_TAREFA } from "@/lib/tarefas";
import Calendario from "./calendario";

export default function CalendarioPage({ params }) {
  return (
    <Suspense fallback={<Bloco className="h-[560px]" />}>
      <ConteudoCalendario params={params} />
    </Suspense>
  );
}

async function ConteudoCalendario({ params }) {
  const { id } = await params;
  const { supabase, userId } = await contexto();

  const [materias, tarefas, membros, grupo] = await Promise.all([
    supabase.from("subjects").select("id, nome, cor").eq("group_id", id),
    supabase.from("tasks").select(CAMPOS_TAREFA).eq("group_id", id).not("prazo", "is", null),
    listarMembros(supabase, id),
    supabase.from("groups").select("nome").eq("id", id).maybeSingle(),
  ]);

  return (
    <Calendario
      grupoId={id}
      userId={userId}
      nomeGrupo={grupo.data?.nome ?? "StudyFlow"}
      materias={materias.data ?? []}
      tarefas={tarefas.data ?? []}
      membros={membros}
    />
  );
}
