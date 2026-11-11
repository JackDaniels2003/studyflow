// Modelo de Projeto Integrador: materias e tarefas tipicas, com prazos nas proximas 2 semanas.
import { novoId } from "./id.js";

const MATERIAS = [
  { chave: "doc", nome: "Documentação", cor: "#4f46e5" },
  { chave: "dev", nome: "Desenvolvimento", cor: "#059669" },
  { chave: "apr", nome: "Apresentação", cor: "#db2777" },
];

const TAREFAS = [
  { m: "doc", titulo: "Definir o tema e o problema", dias: 1, status: "done" },
  { m: "doc", titulo: "Escrever a introdução e os objetivos", dias: 4, checklist: ["Contexto", "Problema", "Objetivo geral", "Objetivos específicos"] },
  { m: "doc", titulo: "Levantar as referências bibliográficas", dias: 8 },
  { m: "dev", titulo: "Modelar o banco de dados", dias: 3, status: "doing", prioridade: "alta" },
  { m: "dev", titulo: "Protótipo das telas", dias: 6, checklist: ["Login", "Tela principal", "Cadastro"] },
  { m: "dev", titulo: "Implementar e testar as funcionalidades", dias: 10 },
  { m: "apr", titulo: "Montar os slides", dias: 12, checklist: ["Problema", "Solução", "Arquitetura", "Demonstração", "Conclusão"] },
  { m: "apr", titulo: "Ensaiar a apresentação", dias: 13 },
  { m: "apr", titulo: "Apresentação final", dias: 14, prioridade: "alta" },
];

// Cria tudo no grupo. Prazos as 23:59 do dia, responsaveis em rodizio entre os membros.
export async function criarModeloProjeto(supabase, grupoId, membros, comChecklist) {
  const { data: materias, error } = await supabase
    .from("subjects")
    .insert(MATERIAS.map(({ nome, cor }) => ({ group_id: grupoId, nome, cor })))
    .select("id, nome");
  if (error) return error;

  const idPorChave = Object.fromEntries(
    MATERIAS.map((m) => [m.chave, materias.find((x) => x.nome === m.nome)?.id]),
  );

  const hoje = new Date();
  const tarefas = TAREFAS.map((t, i) => {
    const prazo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + t.dias, 23, 59);
    return {
      group_id: grupoId,
      subject_id: idPorChave[t.m],
      titulo: t.titulo,
      status: t.status ?? "todo",
      prioridade: t.prioridade ?? "media",
      prazo: prazo.toISOString(),
      responsavel: membros.length ? membros[i % membros.length].id : null,
      ...(comChecklist &&
        t.checklist && {
          checklist: t.checklist.map((texto) => ({ id: novoId(), texto, feito: false })),
        }),
    };
  });

  const { error: erroTarefas } = await supabase.from("tasks").insert(tarefas);
  return erroTarefas ?? null;
}
