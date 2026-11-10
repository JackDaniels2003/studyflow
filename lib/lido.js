// Ultima vez que o usuario viu o chat de cada grupo (fica no navegador).

const chave = (grupoId) => `studyflow:lido:${grupoId}`;

export function lerLido(grupoId) {
  try {
    return localStorage.getItem(chave(grupoId));
  } catch {
    return null;
  }
}

export function marcarLido(grupoId) {
  try {
    localStorage.setItem(chave(grupoId), new Date().toISOString());
  } catch {
    // Sem armazenamento: o contador so vale ate recarregar.
  }
}

// Quantas mensagens de outras pessoas chegaram depois da ultima leitura.
export async function contarNaoLidas(supabase, grupoId, userId, desde) {
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("group_id", grupoId)
    .neq("user_id", userId)
    .gt("created_at", desde);
  return count ?? 0;
}
