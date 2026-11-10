import { Geist, Geist_Mono } from "next/font/google";
import { AvisosProvider } from "@/components/avisos";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "StudyFlow",
  description: "Organize os estudos do seu grupo: tarefas, prazos, chat e arquivos.",
  applicationName: "StudyFlow",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// Aplica o tema salvo antes da primeira pintura, para nao piscar claro no modo escuro.
const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");var e=t==="escuro"||(t!=="claro"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.tema=e?"escuro":"claro"}catch(_){}`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AvisosProvider>{children}</AvisosProvider>
      </body>
    </html>
  );
}
