import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { addStageFor, buildBoardColumns, dealsForColumn, dropStageFor } from "./pipeline-board.ts";

const st = (id: string, name: string, order: number, extra: Record<string, unknown> = {}, deals: unknown[] = []) => ({ id, name, order, isWon: false, isLost: false, deals, ...extra });
const sales = { id: "S", name: "Sales Pipeline", stages: [st("s1", "Lead", 0), st("s2", "Cotizado", 1), st("s3", "Entregado", 2, { isWon: true }), st("s4", "Perdido", 3, { isLost: true })] };
const edit = { id: "E", name: "Noxy Editorial", stages: [st("e1", "Entrevista", 0), st("e2", "Manuscrito", 1), st("e3", "Publicación KDP", 2, { isWon: true }), st("e4", "Perdido", 3, { isLost: true })] };

test("un solo conjunto de columnas: abiertas, luego ganadas y al final perdidas, y «Perdido» se junta", () => {
  const cols = buildBoardColumns([sales, edit]);
  assert.deepEqual(cols.map((c: { name: string }) => c.name), ["Lead", "Cotizado", "Entrevista", "Manuscrito", "Entregado", "Publicación KDP", "Perdido"]);
  const lost = cols[cols.length - 1];
  assert.deepEqual(lost.stageByPipeline, { S: "s4", E: "e4" });
});

test("el mismo nombre con distinto tipo no se mezcla", () => {
  const a = { id: "A", name: "A", stages: [st("a1", "Cerrado", 0, { isWon: true })] };
  const b = { id: "B", name: "B", stages: [st("b1", "Cerrado", 0)] };
  assert.equal(buildBoardColumns([a, b]).length, 2);
});

test("dealsForColumn junta los deals de todos los pipelines, el más reciente primero", () => {
  const p1 = { ...sales, stages: [st("s1", "Lead", 0, {}, [{ id: "d1", createdAt: "2026-01-01" }]), ...sales.stages.slice(1)] };
  const p2 = { ...edit, stages: [st("e4", "Perdido", 0, { isLost: true }, [{ id: "d2", createdAt: "2026-03-01" }]), ...edit.stages.slice(0, 0)] };
  const lostBoth = { ...p1, stages: [...p1.stages.slice(0, 3), st("s4", "Perdido", 3, { isLost: true }, [{ id: "d3", createdAt: "2026-02-01" }])] };
  const cols = buildBoardColumns([lostBoth, p2]);
  const lost = cols.find((c: { isLost: boolean }) => c.isLost);
  assert.deepEqual(dealsForColumn([lostBoth, p2], lost).map((d: { id: string }) => d.id), ["d2", "d3"]);
});

test("al soltar un deal solo vale la columna que su pipeline tiene", () => {
  const cols = buildBoardColumns([sales, edit]);
  const lead = cols.find((c: { name: string }) => c.name === "Lead");
  const lost = cols.find((c: { name: string }) => c.name === "Perdido");
  assert.equal(dropStageFor(lead, "S"), "s1");
  assert.equal(dropStageFor(lead, "E"), null, "un deal editorial no va a «Lead» de ventas");
  assert.equal(dropStageFor(lost, "E"), "e4");
  assert.equal(dropStageFor(lost, undefined), null);
});

test("agregar deal usa la etapa del pipeline elegido o la primera disponible", () => {
  const cols = buildBoardColumns([sales, edit]);
  const lost = cols.find((c: { name: string }) => c.name === "Perdido");
  assert.equal(addStageFor(lost, "E"), "e4");
  assert.equal(addStageFor(lost, null), "s4");
});
