"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";

const HORA = 3600 * 1000;
const REVISAR_A_CADA = 15 * 60 * 1000;

// Avisa 1h antes do prazo das tarefas do usuario (em todos os grupos), enquanto o app esta aberto.
// Cada lembrete aparece uma vez por sessao do navegador.
export default function LembretesPrazo({ userId }) {
  const { avisar } = useAvisos();

  useEffect(() => {
    let timers = [];

    function jaAvisado(id) {
      try {
        if (sessionStorage.getItem(`studyflow:lembrete:${id}`)) return true;
        sessionStorage.setItem(`studyflow:lembrete:${id}`, "1");
      } catch {
        // sem armazenamento: pode repetir o aviso, sem problema
      }
      return false;
    }

    function lembrar(tarefa) {
      if (jaAvisado(tarefa.id)) return;
      const minutos = Math.max(1, Math.round((new Date(tarefa.prazo).getTime() - Date.now()) / 60000));
      const texto = `⏰ "${tarefa.titulo}" vence em ${minutos >= 60 ? "1 hora" : `${minutos} min`} (${tarefa.groups?.nome ?? "grupo"})`;
      avisar(texto, "info");
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        new Notification("StudyFlow · prazo chegando", { body: texto.slice(2), tag: `prazo-${tarefa.id}` });
      }
    }

    async function agendar() {
      timers.forEach(clearTimeout);
      timers = [];
      const agora = Date.now();
      const { data } = await createClient()
        .from("tasks")
        .select("id, titulo, prazo, groups(nome)")
        .eq("responsavel", userId)
        .neq("status", "done")
        .gt("prazo", new Date(agora).toISOString())
        .lte("prazo", new Date(agora + 24 * HORA).toISOString());

      for (const tarefa of data ?? []) {
        const falta = new Date(tarefa.prazo).getTime() - agora - HORA;
        if (falta <= 0) lembrar(tarefa);
        else timers.push(setTimeout(() => lembrar(tarefa), falta));
      }
    }

    agendar();
    const revisao = setInterval(agendar, REVISAR_A_CADA);
    return () => {
      clearInterval(revisao);
      timers.forEach(clearTimeout);
    };
  }, [userId, avisar]);

  return null;
}
