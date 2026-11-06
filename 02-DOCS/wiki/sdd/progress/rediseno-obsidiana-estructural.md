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

## T004 — 2026-11-05
- status: complete
- green: `node --test src/components/ui/ui-contract.test.ts src/components/ui/cn.test.ts` → 18/18 ✔; `npm test` → solo los 4 conocidos.
- cambios: 13 piezas en `src/components/ui/` (PageHeader, StatStrip, Block, DataList, DataTable, FilterBar, Segmented, Chip, Board/BoardColumn/BoardCard, EmptyState, ErrorState, Skeleton, Enter), `index.ts`, `cn.ts` + `cn.test.ts`; tokens de estado `--color-danger/-soft`, `--color-success/-soft` en `@theme` y `--danger…` en `:root`.
- nota TDD: `cn` se escribió junto con su test (no hubo rojo previo); helper de una línea.
- navegador (ruta temporal `/ui-preview-temporal`, ya borrada): 1440 px coincide con la maqueta; 375 px → scrollWidth 375, 0 textos < 12 px, 0 controles < 44 px; Chip late/done/hot con los colores de token; sombra overlay al arrastrar; `.crm-enter` animando. Tras la corrección: barra de título del skeleton visible, avatar redondo, delta neutro gris, bordes de 5 cifras correctos a < 1024 y a 1440 px.
- entorno: caché de Turbopack obsoleta borrada (ver «Entorno — T004»).
- risk: tier 1 — 1 revisor (agente general; `react-reviewer` de rsc no arranca)
- review: ronda 1 → 7 (1 should-fix: utilidades en conflicto vía `cn`, + 2.ª instancia encontrada por barrido; 4 nits; 2 preguntas) → corregidos o documentados (L36 intencional: `"use client"` exigido por el contrato). Ronda 2 → pass.
- controls: tests ✅ · build: tsc 19, 0 en `src/components/ui` ✅ · eslint 0 ✅ · security: no aplica · traceability ✅ (AC2, AC3, AC6, AC7, AC8)
- files: src/components/ui/* (nuevos), app/globals.css, plan («T007–T013 — Interfaces»)

## T005 — 2026-11-05
- status: complete
- red: `node --test src/lib/crm-navigation.test.ts src/lib/redesign-shell-contract.test.ts` → 19 ✖ por aserción; `crm-themes.test.ts` → 1 ✖ (`--nav-active-ink`).
- enfoque: tras la ronda 1, el modelo de navegación pasa a `src/lib/crm-navigation.ts` (stub) y se prueba ejecutándolo (destinos, permisos, contextuales, destino activo, pestañas, `sidebarView`, estilos activos); el contrato del shell solo mira JSX/CSS con un analizador de etiquetas.
- decisiones: Bóveda contextual (5.ª); se retira «Editar barra»; `--nav-active-ink`; elegir un destino anula «Volver» (ver decisions.md).
- risk: tier 1 — 1 revisor
- review: ronda 1 → 14 (8 should-fix); ronda 2 → 6 (1 should-fix); ronda 3 → pass (1 pregunta + 3 nits, corregidos y registrados). Ledger L42–L61 = fixed.
- controls: tests ✅ (rojo esperado) · tsc 19 ✅ · eslint 0 errores ✅ · traceability ✅ (AC1–AC4, AC10, criterios de navegación)
- files: src/lib/crm-navigation.ts (stub), src/lib/crm-navigation.test.ts, src/lib/redesign-shell-contract.test.ts, src/lib/crm-themes.test.ts, plan §3

## Decision queue
- **review-after** · T005 · tier 1 · ¿Bóveda como 5.ª sección contextual (conserva `VaultNav`, su selector de clientes)? · Opciones: (a) contextual, (b) plana y perder el selector · Recomendación: (a) · Evidencia: decisions.md «Modelo de navegación y dos consecuencias».
- **review-after** · T005 · tier 1 · Se retira «Editar barra» de la barra móvil (consecuencia de «cuatro destinos fijos y Más») · Evidencia: misma entrada.
- **review-after** · T001 · tier 1 · ¿Vale la «tinta activa» Obsidiana en los temas noxy-memory y noxy-lime (su color de acción no llega a AA sobre blanco)? · Opciones: (a) cambiar sus colores de acción, (b) pastilla rellena, (c) tinta derivada · Recomendación: (c) · Evidencia: `decisions.md` 2026-11-05 «Tinta del destino activo».

## Entorno — 2026-11-05
- `npx prisma generate` (aprobado por el dueño). Dashboard `/` carga con datos y `/api/contacts` → 200 tras reiniciar el servidor de desarrollo.
- tsc: 66 → 19 errores (tipos de Prisma). Línea base efectiva del trabajo: 19.

## Entorno — 2026-11-05 (T004)
- La caché persistente de Turbopack (`.next/dev/cache/turbopack`, 1,3 GB) servía un `globals.css` antiguo: los tokens de estado nuevos no llegaban al navegador ni tras reiniciar ni tras `touch`. Borrada (está en `.gitignore` y se regenera); tras reiniciar, el CSS servido incluye los tokens.
- El agente `react-reviewer` instalado por rsc no arranca: su frontmatter declara herramientas `read, search` que Claude Code no reconoce. Revisión de T004 lanzada con el agente general. Pendiente: arreglar el frontmatter del agente (fuera del alcance de este trabajo).

## T006 — 2026-11-05 (EN CURSO, interrumpido por límite de uso)
- hecho: `crm-navigation.ts` implementado (16/16); `--nav-active-ink` en temas y `:root`; Sidebar con lista plana + modo contextual + «Volver» + iconos currentColor; DashboardShell en L (`h-dvh`, hoja `data-crm-sheet`); MobileBottomTabBar fija (Inicio · Contactos · Pipeline · Tareas · Más); AssistantSidebarShell sin Lucide ni vidrio; MobileSidebarToggle 44 px con Hugeicons; Header con botones 44/40 px y sin texto < 12 px; `assistant-sidebar-navigation-contract.test.ts` actualizado a la navegación nueva.
- verde: contratos de shell, modelo y temas 24/24; `npm test` solo los 4 conocidos; tsc 19.
- falta: script CHECK y verificación en navegador (1440 y 375 px en /, /contacts, /emails, /kb, /assistant; «Volver»; «Más» con teclado/Escape); capturas; revisión tier 1 de T006; eslint por archivo frente a la línea base.
