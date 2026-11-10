"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CORES,
  EMOJIS_GRUPO,
  botaoPrimario,
  botaoSecundario,
  campo,
  cartao,
  sortear,
} from "@/components/ui";

export default function AcoesGrupo() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function criar(event) {
    event.preventDefault();
    const nome = String(new FormData(event.currentTarget).get("nome")).trim();
    if (!nome) return;

    setErro("");
    setOcupado(true);
    // Comeca com emoji e cor sorteados; o criador personaliza depois.
    const { data, error } = await createClient()
      .from("groups")
      .insert({ nome, emoji: sortear(EMOJIS_GRUPO), cor: sortear(CORES) })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar grupo:", error);
      setErro("Não foi possível criar o grupo. Tente de novo.");
      setOcupado(false);
      return;
    }
    router.push(`/grupos/${data.id}`);
  }

  async function entrar(event) {
    event.preventDefault();
    const codigo = String(new FormData(event.currentTarget).get("codigo")).trim();
    if (!codigo) return;

    setErro("");
    setOcupado(true);
    const { data, error } = await createClient().rpc("join_group", {
      p_codigo: codigo,
    });

    if (error) {
      setErro(
        /codigo invalido/.test(error.message)
          ? "Código de convite inválido. Confira com quem te convidou."
          : "Não foi possível entrar no grupo. Tente de novo.",
      );
      setOcupado(false);
      return;
    }
    router.push(`/grupos/${data}`);
  }

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2">
      <form onSubmit={criar} className={`${cartao} p-5`}>
        <h2 className="flex items-center gap-2 font-medium">
          <Plus className="size-4 text-indigo-600" /> Novo grupo
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            name="nome"
            required
            maxLength={60}
            placeholder="Ex.: Projeto Integrador"
            aria-label="Nome do grupo"
            className={campo}
          />
          <button disabled={ocupado} className={`${botaoPrimario} shrink-0`}>
            Criar
          </button>
        </div>
      </form>

      <form onSubmit={entrar} className={`${cartao} p-5`}>
        <h2 className="flex items-center gap-2 font-medium">
          <LogIn className="size-4 text-indigo-600" /> Entrar com código
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            name="codigo"
            required
            maxLength={12}
            placeholder="Ex.: A1B2C3"
            aria-label="Código de convite"
            className={`${campo} font-mono uppercase tracking-widest placeholder:font-sans placeholder:tracking-normal`}
          />
          <button disabled={ocupado} className={`${botaoSecundario} shrink-0`}>
            Entrar
          </button>
        </div>
      </form>

      {erro && (
        <p role="alert" className="text-sm text-red-600 md:col-span-2">
          {erro}
        </p>
      )}
    </section>
  );
}
