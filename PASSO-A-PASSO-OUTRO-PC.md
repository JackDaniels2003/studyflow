# Continuar o StudyFlow em outro computador

Passo a passo para o Daniel. Leva uns 15 minutos.

## 1. Instalar o que precisa (uma vez só)

- **Node.js 22 (LTS)**: <https://nodejs.org>
- **Git**: <https://git-scm.com/downloads>
- **VS Code**: <https://code.visualstudio.com> (se quiser usar o Claude Code dentro dele)
- **Claude Code**: siga as instruções de instalação em <https://claude.com/claude-code> e entre
  com a sua conta.

Confira no terminal:

```bash
node -v    # precisa ser 20.9 ou mais novo
git --version
```

## 2. Baixar o projeto

```bash
git clone https://github.com/JackDaniels2003/studyflow.git
cd studyflow
npm install
```

O GitHub pode pedir login na primeira vez. Entre com a conta **JackDaniels2003**.

Configure o e-mail do Git **só neste projeto** (para os commits ficarem no seu perfil):

```bash
git config user.name "Daniel"
git config user.email "danielteodoro1003@gmail.com"
```

## 3. Criar o arquivo `.env.local`

Ele **não vai para o GitHub** (de propósito), então precisa ser criado à mão. Na raiz do projeto,
crie `.env.local` com estas duas linhas:

```
NEXT_PUBLIC_SUPABASE_URL=https://hytnljoxckxqerfuyumx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLE_AQUI_A_CHAVE_PUBLISHABLE
```

A chave está no Supabase: *Project Settings → API Keys → Publishable key* (começa com
`sb_publishable_`). Também dá para copiar o `.env.local` do computador antigo.

> Nunca use a chave `secret` ou `service_role` aqui.

## 4. Conferir que está tudo certo

```bash
npm test         # deve mostrar 29 testes passando
npm run dev      # abra http://localhost:3000
```

O banco é o mesmo na nuvem, então suas contas, grupos e tarefas já aparecem.

Se alguma função do app mostrar "precisa de uma atualização no banco", rode o
`supabase/schema.sql` no *SQL Editor* do Supabase (copiar tudo, colar, Run). Pode rodar quantas
vezes quiser.

## 5. Passar o bastão para o Claude

Abra a pasta `studyflow` no VS Code, abra o Claude Code e **cole este texto**:

> Leia o `CLAUDE.md` e o `DEPLOY-AWS.md` deste projeto. Eu preciso colocar o site para rodar no
> AWS Learner Lab (numa EC2). Comece pela pendência 2 do CLAUDE.md (plano B para funcionar em
> HTTP, sem HTTPS), faça lint, testes e build, e depois me guie no passo a passo da EC2, um
> comando de cada vez. O professor exige: _[escreva aqui o que ele pediu]_.

Na parte do professor, escreva o que ele realmente exige (ex.: "o site na EC2 e o banco no RDS"
ou "só rodar na AWS"). Isso muda o plano, então vale ser específico.

## Se algo der errado

| Problema | O que fazer |
|---|---|
| `npm install` reclama de versão | Atualize o Node (precisa ser 20.9 ou mais novo) |
| Site abre mas não loga | Confira as duas linhas do `.env.local` e reinicie o `npm run dev` |
| "precisa de uma atualização no banco" | Rode o `supabase/schema.sql` no Supabase |
| `git push` pede senha e falha | Use o login pelo navegador que o Git abre, ou crie um token em GitHub → Settings → Developer settings |
