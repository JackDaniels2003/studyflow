// Testes das regras do app (rodam com `npm test`, usando o executor nativo do Node).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chaveDoDia,
  formatarRestante,
  formatarTamanho,
  partesDoTempo,
} from "../lib/formatos.js";
import { ordenarTarefas, progressoChecklist } from "../lib/tarefas.js";

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

describe("contagem regressiva", () => {
  it("mostra dias e horas quando falta mais de um dia", () => {
    assert.equal(formatarRestante(2 * DIA + 4 * HORA + 10 * MIN), "2d 4h");
  });

  it("mostra horas e minutos quando falta menos de um dia", () => {
    assert.equal(formatarRestante(3 * HORA + 12 * MIN), "3h 12m");
  });

  it("mostra minutos e segundos na reta final", () => {
    assert.equal(formatarRestante(45 * MIN + 10 * 1000), "45m 10s");
  });

  it("usa o valor absoluto para prazos atrasados", () => {
    assert.equal(formatarRestante(-(5 * HORA)), "5h 0m");
  });

  it("separa o tempo em dias, horas, minutos e segundos", () => {
    assert.deepEqual(partesDoTempo(DIA + 2 * HORA + 3 * MIN + 4000), {
      dias: 1,
      horas: 2,
      minutos: 3,
      segundos: 4,
    });
  });

  it("nunca fica negativo nos blocos do cronômetro", () => {
    assert.deepEqual(partesDoTempo(-1000), { dias: 0, horas: 0, minutos: 0, segundos: 0 });
  });
});

describe("ordem das tarefas", () => {
  const t = (id, prazo, prioridade = "media", created_at = "2026-01-01T00:00:00Z") => ({
    id,
    prazo,
    prioridade,
    created_at,
  });

  it("prazo mais próximo primeiro e sem prazo no fim", () => {
    const lista = [t("sem", null), t("depois", "2026-05-10T10:00:00Z"), t("antes", "2026-05-01T10:00:00Z")];
    assert.deepEqual(lista.toSorted(ordenarTarefas).map((x) => x.id), ["antes", "depois", "sem"]);
  });

  it("no mesmo prazo, prioridade alta vem antes", () => {
    const prazo = "2026-05-01T10:00:00Z";
    const lista = [t("baixa", prazo, "baixa"), t("alta", prazo, "alta"), t("media", prazo, "media")];
    assert.deepEqual(lista.toSorted(ordenarTarefas).map((x) => x.id), ["alta", "media", "baixa"]);
  });

  it("sem prazo e mesma prioridade, a mais antiga vem antes", () => {
    const lista = [t("nova", null, "media", "2026-03-02T00:00:00Z"), t("velha", null, "media", "2026-03-01T00:00:00Z")];
    assert.deepEqual(lista.toSorted(ordenarTarefas).map((x) => x.id), ["velha", "nova"]);
  });
});

describe("checklist", () => {
  it("conta itens feitos e o total", () => {
    const tarefa = { checklist: [{ feito: true }, { feito: false }, { feito: true }] };
    assert.deepEqual(progressoChecklist(tarefa), { feitos: 2, total: 3 });
  });

  it("aguenta tarefa sem checklist (banco antigo)", () => {
    assert.deepEqual(progressoChecklist({}), { feitos: 0, total: 0 });
  });
});

describe("formatação", () => {
  it("tamanho de arquivo legível", () => {
    assert.equal(formatarTamanho(512), "512 B");
    assert.equal(formatarTamanho(2048), "2 KB");
    assert.equal(formatarTamanho(5.5 * 1024 * 1024), "5,5 MB");
  });

  it("agrupa mensagens pelo dia no horário de Brasília", () => {
    // 01:30 UTC do dia 31 ainda é dia 30 em São Paulo (UTC-3).
    assert.equal(chaveDoDia("2026-10-31T01:30:00Z"), "2026-10-30");
    assert.equal(chaveDoDia("2026-10-31T03:30:00Z"), "2026-10-31");
  });
});

describe("prazo escrito no título", async () => {
  const { extrairPrazo } = await import("../lib/prazo-escrito.js");
  // Sexta-feira, 30/10/2026, 10:00 no horário local.
  const agora = new Date(2026, 9, 30, 10, 0);
  const data = (a, m, d, h, min) => new Date(a, m - 1, d, h, min).getTime();

  it("amanhã com hora", () => {
    const r = extrairPrazo("Revisar slides amanhã 18h", agora);
    assert.equal(r.titulo, "Revisar slides");
    assert.equal(r.prazo.getTime(), data(2026, 10, 31, 18, 0));
  });

  it("data com barra e 'até', sem hora = 23:59", () => {
    const r = extrairPrazo("Entregar relatório até 15/11", agora);
    assert.equal(r.titulo, "Entregar relatório");
    assert.equal(r.prazo.getTime(), data(2026, 11, 15, 23, 59));
  });

  it("dia da semana com 'às' e minutos", () => {
    const r = extrairPrazo("Reunião segunda às 14:30", agora);
    assert.equal(r.titulo, "Reunião");
    assert.equal(r.prazo.getTime(), data(2026, 11, 2, 14, 30));
  });

  it("o próprio dia da semana ainda vale se a hora não passou", () => {
    assert.equal(extrairPrazo("Ensaiar sexta", agora).prazo.getTime(), data(2026, 10, 30, 23, 59));
    assert.equal(extrairPrazo("Ensaiar sexta 8h", agora).prazo.getTime(), data(2026, 11, 6, 8, 0));
  });

  it("data que já passou no ano vai para o ano seguinte", () => {
    assert.equal(extrairPrazo("Prova 10/03", agora).prazo.getTime(), data(2027, 3, 10, 23, 59));
  });

  it("sem prazo no texto, ou data impossível, não inventa nada", () => {
    assert.deepEqual(extrairPrazo("Comprar café", agora), { titulo: "Comprar café", prazo: null });
    assert.equal(extrairPrazo("Algo 31/02", agora).prazo, null);
    assert.equal(extrairPrazo("amanhã", agora).prazo, null); // só a data, sem título
  });
});
