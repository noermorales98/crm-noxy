---
author: Noeli
branch: videos-metricas-fase3
status: done
merged: 2026-11-15
merged_by: Noeli
---

# Videos: importar PDF de Metricool, alta manual y enlace al calendario

## Intent
`/contenido/videos` hoy solo acepta CSV de Metricool y muestra las tablas vacías si no hay importación.
Metricool a veces entrega PDF, no CSV. Además las piezas ya programadas en `/contenido/general`
deben poder convertirse en videos registrados con un clic, y cualquier dato debe poder
corregirse a mano. Se usa la IA que el CRM ya tiene (OpenRouter vía `completeWithAi`) para
extraer las filas del PDF.

## Scope
Dentro:
- Importar PDF de Metricool: el CRM extrae el texto del PDF (pdf-parse) y la IA lo convierte
  en filas de videos (título, plataforma, fecha, alcance, vistas, compartidos, guardados,
  comentarios, retención 3s). Vista previa antes de guardar, con deduplicación igual que el CSV.
- Alta manual de videos con formulario (todos los campos del modelo `Video`), opcionalmente
  vinculados a cliente de contenido y pieza del calendario.
- Edición manual de videos existentes (necesario para rellenar métricas de los creados desde
  el calendario). Sin borrado (no se pidió).
- Botón "Desde calendario": lista las piezas de `/contenido/general` de tipo video/reel que
  aún no tienen video registrado, con vista previa y creación masiva vinculada
  (`contentItemId`, `contentClientId`, hook, fecha).
- El flujo CSV existente queda intacto.
Fuera: borrar videos; API de Metricool; cambios al modelo `Video` (ya tiene todo lo necesario);
métricas predictoras automáticas.

## Checklist
- [ ] 1. Dependencia pdf-parse + lib `pdf-videos.ts` (extraer texto, limpiarlo) — `npm test` de sus pruebas puras
- [ ] 2. `POST /api/videos/import-pdf`: base64 → texto → IA → filas mapeadas (vista previa); confirmar crea videos con dedup — prueba con PDF de ejemplo + cURL de error 400
- [ ] 3. Diálogo de importación acepta `.pdf`; si es PDF llama a import-pdf y muestra las filas extraídas; confirmar guarda
- [ ] 4. Formulario de alta manual (POST /api/videos ya existe) con selects de cliente/pieza — build OK
- [ ] 5. `PATCH /api/videos/[id]` con misma validación + diálogo de edición — tsc + prueba de validación
- [ ] 6. `GET/POST /api/videos/from-calendar`: candidatos (video/reel sin Video) y creación vinculada — prueba pura de selección + cURL
- [ ] 7. Botón "Desde calendario" con vista previa y selección — build OK
- [ ] 8. Checks: tsc sin errores nuevos, `npm test` igual que base, `next build`, `rsc risk`, revisor si tier ≥ 1

## Evidence
- (pendiente)

## Next
Fusionado en main el 2026-11-15 (a13bbc5).
