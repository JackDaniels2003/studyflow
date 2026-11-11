// Testes do gerador de ids usado quando o site roda em HTTP (sem crypto.randomUUID).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { novoId } from "../lib/id.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Simula um navegador em HTTP: sem randomUUID, só com getRandomValues.
const semRandomUUID = { getRandomValues: (bytes) => globalThis.crypto.getRandomValues(bytes) };

describe("novoId", () => {
  it("usa crypto.randomUUID quando existe", () => {
    assert.equal(novoId({ randomUUID: () => "fixo" }), "fixo");
    assert.match(novoId(), UUID_V4);
  });

  it("sem randomUUID (HTTP), ainda gera um UUID v4 válido", () => {
    assert.match(novoId(semRandomUUID), UUID_V4);
  });

  it("sem crypto nenhum, cai no Math.random e continua válido", () => {
    assert.match(novoId({}), UUID_V4);
    assert.match(novoId(null), UUID_V4);
  });

  it("não repete ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => novoId(semRandomUUID)));
    assert.equal(ids.size, 1000);
  });
});
