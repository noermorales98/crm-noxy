import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { countMeetingTags, normalizeRestNote, parseActionItems, parseMcpMeetings, parseParticipantLine } from "./granola-parse.ts";

test("pasos: viñetas bajo «Siguientes pasos» y casillas pendientes", () => {
  const summary = [
    "# Resumen",
    "- Esto es contexto, no un paso",
    "## Siguientes pasos",
    "- **Enviar** la cotización el lunes",
    "- Agendar demo",
    "## Otro tema",
    "- Tampoco es un paso",
    "- [ ] Confirmar presupuesto",
    "- [x] Ya hecho",
  ].join("\n");
  assert.deepEqual(parseActionItems(summary), ["Enviar la cotización el lunes", "Agendar demo", "Confirmar presupuesto"]);
});

test("pasos: reconoce Action items en inglés y quita duplicados", () => {
  const summary = "### Action items\n1. Mandar contrato\n2. mandar contrato\n";
  assert.deepEqual(parseActionItems(summary), ["Mandar contrato"]);
});

test("pasos: sin estructura o sin resumen no hay pasos", () => {
  assert.deepEqual(parseActionItems("Solo un párrafo."), []);
  assert.deepEqual(parseActionItems(null), []);
  assert.deepEqual(parseActionItems(undefined), []);
});

test("pasos: máximo 30 y texto acotado", () => {
  const many = "## Next steps\n" + Array.from({ length: 50 }, (_, i) => `- paso ${i}`).join("\n");
  assert.equal(parseActionItems(many).length, 30);
  const long = `## Next steps\n- ${"a".repeat(900)}`;
  assert.equal(parseActionItems(long)[0].length, 500);
});

test("participante: nombre y correo en minúsculas; sin correo se descarta", () => {
  assert.deepEqual(parseParticipantLine("Ana Pérez (note creator) from Acme (Ana@Acme.com)"), { name: "Ana Pérez", email: "ana@acme.com" });
  assert.equal(parseParticipantLine("Alguien sin correo"), null);
});

const XML = `<meetings_data count="2">
<meeting id="m-1" title="Demo con Acme &amp; socios" date="Nov 6, 2026" meeting_at="2026-11-06T11:00:00.000-05:00" created_at="2026-11-06T11:00:00.000-05:00" updated_at="2026-11-07T10:00:00.000-05:00" url="https://notes.granola.ai/d/m-1">
  <known_participants>
  Ana Pérez (note creator) from Acme (ana@acme.com)
  Luis (attendee) (luis@otro.mx)
  </known_participants>
  <private_notes status="empty" />
  <summary>
## Siguientes pasos
- Enviar propuesta &lt;5 días
  </summary>
</meeting>
<meeting id="m-2" title="Con notas" meeting_at="2026-11-08T09:00:00.000-05:00">
  <known_participants>
  Sofía (x) (sofia@x.com)
  </known_participants>
  <private_notes>Nota mía</private_notes>
  <summary>Texto completo</summary>
</meeting>
</meetings_data>`;

test("MCP: lee reuniones, atributos, asistentes y notas privadas", () => {
  const [a, b] = parseMcpMeetings(XML);
  assert.equal(a.granolaId, "m-1");
  assert.equal(a.title, "Demo con Acme & socios");
  assert.equal(a.url, "https://notes.granola.ai/d/m-1");
  assert.equal(a.startedAt?.toISOString(), "2026-11-06T16:00:00.000Z");
  assert.equal(a.updatedAt?.toISOString(), "2026-11-07T15:00:00.000Z");
  assert.deepEqual(a.attendees.map((x: { email: string }) => x.email), ["ana@acme.com", "luis@otro.mx"]);
  assert.equal(a.privateNotes, null);
  assert.deepEqual(parseActionItems(a.summary), ["Enviar propuesta <5 días"]);
  assert.equal(b.granolaId, "m-2");
  assert.equal(b.privateNotes, "Nota mía");
  assert.equal(b.summary, "Texto completo");
  assert.equal(countMeetingTags(XML), 2);
});

test("MCP: una reunión cortada se descarta (no se guarda un resumen truncado) y se nota con el conteo", () => {
  const cut = XML.slice(0, XML.indexOf("Texto completo") + 5); // corta dentro del resumen de m-2
  const parsed = parseMcpMeetings(cut);
  assert.deepEqual(parsed.map((n: { granolaId: string }) => n.granolaId), ["m-1"]);
  assert.equal(countMeetingTags(cut), 2);
  assert.ok(parsed.length < countMeetingTags(cut));
});

test("MCP: sin reuniones devuelve lista vacía", () => {
  assert.deepEqual(parseMcpMeetings("<meetings_data count=\"0\"></meetings_data>"), []);
});

test("REST: usa el horario del evento, une asistentes e invitados y prefiere markdown", () => {
  const note = normalizeRestNote({
    id: "not_abc",
    title: null,
    web_url: "https://notes.granola.ai/d/x",
    created_at: "2026-11-06T16:05:00Z",
    updated_at: "2026-11-06T17:00:00Z",
    attendees: [{ name: "Ana", email: "Ana@Acme.com" }],
    calendar_event: { scheduled_start_time: "2026-11-06T16:00:00Z", scheduled_end_time: "2026-11-06T16:30:00Z", invitees: [{ email: "ana@acme.com" }, { email: "b@b.com" }] },
    summary_markdown: "## Next steps\n- Algo",
    summary_text: "texto",
    private_notes_text: "privado",
  });
  assert.equal(note?.startedAt?.toISOString(), "2026-11-06T16:00:00.000Z");
  assert.equal(note?.endedAt?.toISOString(), "2026-11-06T16:30:00.000Z");
  assert.deepEqual(note?.attendees.map((x: { email: string }) => x.email), ["ana@acme.com", "b@b.com"]);
  assert.equal(note?.summary, "## Next steps\n- Algo");
  assert.equal(note?.privateNotes, "privado");
  assert.equal(note?.title, null);
});

test("REST: sin evento cae a created_at; datos inválidos se descartan", () => {
  const note = normalizeRestNote({ id: "not_z", created_at: "2026-11-01T10:00:00Z", summary_text: "t" });
  assert.equal(note?.startedAt?.toISOString(), "2026-11-01T10:00:00.000Z");
  assert.equal(normalizeRestNote(null), null);
  assert.equal(normalizeRestNote({ title: "sin id" }), null);
});
