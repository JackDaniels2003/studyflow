// Envio de arquivos para o Storage + registro na tabela (aba Arquivos e anexos de tarefa).

export const LIMITE_ARQUIVO = 50 * 1024 * 1024; // limite por arquivo do plano gratis do Supabase
export const CAMPOS_ARQUIVO = "*";

// O Storage so aceita nomes simples no caminho; o nome original fica na tabela.
export function nomeSeguro(nome) {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(-100) || "arquivo"
  );
}

// Sobe para o Storage e registra na tabela; se o registro falhar, remove o upload.
export async function enviarArquivo(supabase, { grupoId, arquivo, taskId = null }) {
  const path = `${grupoId}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
  const upload = await supabase.storage
    .from("arquivos")
    .upload(path, arquivo, { contentType: arquivo.type || undefined });
  if (upload.error) return { error: upload.error };

  const { data, error } = await supabase
    .from("files")
    .insert({
      group_id: grupoId,
      nome: arquivo.name,
      path,
      tamanho: arquivo.size,
      tipo: arquivo.type || null,
      ...(taskId && { task_id: taskId }),
    })
    .select(CAMPOS_ARQUIVO)
    .single();

  if (error) await supabase.storage.from("arquivos").remove([path]);
  return { data, error };
}

export async function baixarArquivo(supabase, arquivo) {
  const { data, error } = await supabase.storage
    .from("arquivos")
    .createSignedUrl(arquivo.path, 60, { download: arquivo.nome });
  if (!error) window.location.assign(data.signedUrl);
  return error;
}

// Traduz os erros mais comuns em algo que o usuario entende.
export function explicarErro(error) {
  const msg = error?.message ?? "";
  if (/schema cache|column/i.test(msg)) {
    return "O banco está desatualizado: rode o supabase/schema.sql de novo no Supabase.";
  }
  if (/row-level security|unauthorized|403/i.test(msg)) {
    return "Você não tem permissão para enviar neste grupo.";
  }
  if (/exceeded|too large|payload/i.test(msg)) {
    return "O arquivo é grande demais.";
  }
  return "Tente de novo.";
}
