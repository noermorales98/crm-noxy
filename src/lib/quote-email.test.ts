import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { defaultQuoteMessage, defaultQuoteSubject, escapeHtml, renderQuoteEmailHtml } from "./quote-email.ts";

const quote = {
  folio: "COT-2026-0001",
  clientName: "Ana <b>",
  currency: "MXN",
  subtotal: 100,
  taxRate: 16,
  taxAmount: 16,
  total: 116,
  validUntil: null,
  items: [{ description: "Diseño <script>", quantity: 1, unitPrice: 100, total: 100 }],
};

test("escapeHtml neutraliza etiquetas y comillas", () => {
  assert.equal(escapeHtml(`<a href="x">&`), "&lt;a href=&quot;x&quot;&gt;&amp;");
});

test("asunto y mensaje por defecto", () => {
  assert.equal(defaultQuoteSubject("COT-1", "Noxy"), "Cotización COT-1 — Noxy");
  assert.match(defaultQuoteMessage(quote), /^Hola Ana <b>,\n\nTe compartimos la cotización COT-2026-0001/);
});

test("el HTML usa el mensaje editado, escapado, y conserva el enlace", () => {
  const html = renderQuoteEmailHtml({ quote, businessName: "Noxy", publicUrl: "https://x.test/cotizar/t", message: "Línea 1\nLínea 2\n\n<img src=x>" });
  assert.match(html, /Línea 1<br\/>Línea 2/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /href="https:\/\/x\.test\/cotizar\/t"/);
});
