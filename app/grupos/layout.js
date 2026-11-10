import Link from "next/link";
import { Suspense } from "react";
import Logo from "@/components/logo";
import PaletaComandos, { BotaoBusca } from "@/components/paleta-comandos";
import SeletorTema from "@/components/seletor-tema";
import { contexto } from "@/lib/dados";
import LembretesPrazo from "./lembretes-prazo";
import MenuUsuario from "./menu-usuario";

export default function AreaLogadaLayout({ children }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 print:hidden border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/grupos">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <BotaoBusca />
            <Suspense fallback={null}>
              <PaletaComandos />
            </Suspense>
            <SeletorTema />
            <Suspense fallback={<span className="size-8" />}>
              <Usuario />
            </Suspense>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

async function Usuario() {
  const { supabase, userId } = await contexto();
  if (!userId) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, cor")
    .eq("id", userId)
    .single();

  return (
    <>
      <MenuUsuario userId={userId} nome={perfil?.nome ?? ""} cor={perfil?.cor} />
      <LembretesPrazo userId={userId} />
    </>
  );
}
