import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { approvalBlocked, buildReviewPrompt, formatReviewNote, parseReview, verdictOfNote } from "./content-review.ts";

test("parseReview entiende los tres veredictos y no bloquea si el modelo no sigue el formato", () => {
  assert.equal(parseReview("VEREDICTO: OK\nTodo bien").verdict, "ok");
  assert.equal(parseReview("Veredicto: observaciones\n- falta tilde").verdict, "issues");
  assert.equal(parseReview("VEREDICTO: GRAVE\n- dato falso").verdict, "blocking");
  assert.equal(parseReview("Me parece bien, aunque…").verdict, "issues");
  assert.equal(parseReview("VEREDICTO: OK").body, "Todo en orden.");
});

test("la nota de revisión se reconoce después y distingue el veredicto", () => {
  for (const v of ["ok", "issues", "blocking"] as const) {
    assert.equal(verdictOfNote(formatReviewNote(v, "detalle")), v);
  }
  assert.equal(verdictOfNote("Nota normal de la editora"), null);
  assert.equal(verdictOfNote(null), null);
});

test("solo bloquea 'aprobado' con la opción activa, revisión grave y sin forzar", () => {
  const grave = formatReviewNote("blocking", "x");
  assert.equal(approvalBlocked(grave, true), true);
  assert.equal(approvalBlocked(grave, false), false);
  assert.equal(approvalBlocked(grave, true, true), false);
  assert.equal(approvalBlocked(formatReviewNote("issues", "x"), true), false);
  assert.equal(approvalBlocked("nota de la editora", true), false);
});

test("el prompt incluye la voz de la marca, o avisa de que no hay y no juzga el tono", () => {
  const withVoice = buildReviewPrompt({ title: "T", type: "reel", brandName: "Luna", brandVoice: "Tono cálido" });
  assert.match(withVoice.user, /Tono cálido/);
  const without = buildReviewPrompt({ title: "T", type: "reel", brandName: "Luna" });
  assert.match(without.user, /sin definir/);
  assert.match(without.system, /VEREDICTO/);
});
