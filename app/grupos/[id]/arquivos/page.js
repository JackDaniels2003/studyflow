import { Suspense } from "react";
import { EsqueletoLista } from "@/components/esqueletos";
import { contexto, listarMembros } from "@/lib/dados";
import Arquivos from "./arquivos";

export default function ArquivosPage({ params }) {
  return (
    <Suspense fallback={<EsqueletoLista />}>
      <ConteudoArquivos params={params} />
    </Suspense>
  );
}

async function ConteudoArquivos({ params }) {
  const { id } = await params;
  const { supabase, userId } = await contexto();

  const [{ data: arquivos }, membros, { data: tarefas }] = await Promise.all([
    supabase
      .from("files")
      .select("*")
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
    listarMembros(supabase, id),
    supabase.from("tasks").select("id, titulo").eq("group_id", id),
  ]);

  return (
    <Arquivos
      grupoId={id}
      userId={userId}
      membros={membros}
      tarefas={tarefas ?? []}
      arquivosIniciais={arquivos ?? []}
    />
  );
}
