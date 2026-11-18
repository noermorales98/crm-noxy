import assert from "node:assert/strict";
import test from "node:test";
import { formatLeadPersonNotes, parseLeadPersonFromNotes } from "./lead-person.ts";

test("formatea y parsea la persona del lead", () => {
  const notes = formatLeadPersonNotes(
    { firstName: "Ana", lastName: "Ruiz", email: "ana@example.com", phone: "+52 1" },
    "Form Details:\nEmpresa: Acme",
  );
  assert.match(notes, /^Nombre: Ana Ruiz/);
  assert.match(notes, /Email: ana@example.com/);
  const person = parseLeadPersonFromNotes(notes);
  assert.deepEqual(person, { firstName: "Ana", lastName: "Ruiz", email: "ana@example.com", phone: "+52 1" });
});

test("sin bloque usa el título como nombre", () => {
  const person = parseLeadPersonFromNotes("solo notas", "Luis Pérez — Formulario");
  assert.equal(person?.firstName, "Luis");
  assert.equal(person?.lastName, "Pérez — Formulario");
});
