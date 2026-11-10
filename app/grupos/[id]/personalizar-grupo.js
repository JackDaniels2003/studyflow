"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  EMOJIS_GRUPO,
  Janela,
  SeletorCor,
  botaoIcone,
  botaoPrimario,
  botaoSecundario,
  campo,
  rotulo,
} from "@/components/ui";

export default function PersonalizarGrupo({ grupo }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Personalizar grupo"
        aria-label="Personalizar grupo"
        className={botaoIcone}
      >
        <Palette className="size-4" />
      </button>
      {aberto && <Formulario grupo={grupo} onFechar={() => setAberto(false)} />}
    </>
  );
}

function Formulario({ grupo, onFechar }) {
  const router = useRouter();
  const [nome, setNome] = useState(grupo.nome);
  const [emoji, setEmoji] = useState(grupo.emoji);
  const [cor, setCor] = useState(grupo.cor);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(event) {
    event.preventDefault();
    if (!nome.trim()) return;

    setSalvando(true);
    const { error } = await createClient()
      .from("groups")
      .update({ nome: nome.trim(), emoji, cor })
      .eq("id", grupo.id);

    if (error) {
      console.error("Erro ao personalizar grupo:", error);
      setErro("Não foi possível salvar. Tente de novo.");
      setSalvando(false);
      return;
    }
    onFechar();
    router.refresh();
  }

  return (
    <Janela titulo="Personalizar grupo" onFechar={onFechar} largura="max-w-md">
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{ backgroundColor: `${cor}14` }}
        >
          <span
            className="inline-flex size-12 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: `${cor}26` }}
          >
            {emoji}
          </span>
          <span className="truncate text-lg font-semibold">{nome || "Nome do grupo"}</span>
        </div>

        <label className={rotulo}>
          Nome
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={60}
            className={campo}
          />
        </label>

        <div className={rotulo}>
          Ícone
          <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Ícone do grupo">
            {EMOJIS_GRUPO.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={emoji === e}
                onClick={() => setEmoji(e)}
                className={`inline-flex aspect-square items-center justify-center rounded-lg text-xl transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  emoji === e ? "bg-zinc-100 ring-2 ring-indigo-500 dark:bg-zinc-800" : ""
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className={rotulo}>
          Cor
          <SeletorCor valor={cor} onMudar={setCor} rotulo="Cor do grupo" />
        </div>

        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={botaoSecundario}>
            Cancelar
          </button>
          <button disabled={salvando} className={botaoPrimario}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Janela>
  );
}
