import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { ASSISTANT_NEW_COPY } from "./assistant-new-copy.ts";

test("assistant new experience exposes the approved Spanish copy", () => {
  assert.equal(
    ASSISTANT_NEW_COPY.heading,
    "Encontremos las referencias adecuadas para tu trabajo",
  );
  assert.deepEqual(ASSISTANT_NEW_COPY.headingLines, [
    "Encontremos las referencias adecuadas",
    "para tu trabajo",
  ]);
  assert.equal(ASSISTANT_NEW_COPY.headingLines.join(" "), ASSISTANT_NEW_COPY.heading);
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
