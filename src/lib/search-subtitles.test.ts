import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { dealSearchSubtitle, quoteSearchSubtitle } from "./search-subtitles.ts";

test("deal perdido: muestra el motivo (recortado) para poder encontrarlo", () => {
  assert.equal(dealSearchSubtitle({ value: 150, currency: "USD", stage: { name: "Perdido", isLost: true }, lostReason: "Le pareció caro" }), "$150 USD · Perdido: Le pareció caro");
  assert.match(dealSearchSubtitle({ value: 1, currency: "MXN", stage: { name: "Perdido", isLost: true }, lostReason: "x".repeat(100) }) ?? "", /…$/);
  assert.equal(dealSearchSubtitle({ value: null, currency: "USD", stage: { name: "Perdido", isLost: true } }), "Perdido");
});

test("deal ganado: etapa, saldo pendiente y archivado", () => {
  assert.equal(
    dealSearchSubtitle({ value: 990.84, currency: "USD", stage: { name: "Ganado", isWon: true }, quotes: [{ status: "PARCIAL" }] }),
    "$990.84 USD · Ganado · Ganado · falta cobrar el saldo",
  );
  assert.equal(dealSearchSubtitle({ value: 10, currency: "MXN", stage: { name: "Entregado", isWon: true }, isArchived: true, quotes: [{ status: "PAGADA" }] }), "$10 MXN · Ganado · Entregado · archivado");
  assert.equal(dealSearchSubtitle({ value: 5, currency: "USD", stage: { name: "Contactado" } }), "$5 USD · Contactado");
});

test("cotización: estado, monto y deal; la pagada sin deal se avisa", () => {
  assert.equal(quoteSearchSubtitle({ status: "PAGADA", total: 46.84, currency: "USD", deal: { title: "Libro de Leticia" } }), "Pagada · $46.84 USD · Deal: Libro de Leticia");
  assert.equal(quoteSearchSubtitle({ status: "PAGADA", total: 312.24, currency: "USD" }), "Pagada · $312.24 USD · pagada sin deal: no sale en el historial");
  assert.equal(quoteSearchSubtitle({ status: "ENVIADA", total: 500, currency: "USD" }), "Enviada · $500 USD · sin deal");
});
