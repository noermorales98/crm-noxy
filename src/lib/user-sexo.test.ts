import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { isSexo, parseSexo, userAvatarSrc, welcomeGreeting } from "./user-sexo.ts";

test("femenino greeting and avatar", () => {
  assert.equal(welcomeGreeting("FEMENINO"), "Bienvenida");
  assert.equal(userAvatarSrc("FEMENINO"), "/femenino.svg");
});

test("masculino and missing sexo keep current defaults", () => {
  assert.equal(welcomeGreeting("MASCULINO"), "Bienvenido");
  assert.equal(welcomeGreeting(undefined), "Bienvenido");
  assert.equal(userAvatarSrc("MASCULINO"), "/avt.webp");
  assert.equal(userAvatarSrc(null), "/avt.webp");
  assert.equal(parseSexo("otro"), "MASCULINO");
  assert.equal(isSexo("FEMENINO"), true);
  assert.equal(isSexo("otro"), false);
});
