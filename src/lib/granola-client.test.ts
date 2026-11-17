import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { createRestSource, GranolaError, isUnchanged, statusForError, windowStart } from "./granola-client.ts";

type Reply = { status?: number; body?: unknown };

function fakeFetch(replies: Reply[]) {
  const calls: { url: string; auth: string | null }[] = [];
  const fn = (async (url: string, init: { headers: Record<string, string> }) => {
    calls.push({ url, auth: init.headers.Authorization ?? null });
    const reply = replies.shift() ?? { status: 500 };
    const status = reply.status ?? 200;
    return { status, ok: status >= 200 && status < 300, json: async () => reply.body } as Response;
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const noSleep = async () => {};

test("clave inválida → INVALID_KEY y la clave solo viaja en la cabecera", async () => {
  const { fn, calls } = fakeFetch([{ status: 401 }]);
  const source = createRestSource("grn_secreta", { fetchFn: fn, sleepFn: noSleep });
  await assert.rejects(() => source.check(), (e: InstanceType<typeof GranolaError>) => e.code === "INVALID_KEY" && !e.message.includes("grn_secreta"));
  assert.equal(calls[0].auth, "Bearer grn_secreta");
  assert.ok(!calls[0].url.includes("grn_secreta"));
});

test("403 → FORBIDDEN; 500 → UNAVAILABLE", async () => {
  const a = createRestSource("k", { fetchFn: fakeFetch([{ status: 403 }]).fn, sleepFn: noSleep });
  await assert.rejects(() => a.check(), (e: InstanceType<typeof GranolaError>) => e.code === "FORBIDDEN");
  const b = createRestSource("k", { fetchFn: fakeFetch([{ status: 500 }]).fn, sleepFn: noSleep });
  await assert.rejects(() => b.check(), (e: InstanceType<typeof GranolaError>) => e.code === "UNAVAILABLE");
});

test("429 reintenta una vez; si persiste → RATE_LIMITED", async () => {
  const ok = createRestSource("k", { fetchFn: fakeFetch([{ status: 429 }, { body: { notes: [] } }]).fn, sleepFn: noSleep });
  await ok.check();
  const bad = createRestSource("k", { fetchFn: fakeFetch([{ status: 429 }, { status: 429 }]).fn, sleepFn: noSleep });
  await assert.rejects(() => bad.check(), (e: InstanceType<typeof GranolaError>) => e.code === "RATE_LIMITED");
});

test("lista paginada, salta lo que no cambió y pide solo el detalle de lo nuevo", async () => {
  const unchanged = "2026-11-05T10:00:00.000Z";
  const { fn, calls } = fakeFetch([
    { body: { notes: [{ id: "not_old", updated_at: unchanged }, { id: "not_new", updated_at: "2026-11-06T10:00:00Z" }], hasMore: true, cursor: "c2" } },
    { body: { notes: [{ id: "not_edit", updated_at: "2026-11-07T10:00:00Z" }], hasMore: false, cursor: null } },
    { body: { id: "not_new", title: "Nueva", created_at: "2026-11-06T09:00:00Z", summary_text: "x" } },
    { body: { id: "not_edit", title: "Editada", created_at: "2026-11-07T09:00:00Z", summary_text: "y" } },
  ]);
  const source = createRestSource("k", { fetchFn: fn, sleepFn: noSleep });
  const { notes, complete } = await source.fetchNotes({ since: new Date("2026-11-01T00:00:00Z"), known: new Map([["not_old", new Date(unchanged).getTime()]]), maxDetail: 10 });
  assert.equal(complete, true);
  assert.deepEqual(notes.map((n: { granolaId: string }) => n.granolaId), ["not_new", "not_edit"]);
  assert.equal(calls.length, 4);
  assert.match(calls[0].url, /updated_after=2026-11-01T00%3A00%3A00.000Z/);
  assert.match(calls[1].url, /cursor=c2/);
  assert.ok(calls[2].url.endsWith("/v1/notes/not_new"));
});

test("respeta el tope de detalle por corrida", async () => {
  const { fn } = fakeFetch([
    { body: { notes: [{ id: "not_a", updated_at: "2026-11-06T10:00:00Z" }, { id: "not_b", updated_at: "2026-11-06T11:00:00Z" }], hasMore: false } },
    { body: { id: "not_a", summary_text: "x" } },
  ]);
  const { notes, complete } = await createRestSource("k", { fetchFn: fn, sleepFn: noSleep }).fetchNotes({ since: null, known: new Map(), maxDetail: 1 });
  assert.equal(notes.length, 1);
  assert.equal(complete, false, "con tope alcanzado la ventana no se da por cubierta");
});

test("espacia las peticiones (ritmo de la API)", async () => {
  const waits: number[] = [];
  const { fn } = fakeFetch([{ body: { notes: [{ id: "not_a", updated_at: "2026-11-06T10:00:00Z" }], hasMore: false } }, { body: { id: "not_a", summary_text: "x" } }]);
  await createRestSource("k", { fetchFn: fn, sleepFn: async (ms: number) => void waits.push(ms) }).fetchNotes({ since: null, known: new Map(), maxDetail: 5 });
  assert.deepEqual(waits, [220]);
});

test("isUnchanged compara por milisegundos y necesita fecha", () => {
  const d = new Date("2026-11-06T10:00:00Z");
  assert.equal(isUnchanged(new Map([["a", d.getTime()]]), "a", d), true);
  assert.equal(isUnchanged(new Map([["a", 1]]), "a", d), false);
  assert.equal(isUnchanged(new Map(), "a", d), false);
  assert.equal(isUnchanged(new Map([["a", 1]]), "a", null), false);
});

test("429 espera 2 s antes de reintentar", async () => {
  const waits: number[] = [];
  const source = createRestSource("k", { fetchFn: fakeFetch([{ status: 429 }, { body: { notes: [] } }]).fn, sleepFn: async (ms: number) => void waits.push(ms) });
  await source.check();
  assert.ok(waits.includes(2000));
});

test("un 429 persistente a media corrida conserva lo ya traído y marca incompleto", async () => {
  const { fn } = fakeFetch([
    { body: { notes: [{ id: "not_a", updated_at: "2026-11-06T10:00:00Z" }, { id: "not_b", updated_at: "2026-11-06T11:00:00Z" }], hasMore: false } },
    { body: { id: "not_a", summary_text: "x" } },
    { status: 429 },
    { status: 429 },
  ]);
  const { notes, complete } = await createRestSource("k", { fetchFn: fn, sleepFn: noSleep }).fetchNotes({ since: null, known: new Map(), maxDetail: 10 });
  assert.deepEqual(notes.map((n: { granolaId: string }) => n.granolaId), ["not_a"]);
  assert.equal(complete, false);
});

test("sin nada traído, un 429 persistente sí es un error", async () => {
  const { fn } = fakeFetch([{ body: { notes: [{ id: "not_a", updated_at: "2026-11-06T10:00:00Z" }], hasMore: false } }, { status: 429 }, { status: 429 }]);
  await assert.rejects(() => createRestSource("k", { fetchFn: fn, sleepFn: noSleep }).fetchNotes({ since: null, known: new Map(), maxDetail: 10 }), (e: InstanceType<typeof GranolaError>) => e.code === "RATE_LIMITED");
});

test("windowStart: sin fecha son 30 días atrás; con fecha se respeta", () => {
  assert.equal(windowStart(null, new Date("2026-11-30T00:00:00Z")).toISOString(), "2026-10-31T00:00:00.000Z");
  const given = new Date("2026-11-02T00:00:00Z");
  assert.equal(windowStart(given), given);
});

test("sin `since` la lista pide la ventana de 30 días", async () => {
  const { fn, calls } = fakeFetch([{ body: { notes: [], hasMore: false } }]);
  await createRestSource("k", { fetchFn: fn, sleepFn: noSleep }).fetchNotes({ since: null, known: new Map(), maxDetail: 5 });
  const asked = new URL(calls[0].url).searchParams.get("updated_after")!;
  const days = (Date.now() - new Date(asked).getTime()) / 86_400_000;
  assert.ok(days > 29.9 && days < 30.1);
});

test("estado tras un fallo: credenciales malas piden reconectar; lo demás es error pasajero", () => {
  assert.equal(statusForError("INVALID_KEY"), "NEEDS_RECONNECT");
  assert.equal(statusForError("NEEDS_RECONNECT"), "NEEDS_RECONNECT");
  assert.equal(statusForError("RATE_LIMITED"), "ERROR");
  assert.equal(statusForError("UNAVAILABLE"), "ERROR");
  assert.equal(statusForError("FORBIDDEN"), "ERROR");
});
