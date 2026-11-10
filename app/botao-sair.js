"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { botaoIcone } from "@/components/ui";

export default function BotaoSair() {
  const router = useRouter();

  async function sair() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={sair} title="Sair" aria-label="Sair" className={botaoIcone}>
      <LogOut className="size-4" />
    </button>
  );
}
