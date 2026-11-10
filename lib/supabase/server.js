import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Le cookies(), entao so pode ser chamado de dentro de um <Suspense>
// (Cache Components) ou de Server Actions / Route Handlers.
export async function createClient() {
  // O supabase-js usa Date.now() para checar a validade da sessao;
  // connection() marca o trecho como "na hora do pedido", fora do prerender.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component: o proxy ja renova a sessao.
          }
        },
      },
    },
  );
}
