import { createClient } from "@/lib/supabase/server";

// Cliente + id do usuario logado. O proxy ja barrou quem nao esta logado.
export async function contexto() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

// Descobre se o banco ja tem as tabelas/colunas das funcoes mais novas
// (enquanto o schema.sql atualizado nao roda, essas funcoes ficam escondidas).
const SONDAS = {
  checklist: (s) => s.from("tasks").select("checklist").limit(0),
  mural: (s) => s.from("notes").select("id").limit(0),
  atividade: (s) => s.from("activity").select("id").limit(0),
  reacoes: (s) => s.from("message_reactions").select("emoji").limit(0),
  foco: (s) => s.from("focus_sessions").select("id").limit(0),
  enquete: (s) => s.from("poll_votes").select("opcao").limit(0),
  comentarios: (s) => s.from("task_comments").select("id").limit(0),
  anexos: (s) => s.from("files").select("task_id").limit(0),
};

export async function recursos(supabase, ...nomes) {
  const resultados = await Promise.all(nomes.map((nome) => SONDAS[nome](supabase)));
  return Object.fromEntries(nomes.map((nome, i) => [nome, !resultados[i].error]));
}

export async function listarMembros(supabase, grupoId) {
  const { data } = await supabase
    .from("group_members")
    .select("user_id, profiles(nome, cor)")
    .eq("group_id", grupoId)
    .order("created_at");

  return (data ?? []).map((m) => ({
    id: m.user_id,
    nome: m.profiles?.nome ?? "Membro",
    cor: m.profiles?.cor,
  }));
}

// Sessoes de foco dos ultimos 7 dias (para o ranking do painel).
export async function focoDaSemana(supabase, grupoId) {
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("focus_sessions")
    .select("user_id, minutos")
    .eq("group_id", grupoId)
    .gte("created_at", seteDiasAtras);
  return data ?? [];
}
