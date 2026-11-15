import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { leadInput, paymentReceivedInput, taskInput, weeklyVideosInput } from './bot-input.ts';

test('lead requiere título y acepta fuente, contacto y referente', () => {
  assert.equal(leadInput.safeParse({ title: '' }).success, false);
  assert.equal(leadInput.parse({ title: '  Nuevo lead  ', source: 'REFERIDO', referredByClientId: 'client-1' }).title, 'Nuevo lead');
  assert.equal(leadInput.safeParse({ title: 'Lead', referredByClientId: 'a', referredByContactId: 'b' }).success, false);
  assert.equal(leadInput.safeParse({ title: 'Lead', source: 'INVALIDA' }).success, false);
});

test('tarea y pago rechazan datos incompletos', () => {
  assert.equal(taskInput.safeParse({ title: ' ' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Seguimiento', dueDate: 'mañana' }).success, false);
  assert.equal(taskInput.parse({ title: 'Seguimiento', dealId: 'deal-1' }).dealId, 'deal-1');
  assert.equal(paymentReceivedInput.safeParse({ id: '' }).success, false);
});

test('reporte semanal limita las semanas', () => {
  assert.equal(weeklyVideosInput.parse(undefined), 1);
  assert.equal(weeklyVideosInput.parse('4'), 4);
  assert.equal(weeklyVideosInput.safeParse('53').success, false);
});
