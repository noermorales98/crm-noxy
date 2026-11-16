import test from 'node:test';import assert from 'node:assert/strict';// @ts-ignore Node test runner requires the explicit .ts extension.
import { coerceVideoRow } from './video-fields.ts';

test('fila válida con fecha corta y métricas enteras', () => {
  const data = coerceVideoRow({ title: ' A ', platform: 'TikTok', publishedAt: '2026-11-01', reach: '1200.4', retention3s: '45.5' });
  assert.equal(data?.title, 'A');
  assert.equal(data?.reach, 1200);
  assert.equal(data?.retention3s, 45.5);
  assert.equal((data?.publishedAt as Date).toISOString(), '2026-11-01T12:00:00.000Z');
});

test('sin título o plataforma se rechaza', () => {
  assert.equal(coerceVideoRow({ title: '', platform: 'TikTok' }), null);
  assert.equal(coerceVideoRow({ title: 'A' }), null);
});

test('valor vacío o null en clave presente limpia el campo (edición)', () => {
  const data = coerceVideoRow({ title: 'A', platform: 'TikTok', reach: '', notes: null, publishedAt: '' });
  assert.equal(data?.reach, null);
  assert.equal(data?.notes, null);
  assert.equal(data?.publishedAt, null);
});

test('clave ausente no se toca (importación parcial)', () => {
  const data = coerceVideoRow({ title: 'A', platform: 'TikTok' });
  assert.ok(!('reach' in (data as object)));
  assert.ok(!('notes' in (data as object)));
});

test('números negativos o inválidos se guardan como null, no se omiten', () => {
  const data = coerceVideoRow({ title: 'A', platform: 'TikTok', views: -5, shares: 'abc' });
  assert.equal(data?.views, null);
  assert.equal(data?.shares, null);
});
