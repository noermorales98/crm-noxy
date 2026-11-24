import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { suggestedQuestions } from "./ai-ask.ts";

test("cada tipo de registro tiene sus preguntas y lo desconocido cae a unas genéricas", () => {
  for (const page of ["appointment", "kb", "deal", "content_client", "content_item"]) {
    assert.ok(suggestedQuestions(page).length >= 3, page);
  }
  assert.notDeepEqual(suggestedQuestions("appointment"), suggestedQuestions("deal"));
  assert.ok(suggestedQuestions("otra-cosa").length >= 2);
});
