import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error: import relativo con extensión para node --test
import { stripEmojis } from "./strip-emoji.ts";

test("quita emojis y deja el texto limpio", () => {
  assert.equal(stripEmojis("Listo ✅ tu cotización 🎉 está creada"), "Listo tu cotización está creada");
  assert.equal(stripEmojis("📍 Aquí estás\n➡️ Sigue"), "Aquí estás\nSigue");
});

test("no toca flechas, acentos ni símbolos normales", () => {
  const t = "Total → 1,200 © 2026 ™ ¿Qué tal? #1 *negrita* 100%";
  assert.equal(stripEmojis(t), t);
});

test("no toca los bloques de código (tarjetas de acción)", () => {
  const t = 'Mira 🎬\n```action\n{"title":"Video 🎬"}\n```\nFin 🚀';
  assert.equal(stripEmojis(t), 'Mira\n```action\n{"title":"Video 🎬"}\n```\nFin');
});

test("un bloque sin cerrar (llegando en streaming) también se respeta", () => {
  assert.equal(stripEmojis('Hola 👋\n```action\n{"a":"🎬'), 'Hola\n```action\n{"a":"🎬');
});

test("secuencias con ZWJ y tono de piel se quitan completas", () => {
  assert.equal(stripEmojis("Equipo 👩🏽‍💻 listo"), "Equipo listo");
});
