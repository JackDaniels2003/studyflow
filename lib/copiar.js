// Copia texto para a área de transferência. Devolve true se conseguiu.
//
// `navigator.clipboard` só existe em contexto seguro (HTTPS ou localhost). Em HTTP simples o
// plano B usa um <textarea> escondido com `document.execCommand("copy")`.
export async function copiarTexto(texto) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // permissão negada ou contexto inseguro: cai no plano B
  }

  const anterior = document.activeElement;
  const area = document.createElement("textarea");
  try {
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, texto.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    if (anterior instanceof HTMLElement) anterior.focus();
  }
}
