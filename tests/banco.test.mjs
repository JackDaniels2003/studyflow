// Testa o supabase/schema.sql num Postgres de verdade (PGlite, em memoria), com imitacoes
// minimas do que o Supabase fornece (auth.uid(), storage, publicacao do realtime).
// Cada "como(usuario, sql)" roda a consulta logado como aquele usuario, passando pela RLS.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const ANA = "11111111-1111-1111-1111-111111111111";
const BETO = "22222222-2222-2222-2222-222222222222";
const CAIO = "33333333-3333-3333-3333-333333333333";

const db = new PGlite();
let grupo;
let tarefa;

async function como(uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

async function falha(uid, sql, params) {
  try {
    await como(uid, sql, params);
    return false;
  } catch {
    return true;
  }
}

const contar = async (sql, params) => (await db.query(sql, params)).rows[0].n;

describe("banco (schema.sql + regras de acesso)", () => {
  before(async () => {
    await db.exec(`
      create role authenticated; create role anon;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
      create function storage.foldername(name text) returns text[] language sql immutable as
        $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
      alter table storage.objects enable row level security;
      create publication supabase_realtime;
      grant usage on schema public, auth, storage to authenticated;
      grant all on storage.objects to authenticated;
    `);
    await db.exec(schema);
    await db.exec(`
      grant all on all tables in schema public to authenticated;
      grant all on all sequences in schema public to authenticated;
      insert into auth.users values
        ('${ANA}', 'ana@x.com', '{"nome": "Ana"}'),
        ('${BETO}', 'beto@x.com', '{"nome": "Beto"}'),
        ('${CAIO}', 'caio@x.com', '{}');
    `);
  });

  it("pode ser rodado de novo sem erro (idempotente)", async () => {
    await db.exec(schema);
  });

  it("cria o perfil no cadastro (nome do e-mail quando falta)", async () => {
    const nomes = (await db.query("select nome from profiles order by nome")).rows.map((r) => r.nome);
    assert.deepEqual(nomes, ["Ana", "Beto", "caio"]);
  });

  it("quem cria o grupo vira membro, com emoji e cor padrão", async () => {
    grupo = (await como(ANA, "insert into groups (nome) values ('PI') returning id, codigo, emoji, cor")).rows[0];
    assert.equal(grupo.emoji, "📚");
    assert.equal(await contar("select count(*)::int n from group_members where group_id = $1", [grupo.id]), 1);
  });

  it("quem não é membro não vê o grupo nem cria tarefas nele", async () => {
    assert.equal((await como(BETO, "select id from groups")).rows.length, 0);
    assert.ok(await falha(BETO, "insert into tasks (group_id, titulo) values ($1, 'x')", [grupo.id]));
    assert.ok(await falha(BETO, "insert into group_members (group_id, user_id) values ($1, $2)", [grupo.id, BETO]));
  });

  it("prévia do convite e entrada pelo código (minúsculo também)", async () => {
    const previa = (await como(BETO, "select * from previa_convite($1)", [grupo.codigo.toLowerCase()])).rows[0];
    assert.equal(previa.nome, "PI");
    await como(BETO, "select join_group($1)", [grupo.codigo.toLowerCase()]);
    await como(CAIO, "select join_group($1)", [grupo.codigo]);
    assert.equal((await como(BETO, "select id from groups")).rows.length, 1);
    assert.ok(await falha(BETO, "select join_group('NAOEXISTE')"));
  });

  it("histórico registra tarefas, foco, notas e arquivos", async () => {
    tarefa = (await como(ANA, "insert into tasks (group_id, titulo) values ($1, 'Relatório') returning id", [grupo.id])).rows[0];
    await como(BETO, "update tasks set status = 'doing' where id = $1", [tarefa.id]);
    await como(BETO, "update tasks set status = 'done' where id = $1", [tarefa.id]);
    await como(BETO, "insert into focus_sessions (group_id, minutos, task_id) values ($1, 25, $2)", [grupo.id, tarefa.id]);
    await como(CAIO, "insert into notes (group_id, titulo) values ($1, 'Links')", [grupo.id]);
    await como(CAIO, "insert into files (group_id, nome, path) values ($1::uuid, 'a.pdf', $1::text || '/a.pdf')", [grupo.id]);
    await como(CAIO, "insert into files (group_id, nome, path, task_id) values ($1::uuid, 'b.pdf', $1::text || '/b.pdf', $2)", [grupo.id, tarefa.id]);
    const textos = (await como(ANA, "select texto from activity order by id")).rows.map((r) => r.texto);
    assert.deepEqual(textos, [
      "criou o grupo",
      "entrou no grupo",
      "entrou no grupo",
      'criou a tarefa "Relatório"',
      'moveu "Relatório" para Fazendo',
      'concluiu "Relatório"',
      'focou 25 min em "Relatório"',
      'fixou uma nota no mural: "Links"',
      'enviou o arquivo "a.pdf"',
      'anexou "b.pdf" em "Relatório"',
    ]);
    assert.ok(await falha(BETO, "insert into activity (group_id, tipo, texto) values ($1, 'x', 'falso')", [grupo.id]));
  });

  it("ninguém age em nome de outra pessoa", async () => {
    const msg = (await como(BETO, "insert into messages (group_id, texto) values ($1, 'oi') returning id", [grupo.id])).rows[0];
    assert.ok(await falha(BETO, "insert into messages (group_id, texto, user_id) values ($1, 'x', $2)", [grupo.id, ANA]));
    assert.ok(await falha(CAIO, "insert into message_reactions (message_id, group_id, emoji, user_id) values ($1, $2, '👍', $3)", [msg.id, grupo.id, ANA]));
    assert.ok(await falha(CAIO, "insert into task_comments (task_id, group_id, texto, user_id) values ($1, $2, 'x', $3)", [tarefa.id, grupo.id, ANA]));
    assert.ok(await falha(CAIO, "insert into focus_sessions (group_id, minutos, user_id) values ($1, 25, $2)", [grupo.id, ANA]));
  });

  it("enquete: um voto por pessoa, que pode ser trocado", async () => {
    const enq = (await como(ANA, `insert into notes (group_id, titulo, opcoes) values ($1, 'Dia?', '["Seg","Qua"]') returning id`, [grupo.id])).rows[0];
    await como(BETO, "insert into poll_votes (note_id, group_id, opcao) values ($1, $2, 0)", [enq.id, grupo.id]);
    await como(BETO, "insert into poll_votes (note_id, group_id, opcao) values ($1, $2, 1) on conflict (note_id, user_id) do update set opcao = excluded.opcao", [enq.id, grupo.id]);
    const votos = (await db.query("select opcao from poll_votes where note_id = $1", [enq.id])).rows;
    assert.deepEqual(votos, [{ opcao: 1 }]);
  });

  it("só o criador remove membros, e o removido perde o acesso", async () => {
    await como(BETO, "delete from group_members where user_id = $1", [CAIO]);
    assert.equal(await contar("select count(*)::int n from group_members where user_id = $1", [CAIO]), 1);
    await como(ANA, "delete from group_members where user_id = $1", [CAIO]);
    assert.equal(await contar("select count(*)::int n from group_members where user_id = $1", [CAIO]), 0);
    assert.equal((await como(CAIO, "select id from notes")).rows.length, 0);
    assert.equal((await como(CAIO, "select id from activity")).rows.length, 0);
  });

  it("tempo real ligado nas tabelas certas", async () => {
    const tabelas = (await db.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1")).rows.map((r) => r.tablename);
    assert.deepEqual(tabelas, ["activity", "files", "message_reactions", "messages", "notes", "poll_votes", "subjects", "task_comments", "tasks"]);
  });
});
