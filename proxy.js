import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Publicas: abrem sem login (e quem esta logado vai direto para /grupos).
const ROTAS_PUBLICAS = ["/", "/login", "/cadastro", "/esqueci-senha"];
// Livres: abrem com ou sem login, sem redirecionar.
const ROTAS_LIVRES = ["/auth/callback", "/sobre"];

export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Valida o JWT e renova a sessao se estiver perto de expirar.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const publica = ROTAS_PUBLICAS.includes(pathname);
  if (ROTAS_LIVRES.includes(pathname)) return response;

  // Quem cai numa pagina protegida sem login volta para ela depois de entrar.
  if (!logado && !publica) {
    const proximo = encodeURIComponent(pathname + request.nextUrl.search);
    return redirecionar(request, `/login?proximo=${proximo}`, response);
  }
  if (logado && publica) {
    const proximo = destinoSeguro(request.nextUrl.searchParams.get("proximo"));
    return redirecionar(request, proximo ?? "/grupos", response);
  }

  return response;
}

// So aceita caminhos internos ("/grupos/..."), nunca outro site.
function destinoSeguro(caminho) {
  return caminho?.startsWith("/") && !caminho.startsWith("//") ? caminho : null;
}

// Mantem os cookies de sessao renovados tambem nos redirects.
function redirecionar(request, destino, response) {
  const redirect = NextResponse.redirect(new URL(destino, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
