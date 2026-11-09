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

## 2026-11-05 — Cierre de T003 tras la ronda 3  (feature: rediseno-obsidiana-estructural, task: T003)
Context   — La ronda 3 (máximo del ledger) dejó 1 should-fix y 3 nits, todos de precisión en las regex del propio test de contrato (StatStrip tone/flag, extractor de clases con template literals, límites del clamp).
Options    — (a) aparcar T003 en la cola de decisiones (bloquea T004); (b) corregir y registrar como trivial sin peso de negocio (implement, paso g).
Decision   — (b). Corregidos y validados con fixtures de scratch: formas correctas pasan (`cn(… dragging && overlay)`, desestructuración, claves entre comillas, `Math.min(5, Math.max(0, i))`) y formas incorrectas fallan (`hover:transition-colors` y `transition-[transform]` junto a `crm-lift`, transición en `${cond ? … : "transition-colors"}`, límite 3).
Why        — Sin cambio de alcance ni de contrato de producto; el riesgo residual es de falso rojo en T004, que se detectaría y corregiría al implementar.

## 2026-11-05 — Modelo de navegación y dos consecuencias  (feature: rediseno-obsidiana-estructural, task: T005)
Context   — La revisión de T005 mostró que comprobar la navegación con regex sobre el JSX era frágil (falsos rojos y verdes) y dejaba sin probar «Volver», el contador de correo y el teclado del panel.
Decision   — Modelo puro `src/lib/crm-navigation.ts` probado ejecutándolo; el contrato del shell solo mira JSX/CSS con un analizador de etiquetas.
Consecuencia 1 — **Bóveda contextual** (5.ª sección): `VaultNav` es el único selector de clientes; el spec decía «ninguna función de esos submenús se pierde». Desviación del texto del spec (que listaba 4), registrada para revisión del dueño (review-after).
Consecuencia 2 — **Se retira «Editar barra»** de la barra móvil (personalización por usuario en `localStorage`): el dueño eligió «cuatro destinos fijos y Más». Las preferencias guardadas quedan sin uso.
Interfaz nueva — `--nav-active-ink` en `crmThemeCssVariables` y `:root`.

## 2026-11-05 — Cierre de T005 tras la ronda 3 (pass)  (feature: rediseno-obsidiana-estructural, task: T005)
Context   — Ronda 3 en pass con 1 pregunta y 3 nits.
Decision   — (1) **UX de «Volver»**: elegir cualquier destino de la lista plana anula el descarte, así que pulsar «Correo» estando en /emails reabre su submenú (contrato: `setX(null)`). (2) Los iconos de navegación heredan `currentColor` (sin `ICON_COLOR` ni `color` fijo), para que la tinta activa llegue al icono. (3) Las clases de la barra móvil se buscan en el `<nav>` o su primer hijo, no en una ventana de 400 caracteres. (4) El setter de «Volver» acepta cualquier nombre de variable que venga de `usePathname()`.
Why        — Ajustes de precisión del contrato sin cambio de alcance; registrados en lugar de una 4.ª ronda.

## 2026-11-06 — Token `line` frente a las reglas heredadas de bordes  (feature: rediseno-obsidiana-estructural, task: T008)
Context   — `globals.css` tiene tres reglas antiguas bajo `[data-crm-theme]` que, para todo elemento con `border-border-subtle`, ponen el borde transparente, el fondo de enlaces/botones en Lavanda y fuerzan el radio de superficie (diseño previo «sin bordes»). Anulaban los bordes de la maqueta aprobada (bloques, hoja, KPI).
Options    — (a) borrar las reglas (cambia de golpe el aspecto de pantallas fuera de alcance); (b) token nuevo `line` (`@theme inline`, mismo color que `border-subtle` y sigue al tema) usado por el lenguaje nuevo; las reglas siguen aplicando solo al código heredado.
Decision   — (b). Piezas, shell y pantallas del alcance usan `border-line` / `divide-line`; los contratos lo exigen.
Why        — Respeta el alcance (pantallas fuera de alcance sin cambios) y deja retirar las reglas heredadas en otro ciclo.

## 2026-11-06 — Citas: recarga fallida conserva la lista; enlaces mailto/tel  (feature: rediseno-obsidiana-estructural, task: T013)
Context   — La revisión de T013 vio que una recarga fallida tras Completar/Cancelar/Eliminar sustituía la lista por ErrorState, que `updateStatus` no trataba errores y que el email y teléfono del invitado pasaron a ser enlaces.
Options    — (a) dejar el comportamiento; (b) ErrorState solo sin datos y toast en recargas; (c) revertir los enlaces.
Decision   — (b). `fetchAppointments({ refresh: true })` tras una acción: si falla, la lista se queda y sale un toast. `updateStatus` comprueba `res.ok` y avisa con un toast. El esqueleto y «Cargando citas…» solo salen en la primera carga. Los enlaces mailto/tel se mantienen.
Why        — El spec pide estados de error visibles sin perder datos ya cargados. Los enlaces siguen el mismo patrón que contactos y empresas (filas móviles con `tel:`), así que son coherencia del rediseño, no una función nueva. El Segmented de 4 opciones con scroll horizontal a 375 px es el comportamiento común de la pieza; se revisa en T014.

## 2026-11-06 — Proyectos: lista en DataList, borrado visible y onDeleted  (feature: rediseno-obsidiana-estructural, task: T011)
Context   — La rejilla de tarjetas de proyectos tenía el borrado oculto hasta hover y `router.refresh()` no quitaba la fila de una lista pedida en el cliente. La cabecera del espacio usaba iconos de Lucide en el panel de compartir y un disparador de 32×24.
Options    — (a) conservar la rejilla; (b) DataList con borrado siempre visible.
Decision   — (b). `DeleteProjectButton` recibe `onDeleted` y la lista quita la fila. Se añade estado de error con reintentar. `ProjectSharePanel` pasa a Hugeicons y su disparador mide 44 px. `ProjectHeaderSetter` marca `pageHeader: true`. El resumen del proyecto (`app/projects/[id]/page.tsx`) queda fuera de T011 y conserva texto pequeño.
Why        — Con el borrado visible, la fila que no desaparecía parecería un fallo. El aviso de lint `set-state-in-effect` del montaje se acepta: el archivo queda en 1 error frente a 3 de la línea base.

## 2026-11-06 — Pipeline: tablero común, filas de clientes, historial en DataTable  (feature: rediseno-obsidiana-estructural, task: T009)
Context   — El tablero, los clientes recurrentes y el historial tenían texto de 9 a 11 px, etiquetas en mayúsculas con tracking, acciones solo con hover, emojis como estado y el botón principal en la barra superior.
Options    — (a) restilar sin cambiar estructura; (b) componer con Board/BoardColumn/BoardCard, DataList y DataTable.
Decision   — (b). `BoardColumn` gana dos props opcionales: `accent` (color de etapa guardado por el usuario) y `footer` («Agregar deal» fuera de la zona de soltar). `Board` lleva `scroll-px` para que el snap respete el margen a 375 px. Las tarjetas de clientes pasan a filas con «Marcar pagado» y borrar siempre visibles. 🎉/❌ pasan a chips «Ganado»/«Perdido». «Necesita atención» usa Lima (urgente). El historial usa `backHref` de la barra superior en vez de su flecha propia. Se añaden estados de error con reintentar. Intro abre el deal salvo durante un arrastre con teclado. `DataTable` reordena sus clases para que el contrato de UI vuelva a casar (`hidden lg:block`).
Why        — DESIGN.md manda conservar los colores de datos (fuentes, etapas, avatares) y reservar Lima para lo urgente. La pieza común evita tres variantes de tablero y de tabla.

## 2026-11-06 — Navegación por áreas y tests de navegación sustituidos  (feature: rediseno-obsidiana-estructural, task: T015)
Context   — La ronda 2 aprobada cambia el primer nivel de la sidebar: de 17 destinos en 4 grupos a 11 entradas en 3 grupos, con áreas que abren submenú.
Options    — (a) mantener `NAV_GROUPS` plano y añadir agrupación solo en la vista; (b) modelar las áreas en `crm-navigation.ts` (`NavArea`, `AREA_ITEMS`, `NAV_DESTINATIONS`).
Decision   — (b). Los tests de `crm-navigation.test.ts` que fijaban la estructura de la ronda 1 se **sustituyen** (no se debilitan): se conservan las garantías (17 destinos, permisos, contador de correo, «/» exacto, «Volver», barra móvil) y se añaden las de áreas. El chevrón › y el texto «, abre submenú» para lector de pantalla van en áreas y en Correo, Docs, Bóveda y Contenido; no en Asistente (chrome propio). Un área sin destinos visibles no abre un panel vacío. La marca es el isotipo oficial a 20×15 px con `alt=""` junto a «Noxy».
Why        — El modelo puro se prueba ejecutándolo y la sidebar solo lo pinta; así el resaltado y los permisos no dependen de React.

## 2026-11-06 — Piezas compartidas a 44 px y `selectInline`  (feature: rediseno-obsidiana-estructural, tasks: T018)
Context   — Las pantallas de la ronda 2 repetían botones `btnPrimary`/`btnGhost` (40 px) y el disparador de `DatePicker` (40 px), y `${inputCls} w-auto` no ganaba a `w-full`.
Options    — (a) corregir cada pantalla; (b) corregir la pieza compartida.
Decision   — (b). `btnPrimary`/`btnGhost` pasan a `min-h-11 lg:min-h-10` (también llega a `/login`, que solo crece en móvil); el `DatePicker` normal pasa a `min-h-11 lg:min-h-10` con anillo `focus` (la variante `compact` no cambia de alto); `selectInline` = `input` con `w-auto`. La fila de escritorio de cotizaciones enlaza desde el folio (antes `onClick` en la fila, no accesible por teclado); la fila móvil entera es enlace.
Why        — Un solo cambio arregla todas las pantallas que usan la pieza y no altera superficies públicas más allá de la altura táctil.

## 2026-11-06 — Regla de acción principal en pantallas «pass»  (feature: rediseno-obsidiana-estructural, tasks: T020, T023)
Context   — El contrato común prohibía `addButton` en los archivos «pass» sin PageHeader, pero el calendario de contenido tiene su acción principal («Agregar pieza») en la barra superior, junto a la navegación de mes.
Options    — (a) mover esa acción a un PageHeader que el editor no tiene; (b) limitar la regla «la acción vive en PageHeader» a las páginas que tienen PageHeader.
Decision   — (b). En una pantalla «pass» sin PageHeader no se exige `pageHeader: true` ni se prohíbe `addButton`: la barra superior conserva su h1 y su acción. Los editores y calendarios son chrome de trabajo, no páginas de lista.
Why        — La regla original (plan §3) liga la acción primaria a PageHeader; extenderla a pantallas sin PageHeader no estaba en la spec y obligaba a rediseñar el calendario.

## 2026-11-06 — Prueba del compositor de correo sustituida  (feature: rediseno-obsidiana-estructural, task: T020)
Context   — `crm-surface-style.test.ts` exigía en el compositor de `/emails` un fondo `bg-brand-obsidian/55` con `backdrop-blur-[2px]` y un panel `bg-white`. La ronda 1 del rediseño aprobó «sin cristal» y superficies por token.
Options    — (a) conservar el blur para que pase la prueba; (b) sustituir la prueba por el contrato aprobado.
Decision   — (b). La prueba exige ahora fondo sólido `bg-brand-obsidian/45`, ausencia de `backdrop-blur` junto al compositor y panel `bg-surface-elevated rounded-surface overflow-hidden`. No se debilita: cambia lo que protege porque cambió la regla.
Why        — La spec prohíbe el cristal en el shell y sus pantallas; mantener la prueba antigua obligaría a incumplir la spec aprobada.

## 2026-11-07 — Sin barra superior: los controles pasan a PageHeader y a una fila de la hoja  (feature: rediseno-obsidiana-estructural, tasks: T028, T030)
Context   — Ronda 3: la persona pidió quitar el navbar superior. Orden, filtros, botón principal, acciones y «volver» salían de `Header.tsx` leyendo `HeaderContext`; 30 pantallas dependen de esa configuración.
Options    — (a) reescribir cada pantalla para pintar sus propios controles; (b) extraer los controles a `PageControls` y pintarlos desde `PageHeader` (pantallas de lista), más una fila `PageBar` dentro de la hoja para las pantallas sin PageHeader (editores, calendarios, detalle).
Decision   — (b). `Header.tsx` se elimina; `useOptionalHeader` evita lanzar fuera del proveedor. `PageBar` no es una barra global: ocupa la parte alta del contenido, cede el paso a PageHeader (`pageHeader: true`) y conserva el único h1. Búsqueda (⌘K) y campana pasan a la cabecera de la sidebar; en móvil se alcanzan dentro del cajón («Más»).
Why        — Mantiene sin tocar la API de `HeaderContext` y las 30 pantallas; ninguna pierde orden, filtros, volver ni botón principal. Costo conocido: Correo y los calendarios conservan una fila fina de título sobre su contenido.

## 2026-11-07 — Pruebas de contrato de la sidebar sustituidas por las del modelo de modos  (feature: rediseno-obsidiana-estructural, tasks: T028, T029)
Context   — `redesign-shell-contract.test.ts`, `assistant-sidebar-navigation-contract.test.ts` y `crm-navigation.test.ts` modelaban el árbol con ramas (`data-tree-parent`, `inert`, `SIDEBAR_OPEN_STORAGE_KEY`, `branchForPath`, `sidebarView`…), que la ronda 3 aprobada retira.
Options    — (a) conservar el árbol para no tocar las pruebas; (b) sustituirlas por el contrato aprobado y podar el código muerto.
Decision   — (b). Las pruebas nuevas exigen tablist de 3 modos, lista plana, búsqueda y campana en la cabecera, segunda columna con estado guardado y ausencia de ramas; las del asistente leen `context-navs.tsx`. Se podaron `sidebarView`, `branchFor*`, `parseOpenBranches`, `initialOpenBranches`, `toggleBranch`, `SIDEBAR_OPEN_STORAGE_KEY` y `NAV_PARENT_ACTIVE`. No se debilita ninguna aserción vigente: cambia lo que protege porque cambió la regla.
Why        — Mantener las pruebas antiguas obligaría a incumplir la spec de la ronda 3.

## 2026-11-08 — Radios más redondos, hoja recta y submenú bajo su elemento  (feature: rediseno-obsidiana-estructural, ronda 3)
Context   — El dueño pidió uniformidad (sidebar con los mismos bordes que el CRM), elementos y tarjetas más redondeados, la esquina de la hoja recta, tablas rediseñadas y que la lista de Correo/Docs/Bóveda/Contenido aparezca debajo de su elemento.
Options    — (a) mantener el tope de 16px de DESIGN.md; (b) subir los tokens y actualizar el contrato.
Decision   — (b). control 14px, superficie 20px, ningún radio sobre 24px (DESIGN.md y las pruebas de tokens actualizadas); `lg:rounded-tl-surface` fuera de la hoja; fila activa, modo activo y cuenta del sidebar con `border-line`; `DataTable` con encabezado tintado fijo, hover por fila y primera columna en peso medio.
Why        — Orden explícita del dueño; el cambio vive en tokens, así todas las superficies quedan uniformes.
