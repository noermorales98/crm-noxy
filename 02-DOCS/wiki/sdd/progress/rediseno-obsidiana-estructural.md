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

## T006 — 2026-11-06 (implementación y verificación; revisión en curso)
- green: contratos shell + modelo + temas 24/24; `npm test` → solo los 4 conocidos; tsc 19; eslint por archivo ≤ línea base (Sidebar 5→3, MobileBottomTabBar 2→0).
- navegador (sesión del dueño, solo lectura), `check.js` en ámbito shell: pasa a 1440 y 375 px en /, /contacts, /emails, /kb, /assistant.
- corregido durante la verificación: `⌘K` a 10 px y buscador de 36 px en GlobalSearchTrigger (→ 12 px, 44/36 px, fondo blanco); destinos de 40 px en móvil (→ 44 px < lg); el foco no volvía a «Más» al cerrar el panel con Escape (→ `mobileReturnFocusRef` en AssistantSidebarShell).
- interacción: «Más» abre el panel (aria-modal, foco dentro, elementos ≥ 44 px), Escape lo cierra y el foco vuelve a «Más»; en /emails «Volver» muestra la lista plana con Correo activo y pulsar Correo reabre el submenú (11 controles).
- capturas: revisadas en la conversación (1440 /, 1440 /emails, 375 /); no se guardan como archivo (la herramienta de captura no escribe en disco).
- check.js: añadido ámbito `shell` y exclusión de elementos fuera de pantalla.

## T007 — 2026-11-06 (escrito; revisión en curso)
- red: `node --test src/lib/redesign-screens-contract.test.ts` → 22 ✖ por aserción.
- decisión: las pantallas marcan `pageHeader: true` (la barra superior no pinta un segundo h1) y mueven la acción principal de `addButton` a `PageHeader`; ordenación y filtros siguen en la barra.

## T006 — 2026-11-06 (cierre)
- status: complete
- review: ronda 1 → 5 (1 should-fix: botones con etiqueta de la cabecera fijados a 40 px de ancho en ≥ 1024 px por `lg:size-10`, medido por el revisor; 4 nits) → corregido (`h-11 w-11 sm:w-auto lg:h-10`, `transition-colors`) y retorno de foco de respaldo; ronda 2 → pass. Ledger L62/L65 fixed; L63/L64/L66 intentional (altura 40 px en escritorio según DESIGN.md; `dismissedPath` residual inocuo; «Más» sin aria-expanded y sin contador).
- clase corregida en la herramienta: `check.js` ahora detecta controles con contenido recortado.
- navegador tras la corrección: /contacts 1440 → «Ordenar» 100×40, «Agregar contacto» 166×40, ningún control del shell recortado; 375 → todos los controles de la cabecera 44×44.
- controls: tests ✅ (116 ✔; los ✖ son los 4 conocidos + el rojo de T007) · tsc 19 ✅ · eslint ≤ línea base en todos los archivos tocados ✅ · traceability ✅ (AC1–AC4, AC10, criterios de navegación)
- files: Sidebar, Header, DashboardShell, MobileBottomTabBar, AssistantSidebarShell, MobileSidebarToggle, GlobalSearchTrigger, crm-navigation.ts, crm-themes.ts, globals.css, assistant-sidebar-navigation-contract.test.ts, check.js

## T007 — 2026-11-06 (cierre)
- status: complete
- red: `node --test src/lib/redesign-screens-contract.test.ts` → 22 ✖ por aserción.
- review: ronda 1 → 8 (5 should-fix: paleta demasiado amplia frente a DESIGN.md, EmptyState heredado, regex de lista entre archivos, mayúsculas dependientes del orden, subpáginas sin cubrir); ronda 2 → 4 (2 should-fix: genéricos en `tagAt`, comillas en `literals`); ronda 3 → pass (1 nit aceptado: T008 usará `{!config.pageHeader && … <h1`). Ledger L67–L77 fixed, L78 intentional (`bg-white` se prohíbe: el blanco del contenido es `surface-elevated`).
- decisiones: solo neutros crudos a tokens; `pageHeader` en la barra superior (T008); acción principal en PageHeader.
- controls: tests ✅ (rojo esperado) · tsc 19 ✅ · eslint 0 ✅ · traceability ✅ (AC3, AC7, AC8)
- files: src/lib/redesign-screens-contract.test.ts, plan («T007–T013 — Interfaces»)

## T008 — 2026-11-06
- status: complete
- green: contrato `dashboard` 3/3 (incluye ahora DashboardWidgets.tsx y dashboardTabs.tsx); `npm test` sin fallos nuevos; tsc 19; eslint ≤ línea base.
- cambios: `HeaderConfig.pageHeader` + h1 de la barra superior condicionado (y contador `lg:hidden`); DashboardCustomizer con PageHeader (saludo, fecha calculada en cliente, «Personalizar»), Enter; WidgetCard → Block; KpiWidget plano y vertical (`crm-lift`); DashboardGrid sin Lucide, spans responsivos; listas de widgets → DataList + EmptyState común; tabla de pestañas con marco, EmptyState común y sin «—»; WelcomeHeaderTitle eliminado (sin referencias).
- hallazgo de infraestructura: reglas heredadas `[data-crm-theme]` anulaban los bordes `border-border-subtle` → token nuevo `line` (decisions.md).
- navegador: / a 1440 y 375 → check.js página completa ok; KPI blancos con borde; personalizador abre/cierra sin escrituras (fetch interceptado: 0 no-GET).
- review: ronda 1 → 7 (3 should-fix); ronda 2 → 2 (1 should-fix: marco de la tabla de pestañas); ronda 3 → pass.
- controls: tests ✅ · tsc 19 ✅ · eslint ✅ · traceability ✅ (AC1–AC3, AC7, AC8)

## T010 — 2026-11-06
- status: complete
- green: contratos `contacts` y `companies` 3/3; tsc 19; eslint contacts 7→5, companies 7.
- cambios: PageHeader con acción principal (sin `addButton`), Segmented de vista (contactos), DataTable con filas móviles (teléfono `tel:` y web incluidos), Chip, Skeleton/ErrorState/EmptyState (estado de error nuevo: antes solo consola), modales con `role=dialog` + `useDialog` (foco, Tab, Escape, retorno), sin «—».
- piezas: DataTable con desplazamiento propio (`overflow-x-auto`); hook común `useDialog`.
- navegador: 1440/375 check ok; 1100 px companies → tabla desplazable dentro de su caja; STATES ok (skeleton, error 500 + reintento); modal de contactos: foco dentro, Tab envuelve, Escape cierra, foco vuelve.
- review: ronda 1 → 8 (4 should-fix); ronda 2 → pass (nits: foco inicial → primer campo, corregido; restauración si el opener desaparece y Escape no anidado, aceptados).

## T012 — 2026-11-06
- status: complete
- green: contrato `tasks` 3/3; tsc 19; eslint 8→6.
- cambios: PageHeader («Nueva tarea» + acceso a Proyectos), Segmented Pendientes/Completadas con contadores, DataList, casilla de completar 44 px, chips (vencida = late), iconos Hugeicons en vez de emojis, Skeleton/ErrorState/EmptyState, modal con `useDialog`, fallback de Suspense con Skeleton.
- navegador: 1440/375 check ok; STATES ok (skeleton, error 500 + reintento).
- review: ronda 1 → pass (6 nits/pregunta); corregidos: aria-pressed contradictorio, error de recarga ya no oculta la lista cargada, chip de filtro, fallback. Aceptados: labels del modal sin htmlFor (previo), estado `any[]` (previo).

## Decision queue
- **review-after** · T005 · tier 1 · ¿Bóveda como 5.ª sección contextual (conserva `VaultNav`, su selector de clientes)? · Opciones: (a) contextual, (b) plana y perder el selector · Recomendación: (a) · Evidencia: decisions.md «Modelo de navegación y dos consecuencias».
- **review-after** · T005 · tier 1 · Se retira «Editar barra» de la barra móvil (consecuencia de «cuatro destinos fijos y Más») · Evidencia: misma entrada.
- **review-after** · T001 · tier 1 · ¿Vale la «tinta activa» Obsidiana en los temas noxy-memory y noxy-lime (su color de acción no llega a AA sobre blanco)? · Opciones: (a) cambiar sus colores de acción, (b) pastilla rellena, (c) tinta derivada · Recomendación: (c) · Evidencia: `decisions.md` 2026-11-05 «Tinta del destino activo».

- kind: review-after · task: T009 · tier: 1 · question: a 375 px, el arrastre con teclado (Espacio + flecha) no lleva la tarjeta a una columna fuera de la vista; a 1440 px sí. ¿Se acepta o se investiga quitando `snap-mandatory`? · options: (a) aceptar, el tablero antiguo también se desplazaba en horizontal; (b) probar sin `snap-mandatory` · recommendation: (a) por ahora; el arrastre con puntero y los botones de etapa del detalle del deal siguen disponibles · evidence: progress T009, ledger L115

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

## T013 — 2026-11-06
- status: complete
- red: `node --test src/lib/redesign-screens-contract.test.ts` (appointments 3 casos) fallaba antes de recomponer
- green: los 3 casos de appointments pasan
- files: app/appointments/page.tsx
- risk: tier 1 — 1 revisor (sonnet, contexto limpio)
- review: ronda 1: 6 reportados (2 should-fix, 3 nits, 1 pregunta) → 4 arreglados (L102–L105), 2 intencionados (L106 Segmented común, L107 enlaces mailto/tel)
- controls: tests ✅ (appointments) · tsc 19 = baseline ✅ · eslint 1 error < baseline 2 ✅ · navegador 1440/375 ✅ · estados: esqueleto, error+reintentar, vacío ✅; recarga fallida con datos simulados (PATCH interceptado, sin escrituras) conserva la lista y muestra toast ✅ · traceability AC3/AC7/AC8 ✅
- decision: decisions.md «Citas: recarga fallida conserva la lista; enlaces mailto/tel»

## T011 — 2026-11-06
- status: complete
- red: casos `projects` de `redesign-screens-contract.test.ts` fallaban antes de recomponer
- green: los 3 casos de projects pasan
- files: app/projects/page.tsx, src/components/ProjectWorkspaceHeader.tsx, src/components/ProjectHeaderSetter.tsx, src/components/DeleteProjectButton.tsx, src/components/ProjectSharePanel.tsx
- risk: tier 1 — 1 revisor (sonnet, contexto limpio)
- review: ronda 1: 3 reportados (2 nits, 1 pregunta), VERDICT pass → L109, L110 arreglados; L108 intencionado
- controls: tests ✅ · tsc 19 = baseline ✅ · eslint ≤ baseline en los 5 archivos ✅ · navegador: lista 1440/375 ✅, cabecera del espacio 1440/375 ✅ (un h1, toques 44 px) · estados esqueleto/error/vacío ✅ (fetch interceptado, solo lectura) · traceability AC3/AC7/AC8 ✅
- pendiente fuera de alcance: el resumen `app/projects/[id]/page.tsx` tiene texto < 12 px y enlaces «Ver todas» de 16 px

## T009 — 2026-11-06
- status: complete
- red: casos `pipeline` de `redesign-screens-contract.test.ts` y el caso común «pages with a PageHeader» fallaban
- green: `redesign-screens-contract` 22/22 y `ui-contract` 17/17
- files: app/pipeline/page.tsx, app/pipeline/clientes/page.tsx, app/pipeline/historial/page.tsx, src/components/pipeline/PipelineShared.tsx, src/components/ui/Board.tsx, src/components/ui/DataTable.tsx
- risk: tier 1 — 1 revisor (sonnet, contexto limpio)
- review: ronda 1: 5 reportados (2 should-fix, 2 nits, 1 pregunta) → L111–L114 arreglados; L115 aparcado (review-after)
- controls: tests ✅ · tsc 19 = baseline ✅ · eslint 22/9/0 ≤ baseline 22/9/1 ✅ · navegador 375/1440 en las 3 páginas ✅ (un h1, sin desbordes, toques ≥ 44 px) · arrastre con teclado sobre datos simulados y PATCH interceptado: cancelar 0 llamadas, mover 1 a 1440, Intro durante el arrastre no navega ✅ · traceability AC3/AC7/AC8 ✅

## T015 — 2026-11-06
- status: complete
- red: `crm-navigation.test.ts` (ronda 2) fallaba en 10 casos por aserción (tras stubs de exportación)
- green: 13/13; `redesign-shell-contract` y `assistant-sidebar-navigation-contract` siguen verdes (26/26 en total)
- files: src/lib/crm-navigation.ts, src/lib/crm-navigation.test.ts, src/components/Sidebar.tsx
- risk: tier 1 — 1 revisor (sonnet)
- review: ronda 1: 3 reportados (1 pregunta, 2 nits), VERDICT pass → los 3 arreglados
- controls: tsc 19 ✅ · eslint Sidebar 3 ≤ 5 ✅ · navegador 1440 (lista plana, submenú Agenda, Volver) y 375 (cajón «Más» con submenú Contactos, toques 44 px) ✅ · traceability AC1/AC4 + ronda 2 ✅

## T016 — 2026-11-06
- status: complete
- red: `redesign-screens-contract.test.ts` amplía `SCREENS` con las pantallas de la ronda 2 y el campo `level` («pass» no exige DataList/Board); 26 casos nuevos fallan por aserción, los 25 de la ronda 1 siguen verdes
- files: src/lib/redesign-screens-contract.test.ts
- risk: tier 1 — solo test; lo revisa cada tarea de pantalla que lo pone en verde

## T017 — 2026-11-06
- status: complete
- red: casos `forms` y `forms-builder` del contrato (T016)
- green: ambos verdes
- files: app/forms/page.tsx, app/forms/[id]/page.tsx, src/components/FormWhatsAppRecipients.tsx, src/components/FormApiConfig.tsx; check.js (recortes: excluye campos de texto y controles marcados; toques: excluye `sr-only`)
- risk: tier 1 — 1 revisor (sonnet)
- review: ronda 1: 5 reportados (3 should-fix, 2 nits) → 4 arreglados; 1 intencionado (recarga fallida con datos ya cargados: no es regresión)
- controls: tsc 19 ✅ · eslint lista 0 < 5, constructor 14 = 14 ✅ · navegador lista 375/1440 ✅, constructor 4 pestañas a 375 ✅ (Variantes con una variante simulada; modal con foco dentro y Escape) · estados lista: carga, error+reintentar, vacío ✅ (fetch interceptado)
- decision: el constructor es chrome de editor: `pageHeader: true` + `backHref`, su h1 en la barra del constructor (`sr-only lg:not-sr-only`); `forms-builder` no exige PageHeader en el contrato

## T018 — 2026-11-06
- status: complete
- red: casos `quotes` del contrato (T016)
- green: 3/3
- files: app/cotizaciones/{page,configuracion/page,nueva/page,[folio]/page}.tsx, src/components/quotes/{QuoteForm,shared,QuoteAiAssist,QuotePdfButton}.tsx, src/components/DatePicker.tsx, src/lib/crm-ui.ts (+ `selectInline` en app/pipeline/page.tsx y historial)
- risk: tier 1 — 1 revisor (sonnet)
- review: ronda 1: 5 reportados (1 should-fix, 3 nits, 1 pregunta) → 4 arreglados; 1 intencionado (enlace desde el folio en escritorio)
- controls: tsc 19 ✅ · eslint ≤ baseline en todos ✅ · navegador 375/1440 en lista, configuración, nueva y detalle ✅ · estados lista: carga, error+reintentar, vacío ✅ (fetch interceptado)

## T019 — 2026-11-06
- status: complete
- red: casos `agenda` del contrato (T016)
- green: 3/3
- files: app/appointment-types/page.tsx, app/availability/page.tsx
- risk: tier 1 — 1 revisor (sonnet)
- review: ronda 1: 7 reportados (4 should-fix, 2 nits, 1 pregunta) → 6 arreglados; 1 intencionado (los separadores «── México ──» de zonas horarias son decoración de la lista, no separadores de texto; contenido previo)
- controls: tsc 19 ✅ · eslint 9 ≤ 10 y 7 = 7 ✅ · navegador 375/1440 ✅; 4 modales con foco dentro, Escape y toques 44 px ✅ · estados: horarios (carga/error/vacío) y tablas de extendidos y excepciones (carga, error+reintentar) ✅ (fetch interceptado, sin escrituras)

## T020 — 2026-11-06
- status: complete
- red: casos `mail` del contrato (T016)
- green: verdes; el caso común «pages with a PageHeader» se acota: una pantalla «pass» sin PageHeader conserva el h1 de la barra superior (sigue prohibido `addButton`)
- files: app/emails/page.tsx, src/lib/redesign-screens-contract.test.ts
- risk: tier 1 — 1 revisor (sonnet)
- review: ronda 1: 3 nits, VERDICT pass → 2 arreglados (blanco literal tras el HTML del correo, grises de spinners y placeholder); 1 intencionado (el contrato solo ve el PageHeader del propio archivo; ningún archivo lo delega)
- controls: tsc 19 ✅ · eslint 0 errores ✅ · navegador 375 lista y lectura (todas las peticiones no-GET interceptadas, ninguna salió) ✅, 1440 lista y redactar (cerrado con Cancelar, sin enviar) ✅ · sin cristal ✅
