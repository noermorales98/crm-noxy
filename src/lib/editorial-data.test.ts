import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Native Node test runner needs the TypeScript extension.
import { createSampleData, counts, overdueTasks, restoreCompleted, restoreWorkspace, SAMPLE_DEALS } from "./editorial-data.ts";
test("completing the priority task updates all derived counts and removes the overdue finding", () => {
  const data = createSampleData();
  assert.deepEqual(counts(data), { contacts: 6, tasks: 6, appointments: 3, projects: 2 });
  data.tasks = data.tasks.map(t => t.id === "t1" ? { ...t, completed: true } : t);
  assert.equal(counts(data).tasks, 5);
  assert.equal(overdueTasks(data).length, 0);
});
test("missing dates sort safely and empty data has honest zeros", () => {
  const data = createSampleData();
  data.tasks = []; data.projects = []; data.contacts = []; data.appointments = [];
  assert.deepEqual(counts(data), { contacts: 0, tasks: 0, appointments: 0, projects: 0 });
  assert.equal(overdueTasks(data).length, 0);
});
test("restoring sample completion rejects malformed browser storage", () => {
  const tasks = createSampleData().tasks;
  assert.deepEqual(restoreCompleted(tasks, [{ id: "t1" }]), tasks);
  assert.equal(restoreCompleted(tasks, ["t1", "t7", "t8"]).filter(t => t.completed).length, 3);
});
test("stage totals reconcile to the pipeline using integer cents", () => {
  const total = SAMPLE_DEALS.reduce((s, d) => s + d.cents, 0);
  assert.equal(total, 6000000);
  assert.equal(SAMPLE_DEALS.filter(d => d.stage === "Contacto").reduce((s, d) => s + d.cents, 0), 1800000);
});

// @ts-expect-error Native Node test runner needs the TypeScript extension.
import { isPublicPagePath, resolveRouteAccess } from "./permissions.ts";
test("only the isolated sample route and its explicit brand assets are public", () => {
  assert.equal(isPublicPagePath("/design-preview"), true);
  assert.equal(isPublicPagePath("/design-preview/private"), false);
  assert.equal(isPublicPagePath("/Isotipo_Azul.svg"), true);
  assert.equal(isPublicPagePath("/fonts/open-sauce-two/open-sauce-two-latin-400-normal.woff2"), true);
  assert.equal(isPublicPagePath("/fonts/secret.txt"), false);
  assert.deepEqual(resolveRouteAccess("/api/tasks"), { kind: "module", module: "crm" });
  assert.deepEqual(resolveRouteAccess("/"), { kind: "module", module: "crm" });
});

test("sample cache keeps locally created records and rejects malformed dates", () => {
  const fallback = createSampleData();
  const cached = createSampleData();
  cached.tasks.push({ id: "local-task", title: "Revisar entrega", owner: "Lucía Vega", projectId: null, due: null, completed: false });
  assert.equal(restoreWorkspace(fallback, cached).tasks.length, 9);
  cached.tasks[0].due = "not-a-date";
  assert.equal(restoreWorkspace(fallback, cached), fallback);
});
