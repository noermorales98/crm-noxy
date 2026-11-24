import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error: import relativo con extensión para node --test
import { buildCapabilityChips, CAPABILITY_EXAMPLES } from "./ai-capabilities.ts";

const skill = (command: string, over: Record<string, unknown> = {}) => ({ id: `s-${command}`, command, name: command, description: "", instructions: "x", enabled: true, ...over });

test("sin habilidades: solo ejemplos, hasta el máximo", () => {
  const chips = buildCapabilityChips([], "a", 6);
  assert.equal(chips.length, 6);
  assert.ok(chips.every((c: { kind: string }) => c.kind === "example"));
});

test("las habilidades activas salen como /comando y las desactivadas no", () => {
  const chips = buildCapabilityChips([skill("guion", { builtin: true }), skill("viejo", { enabled: false, builtin: true })], "a", 6);
  assert.ok(chips.some((c: { text: string }) => c.text === "/guion "));
  assert.ok(!chips.some((c: { text: string }) => c.text === "/viejo "));
});

test("las habilidades propias van antes que las de fábrica y no pasan de la mitad", () => {
  const skills = [skill("f1", { builtin: true }), skill("f2", { builtin: true }), skill("f3", { builtin: true }), skill("f4", { builtin: true }), skill("mia")];
  const chips = buildCapabilityChips(skills, "a", 6);
  assert.equal(chips[0].text, "/mia ");
  assert.equal(chips.filter((c: { kind: string }) => c.kind === "skill").length, 3);
  assert.equal(chips.length, 6);
});

test("misma semilla, mismo resultado; otra semilla puede cambiar los ejemplos", () => {
  assert.deepEqual(buildCapabilityChips([], "x"), buildCapabilityChips([], "x"));
  const all = new Set<string>();
  for (const s of ["a", "b", "c", "d", "e", "f", "g"]) buildCapabilityChips([], s).forEach((c: { id: string }) => all.add(c.id));
  assert.ok(all.size > 6);
  assert.ok(CAPABILITY_EXAMPLES.length >= 8);
});
