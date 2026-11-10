// Classes compartilhadas para manter as telas com o mesmo visual.

export const cartao =
  "rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const campo =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-950";

export const botaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:pointer-events-none disabled:opacity-60";

export const botaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const botaoIcone =
  "inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export const rotulo = "flex flex-col gap-1.5 text-sm font-medium";

// Paleta de materias, avatares e grupos. Tons 600: texto branco legivel por cima.
export const CORES = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#7c3aed",
];

export const EMOJIS_GRUPO = [
  "📚", "💻", "🧪", "📐", "🧠", "🎨", "🌎", "⚙️",
  "📊", "🩺", "⚖️", "🎵", "🚀", "🌱", "🏗️", "✏️",
];

export const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

export function Avatar({ nome, cor, tamanho = "size-7", texto = "text-[11px]" }) {
  const iniciais = (nome ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");

  return (
    <span
      title={nome}
      style={{ backgroundColor: cor ?? CORES[0] }}
      className={`${tamanho} ${texto} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
    >
      {iniciais || "?"}
    </span>
  );
}

// Seletor de cor em bolinhas, usado em materias, perfil e grupo.
export function SeletorCor({ valor, onMudar, rotulo = "Cor" }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={rotulo}>
      {CORES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={valor === c}
          aria-label={`Cor ${c}`}
          onClick={() => onMudar(c)}
          className={`size-6 rounded-full transition hover:scale-110 ${
            valor === c ? "ring-2 ring-zinc-400 ring-offset-2 dark:ring-offset-zinc-900" : ""
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

// Janela modal com <dialog> nativo: Esc fecha, foco preso, clique fora fecha.
export function Janela({ titulo, onFechar, children, largura = "max-w-lg" }) {
  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onFechar}
      aria-label={titulo}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className={`m-auto w-[calc(100%-2rem)] ${largura} rounded-2xl bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/50 backdrop:backdrop-blur-sm dark:bg-zinc-900 dark:text-zinc-100`}
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <form method="dialog">
            <button aria-label="Fechar" className={botaoIcone}>
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </button>
          </form>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Carregando({ texto = "Carregando..." }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
      <span className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
      {texto}
    </div>
  );
}
