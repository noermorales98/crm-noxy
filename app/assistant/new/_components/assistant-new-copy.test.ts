import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import {
  ASSISTANT_NEW_COPY,
  assistantGreetingOptions,
  pickAssistantGreeting,
} from "./assistant-new-copy.ts";

test("assistant new experience exposes the approved Spanish copy", () => {
  assert.equal(ASSISTANT_NEW_COPY.subtitle, "¿Qué tipo de referencias estás buscando?");
  assert.equal(
    ASSISTANT_NEW_COPY.promptLabel,
    "Describe las referencias que estás buscando",
  );
  assert.equal(
    ASSISTANT_NEW_COPY.promptHint,
    "Presiona Enter para enviar o Shift + Enter para una nueva línea.",
  );
  assert.equal(ASSISTANT_NEW_COPY.sendLabel, "Enviar mensaje");
  assert.deepEqual(ASSISTANT_NEW_COPY.prompts, [
    "Crea el diseño de un dashboard financiero",
    "Diseña una identidad de marca con la letra M",
    "Crea un efecto de cristal líquido",
    "Diseña una animación de carga",
    "Crea una landing page para SaaS",
  ]);
});

test("assistant new images and legal copy are fully localized", () => {
  assert.deepEqual(ASSISTANT_NEW_COPY.cards, [
    "Referencia de composición editorial",
    "Referencia de interfaz de producto",
    "Referencia de identidad de marca",
  ]);
  assert.equal(
    ASSISTANT_NEW_COPY.legalPrefix,
    "Al enviar un mensaje a ChatBot, aceptas nuestros",
  );
  assert.equal(ASSISTANT_NEW_COPY.terms, "Términos");
  assert.equal(ASSISTANT_NEW_COPY.legalJoin, "y confirmas que leíste nuestra");
  assert.equal(ASSISTANT_NEW_COPY.privacy, "Política de privacidad");
});

test("assistant greeting stays short and follows the hour and name", () => {
  const morning = new Date(2026, 9, 8, 9, 0, 0);
  const afternoon = new Date(2026, 9, 8, 15, 0, 0);
  const night = new Date(2026, 9, 8, 21, 0, 0);

  assert.deepEqual(assistantGreetingOptions("Noeli Morales", morning.getHours()), [
    "Buenos días",
    "¿En qué te ayudo?",
    "¿Qué hacemos hoy?",
    "Hola, Noeli",
  ]);
  assert.deepEqual(assistantGreetingOptions(null, afternoon.getHours()), [
    "Buenas tardes",
    "¿En qué te ayudo?",
    "¿Qué hacemos hoy?",
  ]);
  assert.deepEqual(assistantGreetingOptions("  ", night.getHours()), [
    "Buenas noches",
    "¿En qué te ayudo?",
    "¿Qué hacemos hoy?",
  ]);

  const options = assistantGreetingOptions("Noeli", morning.getHours());
  assert.equal(pickAssistantGreeting("Noeli Morales", morning, () => 0), options[0]);
  assert.equal(pickAssistantGreeting("Noeli Morales", morning, () => 0.99), options[options.length - 1]);
  for (const phrase of options) {
    assert.ok(phrase.length <= 24);
  }
});
