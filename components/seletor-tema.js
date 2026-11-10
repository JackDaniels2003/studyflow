"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

const OPCOES = [
  { id: "claro", titulo: "Tema claro", icone: Sun },
  { id: "escuro", titulo: "Tema escuro", icone: Moon },
  { id: "sistema", titulo: "Seguir o sistema", icone: Monitor },
];

const EVENTO = "studyflow:tema";

function lerTema() {
  try {
    return localStorage.getItem("tema") ?? "sistema";
  } catch {
    return "sistema";
  }
}

function aplicar(tema) {
  const escuro =
    tema === "escuro" ||
    (tema === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
}

function inscrever(avisar) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

export default function SeletorTema() {
  const tema = useSyncExternalStore(inscrever, lerTema, () => "sistema");

  // No modo "sistema", acompanha a troca de tema do computador na hora.
  useEffect(() => {
    if (tema !== "sistema") return;
    const consulta = matchMedia("(prefers-color-scheme: dark)");
    const mudou = () => aplicar("sistema");
    consulta.addEventListener("change", mudou);
    return () => consulta.removeEventListener("change", mudou);
  }, [tema]);

  // Impressao/PDF sempre no tema claro (papel branco), voltando ao tema escolhido depois.
  useEffect(() => {
    const antes = () => (document.documentElement.dataset.tema = "claro");
    const depois = () => aplicar(lerTema());
    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", depois);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", depois);
    };
  }, []);

  function escolher(novo) {
    try {
      localStorage.setItem("tema", novo);
    } catch {
      // Sem armazenamento: o tema vale so ate recarregar.
    }
    aplicar(novo);
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {OPCOES.map(({ id, titulo, icone: Icone }) => (
        <button
          key={id}
          role="radio"
          aria-checked={tema === id}
          title={titulo}
          aria-label={titulo}
          onClick={() => escolher(id)}
          className={`inline-flex size-7 items-center justify-center rounded-md transition ${
            tema === id
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <Icone className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
