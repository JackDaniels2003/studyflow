"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/logo";
import SeletorTema from "@/components/seletor-tema";
import { botaoPrimario, campo, rotulo } from "@/components/ui";

const MENSAGENS = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "User already registered": "Este e-mail já está cadastrado.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar.",
};

function traduzir(message) {
  if (MENSAGENS[message]) return MENSAGENS[message];
  if (/password should be at least/i.test(message)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (/rate limit/i.test(message)) {
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  }
  return message;
}

// Para onde ir depois de entrar: o ?proximo= (se for interno) ou a lista de grupos.
// Lido na hora do envio, sem useSearchParams, para a pagina continuar estatica.
function destino() {
  const proximo = new URLSearchParams(window.location.search).get("proximo");
  return proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/grupos";
}

const DESTAQUES = [
  "Tarefas por matéria com contagem regressiva",
  "Chat do grupo em tempo real",
  "Arquivos e gráficos de progresso",
];

export default function AuthForm({ modo }) {
  const cadastro = modo === "cadastro";
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    setErro("");
    setAviso("");
    setEnviando(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const senha = String(form.get("senha"));
    const supabase = createClient();

    if (cadastro) {
      const nome = String(form.get("nome")).trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });
      if (error) {
        setErro(traduzir(error.message));
      } else if (data.session) {
        router.push(destino());
        router.refresh();
        return;
      } else {
        setAviso("Conta criada! Confirme seu e-mail para entrar.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErro(traduzir(error.message));
      } else {
        router.push(destino());
        router.refresh();
        return;
      }
    }

    setEnviando(false);
  }

  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-indigo-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/60 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-500/50 blur-3xl" />
        <Link href="/" className="relative">
          <Logo variante="claro" className="text-lg" />
        </Link>
        <div className="relative">
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-balance">
            Estudar em grupo fica mais fácil quando todo mundo sabe o que falta.
          </h2>
          <ul className="mt-8 space-y-3 text-indigo-100">
            {DESTAQUES.map((texto) => (
              <li key={texto} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0" />
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200">Projeto Integrador</p>
      </aside>

      <div className="relative flex items-center justify-center px-4 py-12">
        <div className="absolute top-4 right-4">
          <SeletorTema />
        </div>
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden">
            <Logo className="text-lg" />
          </Link>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight lg:mt-0">
            {cadastro ? "Crie sua conta" : "Bem-vindo de volta"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {cadastro
              ? "Leva menos de um minuto."
              : "Entre para ver seus grupos de estudo."}
          </p>

          <form onSubmit={enviar} className="mt-8 flex flex-col gap-4">
            {cadastro && (
              <label className={rotulo}>
                Nome
                <input name="nome" required maxLength={60} autoComplete="name" className={campo} />
              </label>
            )}
            <label className={rotulo}>
              E-mail
              <input name="email" type="email" required autoComplete="email" className={campo} />
            </label>
            <label className={rotulo}>
              <span className="flex items-center justify-between">
                Senha
                {!cadastro && (
                  <Link href="/esqueci-senha" className="text-xs font-normal text-indigo-600 hover:underline dark:text-indigo-400">
                    Esqueci minha senha
                  </Link>
                )}
              </span>
              <input
                name="senha"
                type="password"
                required
                minLength={6}
                autoComplete={cadastro ? "new-password" : "current-password"}
                className={campo}
              />
            </label>

            {erro && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {erro}
              </p>
            )}
            {aviso && (
              <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
                {aviso}
              </p>
            )}

            <button type="submit" disabled={enviando} className={`${botaoPrimario} py-2.5`}>
              {enviando ? "Aguarde..." : cadastro ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {cadastro ? "Já tem conta? " : "Ainda não tem conta? "}
            <Link
              href={cadastro ? "/login" : "/cadastro"}
              onClick={(e) => {
                // Leva junto o ?proximo= (ex.: link de convite) ao trocar entre login e cadastro.
                if (window.location.search) {
                  e.preventDefault();
                  router.push((cadastro ? "/login" : "/cadastro") + window.location.search);
                }
              }}
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {cadastro ? "Entrar" : "Cadastre-se"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
