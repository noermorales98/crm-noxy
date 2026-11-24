import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { expandSkill, FACTORY_SKILLS, matchSkill, mergeSkills, parseCustomSkills, slugCommand, suggestSkills } from "./ai-skills.ts";

test("slugCommand deja un comando limpio", () => {
  assert.equal(slugCommand("/Guión Corto!"), "guion-corto");
  assert.equal(slugCommand("  ///x  "), "x");
  assert.equal(slugCommand("***"), "");
});

test("parseCustomSkills descarta lo inválido, repetidos y comandos de fábrica", () => {
  const stored = JSON.stringify([
    { command: "ideas", name: "Ideas", instructions: "Da 5 ideas" },
    { command: "IDEAS", instructions: "repetida" },
    { command: "guion", instructions: "choca con la de fábrica" },
    { command: "sin-instrucciones", instructions: "  " },
    "basura",
    { command: "!!!", instructions: "x" },
  ]);
  const out = parseCustomSkills(stored);
  assert.deepEqual(out.map((s: { command: string }) => s.command), ["ideas"]);
  assert.deepEqual(parseCustomSkills("no es json"), []);
  assert.deepEqual(parseCustomSkills(null), []);
});

test("matchSkill reconoce el comando solo si la habilidad está activa", () => {
  const skills = mergeSkills([], ["factory-seguimiento"]);
  assert.equal(matchSkill("/guion reel de café para Luna", skills)?.skill.command, "guion");
  assert.equal(matchSkill("/guion reel de café para Luna", skills)?.rest, "reel de café para Luna");
  assert.equal(matchSkill("/seguimiento a Ana", skills), null);
  assert.equal(matchSkill("hola /guion", skills), null);
  assert.equal(matchSkill("/inexistente x", skills), null);
});

test("expandSkill incluye las instrucciones y el pedido", () => {
  const text = expandSkill(FACTORY_SKILLS[0], "reel de café");
  assert.match(text, /HABILIDAD \/guion/);
  assert.match(text, /reel de café/);
  assert.match(expandSkill(FACTORY_SKILLS[0], ""), /sin detalles/);
});

test("suggestSkills filtra por lo escrito y no sugiere tras un espacio", () => {
  const skills = mergeSkills([]);
  assert.deepEqual(suggestSkills("/", skills).length, skills.length);
  assert.deepEqual(suggestSkills("/res", skills).map((s: { command: string }) => s.command), ["resumen-semanal"]);
  assert.deepEqual(suggestSkills("/guion algo", skills), []);
  assert.deepEqual(suggestSkills("guion", skills), []);
});
