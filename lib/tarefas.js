// "*" em vez de lista fixa: se o banco ainda nao tiver uma coluna nova (ex.: checklist),
// a consulta continua funcionando e o recurso so fica escondido.
export const CAMPOS_TAREFA = "*";

// Progresso do checklist: { feitos, total }.
export function progressoChecklist(tarefa) {
  const itens = Array.isArray(tarefa.checklist) ? tarefa.checklist : [];
  return { feitos: itens.filter((i) => i.feito).length, total: itens.length };
}

// As cores vem de variaveis CSS (globals.css), que mudam no modo escuro.
export const STATUS = [
  { id: "todo", titulo: "A fazer", cor: "var(--status-todo)" },
  { id: "doing", titulo: "Fazendo", cor: "var(--status-doing)" },
  { id: "done", titulo: "Concluído", cor: "var(--status-done)" },
];

export const PRIORIDADES = [
  { id: "alta", titulo: "Alta", peso: 0 },
  { id: "media", titulo: "Média", peso: 1 },
  { id: "baixa", titulo: "Baixa", peso: 2 },
];

const PESO = Object.fromEntries(PRIORIDADES.map((p) => [p.id, p.peso]));

// Prazo mais proximo primeiro (sem prazo no fim); empate decide pela prioridade.
export function ordenarTarefas(a, b) {
  if (a.prazo !== b.prazo) {
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo);
  }
  const prioridade = (PESO[a.prioridade] ?? 1) - (PESO[b.prioridade] ?? 1);
  return prioridade || a.created_at.localeCompare(b.created_at);
}
