"use client";

import { createContext, use, useCallback, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { Janela, botaoPrimario, botaoSecundario } from "@/components/ui";

const Contexto = createContext(null);

const ICONES = {
  sucesso: <CircleCheck className="size-4 text-emerald-400 dark:text-emerald-600" />,
  erro: <CircleAlert className="size-4 text-red-400 dark:text-red-600" />,
  info: <Info className="size-4 text-sky-400 dark:text-sky-600" />,
};

// Avisos rapidos (toasts) e confirmacao no visual do app, no lugar de alert/confirm.
export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [pergunta, setPergunta] = useState(null);
  const resolver = useRef(null);

  const avisar = useCallback((texto, tipo = "sucesso") => {
    const id = crypto.randomUUID();
    setAvisos((atual) => [...atual.slice(-2), { id, texto, tipo }]);
    setTimeout(() => setAvisos((atual) => atual.filter((a) => a.id !== id)), 3500);
  }, []);

  const confirmar = useCallback(
    (opcoes) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setPergunta(opcoes);
      }),
    [],
  );

  function responder(sim) {
    resolver.current?.(sim);
    resolver.current = null;
    setPergunta(null);
  }

  const valor = useMemo(() => ({ avisar, confirmar }), [avisar, confirmar]);

  return (
    <Contexto value={valor}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === "erro" ? "alert" : "status"}
            className="animar-surgir pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-white dark:text-zinc-900"
          >
            {ICONES[a.tipo]}
            {a.texto}
          </div>
        ))}
      </div>

      {pergunta && (
        <Janela titulo={pergunta.titulo} onFechar={() => responder(false)} largura="max-w-sm">
          {pergunta.texto && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{pergunta.texto}</p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => responder(false)} className={botaoSecundario}>
              Cancelar
            </button>
            <button
              autoFocus
              onClick={() => responder(true)}
              className={
                pergunta.perigo
                  ? `${botaoPrimario} bg-red-600 hover:bg-red-700 focus-visible:outline-red-600`
                  : botaoPrimario
              }
            >
              {pergunta.botao ?? "Confirmar"}
            </button>
          </div>
        </Janela>
      )}
    </Contexto>
  );
}

export function useAvisos() {
  const avisos = use(Contexto);
  if (!avisos) throw new Error("useAvisos precisa estar dentro de <AvisosProvider>");
  return avisos;
}
