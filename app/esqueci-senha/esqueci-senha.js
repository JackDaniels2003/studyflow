"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/logo";
import { botaoPrimario, campo, cartao, rotulo } from "@/components/ui";

// Le ?expirado=1 sem useSearchParams (a pagina continua estatica).
function useLinkExpirado() {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).has("expirado"),
    () => false,
  );
}

export default function EsqueciSenha() {
  const expirado = useLinkExpirado();
  const [enviado, setEnviado] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setErro("");
    setEnviando(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?proximo=/redefinir-senha`,
    });
    setEnviando(false);
    if (error) {
      setErro(
        /rate limit/i.test(error.message)
          ? "Muitos pedidos seguidos. Espere alguns minutos e tente de novo."
          : "Não foi possível enviar o e-mail agora. Tente de novo.",
      );
      return;
    }
    setEnviado(email);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Link href="/">
        <Logo className="text-lg" />
      </Link>
      <div className={`${cartao} mt-8 w-full max-w-sm p-8`}>
        {enviado ? (
          <div className="text-center">
            <MailCheck className="mx-auto size-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-semibold">Confira seu e-mail</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Se existir uma conta com <strong className="text-zinc-700 dark:text-zinc-300">{enviado}</strong>,
              chegará um link para criar uma senha nova. Olhe também o spam.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Esqueceu a senha?</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Informe seu e-mail e enviaremos um link para criar uma nova.
            </p>
            {expirado && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                O link usado expirou ou já foi aberto. Peça um novo abaixo.
              </p>
            )}
            <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
              <label className={rotulo}>
                E-mail
                <input name="email" type="email" required autoComplete="email" className={campo} />
              </label>
              {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
              <button disabled={enviando} className={`${botaoPrimario} py-2.5`}>
                {enviando ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </>
        )}
      </div>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        <ArrowLeft className="size-4" /> Voltar para o login
      </Link>
    </main>
  );
}
