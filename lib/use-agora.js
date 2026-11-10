"use client";

import { useSyncExternalStore } from "react";

// Um unico relogio compartilhado por todas as contagens regressivas da tela.
let agora = 0;
let timer = null;
const ouvintes = new Set();

function inscrever(ouvinte) {
  ouvintes.add(ouvinte);
  if (!timer) {
    agora = Date.now();
    timer = setInterval(() => {
      agora = Date.now();
      ouvintes.forEach((avisar) => avisar());
    }, 1000);
  }
  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// Retorna null no servidor e na hidratacao; depois, o horario atual (atualiza a cada 1s).
export function useAgora() {
  return useSyncExternalStore(
    inscrever,
    () => agora || null,
    () => null,
  );
}
