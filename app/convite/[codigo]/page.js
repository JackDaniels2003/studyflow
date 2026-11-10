import { Suspense } from "react";
import Logo from "@/components/logo";
import { Carregando } from "@/components/ui";
import { contexto } from "@/lib/dados";
import AceitarConvite from "./aceitar-convite";

export const metadata = { title: "Convite | StudyFlow" };

export default function ConvitePage({ params }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-transparent px-4 py-16 dark:from-indigo-500/10">
      <Logo className="text-lg" />
      <Suspense fallback={<Carregando texto="Abrindo convite..." />}>
        <Convite params={params} />
      </Suspense>
    </main>
  );
}

async function Convite({ params }) {
  const { codigo } = await params;
  const { supabase } = await contexto();

  // Previa do grupo (nome, emoji, membros) para quem ainda nao e membro.
  const { data } = await supabase.rpc("previa_convite", { p_codigo: codigo });
  const previa = Array.isArray(data) ? data[0] : data;

  return <AceitarConvite codigo={codigo.toUpperCase()} previa={previa ?? null} />;
}
