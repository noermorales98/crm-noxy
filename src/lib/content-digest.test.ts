import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { buildContentDigestLines } from "./content-digest.ts";

const item = (date: string, status: string, title = "Reel", clientName = "Casa Alba") => ({ date: new Date(`${date}T12:00:00Z`), title, publishStatus: status, clientName });

test("separa lo que se sube hoy, lo próximo y lo atrasado", () => {
  const lines = buildContentDigestLines(
    [item("2026-11-23", "editado", "Hoy A"), item("2026-11-24", "pendiente", "Mañana"), item("2026-11-28", "pendiente", "Lejos"), item("2026-11-20", "en_edicion", "Viejo"), item("2026-11-20", "subido", "Ya subido")],
    "2026-11-23",
  );
  assert.match(lines[0], /hoy 1 \| próximos 3 días 1 \| atrasadas sin subir 1/);
  const text = lines.join("\n");
  assert.match(text, /SE SUBEN HOY: 1/);
  assert.match(text, /Casa Alba: Hoy A \(Editado\)/);
  assert.match(text, /Mañana \(Pendiente\)/);
  assert.match(text, /Viejo \(En edición\)/);
  assert.doesNotMatch(text, /Lejos/, "fuera de la ventana de 3 días");
  assert.doesNotMatch(text, /Ya subido/, "lo subido no es pendiente");
});

test("sin piezas devuelve solo el encabezado en ceros", () => {
  assert.deepEqual(buildContentDigestLines([], "2026-11-23"), ["CONTENIDO: hoy 0 | próximos 3 días 0 | atrasadas sin subir 0"]);
});

test("una pieza de hoy ya subida cuenta en «hoy» pero no como pendiente", () => {
  const lines = buildContentDigestLines([item("2026-11-23", "subido")], "2026-11-23");
  assert.match(lines.join("\n"), /\(Subido\)/);
  assert.match(lines[0], /atrasadas sin subir 0/);
});
