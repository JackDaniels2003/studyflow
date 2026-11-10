"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { botaoIcone } from "@/components/ui";

// So o criador ve este botao: exclui o grupo com tudo dentro.
// (Os demais membros saem pela lista de membros.)
export default function SairDoGrupo({ grupoId, nome }) {
  const router = useRouter();
  const { avisar, confirmar } = useAvisos();

  async function excluir() {
    const sim = await confirmar({
      titulo: `Excluir "${nome}"?`,
      texto: "Tarefas, mensagens, notas e arquivos serão apagados para todos. Não dá para desfazer.",
      botao: "Excluir grupo",
      perigo: true,
    });
    if (!sim) return;

    const supabase = createClient();
    // O banco apaga as linhas em cascata, mas os arquivos do Storage nao.
    const { data: arquivos } = await supabase.from("files").select("path").eq("group_id", grupoId);
    if (arquivos?.length) {
      await supabase.storage.from("arquivos").remove(arquivos.map((a) => a.path));
    }
    const { error } = await supabase.from("groups").delete().eq("id", grupoId);
    if (error) {
      avisar("Não foi possível excluir o grupo.", "erro");
      return;
    }
    avisar("Grupo excluído", "info");
    router.push("/grupos");
    router.refresh();
  }

  return (
    <button
      onClick={excluir}
      title="Excluir grupo"
      aria-label="Excluir grupo"
      className={`${botaoIcone} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
