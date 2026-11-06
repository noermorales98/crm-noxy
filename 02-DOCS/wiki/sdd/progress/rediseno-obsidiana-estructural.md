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

## T001 — 2026-11-05 (cierre)
- status: complete
- red: `node --test src/lib/redesign-contract.test.ts` → 7/7 ✖ por aserción (radios 12/20, clase `.crm-glass`, sombra 32px, `--duration-enter` ausente, `.crm-lift:hover` ausente, sin `## Marco claro`, PRODUCT.md sin «marco claro»); `node --test src/lib/crm-themes.test.ts` → 1 ✖ (noxy-memory: tinta activa del stub).
- green: no aplica (tarea de test; verde en T002).
- risk: tier 1 (`rsc risk`) — 1 revisor
- review: ronda 1 → 9 hallazgos (2 should-fix confirmados por reproducción directa, 5 nits, 2 preguntas) → todos corregidos; ronda 2 → 0 nuevos, VERDICT pass. Ledger L1–L9 = fixed.
- clases corregidas: alcance débil del parser (radios), incoherencia plan/test (`backdrop-filter` de Docs), lista negra → lista blanca (keyframes), contrato ausente (límite < 500 ms, hover/pulsación, techo de 16 px), falsos negativos (sombras inset), regex frágil (glass, docs).
- desvío del plan registrado: tokens de movimiento 420/55 ms → 280/40 ms (el plan violaba el «< 500 ms en total» del spec); `navActiveInk` añadido a §3 y a «T002 — Interfaces».
- controls: tests ✅ (rojo esperado; suite 4 conocidos + nuevos de T001) · build: tsc 66 = línea base, 0 en archivos tocados ✅ · eslint 0 en archivos tocados ✅ · security: no aplica (sin input ni secretos) · traceability ✅ (AC4, AC5, AC6, AC12; hover/pulsación → Goals «movimiento expresivo»)
- files: src/lib/redesign-contract.test.ts (nuevo), src/lib/crm-themes.test.ts, src/lib/crm-themes.ts (stub `navActiveInk`), plan §3/T002

## Decision queue
- **review-after** · T001 · tier 1 · ¿Vale la «tinta activa» Obsidiana en los temas noxy-memory y noxy-lime (su color de acción no llega a AA sobre blanco)? · Opciones: (a) cambiar sus colores de acción, (b) pastilla rellena, (c) tinta derivada · Recomendación: (c) · Evidencia: `decisions.md` 2026-11-05 «Tinta del destino activo».
