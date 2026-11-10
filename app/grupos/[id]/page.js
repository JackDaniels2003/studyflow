import { Suspense } from "react";
import { EsqueletoQuadro } from "@/components/esqueletos";
import { contexto, listarMembros, recursos } from "@/lib/dados";
import { CAMPOS_TAREFA } from "@/lib/tarefas";
import QuadroTarefas from "./quadro-tarefas";

export default function TarefasPage({ params }) {
  return (
    <Suspense fallback={<EsqueletoQuadro />}>
      <Tarefas params={params} />
    </Suspense>
  );
}

async function Tarefas({ params }) {
  const { id } = await params;
  const { supabase, userId } = await contexto();

  const [materias, tarefas, membros, grupo, { checklist, comentarios, anexos }] = await Promise.all([
    supabase.from("subjects").select("id, nome, cor").eq("group_id", id).order("created_at"),
    supabase.from("tasks").select(CAMPOS_TAREFA).eq("group_id", id),
    listarMembros(supabase, id),
    supabase.from("groups").select("codigo").eq("id", id).maybeSingle(),
    recursos(supabase, "checklist", "comentarios", "anexos"),
  ]);

  // Quantos comentarios cada tarefa tem (para o selo 💬 no cartao).
  const contagemComentarios = {};
  if (comentarios) {
    const { data } = await supabase.from("task_comments").select("task_id").eq("group_id", id);
    for (const c of data ?? []) contagemComentarios[c.task_id] = (contagemComentarios[c.task_id] ?? 0) + 1;
  }

  // Quantos anexos cada tarefa tem (selo 📎 no cartao).
  const contagemAnexos = {};
  if (anexos) {
    const { data } = await supabase.from("files").select("task_id").eq("group_id", id).not("task_id", "is", null);
    for (const a of data ?? []) contagemAnexos[a.task_id] = (contagemAnexos[a.task_id] ?? 0) + 1;
  }

  return (
    <QuadroTarefas
      grupoId={id}
      comChecklist={checklist}
      comComentarios={comentarios}
      contagemComentarios={contagemComentarios}
      comAnexos={anexos}
      contagemAnexos={contagemAnexos}
      codigo={grupo.data?.codigo}
      userId={userId}
      membros={membros}
      materiasIniciais={materias.data ?? []}
      tarefasIniciais={tarefas.data ?? []}
    />
  );
}
