@AGENTS.md

# StudyFlow: contexto para quem continuar o projeto

Projeto Integrador do Daniel (estudante). Site de organização de estudos em grupo.
Leia este arquivo inteiro antes de mexer em qualquer coisa.

## Como trabalhar com o Daniel
- Escreve em **português informal**; responda em português, direto e sem jargão.
- Ele **testa o visual sozinho**. Não abra navegador nem tire screenshots; verifique com
  `npm run lint`, `npm run build`, `npm test` e requisições HTTP/API.
- Quando ele pede "vai melhorando", pode seguir criando melhorias por conta própria.
- GitHub dele: `JackDaniels2003` (repo `studyflow`). O e-mail do Git **neste repositório** é
  `danielteodoro1003@gmail.com` (configuração local; não mexa na global).
- Não faça push nem deploy sem ele pedir. Nunca grave chaves no Git.

## Stack
- **Next.js 16** (App Router, `cacheComponents` ligado, `partialPrefetching`) + React 19 + Tailwind 4,
  só JavaScript (sem TypeScript). Ícones `lucide-react`, gráficos `recharts`.
- **Supabase** (Postgres + RLS, Auth, Storage, Realtime). Projeto já criado; a URL e a chave
  *publishable* ficam no `.env.local` (fora do Git, ver `.env.example`).
- Deploy planejado: **Render** (`render.yaml`) e/ou **EC2 no AWS Learner Lab** (ver `DEPLOY-AWS.md`).

## Armadilhas do Next 16 (já nos pegaram)
- `middleware` agora se chama **`proxy.js`** (raiz). Ele renova a sessão e protege as rotas.
- Com `cacheComponents`, ler `cookies()` ou `params` só pode ocorrer **dentro de `<Suspense>`**.
  Por isso as páginas têm um componente interno `async` dentro de Suspense. O `createClient()` de
  `lib/supabase/server.js` chama `await connection()` por causa do `Date.now()` do supabase-js.
- A regra `react-hooks/purity` do lint proíbe `Date.now()`/`Math.random()` em componente de
  servidor: coloque em função de `lib/`.
- Arquivos `"use client"` só devem exportar componentes (funções `use...` e utilitários tudo bem,
  constantes compartilhadas com o servidor ficam em `lib/`).
- `useSearchParams` foi evitado de propósito (deixa a página dinâmica); leia `window.location` no
  momento do clique ou use `useSyncExternalStore`.

## Armadilhas do Supabase
- **Realtime não entrega DELETE filtrado por coluna.** Eventos de exclusão são assinados sem
  filtro e tratados pelo `id` (ver `quadro-tarefas.js`, `mural.js`).
- **Tudo que é regra de acesso mora no banco (RLS)** em `supabase/schema.sql`. O arquivo é
  idempotente: pode rodar de novo no SQL Editor sempre que mudar.
- Funções novas dependem de tabelas novas. `lib/dados.js` → `recursos()` sonda o banco e o app
  esconde/avisa quando falta a tabela (em vez de quebrar).
- Histórico (`activity`) é preenchido só por gatilhos; ninguém insere direto.

## Mapa do código
```
app/page.js, sobre/        páginas públicas (landing e arquitetura para a apresentação)
app/login, cadastro, esqueci-senha, redefinir-senha, auth/callback
app/convite/[codigo]/      entrar no grupo por link
app/grupos/                resumo pessoal + lista de grupos
app/grupos/[id]/           tarefas (page.js + quadro-tarefas.js), calendario/, chat/, mural/,
                           arquivos/, foco/, painel/ (progresso)
components/                ui.js (classes e Avatar/Janela), avisos.js (toasts/confirmar), prazo.js...
lib/                       supabase/, dados.js, formatos.js, tarefas.js, prazo-escrito.js, arquivos.js...
supabase/schema.sql        tabelas, RLS, gatilhos, storage, realtime
tests/                     regras.test.mjs (app) e banco.test.mjs (schema no PGlite)
```

## Comandos
```bash
npm run dev      # http://localhost:3000
npm run lint
npm test         # 29 testes; os de banco rodam o schema.sql num Postgres em memória
npm run build
```
Antes de dizer que algo está pronto: lint + test + build sem erro.

## Estado atual
Tudo abaixo existe e foi verificado por lint/build/testes (visual testado pelo Daniel):
login/cadastro/recuperar senha, grupos com convite por link, quadro de tarefas (prioridade,
checklist, anexos, comentários, criação rápida com prazo escrito, arrastar), calendário + `.ics`,
chat (presença, digitando, reações, @menções, notificações, não lidas), mural com enquetes,
arquivos, foco/pomodoro com ranking, progresso (gráficos, histórico, CSV, PDF), tema claro/escuro,
busca Ctrl+K, lembretes de prazo, modelo de Projeto Integrador.

## Pendências (nesta ordem)
1. **Rodar o `supabase/schema.sql` atualizado** no SQL Editor do Supabase (se o Daniel ainda não
   rodou). Conferir sondando a REST, ex.: `GET /rest/v1/poll_votes?limit=1` com o header `apikey`.
2. ~~**Plano B para HTTP (sem HTTPS).**~~ **FEITO.** `lib/id.js` (`novoId()`), `lib/copiar.js`
   (`copiarTexto()` com plano B), botão de notificações some fora de contexto seguro, e
   `app/auth/callback/route.js` redireciona com caminho relativo (atrás do nginx o `request.url`
   vira `localhost:3000`). Testado simulando o nginx com `curl -H "Host: ..."` no `npm start`.
   Falta só confirmar na EC2 real; em HTTP, "copiar" usa `execCommand` e notificações não existem.
3. **Deploy na AWS** seguindo `DEPLOY-AWS.md` (nunca foi testado numa conta real).
4. Deploy no Render (opcional): `render.yaml` está pronto.
5. Pedir ao Daniel para apagar as contas de teste `claude.teste.*@example.com` em
   *Authentication → Users* do Supabase.
6. Para "Esqueci minha senha" funcionar fora do localhost: adicionar a URL do site em
   *Authentication → URL Configuration* (Site URL e Redirect URLs).
