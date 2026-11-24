import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error: import relativo con extensión para node --test
import { parseQuoteLines, formatQuoteLines } from "./ai-quote-items.ts";

test("interpreta descripción, cantidad y precio; ignora líneas vacías", () => {
  const out = parseQuoteLines("Diseño web | 1 | 12000\n\nHosting anual | 2 | $1,500.50\nSoporte");
  assert.deepEqual(out, [
    { description: "Diseño web", quantity: 1, unitPrice: 12000 },
    { description: "Hosting anual", quantity: 2, unitPrice: 1500.5 },
    { description: "Soporte", quantity: 1, unitPrice: 0 },
  ]);
});

test("cantidades o precios inválidos caen a 1 y 0", () => {
  assert.deepEqual(parseQuoteLines("X | abc | -5"), [{ description: "X", quantity: 1, unitPrice: 0 }]);
  assert.deepEqual(parseQuoteLines("| 2 | 3"), []);
});

test("formatQuoteLines y parseQuoteLines son inversas", () => {
  const lines = [{ description: "A", quantity: 3, unitPrice: 10.5 }];
  assert.deepEqual(parseQuoteLines(formatQuoteLines(lines)), lines);
});
