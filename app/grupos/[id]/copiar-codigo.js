"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Link2, RefreshCw, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { Janela, botaoPrimario, botaoSecundario } from "@/components/ui";
import { copiarTexto } from "@/lib/copiar";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I, que confundem

function novoCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

// Botao "Convidar": link para copiar, codigo e (para o criador) gerar um codigo novo.
export default function CopiarCodigo({ grupoId, codigo, criador }) {
  const router = useRouter();
  const { avisar, confirmar } = useAvisos();
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(null);
  const origem = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const link = `${origem}/convite/${codigo}`;

  async function copiar(texto, qual) {
    if (await copiarTexto(texto)) {
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } else {
      avisar("Não deu para copiar. Selecione e copie manualmente.", "erro");
    }
  }

  async function gerarNovo() {
    const sim = await confirmar({
      titulo: "Gerar novo código?",
      texto: "O link e o código atuais param de funcionar. Quem já está no grupo continua.",
      botao: "Gerar novo",
    });
    if (!sim) return;
    const supabase = createClient();
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const { error } = await supabase.from("groups").update({ codigo: novoCodigo() }).eq("id", grupoId);
      if (!error) {
        avisar("Novo código gerado");
        router.refresh();
        return;
      }
    }
    avisar("Não foi possível gerar um novo código.", "erro");
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className={botaoPrimario}>
        <UserPlus className="size-4" /> Convidar
      </button>

      {aberto && (
        <Janela titulo="Convidar para o grupo" onFechar={() => setAberto(false)} largura="max-w-md">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Mande o link no grupo da turma. Quem abrir entra direto (fazendo login ou criando conta).
          </p>

          <div className="mt-4 flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              aria-label="Link de convite"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button onClick={() => copiar(link, "link")} className={botaoPrimario}>
              {copiado === "link" ? <Check className="size-4" /> : <Link2 className="size-4" />}
              {copiado === "link" ? "Copiado" : "Copiar"}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <div>
              <p className="text-xs text-zinc-500">Ou passe o código</p>
              <p className="font-mono text-2xl font-semibold tracking-[0.3em]">{codigo}</p>
            </div>
            <button onClick={() => copiar(codigo, "codigo")} className={botaoSecundario}>
              {copiado === "codigo" ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
              {copiado === "codigo" ? "Copiado" : "Copiar"}
            </button>
          </div>

          {criador && (
            <button
              onClick={gerarNovo}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <RefreshCw className="size-3.5" /> Gerar novo código (invalida o atual)
            </button>
          )}
        </Janela>
      )}
    </>
  );
}
