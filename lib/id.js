// Gera ids únicos no navegador, inclusive quando o site é servido por HTTP simples.
//
// `crypto.randomUUID()` só existe em contexto seguro (HTTPS ou localhost). Numa EC2 servida por
// http://IP ele fica indefinido e quebra avisos, checklist e upload. `crypto.getRandomValues`
// funciona em qualquer contexto, então é nele que o plano B se apoia.
//
// O parâmetro `c` existe só para os testes poderem simular um navegador sem `randomUUID`.
export function novoId(c = globalThis.crypto) {
  if (typeof c?.randomUUID === "function") return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // UUID versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)]
    .map((parte) => parte.join(""))
    .join("-");
}
