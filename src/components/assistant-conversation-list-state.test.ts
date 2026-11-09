import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { assistantConversationListReducer, groupConversationsByDay, INITIAL_ASSISTANT_CONVERSATION_LIST_STATE } from "./assistant-conversation-list-state.ts";

const existing = [{ id: "one", title: "Ventas de julio", updatedAt: "2026-07-16" }];

test("first load uses loading without claiming the list is empty", () => {
  assert.deepEqual(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
    status: "loading",
    conversations: [],
    hasSnapshot: false,
  });
});

test("refresh preserves the current conversation snapshot", () => {
  const ready = { status: "ready" as const, conversations: existing, hasSnapshot: true };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: existing,
    hasSnapshot: true,
  });
});

test("refreshing a legitimately empty ready list does not return to initial loading", () => {
  const ready = { status: "ready" as const, conversations: [], hasSnapshot: true };
  assert.deepEqual(assistantConversationListReducer(ready, { type: "request" }), {
    status: "refreshing",
    conversations: [],
    hasSnapshot: true,
  });
});

test("refresh errors preserve the previous snapshot", () => {
  const refreshing = { status: "refreshing" as const, conversations: existing, hasSnapshot: true };
  assert.deepEqual(assistantConversationListReducer(refreshing, { type: "error" }), {
    status: "error",
    conversations: existing,
    hasSnapshot: true,
  });
});

test("successful requests replace the snapshot", () => {
  const next = [{ id: "two", title: "Seguimiento", updatedAt: "2026-07-17" }];
  assert.deepEqual(
    assistantConversationListReducer(INITIAL_ASSISTANT_CONVERSATION_LIST_STATE, {
      type: "success",
      conversations: next,
    }),
    { status: "ready", conversations: next, hasSnapshot: true },
  );
});

test("retrying an initial error returns to loading instead of showing an empty history", () => {
  const failedInitialLoad = {
    status: "error" as const,
    conversations: [],
    hasSnapshot: false,
  };

  assert.deepEqual(assistantConversationListReducer(failedInitialLoad, { type: "request" }), {
    status: "loading",
    conversations: [],
    hasSnapshot: false,
  });
});

test("retrying after a successful empty snapshot remains a background refresh", () => {
  const failedRefresh = {
    status: "error" as const,
    conversations: [],
    hasSnapshot: true,
  };

  assert.deepEqual(assistantConversationListReducer(failedRefresh, { type: "request" }), {
    status: "refreshing",
    conversations: [],
    hasSnapshot: true,
  });
});

test("history groups by local day: Hoy, Ayer, Últimos 7 días, Anteriores; empty groups are dropped", () => {
  const now = new Date(2026, 10, 6, 15, 30);
  const at = (days: number, hour = 10) => new Date(2026, 10, 6 - days, hour).toISOString();
  const rows = [
    { id: "a", title: "Propuesta de rediseño para Clínica Sanar", updatedAt: at(0, 14) },
    { id: "b", title: "Resumen de tratos de octubre", updatedAt: at(0, 0) },
    { id: "c", title: "Correo de seguimiento a Grupo Ferrer", updatedAt: at(1, 23) },
    { id: "d", title: "Ideas de contenido para noviembre", updatedAt: at(3) },
    { id: "e", title: "Cotización de landing para Café Altura", updatedAt: at(6) },
    { id: "f", title: "Agenda de la semana del 2 de noviembre", updatedAt: at(7) },
    { id: "g", title: "Plan de octubre", updatedAt: at(30) },
  ];
  const groups = groupConversationsByDay(rows, now);
  assert.deepEqual(groups.map((g: { label: string; conversations: { id: string }[] }) => [g.label, g.conversations.map((c) => c.id)]), [
    ["Hoy", ["a", "b"]],
    ["Ayer", ["c"]],
    ["Últimos 7 días", ["d", "e", "f"]],
    ["Anteriores", ["g"]],
  ]);
  const total = groups.reduce((sum: number, g: { conversations: unknown[] }) => sum + g.conversations.length, 0);
  assert.equal(total, rows.length, "every conversation lands in exactly one group");
  assert.deepEqual(groupConversationsByDay([], now), []);
});
