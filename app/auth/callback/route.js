import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Redireciona com caminho relativo: o navegador resolve contra o endereco onde a pessoa realmente
// esta. Atras do nginx (EC2), `request.url` aponta para localhost:3000 e quebraria o retorno.
function irPara(caminho) {
  return new NextResponse(null, { status: 307, headers: { Location: caminho } });
}

// Volta do link enviado por e-mail (ex.: redefinir senha): troca o codigo por uma sessao.
export async function GET(request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("code");
  const proximo = url.searchParams.get("proximo");
  const destino = proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/grupos";

  if (codigo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return irPara(destino);
  }

  return irPara("/esqueci-senha?expirado=1");
}
