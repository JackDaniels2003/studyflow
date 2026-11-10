"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import Logo from "@/components/logo";
import { botaoPrimario, campo, cartao, rotulo } from "@/components/ui";

// Chega aqui logado pelo link do e-mail (/auth/callback) e define a senha nova.
export default function RedefinirSenha() {
  const router = useRouter();
  const { avisar } = useAvisos();
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const senha = String(form.get("senha"));
    if (senha !== String(form.get("confirmacao"))) {
      setErro("As duas senhas não são iguais.");
      return;
    }
    setErro("");
    setSalvando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) {
      setErro(
        /different from the old/i.test(error.message)
          ? "A senha nova precisa ser diferente da antiga."
          : "Não foi possível salvar a senha. Tente de novo.",
      );
      setSalvando(false);
      return;
    }
    avisar("Senha alterada!");
    router.push("/grupos");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Logo className="text-lg" />
      <form onSubmit={salvar} className={`${cartao} mt-8 flex w-full max-w-sm flex-col gap-4 p-8`}>
        <KeyRound className="size-8 text-indigo-600" />
        <div>
          <h1 className="text-xl font-semibold">Crie uma senha nova</h1>
          <p className="mt-1 text-sm text-zinc-500">Pelo menos 6 caracteres.</p>
        </div>
        <label className={rotulo}>
          Nova senha
          <input name="senha" type="password" required minLength={6} autoComplete="new-password" className={campo} />
        </label>
        <label className={rotulo}>
          Repita a senha
          <input name="confirmacao" type="password" required minLength={6} autoComplete="new-password" className={campo} />
        </label>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button disabled={salvando} className={`${botaoPrimario} py-2.5`}>
          {salvando ? "Salvando..." : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
