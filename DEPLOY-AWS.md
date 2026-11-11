# Rodar o StudyFlow numa EC2 (AWS Learner Lab)

> **Status: testado de ponta a ponta** numa conta real do Learner Lab (nov/2026): EC2 + nginx +
> pm2 + Supabase, em HTTP. Os passos abaixo funcionaram; as diferenças encontradas estão em
> "Notas do teste real", logo antes de "Problemas comuns".

## Visão geral

O site (Next.js) roda numa **EC2**. O banco, o login, os arquivos e o tempo real continuam no
**Supabase** (a EC2 só precisa de internet de saída). Isso equivale ao slide: EC2 = servidor web.

```
Navegador ──► EC2 (nginx :80 ─► Node/Next :3000) ──► Supabase (nuvem)
```

Se o professor exigir RDS e S3 de verdade, isso é uma reescrita maior (trocar Supabase Auth,
Storage e Realtime); converse com o Daniel antes de começar.

## Antes de começar

1. **Resolver a pendência 2 do `CLAUDE.md` (funcionar em HTTP).** Uma EC2 simples serve
   `http://IP`, e sem HTTPS o `crypto.randomUUID()` não existe: os avisos, o checklist e o
   upload quebram.
2. Ter `npm run lint`, `npm test` e `npm run build` passando e o código enviado ao GitHub.
3. Ler a **lista de serviços liberados** do seu Learner Lab (varia por curso). Se o seu lab
   liberar Elastic Beanstalk ou CloudFront, veja a seção "Alternativas".

## Regras do Learner Lab que importam

- Clique em **Start Lab** e espere a bolinha ficar verde; abra o console por **AWS**.
- Use a região **us-east-1** (Norte da Virgínia).
- Há um **crédito limitado**. **Pare a instância ao fim do dia** (EC2 → Instance state → Stop).
- Quando a sessão do lab termina, os recursos ficam guardados, mas as instâncias param. O IP
  público muda quando ela volta, **a menos que exista um Elastic IP**.
- Não dá para criar usuários/funções IAM; se pedir um perfil de instância, use o `LabInstanceProfile`.

## Passo 1: criar a instância

EC2 → **Launch instance**:

| Campo | Valor |
|---|---|
| Nome | `studyflow` |
| Imagem (AMI) | Ubuntu Server 24.04 LTS |
| Tipo | **t3.small** ou maior (com 1 GB o `next build` costuma ficar sem memória) |
| Par de chaves | Criar novo, baixar o `.pem` e guardar |
| Rede, permitir | SSH (22) de qualquer lugar (ou do seu IP) e **HTTP (80)** de qualquer lugar |
| Armazenamento | 20 GB |

Depois: EC2 → **Elastic IPs** → *Allocate* → *Associate* com a instância. Anote o IP.

## Passo 2: entrar na instância

```bash
chmod 400 studyflow.pem               # (Linux/Mac; no Windows pode pular)
ssh -i studyflow.pem ubuntu@SEU_IP
```

Alternativa sem chave: EC2 → *Connect* → **EC2 Instance Connect** (terminal no navegador).

## Passo 3: instalar o necessário (na EC2)

```bash
sudo apt update && sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v && git --version
```

## Passo 4: baixar e construir o site

```bash
git clone https://github.com/JackDaniels2003/studyflow.git
cd studyflow
nano .env.local        # cole as 2 linhas (URL e chave publishable), Ctrl+O, Enter, Ctrl+X
npm ci
npm run build
```

O `.env.local` precisa existir **antes** do build: as variáveis `NEXT_PUBLIC_*` são gravadas no
código durante o `next build`. Se trocar a chave depois, rode o build de novo.

Se o build morrer com "Killed" (falta de memória), crie um arquivo de troca:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
npm run build
```

## Passo 5: manter rodando com o pm2

```bash
pm2 start npm --name studyflow -- start
pm2 save
pm2 startup            # copie e execute a linha que ele mostrar (começa com "sudo env PATH=...")
curl -I http://localhost:3000     # deve responder 200 (ou 307 para /login)
```

## Passo 6: nginx na porta 80

```bash
sudo tee /etc/nginx/sites-available/studyflow >/dev/null <<'EOF'
server {
  listen 80 default_server;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # necessario para o tempo real e o streaming de paginas
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
  }
}
EOF
sudo ln -sf /etc/nginx/sites-available/studyflow /etc/nginx/sites-enabled/studyflow
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

Abra `http://SEU_IP` no navegador. O site deve aparecer.

## Passo 7: liberar o endereço no Supabase

*Authentication → URL Configuration*:
- **Site URL**: `http://SEU_IP`
- **Redirect URLs**: adicione `http://SEU_IP/**`

(Necessário para o link de "Esqueci minha senha".)

## Atualizar o site depois

```bash
cd ~/studyflow
git pull
npm ci && npm run build
pm2 restart studyflow
```

## Ao voltar no dia seguinte

1. Start Lab.
2. EC2 → selecione a instância → **Start instance**. Com Elastic IP o endereço é o mesmo.
3. O `pm2` volta sozinho (por causa do `pm2 startup`). Se não voltar: `pm2 resurrect`.

## Notas do teste real

- O console do lab veio **em português**: "Executar instâncias", "IPs elásticos", "Alterar tipo
  de instância".
- A imagem Ubuntu veio como **26.04 ("resolute")**, não 24.04. Node 22 pelo NodeSource, nginx e
  pm2 funcionaram igual. O `sudo` avisa `'-E' is ignored`: é inofensivo.
- O tipo sugerido pelo console foi **t3.micro (1 GB)**. Trocamos para **t3.small** (Estado da
  instância → Parar; Ações → Configurações da instância → Alterar tipo de instância; Iniciar).
  Com t3.small o `npm run build` passou sem precisar de swap.
- O **EC2 Instance Connect** (Conectar → no navegador) funciona sem `.pem` nem SSH no Windows.
- O terminal do navegador **às vezes executa o texto colado duas vezes** (isso gerou um
  `git clone` aninhado). Prefira comandos que podem rodar duas vezes sem estragar: criar o
  `.env.local` com `printf '...' > arquivo` (em vez de `nano`/`cat >`), e subir o site com
  `pm2 delete studyflow 2>/dev/null; pm2 start npm --name studyflow -- start`.
- Para o site voltar sozinho após reiniciar:
  `sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu && pm2 save`
  (o último comando deve imprimir `enabled` ao rodar `systemctl is-enabled pm2-ubuntu`).
- O `/auth/callback` redirecionava para `localhost:3000` atrás do nginx; já corrigido no código
  (redireciona com caminho relativo).
- Em HTTP o botão de notificações some e "copiar link" usa o plano B do `lib/copiar.js`.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Página não abre | Grupo de segurança sem a porta 80, ou nginx parado (`sudo systemctl status nginx`) |
| 502 Bad Gateway | O Next não está rodando (`pm2 logs studyflow`) |
| Site abre mas o login falha | `.env.local` ausente/errado no momento do build: corrija e rode `npm run build` |
| Avisos, checklist ou upload quebram | Falta o plano B de HTTP (pendência 2 do `CLAUDE.md`) |
| Copiar link/notificações não funcionam | Esperado em HTTP; veja HTTPS abaixo |
| Build "Killed" | Pouca memória: use t3.small+ ou crie o swap acima |

## Alternativas (se o seu lab liberar)

- **CloudFront na frente da EC2**: dá um endereço `https://xxxx.cloudfront.net` sem precisar de
  domínio, resolvendo de vez o HTTPS (origem: o IP/DNS da EC2 por HTTP, porta 80). Depois
  troque a Site URL do Supabase para o endereço do CloudFront.
- **Elastic Beanstalk (Node.js)**: sobe o app sem configurar nginx/pm2; envie o projeto
  compactado (sem `node_modules` e sem `.next`) e defina as duas variáveis de ambiente.
- **Render** (fora da AWS): o `render.yaml` já está pronto; veja o `README.md`.
