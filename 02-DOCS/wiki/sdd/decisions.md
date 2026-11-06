# SDD decisions (append-only)

## 2026-11-05 — Rediseño del CRM privado: lenguaje B «Obsidiana estructural»

- Opciones: A (aplicar el DESIGN.md actual), B (lenguaje nuevo), no hacer nada. Elegida **B** por el dueño: el lenguaje actual se ve genérico, poco moderno y con jerarquía débil.
- Objeción registrada (no bloqueante): el problema medido dominante es el incumplimiento (278 textos < 12 px, 389 colores fuera de tokens). Mitigación exigida en el spec: el lenguaje vive en tokens y piezas comunes.
- Lenguaje: «Obsidiana estructural» frente a «Precisión monocroma» y «Color de marca expresivo».
- Se mantienen paleta Noxy, Open Sauce Two y los 10 temas personales. Sin modo oscuro en este ciclo.
- Movimiento «Expresivo»: enmienda la regla de DESIGN.md contra secuencias de entrada; /form sigue sin movimiento.
- Spec: `specs/rediseno-obsidiana-estructural.md`.

## 2026-11-05 — Plan del rediseño: tokens de marco y movimiento con CSS

- Marco oscuro con 6 tokens nuevos (`frame*`) por tema, en vez de oscurecer `surface-sidebar` (339 usos como panel Lavanda dentro del contenido). Mantiene intacto el resto y deja preparado el modo oscuro.
- Movimiento solo con CSS (keyframes y transiciones con tokens), sin dependencia nueva. El arrastre sigue con `@hello-pangea/dnd`.
- Deuda aceptada: Lucide sale solo de los archivos tocados; la dependencia sigue por pantallas fuera de alcance.

## 2026-11-05 — Revisión: marco claro

- El dueño pide sidebar clara («lo único que quiero que cambies es el color del sidebar, que sea claro») y elige «Ajuste: marco claro»: se mantiene todo el rediseño, sidebar y barra superior en el tono de sidebar de cada tema.
- Consecuencias: el activo pasa de Lima a Índigo (Lima sobre Lavanda = 1.02:1); se anulan «marco oscuro tintado por tema» y los 6 tokens `frame*` del plan; el marco reutiliza el contrato de 14 tokens existente.
- El slug `rediseno-obsidiana-estructural` se conserva para no romper enlaces; los títulos pasan a «marco claro».

## 2026-11-05 — Plan aprobado, aislamiento y skill

- Plan aprobado por el dueño («Apruebo el plan»).
- Aislamiento: carpeta principal, directo en `main` (opciones: carpeta principal / worktree sin rama). Por qué: constitution P15; la otra sesión detectada es la que lanzó este trabajo.
- taste-skill: se commitea solo `skills-lock.json`; la carpeta `.claude/skills/design-taste-frontend` (37 MB) va a `.gitignore` (opciones: solo lockfile / ambos / ninguno).

## 2026-11-05 — Enmienda de navegación (analyze F1)

- Opciones: mantener la navegación actual con estilo nuevo / adoptar la de la maqueta. Elegida **adoptar la maqueta**.
- Sidebar plana con los 17 destinos actuales en 4 grupos (Principal, Ventas, Calendario, Espacios); submenú contextual con «Volver» en Correo, Docs, Contenido y Asistente; barra móvil Inicio · Contactos · Pipeline · Tareas · Más; solo contadores existentes.
- Analyze re-run: PASS (2 LOW aceptados).

## 2026-11-05 — Tinta del destino activo  (feature: rediseno-obsidiana-estructural, task: T001)
Context   — En el marco claro, el activo usa texto/icono/barra de color. `actionPrimary` no llega a 4.5:1 sobre blanco en noxy-memory (2.75) ni noxy-lime (1.19): son rellenos que llevan Obsidiana encima (regla de pares).
Options    — (a) cambiar los colores de acción de esos temas; (b) pastilla rellena con acción + su foreground; (c) tinta derivada: acción si ≥ 4.5:1, si no Obsidiana.
Decision   — (c) `navActiveInk(theme)`.
Why        — No altera la identidad de ningún tema ni la maqueta aprobada en los 8 temas que cumplen, y respeta la regla de pares de DESIGN.md. Revisable por el dueño (review-after).

## 2026-11-05 — Sin config SDD  (feature: rediseno-obsidiana-estructural, task: T001)
Context   — `02-DOCS/wiki/sdd/config.yaml` no existe; implement recomienda `sdd-init`.
Decision   — Usar los comandos de la constitution como fallback y no bloquear; recomendar `sdd-init` como mejora posterior.

## 2026-11-05 — Tests de superficie con valores superados  (feature: rediseno-obsidiana-estructural, task: T002)
Context   — `src/lib/crm-surface-style.test.ts` (2026-08-18) fijaba `--radius-surface: 20px`, `--radius-control: 12px` y la sombra de menú `0 10px 28px …`. Contradice el §0 del plan aprobado (control 10 px, superficie 12 px, solo overlay `0 8px 8px`) y el `DESIGN.md` previo (10/12). `analyze` no lo detectó.
Options    — (a) mantener los valores viejos y no cumplir el plan; (b) actualizar los valores esperados al contrato aprobado con la misma exigencia; (c) borrar los tests.
Decision   — (b). Se conserva la aserción exacta (equal), solo cambian los valores y el nombre del test.
Why        — Es la misma regla con la decisión nueva; (c) sería debilitar la red de tests.

## 2026-11-05 — Cliente de Prisma regenerado y nueva línea base de tsc  (feature: rediseno-obsidiana-estructural, entre T002 y T003)
Context   — El dashboard y `/api/contacts` fallaban en local con `Unknown argument hideContacts`: el cliente generado en `node_modules/.prisma` era del 5 de octubre y el esquema añadió el campo después.
Decision   — `npx prisma generate` (aprobado por el dueño: «Sí, ambas cosas»). Solo regenera código local; no toca la base de datos ni archivos versionados.
Effect     — tsc baja de 66 a 19 errores (los 47 restantes eran tipos de Prisma desactualizados). Para el trinquete de este trabajo se usa **19** como línea base efectiva: ninguna tarea puede subirla. La constitution (≤ 66) sigue cumpliéndose; actualizar su cifra es decisión del dueño (enmienda).
