import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { allowRequest, buildFormSubmission, parseDemoRequest } from "./demo-request.ts";

const ok = { name: "Ana Pérez", email: "Ana@Empresa.com", company: "Acme", phone: "+52 998 123 4567", message: "Quiero ver el pipeline" };

test("solicitud válida: recorta, pasa el correo a minúsculas y conserva el resto", () => {
  const r = parseDemoRequest({ ...ok, name: "  Ana   Pérez " });
  assert.equal(r.ok, true);
  if (r.ok === true) {
    assert.equal(r.value.name, "Ana Pérez");
    assert.equal(r.value.email, "ana@empresa.com");
    assert.equal(r.value.company, "Acme");
    assert.equal(r.value.phone, "+52 998 123 4567");
  }
});

test("opcionales vacíos son válidos; nombre y correo son obligatorios", () => {
  assert.equal(parseDemoRequest({ name: "Luis", email: "luis@x.com" }).ok, true);
  assert.deepEqual(parseDemoRequest({ name: "", email: "luis@x.com" }), { ok: false, error: "Escribe tu nombre." });
  assert.deepEqual(parseDemoRequest({ name: "L", email: "luis@x.com" }), { ok: false, error: "Escribe tu nombre." });
  assert.equal(parseDemoRequest({ name: "Luis", email: "no-es-correo" }).ok, false);
  assert.equal(parseDemoRequest({ name: "Luis", email: "a@b" }).ok, false);
  assert.equal(parseDemoRequest({ name: "Luis", email: "a b@c.com" }).ok, false);
  assert.equal(parseDemoRequest({ name: "Luis", email: "luis@x.com", phone: "123" }).ok, false);
});

test("cuerpos que no son objeto se rechazan sin lanzar", () => {
  for (const body of [null, undefined, "x", 5, []]) assert.notEqual(parseDemoRequest(body as never).ok, true);
});

test("el campo trampa lleno es un robot: se descarta en silencio", () => {
  assert.deepEqual(parseDemoRequest({ ...ok, website: "http://spam.example" }), { ok: "bot" });
  assert.equal(parseDemoRequest({ ...ok, website: "   " }).ok, true, "vacío o espacios no es un robot");
});

test("se quitan etiquetas y caracteres de control; los tamaños se acotan", () => {
  const r = parseDemoRequest({ name: "<img src=x onerror=alert(1)>Ana", email: "a@b.co", company: "<b>Acme</b>\u0007", message: "hola\n\n\n\n<script>x</script>adiós" });
  assert.equal(r.ok, true);
  if (r.ok === true) {
    assert.ok(!/[<>]/.test(r.value.name + r.value.company + r.value.message));
    assert.ok(!r.value.company.includes("\u0007"));
    assert.ok(!r.value.message.includes("\n\n\n"));
  }
  const long = parseDemoRequest({ name: "n".repeat(500), email: "a@b.co", message: "m".repeat(5000) });
  if (long.ok === true) {
    assert.equal(long.value.name.length, 120);
    assert.equal(long.value.message.length, 1000);
  }
});

test("el teléfono solo conserva caracteres de teléfono", () => {
  const r = parseDemoRequest({ name: "Ana", email: "a@b.co", phone: "+52 (998) 123-4567 ext<1>" });
  if (r.ok === true) assert.match(r.value.phone, /^[\d+()\-\s.]+$/);
});

const request = { name: "Ana Pérez", email: "ana@x.com", company: "Acme", phone: "+52 998 1234567", message: "Hola" };

test("mapeo por tipo: correo, teléfono, mensaje, empresa y nombre a sus campos", () => {
  const fields = [
    { type: "TEXT", name: "nombre1", label: "Nombre" },
    { type: "EMAIL", name: "correo1", label: "Correo" },
    { type: "PHONE", name: "phone1", label: "Teléfono" },
    { type: "TEXT", name: "empresa1", label: "Empresa" },
    { type: "TEXTAREA", name: "notas1", label: "¿Qué quieres resolver?" },
  ];
  assert.deepEqual(buildFormSubmission(fields, request), { nombre1: "Ana Pérez", correo1: "ana@x.com", phone1: "+52 998 1234567", empresa1: "Acme", notas1: "Hola" });
});

test("mapeo: si se renombran los campos en el CRM sigue funcionando; lo vacío no se envía", () => {
  const fields = [
    { type: "EMAIL", name: "x9", label: "Mail" },
    { type: "TEXT", name: "quien", label: "Persona" },
    { type: "TEXT", name: "org", label: "Company" },
  ];
  const out = buildFormSubmission(fields, { ...request, company: "", phone: "", message: "" });
  assert.deepEqual(out, { x9: "ana@x.com", quien: "Ana Pérez" });
});

test("límite por dirección: 5 por hora, y la ventana se libera con el tiempo", () => {
  const hits = new Map<string, number[]>();
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(allowRequest(hits, "1.2.3.4", t + i), true);
  assert.equal(allowRequest(hits, "1.2.3.4", t + 10), false, "la sexta se rechaza");
  assert.equal(allowRequest(hits, "5.6.7.8", t + 10), true, "otra dirección no se ve afectada");
  assert.equal(allowRequest(hits, "1.2.3.4", t + 61 * 60_000), true, "pasada la hora vuelve a permitir");
});
