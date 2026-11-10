// Fuso fixo: servidor (Render, em UTC) e navegador formatam igual, sem erro de hidratacao.
const FUSO = "America/Sao_Paulo";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const hora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});

const diaCompleto = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const diaChave = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });

export const formatarDataHora = (iso) => dataHora.format(new Date(iso));
export const formatarHora = (iso) => hora.format(new Date(iso));
export const formatarDia = (iso) => diaCompleto.format(new Date(iso));

// "2026-10-30" no fuso de Sao Paulo, para agrupar mensagens por dia.
export const chaveDoDia = (iso) => diaChave.format(new Date(iso));

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

// "agora", "há 5 minutos", "ontem"... (sem "agora" do relogio, mostra a data).
export function formatarRelativo(iso, agora) {
  if (!agora) return formatarDataHora(iso);
  const segundos = Math.round((new Date(iso).getTime() - agora) / 1000);
  const abs = Math.abs(segundos);
  if (abs < 45) return "agora";
  if (abs < 3600) return relativo.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(segundos / 3600), "hour");
  if (abs < 7 * 86400) return relativo.format(Math.round(segundos / 86400), "day");
  return formatarDataHora(iso);
}

export function formatarTamanho(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
}

// Tempo ate (ou desde) o prazo, em texto curto: "2d 4h", "3h 12m", "45m 10s".
export function formatarRestante(ms) {
  const total = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function partesDoTempo(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    dias: Math.floor(total / 86400),
    horas: Math.floor((total % 86400) / 3600),
    minutos: Math.floor((total % 3600) / 60),
    segundos: total % 60,
  };
}

// <input type="datetime-local"> trabalha no horario local do navegador.
export function isoParaInputLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
