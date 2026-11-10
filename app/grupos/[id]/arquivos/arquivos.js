"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Presentation,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/avisos";
import { LIMITE_ARQUIVO, baixarArquivo, enviarArquivo, explicarErro } from "@/lib/arquivos";
import { botaoIcone, cartao } from "@/components/ui";
import { formatarDataHora, formatarTamanho } from "@/lib/formatos";


export default function Arquivos({ grupoId, userId, membros, tarefas = [], arquivosIniciais }) {
  const { avisar, confirmar } = useAvisos();
  const [arquivos, setArquivos] = useState(arquivosIniciais);
  const [enviando, setEnviando] = useState([]);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const input = useRef(null);
  const nomePorId = Object.fromEntries(membros.map((m) => [m.id, m.nome]));
  const tarefaPorId = Object.fromEntries(tarefas.map((t) => [t.id, t.titulo]));

  // Arquivos enviados ou apagados por outros membros aparecem/somem na hora.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`arquivos-${grupoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "files", filter: `group_id=eq.${grupoId}` },
        ({ new: novo }) =>
          setArquivos((atual) => (atual.some((a) => a.id === novo.id) ? atual : [novo, ...atual])),
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "files" }, ({ old }) =>
        setArquivos((atual) => atual.filter((a) => a.id !== old.id)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupoId]);

  async function enviar(lista) {
    const selecionados = [...lista];
    if (selecionados.length === 0) return;
    setErro("");

    const grandes = selecionados.filter((f) => f.size > LIMITE_ARQUIVO);
    if (grandes.length) {
      setErro(`Arquivo acima de 50 MB não é aceito: ${grandes.map((f) => f.name).join(", ")}`);
    }

    const supabase = createClient();
    await Promise.all(
      selecionados
        .filter((f) => f.size <= LIMITE_ARQUIVO)
        .map(async (arquivo) => {
          setEnviando((atual) => [...atual, arquivo.name]);
          const { data, error } = await enviarArquivo(supabase, { grupoId, arquivo });
          setEnviando((atual) => atual.filter((n) => n !== arquivo.name));
          if (error) {
            console.error(`Erro ao enviar "${arquivo.name}":`, error);
            setErro(`Não foi possível enviar "${arquivo.name}". ${explicarErro(error)}`);
            return;
          }
          setArquivos((atual) => (atual.some((a) => a.id === data.id) ? atual : [data, ...atual]));
          avisar(`"${arquivo.name}" enviado`);
        }),
    );
  }

  // Abre no navegador (PDF, imagem) em vez de baixar. A aba abre antes do await
  // para o bloqueador de pop-up nao barrar.
  async function abrir(arquivo) {
    const aba = window.open("", "_blank");
    const { data, error } = await createClient()
      .storage.from("arquivos")
      .createSignedUrl(arquivo.path, 300);
    if (error || !aba) {
      aba?.close();
      setErro("Não foi possível abrir o arquivo.");
      return;
    }
    aba.location.replace(data.signedUrl);
  }

  async function baixar(arquivo) {
    if (await baixarArquivo(createClient(), arquivo)) setErro("Não foi possível baixar o arquivo.");
  }

  async function excluir(arquivo) {
    const sim = await confirmar({
      titulo: "Excluir arquivo?",
      texto: `"${arquivo.nome}" será apagado para todo o grupo.`,
      botao: "Excluir",
      perigo: true,
    });
    if (!sim) return;
    const supabase = createClient();
    const { error } = await supabase.storage.from("arquivos").remove([arquivo.path]);
    if (error) {
      setErro("Não foi possível excluir o arquivo.");
      return;
    }
    await supabase.from("files").delete().eq("id", arquivo.id);
    setArquivos((atual) => atual.filter((a) => a.id !== arquivo.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          enviar(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          arrastando
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
            : "border-zinc-300 hover:border-indigo-400 hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
        }`}
      >
        <UploadCloud className={`size-10 ${arrastando ? "text-indigo-500" : "text-zinc-400"}`} />
        <p className="mt-3 font-medium">
          Arraste arquivos aqui ou <span className="text-indigo-600 dark:text-indigo-400">clique para escolher</span>
        </p>
        <p className="mt-1 text-sm text-zinc-500">PDF, slides, planilhas, imagens... até 50 MB cada</p>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          enviar(e.target.files);
          e.target.value = "";
        }}
      />

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {erro}
        </p>
      )}

      <section className={cartao}>
        <h2 className="border-b border-zinc-200/80 px-5 py-3 text-sm font-semibold dark:border-zinc-800">
          Arquivos do grupo <span className="font-normal text-zinc-400">{arquivos.length}</span>
        </h2>

        {enviando.map((nome) => (
          <div key={nome} className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3 text-sm dark:border-zinc-800/60">
            <span className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
            Enviando {nome}...
          </div>
        ))}

        {arquivos.length === 0 && enviando.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center text-zinc-500">
            <FolderOpen className="size-10 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">Nenhum arquivo ainda</p>
            <p className="text-sm">Os arquivos enviados aparecem aqui para todo o grupo.</p>
          </div>
        ) : (
          <ul>
            {arquivos.map((arquivo) => {
              const { icone: Icone, cor } = iconeDoArquivo(arquivo);
              return (
                <li
                  key={arquivo.id}
                  className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3 last:border-0 dark:border-zinc-800/60"
                >
                  <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${cor}`}>
                    <Icone className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => baixar(arquivo)}
                      className="block max-w-full truncate text-left text-sm font-medium hover:text-indigo-600 hover:underline"
                    >
                      {arquivo.nome}
                    </button>
                    <p className="truncate text-xs text-zinc-500">
                      {formatarTamanho(arquivo.tamanho)}
                      {arquivo.tamanho != null && " · "}
                      {arquivo.user_id === userId ? "você" : (nomePorId[arquivo.user_id] ?? "membro")}
                      {" · "}
                      {formatarDataHora(arquivo.created_at)}
                      {arquivo.task_id && tarefaPorId[arquivo.task_id] && (
                        <span className="text-indigo-600 dark:text-indigo-400"> · 📎 {tarefaPorId[arquivo.task_id]}</span>
                      )}
                    </p>
                  </div>
                  {podeVisualizar(arquivo) && (
                    <button onClick={() => abrir(arquivo)} title="Abrir" aria-label={`Abrir ${arquivo.nome}`} className={botaoIcone}>
                      <Eye className="size-4" />
                    </button>
                  )}
                  <button onClick={() => baixar(arquivo)} title="Baixar" aria-label={`Baixar ${arquivo.nome}`} className={botaoIcone}>
                    <Download className="size-4" />
                  </button>
                  {arquivo.user_id === userId && (
                    <button
                      onClick={() => excluir(arquivo)}
                      title="Excluir"
                      aria-label={`Excluir ${arquivo.nome}`}
                      className={`${botaoIcone} hover:text-red-600`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function podeVisualizar({ nome, tipo }) {
  return (
    tipo?.startsWith("image/") ||
    tipo?.startsWith("video/") ||
    tipo === "application/pdf" ||
    /\.(pdf|png|jpe?g|gif|webp|txt)$/i.test(nome)
  );
}

function iconeDoArquivo({ nome, tipo }) {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  if (tipo?.startsWith("image/"))
    return { icone: FileImage, cor: "bg-pink-50 text-pink-600 dark:bg-pink-500/10" };
  if (ext === "pdf")
    return { icone: FileText, cor: "bg-red-50 text-red-600 dark:bg-red-500/10" };
  if (["ppt", "pptx", "key", "odp"].includes(ext))
    return { icone: Presentation, cor: "bg-orange-50 text-orange-600 dark:bg-orange-500/10" };
  if (["xls", "xlsx", "csv", "ods"].includes(ext))
    return { icone: FileSpreadsheet, cor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" };
  if (["doc", "docx", "txt", "md", "odt", "rtf"].includes(ext))
    return { icone: FileText, cor: "bg-blue-50 text-blue-600 dark:bg-blue-500/10" };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return { icone: FileArchive, cor: "bg-amber-50 text-amber-600 dark:bg-amber-500/10" };
  return { icone: File, cor: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" };
}
