# Harness decisions

- Accepted plan `e57714e49dddf7d764361473511fa68555c5cd4e76708998a3d9b8d33d839f03`.
- Project kind: software.
- SDD: selected.

## 2026-11-06 — Constitution v1.0.0-rc (pendiente de ratificar)

- Commits: gitmoji + Conventional Commits en español (opciones: gitmoji / frases en español sin prefijo). Por qué: log escaneable y versionado semántico; el guard de rsc ya lo impone.
- Barra de tests: sin fallos nuevos sobre la línea base (75 tests, 4 fallos conocidos en noxy-brand-contract) (opciones: sin fallos nuevos / todo en verde primero). Se añade `npm test`.
- Tipos y lint: trinquete sobre la línea base (tsc 66 errores, eslint 572), porque exigir cero bloquearía todo cambio.
- Revisión humana obligatoria: auth/permisos y `app/api/public/**`. No se crea `.rsc/sello-config.json` porque activaría el sello completo; pendiente de decisión.
