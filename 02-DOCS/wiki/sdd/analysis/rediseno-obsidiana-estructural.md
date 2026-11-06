---
type: analysis
title: Análisis — Rediseño del CRM privado (marco claro)
description: Lectura cruzada constitution ↔ spec ↔ plan ↔ tasks antes de implementar.
tags: [sdd, analysis]
timestamp: 2026-11-05T14:00:00Z
topic: sdd
slug: rediseno-obsidiana-estructural
---

# Análisis — Rediseño del CRM privado (marco claro)

**GATE: BLOCKED** · 0 CRITICAL · 1 HIGH · 3 MEDIUM · 3 LOW

Artefactos: [constitution](../constitution.md) · [spec](../specs/rediseno-obsidiana-estructural.md) ·
[plan + tasks](../plans/rediseno-obsidiana-estructural.md) ·
[maqueta aprobada](../specs/assets/rediseno-obsidiana-estructural/maqueta.html)

## Coverage map

| REQ | Criterio del spec (corto) | Plan | Tasks | Estado |
|---|---|---|---|---|
| R1 | Marco claro + activo distinguible por algo más que color | §2, §3 Shell | T005, T006, T008 | covered |
| R2 | 375 px sin scroll, táctil ≥ 44 px | §0, §5 | T004, T006, T008–T013 | covered |
| R3 | Ningún texto funcional < 12 px | §0, §5 | T004–T013 | covered |
| R4 | Sin `backdrop-filter`, sombra ≤ 8 px | §0, §5 | T001, T002, T005, T006 | covered |
| R5 | Contraste AA en 10 temas | §3 tema, §5 | T001, T002 | covered |
| R6 | Movimiento reducido anula entradas y arrastre | §3 movimiento, §4 | T001, T002, T004, T009, T010, T014 | covered |
| R7 | Estado vacío en cada lista | §3 piezas | T003, T004, T007–T013 | covered |
| R8 | Piezas comunes en las 7 pantallas | §2, §3 | T003, T004, T007–T013 | covered |
| R9 | Públicas intactas | §1, §5 | T014 | covered |
| R10 | Tema guardado se respeta | §3 tema | T006 | covered |
| R11 | Barra de calidad (test, tsc, eslint, build) | §0 | T002, T004, T006, T014 | covered |
| R12 | DESIGN.md y PRODUCT.md enmendados | §6 T1 | T001, T002 | covered |
| R13 | Estados de carga y error (Goals, Behaviour) | §3 piezas | T004 (solo la pieza) | AMBIGUOUS (ninguna pantalla lo comprueba) |
| R14 | Truncado accesible de textos largos (Behaviour, Edge) | — | — | AMBIGUOUS (sin done-check) |
| —  | `.gitignore` de la skill, `skills-lock.json`, restaurar `launch.json` | §6 T10 | T014 | DRIFT (aceptado: decisión del dueño, limpieza) |

## Findings

| # | Sev. | Tipo | Artefacto A (loc) | Artefacto B (loc) | Conflicto | Resolver en |
|---|---|---|---|---|---|---|
| F1 | HIGH | Contradicción | Maqueta aprobada (sidebar plana con «Espacios»; barra móvil Inicio · Contactos · Pipeline · Tareas · Más) | Spec §Non-goals «Cambiar rutas, etiquetas de la navegación principal…» y Plan §3 Shell «mismos grupos, etiquetas y rutas que hoy» / «TabBar móvil: 5 destinos actuales» | Hoy la sidebar usa un selector de secciones (Inicio, Correo, Docs, Asistente, Bóveda, Gestión de contenido) con su navegación propia, y la barra móvil tiene **6** destinos (esas secciones), no los 5 de la maqueta. El implementador de T006 no puede cumplir a la vez la referencia aprobada y el non-goal. Además el plan dice «5 destinos actuales», que es falso. | Decisión del dueño → `clarify` (spec) y `plan` |
| F2 | MEDIUM | Ambigüedad | Spec §Goals (estado de carga y de error en todas las pantallas) y §Behaviour (Error) | Tasks T008–T013 | Los done-checks solo comprueban estado vacío; nada verifica skeleton ni error por pantalla. | `tasks` |
| F3 | MEDIUM | Ambigüedad | Maqueta `#dashboard` (bloque «Hoy» que mezcla citas y tareas; saludo con resumen del día) | Spec §Non-goals «Nueva funcionalidad: widgets…» y Plan T008 | No existe un widget «Hoy» combinado; hay «Próximas citas (lista)» y «Tareas pendientes (lista)». El spec dice que la maqueta fija patrones y no datos, pero T008 no dice que el dashboard renderiza **los widgets existentes del usuario** con el nuevo patrón. | `tasks` (precisar T008) |
| F4 | MEDIUM | Ambigüedad / dependencia humana | Spec §How it proves (capturas con sesión del dueño) | Tasks T006, T008–T013 (`SHOT`, `CHECK`) | Los done-checks en navegador necesitan que el dueño inicie sesión en `localhost:3000`; no figura como precondición y bloquea T006 en adelante. | `tasks` |
| F5 | LOW | Ambigüedad | Spec §Behaviour (Edge: truncado accesible) | Tasks | Sin done-check. | `tasks` o aceptar |
| F6 | LOW | Redacción | Slug `rediseno-obsidiana-estructural` | Contenido «marco claro» | Nombre heredado; documentado en `decisions.md`. | aceptar |
| F7 | LOW | Constitución (aclaración) | Constitution P5 «Un cambio no puede añadir ningún test en rojo» | Tasks T001, T003, T005, T007 (tests en rojo a propósito, TDD) | No es violación: el rojo es intermedio y no se commitea (commit único en T014, que exige ≤ 4 fallos). Se anota para que el revisor no lo marque. | aceptar |

Sin hallazgos en: stack canon (sin dependencias nuevas), auth/permisos/API (no se tocan), P23
(`findMany`, no se tocan consultas), P16 (commit sin co-autoría en T014), duplicación de tareas.
Portadores para implementadores aislados: §0 Global Constraints presente; Interfaces en T004, T006
y T007–T013.

## Recommended routing

1. **F1 (bloquea):** el dueño decide entre:
   - **(a) Mantener la navegación actual** (selector de secciones y 6 destinos en móvil) con el estilo nuevo. La maqueta queda como referencia de estilo, no de estructura de la navegación. Hay que corregir «5 destinos» en el plan.
   - **(b) Adoptar la navegación de la maqueta.** Hay que enmendar el non-goal del spec y añadir al plan cómo se llega a Correo, Docs, Asistente, Bóveda y Contenido.
2. **F2, F3, F4, F5:** ajustes en `tasks` (done-checks de carga y error, precisión de T008, precondición de sesión, truncado).
3. **F6, F7:** se aceptan tal cual.
