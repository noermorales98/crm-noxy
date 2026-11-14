import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { EDITORIAL_STAGES, SALES_STAGES, planStages } from "./pipeline-setup.ts";

const st = (id: string, name: string, order: number, f: { isWon?: boolean; isLost?: boolean } = {}) =>
  ({ id, name, order, color: "#6B7280", isWon: false, isLost: false, ...f });
const current = [
  st("1", "Lead", 1), st("2", "Contactado", 2), st("3", "Propuesta", 3),
  st("4", "Ganado", 4, { isWon: true }), st("5", "Perdido", 5, { isLost: true }),
];

test("renombra Propuesta, crea las nuevas y deja Ganado como legado sin perder su id", () => {
  const ops: any[] = planStages(current, SALES_STAGES);
  assert.deepEqual(ops.map((o: any) => o.name), ["Lead", "Contactado", "Cotizado", "Anticipo pagado", "En producción", "Entregado", "Ganado", "Perdido"]);
  const cot = ops.find((o: any) => o.name === "Cotizado");
  assert.equal(cot.stageId, "3");
  assert.equal(cot.type, "update");
  const nuevas = ops.filter((o: any) => o.type === "create").map((o: any) => o.name);
  assert.deepEqual(nuevas, ["Anticipo pagado", "En producción", "Entregado"]);
  const ganado = ops.find((o: any) => o.name === "Ganado");
  assert.equal(ganado.legacy, true);
  assert.equal(ganado.stageId, "4");
  assert.equal(ganado.isWon, true);
  assert.equal(ops.find((o: any) => o.name === "Perdido").stageId, "5");
  assert.ok(ops.every((o: any, i: number) => o.order === i + 1));
});

test("es idempotente: aplicar el resultado y volver a planear no cambia nada", () => {
  const ops: any[] = planStages(current, SALES_STAGES);
  const applied = ops.map((o: any, i: number) => ({ id: o.stageId ?? `n${i}`, name: o.name, order: o.order, color: o.color, isWon: o.isWon, isLost: o.isLost }));
  const again: any[] = planStages(applied, SALES_STAGES);
  assert.ok(again.every((o: any) => o.type === "keep"), JSON.stringify(again.filter((o: any) => o.type !== "keep")));
});

test("pipeline Editorial desde cero crea todo; nunca hay operaciones de borrado", () => {
  const ops: any[] = planStages([], EDITORIAL_STAGES);
  assert.equal(ops.length, 5);
  assert.ok(ops.every((o: any) => o.type === "create"));
  assert.equal(ops.find((o: any) => o.name === "Publicación KDP").isWon, true);
  assert.ok(ops.every((o: any) => ["keep", "update", "create"].includes(o.type)));
});

test("ignora acentos y mayúsculas al emparejar", () => {
  const ops: any[] = planStages([st("9", "LEAD", 1), st("8", "en produccion", 2)], SALES_STAGES);
  assert.equal(ops.find((o: any) => o.name === "En producción").stageId, "8");
  assert.equal(ops.find((o: any) => o.name === "Lead").stageId, "9");
});
