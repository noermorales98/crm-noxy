---
type: plan
title: Plan — Rediseño del CRM privado (marco claro)
description: Plan a nivel de estructura del rediseño: tokens de marco, piezas comunes, shell y siete pantallas.
tags: [sdd, plan, design]
timestamp: 2026-11-05T13:00:00Z
topic: sdd
slug: rediseno-obsidiana-estructural
status: draft
---

# Plan — Rediseño del CRM privado (marco claro)

> Spec: [../specs/rediseno-obsidiana-estructural.md](../specs/rediseno-obsidiana-estructural.md) ·
> Constitution: [../constitution.md](../constitution.md) · Status: draft
> Referencia visual aprobada: [maqueta](../specs/assets/rediseno-obsidiana-estructural/maqueta.html)
> Last updated: 2026-11-05

## 0. Global Constraints

Toda tarea los incluye implícitamente; el revisor los lee primero.

- **Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript strict. **Sin dependencias
  nuevas** (movimiento con CSS; el arrastre del tablero sigue con `@hello-pangea/dnd`).
- **Paleta fija:** Índigo `#3545D6`, Discord `#5363EE`, Azul Recuerdo `#7F96F9`, Lima `#C8FE37`,
  Obsidiana `#0B0B18`, Jazmín `#F5F6FB`, Lavanda `#EBEDFA`. Fuente única: Open Sauce Two.
- **Radios:** control 10 px, superficie 12 px, píldora 9999 px. Nada por encima de 16 px.
- **Sombras:** solo overlay `0 8px 8px rgba(11,11,24,.10)` en dropdowns, menús, modales y tarjeta
  arrastrada. Ninguna superficie en reposo lleva sombra. Prohibido `backdrop-filter`.
- **Tipografía:** ningún texto funcional por debajo de 12 px. Cifras con `tabular-nums`.
- **Contraste:** WCAG AA. 4.5:1 texto normal, 3:1 texto grande y gráficos, en los 10 temas.
- **Táctil:** 44 px mínimo en móvil. Sin scroll horizontal de documento a 375 px.
- **Movimiento:** solo `transform` y `opacity`; toda animación dentro de
  `@media (prefers-reduced-motion: no-preference)`; entradas escalonadas solo en la primera carga
  de la pantalla, < 500 ms en total; `/form/*` sin ninguna utilidad de movimiento.
- **Temas:** los 10 ids estables (`noxy-indigo` … `noxy-monochrome`) se mantienen. El marco usa el
  `surfaceSidebar` de cada tema (Lavanda `#EBEDFA` por defecto); el activo usa `actionPrimary`
  sobre `surfaceElevated`. Lima nunca como indicador sobre el marco claro (1.02:1).
- **Alcance:** shell + dashboard + pipeline (con Clientes e historial) + contactos + empresas +
  proyectos (lista y cabecera del detalle) + tareas + citas agendadas. Nada público.
- **No cambia:** rutas, etiquetas de navegación principal, nombres u orden de campos, logo, favicon,
  permisos, datos.
- **Calidad:** `npm test` ≤ 4 fallos (los conocidos); tsc ≤ 66; eslint ≤ 572; ningún error nuevo en
  archivos tocados; `npm run build` verde.
- **Texto visible:** español, sin raya larga (—) ni semirraya como separador.
- **Git:** un único commit al final, gitmoji + Conventional Commits en español, sin co-autoría de IA.
  Nunca se commitean `src/lib/ai-models.ts` ni `src/hooks/useStoredAiModel.ts`.
- **Iconos:** Hugeicons en todo archivo tocado; Lucide sale de esos archivos.

## 1. Context & constraints

- Criterios que dan forma al diseño: marco claro + activo Índigo (spec §Acceptance 1), 375 px y
  44 px (#2), 12 px (#3), sin vidrio (#4), contraste en 10 temas (#5), movimiento reducido (#6),
  estados vacíos (#7), piezas comunes (#8), públicas intactas (#9), tema guardado (#10), barra de
  calidad (#11), DESIGN/PRODUCT enmendados (#12).
- Constitution: P5–P9 (barra de calidad), P13 (tokens de DESIGN.md), P21–P22 (accesibilidad y
  375 px), P14/P16 (commit), P15 (directo a main).
- Hechos del repo que fijan el diseño:
  - Los temas se aplican como variables CSS en el contenedor del shell
    (`crmThemeCssVariables`), con un contrato de 14 tokens verificado por tests.
  - `surface-sidebar` (Lavanda) tiene 339 usos **dentro del contenido** como panel secundario.
  - No hay librería de animación; hay `@hello-pangea/dnd` para el tablero.
  - Las primitivas actuales son cadenas de clases en `src/lib/crm-ui.ts` y clases `.crm-*` en
    `app/globals.css`.
- Fuera de alcance (spec §Non-goals): superficies públicas, otras pantallas privadas, modo oscuro,
  nueva funcionalidad, deuda de tsc/eslint ajena.

## 2. Architecture

```text
                    DESIGN.md / PRODUCT.md (enmendados: el lenguaje escrito)
                                   │
 ┌─────────────────────────────────▼──────────────────────────────────┐
 │ CAPA 1 · Tokens                                                     │
 │  tema (10)  ──► contrato de 14 tokens existente (sin tokens nuevos) │
 │  global     ──► radios, sombra overlay, keyframes de movimiento     │
 └─────────────────────────────────┬──────────────────────────────────┘
                                   │ variables CSS
 ┌─────────────────────────────────▼──────────────────────────────────┐
 │ CAPA 2 · Piezas comunes (src/components/ui/)                        │
 │  PageHeader · StatStrip · Block · DataRow/DataList · DataTable      │
 │  FilterBar · Segmented · Chip · Board/BoardColumn/BoardCard         │
 │  EmptyState · Skeleton · ErrorState · Enter (entrada escalonada)    │
 └───────────────┬───────────────────────────────┬────────────────────┘
                 │                               │
 ┌───────────────▼──────────────┐   ┌────────────▼─────────────────────┐
 │ CAPA 3 · Shell (marco en L)  │   │ CAPA 4 · Pantallas (7)           │
 │  Sidebar · TopBar · TabBar   │   │  dashboard · pipeline · contactos│
 │  móvil · drawer móvil        │   │  empresas · proyectos · tareas · │
 │  DashboardShell (rejilla)    │   │  citas  → solo composición       │
 └──────────────────────────────┘   └──────────────────────────────────┘
```

- **Tokens** (interno): única fuente de color, radio, sombra y movimiento. Nada de capas superiores
  escribe un hex ni una duración.
- **Piezas comunes** (interno): una sola implementación de cada patrón de la maqueta. Son
  presentacionales: reciben datos y callbacks, no cargan datos ni conocen rutas.
- **Shell** (interno): dibuja el marco y la navegación; no cambia rutas, etiquetas ni permisos.
- **Pantallas** (interno): conservan su carga de datos, sus handlers y su lógica; solo cambian la
  composición visual a piezas comunes.
- **Externo:** la base de datos y las APIs no se tocan.

**Decisión principal: el marco reutiliza los tokens de tema existentes.** Con marco claro, el marco
es `surface-sidebar` (Lavanda en el predeterminado), el texto `text-primary`/`text-secondary`, el
activo `action-primary` sobre `surface-elevated` y los divisores `border-subtle`. Esos pares ya
tienen test de contraste AA en los 10 temas. Lo que separa el marco del contenido es la **hoja**:
un plano `surface-app` con radio 12 px y borde `border-subtle` en su esquina superior izquierda.
*Revisado 2026-11-05:* la primera versión creaba 6 tokens `frame*` para un marco oscuro; con el
marco claro sobran y no se añaden.

**Decisión secundaria: movimiento solo con CSS.** Las entradas escalonadas, el hover y la pulsación
se resuelven con keyframes y transiciones con tokens. Añadir una librería de animación pesa en el
bundle y añade una segunda forma de animar. Con CSS la regla de movimiento reducido se aplica en un
solo sitio. El tablero ya anima el arrastre con su librería.

## 3. Interfaces & contracts

**Contrato de tema:** sin cambios de forma. Los 10 temas, sus ids, swatches y 14 tokens se
mantienen. Solo cambian valores si DESIGN.md enmendado lo exige (radios 10/12, `navActive`). El
test de contraste existente se amplía con el par «`action-primary` sobre `surface-elevated`» (activo
del marco) en los 10 temas.

**Piezas comunes** (props a nivel de contrato):
```text
PageHeader { title, subtitle?, actions? (máx. 1 primaria) }       h1 24/600
StatStrip  { items: [{ label, value, delta?, tone?: up|down, flag? }] }  2 cols < 1024 px, 4 ≥
Block      { title, action?: { label, href|onClick }, children }  superficie 12 px, sin sombra
DataList   { rows, renderRow, empty }    filas ≥ 56 px, divisor entre filas, sin borde doble
DataTable  { columns, rows, mobileRow, empty }  tabla ≥ 1024 px; < 1024 px usa mobileRow
FilterBar  { search?, segments?, actions? }   envuelve en móvil, nunca desborda
Chip       { tone: neutral|hot|late|done, children }   hot = Lima + Obsidiana; nunca solo color
Board      { columns: [{ id, title, count, sum?, items }], renderCard, onMove }
           envuelve la librería de arrastre existente; scroll-snap horizontal < 1024 px
EmptyState { title, body, action? }   ErrorState { title, retry? }   Skeleton { shape: rows|stats|board }
Enter      { index, children }   aplica la entrada escalonada solo al montar la pantalla
```

**Shell:**
```text
DashboardShell: rejilla en L ≥ 1024 px (sidebar 248 px + top 56 px + hoja con radio 12 px arriba a
la izquierda); < 1024 px: TopBar 56 px + hoja + TabBar 64 px. Altura 100dvh, no h-screen.
Sidebar y TopBar: fondo surface-sidebar; mismos grupos, etiquetas y rutas que hoy; activo = fondo
surface-elevated + texto e icono action-primary 600 + barra de 3 px action-primary (dos señales).
Hoja: surface-app, radio 12 px y borde border-subtle arriba/izquierda (≥ 1024 px).
TabBar móvil: sólida surface-sidebar, 5 destinos actuales, activo con icono y texto action-primary.
```

**Movimiento:**
```text
--duration-state 180ms · --duration-enter 420ms · --stagger 55ms · --ease cubic-bezier(.16,1,.3,1)
Clases: entrada (opacity 0→1, translateY 8px→0), hover de tarjeta (translateY −1px),
pulsación de botón (translateY 1px). Todo dentro de no-preference.
```

## 4. Data model & flow

No hay cambios de datos, API ni esquema. El único estado nuevo es visual:

- **Tema → tokens → variables CSS → piezas:** la preferencia guardada sigue resolviendo un id de
  tema; el shell publica sus tokens como variables (igual que hoy); marco, hoja y piezas solo leen
  variables.
- **Entrada escalonada:** se dispara al montar la pantalla. Refiltrar, paginar o reordenar no
  vuelve a montar el contenedor que anima, así que no se repite. Las filas individuales no animan
  su entrada (evita que cada filtro dispare animaciones).
- **Pantallas:** cada página conserva su carga de datos (servidor o cliente) y sus handlers; solo
  cambia el árbol de presentación.

## 5. Testing strategy

Patrón del repo: tests de contrato con `node --test` que leen el código fuente, más verificación en
navegador con la sesión del dueño. Sin datos de prueba: la verificación es de solo lectura.

| Criterio (spec) | Nivel | Qué afirma | Qué se finge |
|---|---|---|---|
| #1 marco + activo | contrato + navegador | marco con `surface-sidebar`, hoja separada; el activo tiene barra + peso además del color. Captura 1440 px | nada |
| #2 375 px y 44 px | navegador (script) | `scrollWidth ≤ innerWidth` en las 7 pantallas; controles interactivos ≥ 44 px en < 1024 px | nada |
| #3 12 px | contrato + navegador | ningún `text-[9-11px]` en archivos del alcance; script: ningún texto visible calculado < 12 px | nada |
| #4 sin vidrio | contrato | `globals.css` y archivos del shell sin `backdrop-filter`/`backdrop-blur`; ninguna sombra con blur > 8 px | nada |
| #5 contraste 10 temas | unitario | test existente de AA + nuevo par action-primary sobre surface-elevated ≥ 4.5 en cada tema | nada |
| #6 movimiento reducido | contrato + navegador | todos los keyframes/transiciones de movimiento nuevos dentro de `no-preference`; con emulación `reduce`, `getAnimations()` vacío | nada |
| #7 estados vacíos | contrato | cada lista del alcance pasa `empty` a su pieza común | nada |
| #8 piezas comunes | contrato | cada página del alcance importa `PageHeader` y su pieza de lista/tablero; ninguna define cabecera o chip propio | nada |
| #9 públicas intactas | contrato (existente) | tests de `/form` sin movimiento siguen igual; `git diff` sin archivos públicos | nada |
| #10 tema guardado | unitario (existente) | ids estables y resolución de desconocidos sin cambios | nada |
| #11 barra de calidad | comando | `npm test`, tsc, eslint, build contra la línea base | nada |
| #12 docs enmendados | contrato | DESIGN.md contiene la sección del marco y la regla de movimiento nueva; registro de enmiendas actualizado | nada |

Comparación visual con la maqueta: capturas 1440 y 375 px por pantalla en
`02-DOCS/wiki/sdd/progress/rediseno-obsidiana-estructural/`, revisadas por el dueño en cada tarea
(modo con aprobación por fase).

## 6. Sequencing & dependencies

```text
T1 Tokens + docs ─► T2 Piezas comunes ─► T3 Shell ─┬─► T4 Dashboard
                                                   ├─► T5 Pipeline (+ Clientes, historial)
                                                   ├─► T6 Contactos + Empresas
                                                   ├─► T7 Proyectos (lista + cabecera)
                                                   ├─► T8 Tareas
                                                   └─► T9 Citas
                                       T4..T9 ─► T10 Verificación final + commit único
```

1. **T1 Tokens y documentos.** Par de contraste del activo en los 10 temas (test); radios
   10/12; sombra overlay única; quitar las clases de vidrio; tokens y keyframes de movimiento;
   enmendar DESIGN.md (marco, movimiento expresivo, piezas comunes) y PRODUCT.md (principio 5).
   *Check:* tests de tema y de marca verdes salvo los 4 conocidos.
2. **T2 Piezas comunes.** Las 14 piezas del §3, con test de contrato. *Check:* tsc/eslint sin
   errores nuevos; una página de prueba no se crea (se verifican al usarse en T3–T4).
3. **T3 Shell.** Rejilla en L, sidebar, top bar, tab bar y drawer móvil sólidos; Lucide fuera de
   estos archivos. *Check:* capturas 1440/375 en 2 pantallas cualquiera; script de 375 px.
4. **T4 Dashboard.** Cabecera, franja de cifras (KPI), bloques de widgets, estados vacíos;
   personalizador intacto. *Check:* captura frente a maqueta `#dashboard`.
5. **T5–T9** en este orden (de más a menos visible). Cada una: composición con piezas comunes,
   tabla→filas en móvil, estados vacío/carga/error, sin `text-[≤11px]` ni grises crudos en sus
   archivos. *Check por tarea:* capturas 1440/375 + script + aprobación del dueño.
6. **T10 Cierre.** Suite completa, tsc, eslint, build, scripts de navegador en las 7 pantallas con
   movimiento normal y reducido, `/form` intacto; quitar el servidor de maqueta de
   `.claude/launch.json`; un solo commit.

Revisión en cada tarea según `rsc risk` del diff (ASDD). Ninguna tarea toca auth, permisos ni
`app/api/public/**`, así que no se espera revisión humana obligatoria más allá de la visual.

## 7. Risks & open decisions

1. **Test de marca ya roto del botón primario** (uno de los 4 conocidos) — *trigger:* T1 toca
   `.crm-btn-primary`/`crm-ui.ts`. *Impacto:* podría pasar a verde (bien) o cambiar de mensaje.
   *Mitigación:* no cambiar ese contrato; si pasa a verde se registra como mejora; nunca se
   modifica el test para que pase.
2. **Cambiar radios globales (12→10, 20→12) afecta a pantallas fuera de alcance** — *trigger:* T1.
   *Impacto:* cambio visible, pequeño, en correo, Docs, ajustes… *Mitigación:* es alinear con
   DESIGN.md (no una dirección nueva); capturas rápidas de 3 pantallas fuera de alcance en T10.
3. **Entrada escalonada repetida al filtrar** — *trigger:* animar filas. *Mitigación:* solo animan
   contenedores de pantalla montados una vez (§4); test en navegador: tras filtrar,
   `getAnimations()` vacío.
4. **Pantallas grandes (pipeline 720 líneas, clientes 585)** — *trigger:* T5. *Impacto:* regresión
   funcional al recomponer. *Mitigación:* no tocar handlers ni carga de datos; diff limitado a JSX y
   clases; prueba manual de arrastre (sin soltar en otra etapa: solo lectura) y de filtros.
5. **Verificación contra producción** — *trigger:* cualquier clic que escriba. *Mitigación:* solo
   navegación, filtros y aperturas de vista; ningún guardar, mover entre etapas ni crear.
   El arrastre se verifica con el gesto cancelado.
6. **Commit único grande** — *impacto:* revertir es todo o nada; el despliegue concentra el
   cambio. *Mitigación (aceptada por el dueño):* el trabajo intermedio queda verificado por tarea
   aunque no se commitee; `git revert` del commit único es el rollback.
7. **Lucide sigue en archivos fuera de alcance** — la dependencia no se elimina en este ciclo.
   *Decisión:* registrada como deuda en `decisions.md`.
8. **Aislamiento** — el hook de rsc detecta otra sesión en esta carpeta y propone un worktree; la
   constitution (P15) y el dueño piden trabajar directo en `main` sin ramas. **Decisión abierta para
   el dueño** (ver aprobación del plan).

## Rollback

Un único commit en `main`: `git revert <sha>` devuelve el aspecto anterior completo. No hay
migraciones ni datos afectados.
