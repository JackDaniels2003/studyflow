"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import {
  Avatar,
  Janela,
  SeletorCor,
  botaoPrimario,
  botaoSecundario,
  campo,
  rotulo,
} from "@/components/ui";
import BotaoSair from "../botao-sair";

export default function MenuUsuario({ userId, nome, cor }) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEditando(true)}
        title="Editar perfil"
        className="flex items-center gap-2 rounded-full py-0.5 pr-3 pl-0.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <Avatar nome={nome} cor={cor} />
        <span className="hidden max-w-32 truncate sm:inline">{nome}</span>
      </button>
      <BotaoSair />
      {editando && (
        <EditarPerfil
          userId={userId}
          nome={nome}
          cor={cor}
          onFechar={() => setEditando(false)}
        />
      )}
    </div>
  );
}

function EditarPerfil({ userId, nome, cor, onFechar }) {
  const router = useRouter();
  const [novoNome, setNovoNome] = useState(nome);
  const [novaCor, setNovaCor] = useState(cor ?? "#4f46e5");
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { avisar } = useAvisos();

  async function salvar(event) {
    event.preventDefault();
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) return;

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nomeLimpo, cor: novaCor })
      .eq("id", userId);

    if (error) {
      console.error("Erro ao salvar perfil:", error);
      setErro("Não foi possível salvar. Tente de novo.");
      setSalvando(false);
      return;
    }

    if (novaSenha) {
      const { error: erroSenha } = await supabase.auth.updateUser({ password: novaSenha });
      if (erroSenha) {
        setErro(
          /different from the old/i.test(erroSenha.message)
            ? "Perfil salvo, mas a senha nova precisa ser diferente da atual."
            : "Perfil salvo, mas não foi possível trocar a senha.",
        );
        setSalvando(false);
        return;
      }
    }

    avisar(novaSenha ? "Perfil e senha atualizados" : "Perfil atualizado");
    onFechar();
    router.refresh();
  }

  return (
    <Janela titulo="Seu perfil" onFechar={onFechar} largura="max-w-sm">
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          <Avatar nome={novoNome || "?"} cor={novaCor} tamanho="size-16" texto="text-xl" />
          <p className="text-xs text-zinc-500">É assim que o grupo vê você</p>
        </div>

        <label className={rotulo}>
          Nome
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            required
            maxLength={60}
            className={campo}
          />
        </label>

        <div className={rotulo}>
          Cor do avatar
          <SeletorCor valor={novaCor} onMudar={setNovaCor} rotulo="Cor do avatar" />
        </div>

        <label className={rotulo}>
          <span>
            Nova senha <span className="font-normal text-zinc-400">(deixe em branco para manter)</span>
          </span>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            className={campo}
          />
        </label>

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
