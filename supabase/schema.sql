-- StudyFlow: schema, RLS, storage e realtime.
-- Cole tudo no SQL Editor do Supabase e rode uma vez (e seguro rodar de novo).

-- ============================================================
-- Tabelas
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  criado_por uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  nome text not null,
  cor text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  titulo text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  prazo timestamptz,
  responsavel uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nome text not null,
  path text not null,
  created_at timestamptz not null default now()
);

-- Colunas adicionadas depois da primeira versao (rodar o arquivo de novo cria).
alter table public.files add column if not exists tamanho bigint;
alter table public.files add column if not exists tipo text;
-- Anexo de tarefa (opcional): o arquivo continua na aba Arquivos, ligado a tarefa.
alter table public.files add column if not exists task_id uuid references public.tasks (id) on delete set null;
create index if not exists files_task_idx on public.files (task_id);
alter table public.profiles add column if not exists cor text not null default '#4f46e5';
alter table public.groups add column if not exists cor text not null default '#4f46e5';
alter table public.groups add column if not exists emoji text not null default '📚';
alter table public.tasks add column if not exists descricao text;
alter table public.tasks add column if not exists prioridade text not null default 'media'
  check (prioridade in ('baixa', 'media', 'alta'));
-- Checklist da tarefa: [{ "id": "...", "texto": "...", "feito": false }, ...]
alter table public.tasks add column if not exists checklist jsonb not null default '[]'::jsonb;

-- Mural de anotacoes do grupo (post-its).
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  titulo text,
  conteudo text not null default '',
  cor text not null default 'amarelo',
  fixada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enquete no mural: nota com "opcoes" (lista de textos); null = nota comum.
alter table public.notes add column if not exists opcoes jsonb;

-- Um voto por pessoa em cada enquete (trocar de opcao = atualizar o voto).
create table if not exists public.poll_votes (
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  opcao int not null check (opcao >= 0),
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

-- Comentarios dentro de cada tarefa.
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx on public.task_comments (task_id, created_at);

-- Historico do grupo, preenchido por gatilhos (ninguem insere direto).
create table if not exists public.activity (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  tipo text not null,
  texto text not null,
  created_at timestamptz not null default now()
);

-- Reacoes (emoji) nas mensagens do chat.
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- Sessoes de foco (pomodoro) concluidas, para o ranking de estudo da semana.
create table if not exists public.focus_sessions (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  minutos int not null check (minutos between 1 and 180),
  created_at timestamptz not null default now()
);

create index if not exists focus_group_idx on public.focus_sessions (group_id, created_at desc);
create index if not exists notes_group_idx on public.notes (group_id);
create index if not exists activity_group_idx on public.activity (group_id, created_at desc);
create index if not exists reactions_group_idx on public.message_reactions (group_id);

create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists subjects_group_idx on public.subjects (group_id);
create index if not exists tasks_group_idx on public.tasks (group_id);
create index if not exists messages_group_idx on public.messages (group_id, created_at);
create index if not exists files_group_idx on public.files (group_id);

-- ============================================================
-- Funcoes auxiliares (security definer evita recursao nas policies)
-- ============================================================

create or replace function public.is_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.shares_group_with(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

-- Cria o perfil quando alguem se cadastra (nome vem do metadata do signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quem cria o grupo entra nele automaticamente.
create or replace function public.add_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id)
  values (new.id, new.criado_por)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.add_creator_as_member();

-- Entrar em um grupo pelo codigo de convite. Retorna o id do grupo.
create or replace function public.join_group(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into gid from public.groups where codigo = upper(trim(p_codigo));
  if gid is null then
    raise exception 'codigo invalido';
  end if;

  insert into public.group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;

  return gid;
end;
$$;

revoke all on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;

-- Previa do grupo na tela de convite (quem ainda nao e membro nao ve a tabela groups).
create or replace function public.previa_convite(p_codigo text)
returns table (nome text, emoji text, cor text, membros bigint)
language sql
stable
security definer
set search_path = public
as $$
  select g.nome, g.emoji, g.cor,
    (select count(*) from public.group_members m where m.group_id = g.id)
  from public.groups g
  where g.codigo = upper(trim(p_codigo));
$$;

revoke all on function public.previa_convite(text) from public, anon;
grant execute on function public.previa_convite(text) to authenticated;

-- Registra no historico: tarefas criadas/movidas, arquivos, entradas, notas.
create or replace function public.registrar_atividade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rotulos constant jsonb := '{"todo": "A fazer", "doing": "Fazendo", "done": "Concluído"}';
begin
  if tg_table_name = 'tasks' then
    if tg_op = 'INSERT' then
      insert into public.activity (group_id, user_id, tipo, texto)
      values (new.group_id, auth.uid(), 'tarefa_criada', format('criou a tarefa "%s"', new.titulo));
    elsif new.status is distinct from old.status then
      insert into public.activity (group_id, user_id, tipo, texto)
      values (
        new.group_id, auth.uid(),
        case when new.status = 'done' then 'tarefa_concluida' else 'tarefa_movida' end,
        case when new.status = 'done' then format('concluiu "%s"', new.titulo)
             else format('moveu "%s" para %s', new.titulo, rotulos ->> new.status) end
      );
    end if;
  elsif tg_table_name = 'files' then
    insert into public.activity (group_id, user_id, tipo, texto)
    values (new.group_id, new.user_id, 'arquivo',
      case when new.task_id is not null
        then format('anexou "%s" em "%s"', new.nome, (select t.titulo from public.tasks t where t.id = new.task_id))
        else format('enviou o arquivo "%s"', new.nome)
      end);
  elsif tg_table_name = 'group_members' then
    insert into public.activity (group_id, user_id, tipo, texto)
    select new.group_id, new.user_id, 'membro',
      case when g.criado_por = new.user_id then 'criou o grupo' else 'entrou no grupo' end
    from public.groups g where g.id = new.group_id;
  elsif tg_table_name = 'notes' then
    insert into public.activity (group_id, user_id, tipo, texto)
    values (new.group_id, new.user_id, 'nota',
      case when new.opcoes is not null
        then format('abriu a enquete "%s"', coalesce(nullif(new.titulo, ''), 'sem título'))
        else format('fixou uma nota no mural%s', coalesce(': "' || nullif(new.titulo, '') || '"', ''))
      end);
  elsif tg_table_name = 'task_comments' then
    insert into public.activity (group_id, user_id, tipo, texto)
    select new.group_id, new.user_id, 'comentario', format('comentou em "%s"', t.titulo)
    from public.tasks t where t.id = new.task_id;
  elsif tg_table_name = 'focus_sessions' then
    insert into public.activity (group_id, user_id, tipo, texto)
    values (new.group_id, new.user_id, 'foco',
      format('focou %s min%s', new.minutos,
        coalesce(' em "' || (select t.titulo from public.tasks t where t.id = new.task_id) || '"', '')));
  end if;
  return null;
end;
$$;

drop trigger if exists atividade_tasks on public.tasks;
create trigger atividade_tasks after insert or update of status on public.tasks
  for each row execute function public.registrar_atividade();
drop trigger if exists atividade_files on public.files;
create trigger atividade_files after insert on public.files
  for each row execute function public.registrar_atividade();
drop trigger if exists atividade_members on public.group_members;
create trigger atividade_members after insert on public.group_members
  for each row execute function public.registrar_atividade();
drop trigger if exists atividade_notes on public.notes;
create trigger atividade_notes after insert on public.notes
  for each row execute function public.registrar_atividade();
drop trigger if exists atividade_comentarios on public.task_comments;
create trigger atividade_comentarios after insert on public.task_comments
  for each row execute function public.registrar_atividade();
drop trigger if exists atividade_foco on public.focus_sessions;
create trigger atividade_foco after insert on public.focus_sessions
  for each row execute function public.registrar_atividade();

-- ============================================================
-- RLS: so membros do grupo leem e escrevem os dados dele
-- ============================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
alter table public.files enable row level security;
alter table public.notes enable row level security;
alter table public.activity enable row level security;
alter table public.message_reactions enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.poll_votes enable row level security;
alter table public.task_comments enable row level security;

-- task_comments: membros leem; cada um comenta como si, em tarefa do proprio grupo; apaga o seu
drop policy if exists "comments_select" on public.task_comments;
create policy "comments_select" on public.task_comments
  for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "comments_insert" on public.task_comments;
create policy "comments_insert" on public.task_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_member(group_id)
    and exists (select 1 from public.tasks t where t.id = task_id and t.group_id = task_comments.group_id)
  );

drop policy if exists "comments_delete" on public.task_comments;
create policy "comments_delete" on public.task_comments
  for delete to authenticated
  using (user_id = auth.uid());

-- poll_votes: membros veem os votos; cada um vota (e troca) so por si, em enquete do proprio grupo
drop policy if exists "votes_select" on public.poll_votes;
create policy "votes_select" on public.poll_votes
  for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "votes_insert" on public.poll_votes;
create policy "votes_insert" on public.poll_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_member(group_id)
    and exists (select 1 from public.notes n where n.id = note_id and n.group_id = poll_votes.group_id)
  );

drop policy if exists "votes_update" on public.poll_votes;
create policy "votes_update" on public.poll_votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member(group_id));

drop policy if exists "votes_delete" on public.poll_votes;
create policy "votes_delete" on public.poll_votes
  for delete to authenticated
  using (user_id = auth.uid());

-- focus_sessions: membros veem o ranking; cada um registra as proprias sessoes
drop policy if exists "focus_select" on public.focus_sessions;
create policy "focus_select" on public.focus_sessions
  for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "focus_insert" on public.focus_sessions;
create policy "focus_insert" on public.focus_sessions
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(group_id));

-- notes: o mural e colaborativo, qualquer membro cria, edita e apaga
drop policy if exists "notes_all" on public.notes;
create policy "notes_all" on public.notes
  for all to authenticated
  using (public.is_member(group_id))
  with check (public.is_member(group_id));

-- activity: so leitura para membros (quem escreve sao os gatilhos)
drop policy if exists "activity_select" on public.activity;
create policy "activity_select" on public.activity
  for select to authenticated
  using (public.is_member(group_id));

-- reacoes: membros veem; cada um poe e tira as proprias
drop policy if exists "reactions_select" on public.message_reactions;
create policy "reactions_select" on public.message_reactions
  for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "reactions_insert" on public.message_reactions;
create policy "reactions_insert" on public.message_reactions
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(group_id));

drop policy if exists "reactions_delete" on public.message_reactions;
create policy "reactions_delete" on public.message_reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- profiles: ve o proprio e quem divide grupo com voce
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- groups: membros leem; qualquer logado cria; criador edita/apaga
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select to authenticated
  using (public.is_member(id) or criado_por = auth.uid());

drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups
  for insert to authenticated
  with check (criado_por = auth.uid());

drop policy if exists "groups_update" on public.groups;
create policy "groups_update" on public.groups
  for update to authenticated
  using (criado_por = auth.uid())
  with check (criado_por = auth.uid());

drop policy if exists "groups_delete" on public.groups;
create policy "groups_delete" on public.groups
  for delete to authenticated
  using (criado_por = auth.uid());

-- group_members: membros veem a lista; cada um sai, e o criador pode remover alguem
-- (entrar e so via join_group)
drop policy if exists "members_select" on public.group_members;
create policy "members_select" on public.group_members
  for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "members_delete_self" on public.group_members;
drop policy if exists "members_delete" on public.group_members;
create policy "members_delete" on public.group_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.criado_por = auth.uid()
    )
  );

-- subjects e tasks: membros fazem tudo no proprio grupo
drop policy if exists "subjects_all" on public.subjects;
create policy "subjects_all" on public.subjects
  for all to authenticated
  using (public.is_member(group_id))
  with check (public.is_member(group_id));

drop policy if exists "tasks_all" on public.tasks;
create policy "tasks_all" on public.tasks
  for all to authenticated
  using (public.is_member(group_id))
  with check (public.is_member(group_id));

-- messages: membros leem e enviam (como eles mesmos); autor apaga a propria
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (public.is_member(group_id) and user_id = auth.uid());

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete to authenticated
  using (user_id = auth.uid());

-- files: membros leem e enviam (como eles mesmos); autor apaga o proprio
drop policy if exists "files_select" on public.files;
create policy "files_select" on public.files
  for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "files_insert" on public.files;
create policy "files_insert" on public.files
  for insert to authenticated
  with check (public.is_member(group_id) and user_id = auth.uid());

drop policy if exists "files_delete_own" on public.files;
create policy "files_delete_own" on public.files
  for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- Storage: bucket privado "arquivos", caminho = <group_id>/<arquivo>
-- ============================================================

insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

drop policy if exists "arquivos_select" on storage.objects;
create policy "arquivos_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'arquivos' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "arquivos_insert" on storage.objects;
create policy "arquivos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'arquivos' and public.is_member(((storage.foldername(name))[1])::uuid));

-- Apaga quem enviou, ou o criador do grupo (ao excluir o grupo inteiro).
drop policy if exists "arquivos_delete" on storage.objects;
create policy "arquivos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'arquivos'
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.groups g
        where g.id = ((storage.foldername(name))[1])::uuid
          and g.criado_por = auth.uid()
      )
    )
  );

-- ============================================================
-- Realtime: chat, e tarefas/materias/arquivos atualizando ao vivo para o grupo
-- ============================================================

do $$
declare
  tabela text;
begin
  foreach tabela in array array['messages', 'tasks', 'subjects', 'files', 'notes', 'activity', 'message_reactions', 'poll_votes', 'task_comments'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tabela);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
