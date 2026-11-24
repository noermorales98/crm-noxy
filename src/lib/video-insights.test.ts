import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { insightsText, summarizeVideos } from "./video-insights.ts";

const videos = [
  { title: "A", platform: "TikTok", hookType: "pregunta", views: 10000, leadsGenerated: 3, durationSeconds: 30 },
  { title: "B", platform: "TikTok", hookType: "pregunta", views: 6000, durationSeconds: 40 },
  { title: "C", platform: "Instagram", hookType: "historia", views: 1000 },
  { title: "D", platform: "Instagram", hookType: "historia", views: 2000 },
  { title: "Sin vistas", platform: "Instagram", hookType: "dato" },
];

test("agrupa por gancho y plataforma y ordena por vistas promedio", () => {
  const s = summarizeVideos(videos);
  assert.equal(s.total, 5);
  assert.equal(s.withViews, 4);
  assert.equal(s.byHook[0].key, "pregunta");
  assert.equal(s.byHook[0].avgViews, 8000);
  assert.equal(s.byHook[0].totalLeads, 3);
  assert.equal(s.byPlatform[0].key, "TikTok");
  assert.equal(s.top[0].title, "A");
  assert.equal(s.avgDuration, 35);
});

test("el texto cita títulos reales y, con pocos datos, no inventa tendencias", () => {
  const rich = insightsText("Luna", summarizeVideos(videos));
  assert.match(rich, /«A»/);
  assert.match(rich, /pregunta/);
  assert.doesNotMatch(rich, /Sin vistas/);
  const poor = insightsText("Luna", summarizeVideos(videos.slice(0, 2)));
  assert.match(poor, /pocos para sacar conclusiones/);
});
