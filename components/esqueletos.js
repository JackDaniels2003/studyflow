// Contornos pulsando no formato da tela que esta carregando.

export function Bloco({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70 ${className}`} />;
}

export function EsqueletoQuadro() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando tarefas">
      <Bloco className="h-28" />
      <div className="flex gap-2">
        {/* classes escritas por inteiro: o Tailwind nao gera nomes montados em tempo de execucao */}
        {["w-16", "w-24", "w-20"].map((w) => (
          <Bloco key={w} className={`h-8 ${w} rounded-full`} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[3, 2, 1].map((n, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl bg-zinc-100/60 p-3 dark:bg-zinc-900/50">
            <Bloco className="h-5 w-24 rounded-md" />
            {Array.from({ length: n }, (_, j) => (
              <Bloco key={j} className="h-24 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoLista({ linhas = 5 }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bloco className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Bloco className="h-3.5 w-1/2 rounded-md" />
            <Bloco className="h-3 w-1/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EsqueletoGrade({ itens = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: itens }, (_, i) => (
        <Bloco key={i} className={i % 3 === 1 ? "h-44" : "h-32"} />
      ))}
    </div>
  );
}

export function EsqueletoPainel() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando progresso">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Bloco className="h-52 lg:row-span-2" />
        <Bloco className="h-24" />
        <Bloco className="h-24" />
        <Bloco className="h-24" />
        <Bloco className="h-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Bloco className="h-64" />
        <Bloco className="h-64" />
      </div>
    </div>
  );
}

export function EsqueletoCabecalhoGrupo() {
  return (
    <div aria-busy="true" aria-label="Carregando grupo">
      <Bloco className="h-4 w-24 rounded-md" />
      <div className="mt-4 flex items-center gap-4">
        <Bloco className="size-14" />
        <div className="flex flex-col gap-2">
          <Bloco className="h-7 w-56 rounded-lg" />
          <Bloco className="h-5 w-32 rounded-full" />
        </div>
      </div>
      <Bloco className="mt-6 h-10 rounded-lg" />
    </div>
  );
}
