import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { CONTEXT_BUDGET, RECORD_BUDGET, assembleSystemPrompt } from "./ai-prompt.ts";

const base = { relevant: "", pageSection: "", actions: "ACCIONES" };
const RECORD = "\n\n=== REGISTRO QUE LA PERSONA TIENE ABIERTO ===\nCITA ABIERTA: Primera sesión | invitado: Yaret <yaret@x.mx>\nNota: se acordó enviar el cuestionario el jueves.";

test("el registro abierto va antes que el resumen del CRM", () => {
  const out = assembleSystemPrompt({ ...base, summary: "RESUMEN DEL CRM", record: RECORD });
  assert.ok(out.indexOf("CITA ABIERTA") < out.indexOf("RESUMEN DEL CRM"));
  assert.ok(out.indexOf("RESUMEN DEL CRM") < out.indexOf("ACCIONES"));
});

test("explica que «esta persona / esta cita / aquí» es ese registro y que no se inventan datos", () => {
  const out = assembleSystemPrompt({ ...base, summary: "x", record: RECORD });
  assert.match(out, /esta cita/i);
  assert.match(out, /NO preguntes a quién/);
  assert.match(out, /nunca lo inventes/i);
});

test("si solo falta el correo, redacta igual y deja «to» vacío en lugar de preguntar el tema", () => {
  const out = assembleSystemPrompt({ ...base, summary: "x", record: RECORD });
  assert.match(out, /redacta igual/i);
  assert.match(out, /«to»/);
  assert.match(out, /No pidas el tema/);
});

test("un resumen enorme se recorta, pero el registro abierto queda completo", () => {
  const huge = "x".repeat(CONTEXT_BUDGET * 3);
  const out = assembleSystemPrompt({ ...base, summary: huge, record: RECORD });
  assert.ok(out.includes("se acordó enviar el cuestionario el jueves."), "el registro sigue completo");
  assert.ok(out.length < CONTEXT_BUDGET + 4000, "el prompt no se dispara");
});

test("un registro más largo que su tope se recorta, pero el resumen conserva un mínimo", () => {
  const bigRecord = "\n\n=== REGISTRO ===\n" + "y".repeat(RECORD_BUDGET * 2);
  const out = assembleSystemPrompt({ ...base, summary: "z".repeat(8000), record: bigRecord });
  const ys = (out.match(/y/g) ?? []).length;
  assert.ok(ys <= RECORD_BUDGET, "el registro respeta su tope");
  assert.ok((out.match(/z/g) ?? []).length >= 4000, "el resumen conserva al menos 4 000 caracteres");
});

test("lo relevante para la pregunta (marca, coincidencias) no lo desplaza el resumen", () => {
  const out = assembleSystemPrompt({ ...base, summary: "s".repeat(CONTEXT_BUDGET * 2), relevant: "\n=== MARCA MENCIONADA ===\nvoz cálida", record: RECORD });
  assert.match(out, /voz cálida/);
});

test("sin registro abierto no aparece el bloque de referencia", () => {
  const out = assembleSystemPrompt({ ...base, summary: "RESUMEN", record: "", pageSection: "\n=== CONTEXTO DE PÁGINA ACTUAL ===\nLista de contactos" });
  assert.doesNotMatch(out, /REGISTRO ABIERTO/);
  assert.match(out, /Lista de contactos/);
});

test("limpia los caracteres de recuadro y viñeta", () => {
  const out = assembleSystemPrompt({ ...base, summary: "═══ • dato │ fila", record: "" });
  assert.doesNotMatch(out, /[═•│]/);
});
