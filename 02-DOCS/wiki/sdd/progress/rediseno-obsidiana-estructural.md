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

## T002 — 2026-11-05
- status: complete
- green: `node --test src/lib/redesign-contract.test.ts src/lib/crm-themes.test.ts src/lib/crm-surface-style.test.ts` → 18/18 ✔; `npm test` → 79 ✔ / 4 ✖ (solo los 4 conocidos).
- cambios: radios 10/12 en `@theme` y `:root` (xl/2xl 18/20 → 16); quitadas `.crm-glass*` y `backdrop-filter` del chrome; chrome móvil sólido en `surface-sidebar`; sombra de menú `0 8px 8px rgba(11,11,24,.10)`; tokens `--duration-enter 280ms`, `--stagger 40ms`, `--ease-enter`; `@keyframes crm-enter`; `.crm-enter`/`.crm-lift`/`.crm-press` en `@layer components` + `no-preference`; `navActiveInk`; DESIGN.md (secciones «Marco claro» y «Motion», Do/Don't, «Registro de enmiendas») y PRODUCT.md (principio 5, marco claro).
- test previo actualizado: `crm-surface-style.test.ts` a los valores del contrato aprobado (ver decisions.md).
- navegador: en `/` con sesión, elemento de prueba → `animation-fill-mode: backwards`, delay 80 ms (`--i: 2`), 280 ms, `--radius-control: 10px`.
- risk: tier 1 — 1 revisor
- review: ronda 1 → 5 hallazgos (3 should-fix, 1 nit, 1 question); corregidos L10, L11, L13; L12 y L14 aplazados con dueño T005/T006 (estado intermedio previsto: el shell usa clases glass eliminadas hasta T006; no se commitea ni se enseña antes). Ronda 2 → pass, 1 nit aceptado (llevado a «T004 — Interfaces»).
- controls: tests ✅ · build: tsc 66 = línea base, 0 nuevos en archivos tocados ✅; CSS compila en dev (200) ✅ · eslint 0 en archivos tocados ✅ · security: no aplica · traceability ✅ (AC4, AC5, AC6, AC12)
- files: app/globals.css, src/lib/crm-themes.ts, DESIGN.md, PRODUCT.md, src/lib/crm-surface-style.test.ts, plan (T005, T004 Interfaces)

## T003 — 2026-11-05
- status: complete
- red: `node --test src/components/ui/ui-contract.test.ts` → 16/16 ✖ por aserción (ninguna por E/S); `npm test` → 4 conocidos + 16 de T003.
- contrato: 13 archivos / 15 componentes (BoardColumn, BoardCard), exports con nombre, solo tokens (sin paleta cruda, hex ni < 12 px), sin vidrio, sombras decorativas ni radios > 16 px, regla de movimiento por elemento, tokens de estado (`@theme` y `:root`, no personalizables), PageHeader h1 24/600, StatStrip dl + tabular-nums, Block h2 + acción 44 px, DataList/DataTable con `empty` obligatorio y filas ≥ 56 px, Segmented accesible, Chip por tonos, Board sin dnd propio y sombra overlay solo al arrastrar, estados vacío/error/carga anunciados, Enter acotado 0-5.
- risk: tier 1 — 1 revisor
- review: ronda 1 → 9 (5 should-fix); ronda 2 → 7 (3 should-fix); ronda 3 → 4 (1 should-fix, 3 nits). Ronda 3 cerrada como trivial (ver decisions.md). Ledger L15–L34 = fixed.
- plan: «T004 — Interfaces» añade tokens de estado `--color-danger/-soft`, `--color-success/-soft` (valores de la maqueta).
- controls: tests ✅ (rojo esperado) · build: tsc 19 = línea base efectiva, 0 en el archivo nuevo ✅ · eslint 0 ✅ · security: no aplica · traceability ✅ (AC2, AC3, AC6, AC7, AC8)
- files: src/components/ui/ui-contract.test.ts (nuevo), plan («T004 — Interfaces»)

## Decision queue
- **review-after** · T001 · tier 1 · ¿Vale la «tinta activa» Obsidiana en los temas noxy-memory y noxy-lime (su color de acción no llega a AA sobre blanco)? · Opciones: (a) cambiar sus colores de acción, (b) pastilla rellena, (c) tinta derivada · Recomendación: (c) · Evidencia: `decisions.md` 2026-11-05 «Tinta del destino activo».

## Entorno — 2026-11-05
- `npx prisma generate` (aprobado por el dueño). Dashboard `/` carga con datos y `/api/contacts` → 200 tras reiniciar el servidor de desarrollo.
- tsc: 66 → 19 errores (tipos de Prisma). Línea base efectiva del trabajo: 19.
