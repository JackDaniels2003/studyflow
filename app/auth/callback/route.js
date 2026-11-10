import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Volta do link enviado por e-mail (ex.: redefinir senha): troca o codigo por uma sessao.
export async function GET(request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("code");
  const proximo = url.searchParams.get("proximo");
  const destino = proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/grupos";

  if (codigo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }

  return NextResponse.redirect(new URL("/esqueci-senha?expirado=1", url.origin));
}
