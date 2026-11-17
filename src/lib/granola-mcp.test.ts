import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { classifyMcpError, createMcpProvider, createMcpSource } from "./granola-mcp.ts";
// @ts-expect-error: node --test carga el .ts directo
import { GranolaError } from "./granola-client.ts";

const meeting = (id: string, updated: string, extra = "") =>
  `<meeting id="${id}" title="Reunión ${id}" meeting_at="2026-11-06T11:00:00.000-05:00" updated_at="${updated}" url="https://notes.granola.ai/d/${id}">${extra}</meeting>`;

const detail = (id: string) =>
  meeting(id, "2026-11-07T10:00:00.000-05:00", `<known_participants>\n  Ana (x) (ana@acme.com)\n  </known_participants><summary>## Next steps\n- Hacer ${id}</summary>`);

function fakeCaller(handler: (name: string, args: Record<string, unknown>) => string) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    callTool: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return handler(name, args);
    },
  };
}

test("lista con search_meetings, pagina y pide detalle solo de lo cambiado", async () => {
  const caller = fakeCaller((name, args) => {
    if (name === "search_meetings") {
      return args.cursor
        ? `<pagination has_more="false" /><meetings_data>${meeting("m3", "2026-11-07T10:00:00.000-05:00")}</meetings_data>`
        : `<pagination has_more="true" next_cursor="cur-2" /><meetings_data>${meeting("m1", "2026-11-07T10:00:00.000-05:00")}${meeting("m2", "2026-11-06T10:00:00.000-05:00")}</meetings_data>`;
    }
    const ids = args.meeting_ids as string[];
    return `<meetings_data>${ids.map(detail).join("")}</meetings_data>`;
  });
  const known = new Map([["m2", new Date("2026-11-06T10:00:00.000-05:00").getTime()]]);
  const { notes, complete } = await createMcpSource(caller).fetchNotes({ since: new Date("2026-11-01T00:00:00Z"), known, maxDetail: 10 });
  assert.equal(complete, true);
  assert.deepEqual(notes.map((n: { granolaId: string }) => n.granolaId), ["m1", "m3"]);
  assert.equal(notes[0].attendees[0].email, "ana@acme.com");
  const lists = caller.calls.filter((c) => c.name === "search_meetings");
  assert.equal(lists.length, 2);
  // Con corridas previas se filtra por fecha de ACTUALIZACIÓN, no por la de la reunión.
  assert.equal(lists[0].args.updated_after, "2026-11-01T00:00:00.000Z");
  assert.equal(lists[0].args.from_date, undefined);
  assert.equal(lists[1].args.cursor, "cur-2");
  const details = caller.calls.filter((c) => c.name === "get_meetings");
  assert.equal(details.length, 1);
  assert.deepEqual(details[0].args.meeting_ids, ["m1", "m3"]);
});

test("respeta el tope de detalle y agrupa en lotes de 10", async () => {
  const ids = Array.from({ length: 25 }, (_, i) => `m${i}`);
  const caller = fakeCaller((name, args) =>
    name === "search_meetings"
      ? `<pagination has_more="false" />${ids.map((id) => meeting(id, "2026-11-07T10:00:00.000-05:00")).join("")}`
      : (args.meeting_ids as string[]).map(detail).join(""),
  );
  const { notes, complete } = await createMcpSource(caller).fetchNotes({ since: null, known: new Map(), maxDetail: 22 });
  assert.equal(notes.length, 22);
  assert.equal(complete, false, "quedaron 3 sin traer por el tope");
  const first = caller.calls.find((c) => c.name === "search_meetings")!;
  assert.ok(typeof first.args.from_date === "string" && first.args.updated_after === undefined, "primera corrida: ventana de reuniones");
  const batches = caller.calls.filter((c) => c.name === "get_meetings").map((c) => (c.args.meeting_ids as string[]).length);
  assert.deepEqual(batches, [10, 10, 2]);
});

test("sin sesiones nuevas no se pide ningún detalle", async () => {
  const caller = fakeCaller(() => `<pagination has_more="false" /><meetings_data count="0"></meetings_data>`);
  const { notes, complete } = await createMcpSource(caller).fetchNotes({ since: null, known: new Map(), maxDetail: 10 });
  assert.deepEqual(notes, []);
  assert.equal(complete, true);
  assert.equal(caller.calls.filter((c) => c.name === "get_meetings").length, 0);
});

test("proveedor OAuth: metadata pública, `state` aleatorio guardado y credenciales vía almacén", async () => {
  const saved: Record<string, unknown> = {};
  const store = {
    loadClientInfo: async () => saved.client as never,
    saveClientInfo: async (v: unknown) => void (saved.client = v),
    loadTokens: async () => saved.tokens as never,
    saveTokens: async (v: unknown) => void (saved.tokens = v),
    loadVerifier: async () => String(saved.verifier ?? ""),
    saveVerifier: async (v: string) => void (saved.verifier = v),
    saveState: async (v: string) => void (saved.state = v),
  };
  let redirected: URL | null = null;
  const provider = createMcpProvider(store, "https://crm.example/api/granola/mcp/callback", (u: URL) => void (redirected = u));
  assert.equal(String(provider.redirectUrl), "https://crm.example/api/granola/mcp/callback");
  assert.deepEqual(provider.clientMetadata.redirect_uris, ["https://crm.example/api/granola/mcp/callback"]);
  assert.equal(provider.clientMetadata.token_endpoint_auth_method, "none");

  const a = await provider.state!();
  const b = await provider.state!();
  assert.notEqual(a, b);
  assert.equal(saved.state, b);

  await provider.saveCodeVerifier("v123");
  assert.equal(await provider.codeVerifier(), "v123");
  await provider.saveTokens({ access_token: "tok", token_type: "Bearer" });
  assert.equal((await provider.tokens())?.access_token, "tok");
  await provider.redirectToAuthorization(new URL("https://mcp-auth.granola.ai/authorize?x=1"));
  assert.equal(String(redirected), "https://mcp-auth.granola.ai/authorize?x=1");
});

test("has_more=false corta aunque venga un cursor", async () => {
  const caller = fakeCaller(() => `<pagination has_more="false" next_cursor="x" /><meetings_data></meetings_data>`);
  await createMcpSource(caller).fetchNotes({ since: null, known: new Map(), maxDetail: 10 });
  assert.equal(caller.calls.filter((c) => c.name === "search_meetings").length, 1);
});

test("un servidor con has_more perpetuo y todo conocido termina por el tope de 200 y queda incompleto", async () => {
  const known = new Map<string, number>();
  let page = 0;
  const caller = fakeCaller(() => {
    const batch = Array.from({ length: 30 }, (_, i) => `p${page}-${i}`);
    for (const id of batch) known.set(id, new Date("2026-11-07T10:00:00.000-05:00").getTime());
    page++;
    return `<pagination has_more="true" next_cursor="c${page}" />${batch.map((id) => meeting(id, "2026-11-07T10:00:00.000-05:00")).join("")}`;
  });
  const { complete } = await createMcpSource(caller).fetchNotes({ since: null, known, maxDetail: 10 });
  assert.equal(complete, false);
  assert.ok(caller.calls.length <= 8, `llamadas acotadas, fueron ${caller.calls.length}`);
});

test("un cursor repetido no avanza: se corta en vez de dar vueltas", async () => {
  const caller = fakeCaller(() => `<pagination has_more="true" next_cursor="igual" />`);
  const { complete } = await createMcpSource(caller).fetchNotes({ since: null, known: new Map(), maxDetail: 10 });
  assert.equal(complete, false);
  assert.ok(caller.calls.length <= 3);
});

test("página de listado cortada → incompleto", async () => {
  const caller = fakeCaller((name) => (name === "search_meetings" ? `<pagination has_more="false" />${meeting("m1", "2026-11-07T10:00:00.000-05:00")}<meeting id="m2" title="cortada" updated_at="2026-11-07T10:00:00.000-05:00">` : detail("m1")));
  const { notes, complete } = await createMcpSource(caller).fetchNotes({ since: null, known: new Map(), maxDetail: 10 });
  assert.equal(complete, false);
  assert.equal(notes.length, 1);
});

test("detalle con reuniones omitidas por tamaño → incompleto, y se conserva lo recibido", async () => {
  const caller = fakeCaller((name, args) =>
    name === "search_meetings"
      ? `<pagination has_more="false" />${meeting("m1", "2026-11-07T10:00:00.000-05:00")}${meeting("m2", "2026-11-07T10:00:00.000-05:00")}`
      : `<meetings_data>${detail((args.meeting_ids as string[])[0])}<omitted_meetings>m2</omitted_meetings></meetings_data>`,
  );
  const { notes, complete } = await createMcpSource(caller).fetchNotes({ since: null, known: new Map(), maxDetail: 10 });
  assert.equal(complete, false);
  assert.deepEqual(notes.map((n: { granolaId: string }) => n.granolaId), ["m1"]);
});

test("los argumentos de las herramientas son los esperados", async () => {
  const caller = fakeCaller((name, args) =>
    name === "search_meetings" ? `<pagination has_more="false" />${meeting("m1", "2026-11-07T10:00:00.000-05:00")}` : detail((args.meeting_ids as string[])[0]),
  );
  await createMcpSource(caller).fetchNotes({ since: null, known: new Map(), maxDetail: 10 });
  const list = caller.calls.find((c) => c.name === "search_meetings")!;
  assert.equal(list.args.limit, 30);
  assert.equal(list.args.max_participants, 0);
  const get = caller.calls.find((c) => c.name === "get_meetings")!;
  assert.equal(get.args.attachments, "none");
});

test("errores del MCP: un GranolaError se respeta (acceso caducado → reconectar), lo desconocido es pasajero", () => {
  const expired = new GranolaError("NEEDS_RECONNECT", "caducó");
  assert.equal(classifyMcpError(expired, "x"), expired);
  const other = classifyMcpError(new Error("boom"), "No se pudo consultar a Granola.");
  assert.equal(other.code, "UNAVAILABLE");
  assert.equal(other.message, "No se pudo consultar a Granola.");
});
