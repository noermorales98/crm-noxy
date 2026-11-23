import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { NEW_CATEGORY_STAGES, parseCategoryName, visiblePipelines } from "./pipeline-categories.ts";

test("parseCategoryName limpia espacios y rechaza vacío, largo y duplicado (sin acentos ni mayúsculas)", () => {
  assert.deepEqual(parseCategoryName({ name: "  Noxy   Cursos " }, []), { ok: true, name: "Noxy Cursos" });
  assert.equal(parseCategoryName({ name: "   " }, []).ok, false);
  assert.equal(parseCategoryName({}, []).ok, false);
  assert.equal(parseCategoryName({ name: "x".repeat(61) }, []).ok, false);
  assert.equal(parseCategoryName({ name: "noxy EDITORIAL" }, ["Noxy Editorial"]).ok, false);
  assert.equal(parseCategoryName({ name: "Revisión" }, ["revision"]).ok, false);
});

test("una categoría nueva nace con etapa ganadora y perdida", () => {
  assert.ok(NEW_CATEGORY_STAGES.some((s: { isWon: boolean }) => s.isWon));
  assert.ok(NEW_CATEGORY_STAGES.some((s: { isLost: boolean }) => s.isLost));
});

test("visiblePipelines: todos, uno, o todos si el elegido ya no existe", () => {
  const list = [{ id: "a" }, { id: "b" }];
  assert.equal(visiblePipelines(list, "all").length, 2);
  assert.deepEqual(visiblePipelines(list, "b"), [{ id: "b" }]);
  assert.equal(visiblePipelines(list, "borrada").length, 2);
});
