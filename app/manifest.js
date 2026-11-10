// Permite "Adicionar a tela inicial" no celular, abrindo como app.
export default function manifest() {
  return {
    name: "StudyFlow",
    short_name: "StudyFlow",
    description: "Organize os estudos do seu grupo: tarefas, prazos, chat e arquivos.",
    start_url: "/grupos",
    display: "standalone",
    background_color: "#f8f8fb",
    theme_color: "#4f46e5",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
