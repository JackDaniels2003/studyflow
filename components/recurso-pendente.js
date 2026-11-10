import { DatabaseZap } from "lucide-react";

// Mostrado quando o banco ainda nao tem a tabela de uma funcao nova.
export default function RecursoPendente({ nome }) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-6 py-12 text-center dark:border-amber-500/30 dark:bg-amber-500/5">
      <DatabaseZap className="mx-auto size-10 text-amber-500" />
      <p className="mt-3 font-medium">{nome} precisa de uma atualização no banco</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Rode o arquivo <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">supabase/schema.sql</code>{" "}
        no SQL Editor do Supabase e recarregue a página. Nada do que já existe é apagado.
      </p>
    </div>
  );
}
