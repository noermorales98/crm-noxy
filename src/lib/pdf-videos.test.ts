import test from 'node:test';import assert from 'node:assert/strict';// @ts-ignore Node test runner requires the explicit .ts extension.
import { parseMetricNumber, extractJsonObject, normalizeVideoRows, buildPdfExtractionPrompt } from './pdf-videos.ts';

test('parseMetricNumber entiende abreviaturas y separadores', () => {
  assert.equal(parseMetricNumber('1,2K'), 1200);
  assert.equal(parseMetricNumber('1.2k'), 1200);
  assert.equal(parseMetricNumber('3M'), 3000000);
  assert.equal(parseMetricNumber('45 %'), 45);
  assert.equal(parseMetricNumber('12.500'), 12500);
  assert.equal(parseMetricNumber('12,500'), 12500);
  assert.equal(parseMetricNumber('2.5'), 2.5);
  assert.equal(parseMetricNumber('2,5'), 2.5);
  assert.equal(parseMetricNumber(1234), 1234);
  assert.equal(parseMetricNumber('—'), null);
  assert.equal(parseMetricNumber(''), null);
  assert.equal(parseMetricNumber(null), null);
});

test('extractJsonObject rescata JSON envuelto en markdown', () => {
  const parsed = extractJsonObject('Claro, aquí va:\n```json\n{"videos":[{"title":"A"}]}\n```\nListo.');
  assert.deepEqual(parsed, { videos: [{ title: 'A' }] });
});

test('extractJsonObject responde null sin JSON', () => {
  assert.equal(extractJsonObject('No encuentro datos'), null);
});

test('normalizeVideoRows descarta filas sin título y aplica plataforma por defecto', () => {
  const rows = normalizeVideoRows({ videos: [
    { title: 'Video A', platform: '', reach: '1,2K', publishedAt: '2026-11-01' },
    { platform: 'TikTok', views: 100 },
    { title: 'Video B', platform: 'Instagram', shares: '1.5K', saves: 20, comments: 5, retention3s: '45 %' },
  ] }, 'TikTok');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { title: 'Video A', platform: 'TikTok', publishedAt: '2026-11-01', reach: 1200 });
  assert.equal(rows[1].platform, 'Instagram');
  assert.equal(rows[1].shares, 1500);
  assert.equal(rows[1].retention3s, 45);
});

test('normalizeVideoRows devuelve [] sin arreglo de videos', () => {
  assert.deepEqual(normalizeVideoRows({ videos: [] }), []);
  assert.deepEqual(normalizeVideoRows(null), []);
});

test('buildPdfExtractionPrompt recorta textos largos', () => {
  const prompt = buildPdfExtractionPrompt('x'.repeat(20000));
  assert.ok(prompt.includes('[...recortado por longitud]'));
  assert.ok(prompt.length < 14500);
});
