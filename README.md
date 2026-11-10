# StudyFlow

Organização de estudos em grupo: tarefas por matéria com contagem regressiva, calendário,
chat em tempo real, mural com enquetes, arquivos, modo foco (pomodoro) e gráficos de progresso.

Destaques: convite por link, quadro com checklist/anexos/comentários, criação rápida com prazo
escrito em português ("Revisar slides amanhã 18h"), lembrete 1h antes do prazo, presença online,
histórico de atividades, relatório em PDF/CSV, tema claro/escuro e busca rápida com Ctrl+K.

Projeto Integrador. Veja a página `/sobre` do app para a arquitetura e a comparação com a
proposta original em AWS.

## Tecnologias

- **Next.js 16** (App Router, Cache Components) + **React 19** + **Tailwind CSS 4**
- **Supabase**: Postgres com RLS, Auth, Storage e Realtime
- **Recharts** para os gráficos e **lucide-react** para os ícones
- Deploy no **Render**

## Rodando localmente

Requisitos: Node 20.9 ou mais novo e uma conta gratuita no [Supabase](https://supabase.com).

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env.local` a partir do `.env.example` e preencha com os dados de
   *Project Settings → API Keys* do Supabase (use a chave **publishable/anon**, nunca a secret):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

3. No Supabase, abra o **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e rode.
   O arquivo pode ser rodado de novo sempre que for atualizado: ele só cria o que falta.

4. Em *Authentication → Sign In / Providers → Email*, desligue **Confirm email** (para o
   cadastro entrar direto, sem precisar confirmar por e-mail).

5. Suba o servidor:

   ```bash
   npm run dev
   ```

   e abra <http://localhost:3000>.

## Documentos do projeto

- `PASSO-A-PASSO-OUTRO-PC.md`: como continuar o projeto em outro computador.
- `DEPLOY-AWS.md`: roteiro para rodar o site numa EC2 do AWS Learner Lab.
- `CLAUDE.md`: contexto, armadilhas e pendências para quem continuar o desenvolvimento.

## Testes

```bash
npm test
```

- `tests/regras.test.mjs`: regras do app (contagem regressiva, ordem das tarefas, checklist, datas).
- `tests/banco.test.mjs`: roda o `supabase/schema.sql` num Postgres em memória (PGlite) e confere
  as regras de acesso, por exemplo: quem não é membro não vê o grupo, ninguém age em nome de
  outra pessoa, só o criador remove membros e o histórico registra as ações. Não precisa de internet.

## Deploy no Render

1. Envie o código para o GitHub.
2. No Render, clique em **New → Blueprint** e escolha o repositório. O arquivo
   `render.yaml` já define o serviço (build `npm ci && npm run build`, start `npm start`).
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` quando o Render pedir.
4. Depois do primeiro deploy, no Supabase, em *Authentication → URL Configuration*:
   - **Site URL**: o endereço do Render (ex.: `https://studyflow.onrender.com`)
   - **Redirect URLs**: adicione `https://studyflow.onrender.com/**` e `http://localhost:3000/**`
     (necessário para o link de "Esqueci minha senha").

> O plano gratuito do Render "dorme" após 15 minutos sem acesso; a primeira visita depois
> disso leva cerca de 50 segundos. Abra o site um pouco antes de apresentar.

## Estrutura

```
app/
  page.js                 página inicial pública
  sobre/                  arquitetura do projeto (para a apresentação)
  login/, cadastro/       autenticação (auth-form.js)
  esqueci-senha/, redefinir-senha/, auth/callback/   recuperação de senha
  convite/[codigo]/       entrar em um grupo por link
  grupos/                 área logada: resumo pessoal e lista de grupos
    [id]/                 um grupo: tarefas (page.js), calendario/, chat/, mural/,
                          arquivos/, foco/, painel/ (progresso)
components/               peças visuais compartilhadas (ui, avisos, prazo, tema...)
lib/                      clientes do Supabase, formatação de datas, regras das tarefas
proxy.js                  renova a sessão e protege as rotas (o antigo middleware)
supabase/schema.sql       tabelas, regras de acesso (RLS), gatilhos, storage e realtime
```

## Segurança

Toda regra de acesso fica no banco (Row Level Security): só quem é membro de um grupo lê e
escreve os dados dele, mesmo que alguém chame a API do Supabase diretamente. Os arquivos ficam
num bucket privado e são baixados por links assinados que expiram.
