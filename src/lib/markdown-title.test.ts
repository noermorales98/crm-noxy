import assert from "node:assert/strict";
import test from "node:test";
import { extractMarkdownTitle } from "./markdown-title.ts";

test("extrae el título de la primera línea # y lo quita del cuerpo", () => {
  const { title, body } = extractMarkdownTitle("# Reunión con Ana\n\n## Notas\n- Hola");
  assert.equal(title, "Reunión con Ana");
  assert.equal(body, "## Notas\n- Hola");
});

test("sin # no inventa título", () => {
  const { title, body } = extractMarkdownTitle("Solo texto\n\nMás");
  assert.equal(title, null);
  assert.equal(body, "Solo texto\n\nMás");
});

test("ignora ## y # vacío", () => {
  assert.equal(extractMarkdownTitle("## Sub\nOk").title, null);
  assert.equal(extractMarkdownTitle("#   \nOk").title, null);
});

test("solo # Título deja el cuerpo vacío", () => {
  const { title, body } = extractMarkdownTitle("# Solo título");
  assert.equal(title, "Solo título");
  assert.equal(body, "");
});
