import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { MIN_STAGE_ROWS, pickStageRows } from "./dashboard-stages.ts";

const stage = (id: string, count: number) => ({ id, count });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id).join(",");

test("el mínimo es 5", () => assert.equal(MIN_STAGE_ROWS, 5));

test("con 5 o más etapas con deals, solo salen esas", () => {
  const stages = [stage("a", 1), stage("b", 0), stage("c", 2), stage("d", 3), stage("e", 1), stage("f", 4), stage("g", 0)];
  assert.equal(ids(pickStageRows(stages)), "a,c,d,e,f");
});

test("con menos de 5 se completan con las siguientes etapas vacías, sin cambiar el orden", () => {
  const stages = [stage("a", 0), stage("b", 2), stage("c", 0), stage("d", 0), stage("e", 1), stage("f", 0), stage("g", 0)];
  assert.equal(ids(pickStageRows(stages)), "a,b,c,d,e");
});

test("sin ningún deal salen las primeras 5 etapas", () => {
  const stages = ["a", "b", "c", "d", "e", "f", "g"].map((id) => stage(id, 0));
  assert.equal(ids(pickStageRows(stages)), "a,b,c,d,e");
});

test("si el CRM tiene menos de 5 etapas, salen todas", () => {
  assert.equal(ids(pickStageRows([stage("a", 0), stage("b", 3)])), "a,b");
  assert.deepEqual(pickStageRows([]), []);
});
