import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { DEFAULT_TEMPLATES, buildTaskDrafts, parseTemplateTasks, pickService } from "./project-templates.ts";

test("pickService: pipeline Editorial y palabras clave, General por defecto", () => {
  assert.equal(pickService({ title: "Ana", pipelineName: "Noxy Editorial" }), "Libro Editorial");
  assert.equal(pickService({ title: "Paquete de reels mensual" }), "Videos con IA");
  assert.equal(pickService({ title: "Manejo de redes sociales" }), "Gestión de redes");
  assert.equal(pickService({ title: "Landing page", notes: null }), "Sitio web");
  assert.equal(pickService({ title: "Consultoría" }), "General");
});

test("buildTaskDrafts calcula fechas relativas al día ganado", () => {
  const drafts = buildTaskDrafts([{ title: "A", offsetDays: 0 }, { title: "B", offsetDays: 3 }], new Date("2026-11-14T03:00:00Z"));
  assert.equal(drafts[0].dueDate.toISOString(), "2026-11-14T12:00:00.000Z");
  assert.equal(drafts[1].dueDate.toISOString(), "2026-11-17T12:00:00.000Z");
});

test("parseTemplateTasks tolera basura y normaliza", () => {
  assert.deepEqual(parseTemplateTasks("no json"), []);
  assert.deepEqual(parseTemplateTasks('{"a":1}'), []);
  assert.deepEqual(parseTemplateTasks('[{"title":" X ","offsetDays":-2},{"nope":1}]'), [{ title: "X", offsetDays: 0, description: undefined }]);
});

test("las plantillas por defecto tienen servicio único y tareas válidas", () => {
  const services = DEFAULT_TEMPLATES.map((t: any) => t.service);
  assert.equal(new Set(services).size, services.length);
  assert.ok(DEFAULT_TEMPLATES.every((t: any) => t.tasks.length >= 4 && t.tasks.every((x: any) => x.title && x.offsetDays >= 0)));
  assert.ok(services.includes("General") && services.includes("Libro Editorial"));
});
