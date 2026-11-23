import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { PUBLISH_STATUSES, matchesPublishFilter, parsePublishStatus, publishStatusColor, publishStatusLabel, uploadedAtForStatus } from "./content-publish.ts";

test("el orden de estados incluye «aprobado» entre «editado» y «subido»", () => {
  assert.deepEqual([...PUBLISH_STATUSES], ["pendiente", "en_edicion", "editado", "aprobado", "subido"]);
});

test("«aprobado» se reconoce, tiene etiqueta y color propios y filtra", () => {
  assert.equal(parsePublishStatus("aprobado"), "aprobado");
  assert.equal(publishStatusLabel("aprobado"), "Aprobado");
  assert.notEqual(publishStatusColor("aprobado"), publishStatusColor("editado"));
  assert.equal(matchesPublishFilter("aprobado", "aprobado"), true);
  assert.equal(matchesPublishFilter("editado", "aprobado"), false);
});

test("uploadedAt solo se fija con «subido», no con «aprobado»", () => {
  assert.equal(uploadedAtForStatus("aprobado", "editado", null), null);
  assert.ok(uploadedAtForStatus("subido", "aprobado", null) instanceof Date);
});

test("un valor desconocido cae a «pendiente» y «listo» sigue siendo «editado»", () => {
  assert.equal(parsePublishStatus("x"), "pendiente");
  assert.equal(parsePublishStatus("listo"), "editado");
});
