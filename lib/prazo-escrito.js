// Entende prazos escritos no fim do titulo, em portugues:
//   "Revisar slides amanhã 18h"  -> titulo "Revisar slides", prazo amanha 18:00
//   "Relatório até 15/11"        -> prazo 15/11 23:59
//   "Reunião segunda às 14:30"   -> proxima segunda 14:30
// Sem horario, o prazo fica para 23:59 do dia. Datas no horario local do navegador.

const DIAS = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

const PADRAO =
  /\s+(?:(?:ate|para|pra)\s+)?(hoje|depois de amanha|amanha|(?:domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+(?:as\s+)?(\d{1,2})(?:h(\d{2})?|:(\d{2})))?\s*$/;

const simples = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function extrairPrazo(texto, agora = new Date()) {
  const original = texto.trim();
  // Tirar acentos de letras ja compostas nao muda o comprimento, entao os indices batem.
  const achado = PADRAO.exec(simples(original.normalize("NFC")));
  if (!achado) return { titulo: original, prazo: null };

  const [, quando, hora, minHora, minDoisPontos] = achado;
  const temHora = hora !== undefined;
  const h = temHora ? Number(hora) : 23;
  const m = temHora ? Number(minHora ?? minDoisPontos ?? 0) : 59;
  if (h > 23 || m > 59) return { titulo: original, prazo: null };

  const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m);
  let prazo;

  if (quando === "hoje") {
    prazo = base;
  } else if (quando === "amanha") {
    prazo = somarDias(base, 1);
  } else if (quando === "depois de amanha") {
    prazo = somarDias(base, 2);
  } else if (quando.includes("/")) {
    const [dia, mes, ano] = quando.split("/").map(Number);
    const anoCheio = ano === undefined ? agora.getFullYear() : ano < 100 ? 2000 + ano : ano;
    prazo = new Date(anoCheio, mes - 1, dia, h, m);
    if (prazo.getMonth() !== mes - 1) return { titulo: original, prazo: null }; // ex.: 31/02
    if (ano === undefined && prazo < agora) prazo = new Date(anoCheio + 1, mes - 1, dia, h, m);
  } else {
    const alvo = DIAS[quando.replace("-feira", "")];
    prazo = somarDias(base, (alvo - agora.getDay() + 7) % 7);
    if (prazo < agora) prazo = somarDias(prazo, 7); // ja passou hoje: semana que vem
  }

  const titulo = original.slice(0, achado.index).trim();
  if (!titulo) return { titulo: original, prazo: null };
  return { titulo, prazo };
}

function somarDias(data, dias) {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}
