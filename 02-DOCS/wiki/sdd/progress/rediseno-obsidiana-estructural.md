---
type: progress
title: Progreso — Rediseño del CRM privado (marco claro)
description: Registro append-only de implement para rediseno-obsidiana-estructural.
tags: [sdd, progress]
timestamp: 2026-11-05T16:00:00Z
topic: sdd
slug: rediseno-obsidiana-estructural
---

# Progreso — rediseno-obsidiana-estructural

Commit único al final (T014, decisión del dueño): las tareas no se commitean una a una.
Config SDD ausente (`02-DOCS/wiki/sdd/config.yaml`): se usan los comandos de la constitution
(`npm test`, `npx tsc --noEmit`, eslint, `npm run build`). Registro de skills ausente: fallback a
las skills del repo (`nextjs`, `design`).

## T001 — 2026-11-05
- status: in review (round 1)
- red: `node --test src/lib/redesign-contract.test.ts` → 6/6 ✖ por aserción (radios, glass, sombra 32px, `--duration-enter`, sección «Marco», principio 5). `node --test src/lib/crm-themes.test.ts` → ✖ «light frame pairs» (noxy-memory: tinta activa 2.75:1).
- suite: `npm test` → 82 tests, 11 ✖ = 4 conocidos + 7 nuevos de T001.
- ajuste en rojo: el par «acción sobre blanco» contradecía la regla de pares de DESIGN.md (memory 2.75, lime 1.19). Contrato corregido a `navActiveInk(theme)` (acción si ≥ 4.5:1, si no Obsidiana); stub exportado en `crm-themes.ts`.
- files: src/lib/redesign-contract.test.ts (nuevo), src/lib/crm-themes.test.ts, src/lib/crm-themes.ts (stub)
- risk: tier 1 (`rsc risk`) — 1 revisor

## Decision queue
- **review-after** · T001 · tier 1 · ¿Vale la «tinta activa» Obsidiana en los temas noxy-memory y noxy-lime (su color de acción no llega a AA sobre blanco)? · Opciones: (a) cambiar sus colores de acción, (b) pastilla rellena, (c) tinta derivada · Recomendación: (c) · Evidencia: `decisions.md` 2026-11-05 «Tinta del destino activo».
