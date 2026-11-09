---
type: spec
title: Spec — Rediseño del CRM privado (marco claro)
description: WHAT y WHY del nuevo lenguaje visual del shell autenticado y de siete pantallas principales de Noxy CRM.
tags: [sdd, spec, design]
timestamp: 2026-11-05T12:00:00Z
topic: sdd
slug: rediseno-obsidiana-estructural
status: clarified
---

# Spec — Rediseño del CRM privado (marco claro)

> Slug: `rediseno-obsidiana-estructural` · Status: clarified (aprobada con enmienda de navegación 2026-11-05) · Created: 2026-11-05
> Inherits: [constitution](../constitution.md) · Enmienda: `DESIGN.md`, `PRODUCT.md`
> Auditoría de partida: notas de sesión `rediseno-auditoria.md` (resumida abajo).

## Problem & why
El equipo de Noxy pasa jornadas largas en el CRM. Según su dueño, hoy la interfaz **se ve genérica**
(otra plantilla SaaS, no se reconoce como Noxy), **poco moderna** y con **jerarquía débil**: en cada
pantalla todo pesa igual y cuesta ver qué importa. Además, la propia marca no se cumple: hay 278
textos por debajo de 12 px, 389 colores fuera de los tokens, 123 etiquetas en mayúsculas con
tracking y glassmorphism en el chrome móvil, aunque `DESIGN.md` lo prohíbe.

## Cost of not building it
El CRM sigue pareciendo una plantilla y la deriva crece con cada pantalla nueva, porque nada impone
el sistema. El coste no es una caída de ingresos medible: es lectura más lenta en cada jornada,
una identidad Noxy que no se ve en la herramienta propia y una deuda visual que cada cambio agranda.

## The cheapest alternative
Opción A de la auditoría: aplicar el `DESIGN.md` actual (tokens, sin vidrio, mínimo de 12 px, una
familia de iconos) sin cambiar de lenguaje. Arregla la inconsistencia, pero no resuelve que el
lenguaje en sí se lea como genérico y poco moderno. **El dueño eligió B tras ver A.**
*Objeción registrada:* el problema dominante medido es el incumplimiento, no el lenguaje. Un
lenguaje nuevo sin mecanismo que lo imponga volverá a desviarse. Por eso este spec exige que el
lenguaje viva en tokens y piezas comunes, no en clases sueltas por pantalla (ver Goals).

## Goals
- El CRM privado tiene un lenguaje propio reconocible como Noxy: un **marco claro en «L»**
  (navegación lateral y barra superior en el tono de sidebar de cada tema, Lavanda por defecto) que
  encuadra una **hoja de contenido** con esquina redondeada, cabeceras con cifras clave y listas y
  tableros densos.
- La jerarquía es evidente: en cada pantalla, lo urgente y lo importante se distingue sin leer todo.
- El lenguaje es uno solo y reutilizable: cabecera de página, barra de filtros, lista/tabla,
  tablero, estado vacío, estado de carga y estado de error se ven y se comportan igual en todas las
  pantallas del alcance.
- El nuevo lenguaje queda escrito en `DESIGN.md` y `PRODUCT.md` enmendados, para que las pantallas
  futuras lo sigan.
- La interfaz se siente viva: movimiento expresivo (respuesta al hover y a la pulsación, transiciones
  de estado, reordenaciones animadas y entradas escalonadas al cargar), siempre anulado con
  movimiento reducido.

## Non-goals / out of scope
- **Superficies públicas**: `/form/*`, `/book/*`, `/schedule/*`, `/docs/*`, `/cotizar/*`,
  `/calendario/*`, `/proyecto/*` y `/login`. Conservan su aspecto actual y Noxy Índigo.
- ~~Pantallas privadas fuera de las siete del alcance~~ — **sustituido por la ronda 2** (ver
  Revisions, 2026-11-06): ahora entran Formularios, Cotizaciones, Tipos de cita, Disponibilidad,
  Correo, Campañas, Docs, Bóveda, Gestión de contenido, Ajustes, Perfil y los detalles internos
  (deal, proyecto, formulario, cotización, página de Docs). Sigue fuera el **asistente**, que
  tiene su propio chrome.
- **Modo oscuro** de la aplicación: diferido. Los tokens deben permitirlo después, pero no se
  entrega.
- Cambiar la paleta Noxy (Índigo, Discord, Azul Recuerdo, Lima, Obsidiana, Jazmín, Lavanda) o la
  tipografía Open Sauce Two. Cambia cómo se usan, no cuáles son.
- Eliminar o reducir los 10 temas personales.
- Cambiar rutas, etiquetas de los destinos de navegación, nombres o el orden de campos de
  formulario, o el favicon. (El **logo del sidebar** sí cambia en la ronda 2: isotipo oficial.) (La **estructura** de la navegación sí cambia: ver Behaviour,
  Navegación.)
- Contadores nuevos en la navegación: solo se mantienen los que ya existen (p. ej. correo sin
  leer).
- Nueva funcionalidad: widgets, filtros, vistas o datos que hoy no existen. Tampoco se añaden
  «por si acaso» buscadores, atajos, onboarding ni ilustraciones.
- Arreglar errores de tsc o eslint preexistentes fuera de los archivos tocados.

## Users & context
El equipo operativo de Noxy Digital (`PRODUCT.md`): gestiona leads, empresas, proyectos, ventas y
citas durante jornadas largas, en escritorio y también en móvil. Lo que buscan es localizar
información y completar acciones recurrentes rápido y sin carga cognitiva.

## What the user can do
Cualquier persona con sesión iniciada en una organización puede, como hoy y sin pasos nuevos:
- navegar por el shell (sidebar en escritorio, barra superior y barra inferior en móvil);
- usar el dashboard (ver y personalizar sus widgets);
- trabajar en el pipeline y en la lista de clientes, en contactos, empresas, la lista de proyectos
  con la cabecera de cada proyecto, tareas y citas agendadas.

Nadie gana ni pierde permisos. Lo que cada rol puede ver y hacer no cambia.

## What result they get
Cada pantalla del alcance se corresponde con una **referencia visual aprobada por el dueño**
(maqueta del shell y del dashboard, más una maqueta de patrón para lista/tabla y otra para tablero),
en escritorio (1440 px) y en móvil (375 px). Referencia propuesta:
[`assets/rediseno-obsidiana-estructural/maqueta.html`](assets/rediseno-obsidiana-estructural/maqueta.html)
(vistas `#dashboard`, `#lista`, `#tablero`; es responsive, así que a 375 px muestra la versión
móvil). La primera versión (marco oscuro) se aprobó el 2026-11-05; **la versión actual, con marco
claro, la aprobó el dueño el 2026-11-05** («Apruebo marco claro»). La maqueta fija el
lenguaje y los patrones; los datos que muestra son de ejemplo y sus iconos (Tabler) son solo de la
maqueta.

## What it must respect
- Constitution P13: la UI respeta los tokens de `DESIGN.md` (enmendado por este cambio) y el texto
  visible va en español.
- Constitution P21 y P22: teclado y foco visible; avisos con `role="status"` o `aria-live`; cada
  pantalla funciona a 375 px sin scroll horizontal.
- `PRODUCT.md`, accesibilidad: WCAG 2.2 AA (4.5:1 texto normal, 3:1 grande y gráficos), objetivos
  táctiles de 44 px en móvil, el color nunca como única señal y soporte global de movimiento reducido.
- El mínimo de 12 px para texto funcional (`DESIGN.md`) se mantiene.
- **Private-Scope Rule:** los temas personales solo envuelven el shell autenticado. Los colores de
  éxito, aviso, error, integraciones, gráficas, categorías y los guardados por el usuario no se
  sustituyen por la paleta de marca.
- Los 10 temas personales siguen funcionando y la preferencia guardada de cada usuario se respeta.
- `/form/:id` sigue sin movimiento bajo cualquier preferencia.
- Contratos de marca existentes (tests): paleta y roles en el tema global, Open Sauce Two como única
  familia fija, `prefers-reduced-motion`, favicon y metadatos. No se rompe ninguno; los 4 fallos
  conocidos siguen siendo los únicos.
- Calidad (DoD de la constitution): `npm test` sin fallos nuevos, tsc ≤ 66 y eslint ≤ 572 sin
  errores nuevos en archivos tocados, `npm run build` en verde.
- Anti-referencias que siguen vigentes: nada de glassmorphism, gradientes decorativos, tarjetas
  anidadas, sombras amplias ni redondeos de más de 16 px.

## How it proves it
- Por cada pantalla: capturas en escritorio (1440 px) y a 375 px, con datos reales y sesión
  iniciada por el dueño, guardadas junto a la verificación y comparadas con la referencia aprobada.
  **El dueño da el visto bueno a la comparación; el agente no juzga solo que «se parece».**
- Comprobaciones automáticas que dejan su salida: ancho de documento ≤ viewport a 375 px, ningún
  texto funcional calculado por debajo de 12 px en las pantallas del alcance, contraste AA de los
  pares de tokens nuevos (en los 10 temas) y ausencia de animación con movimiento reducido.
- Las salidas de `npm test`, `npx tsc --noEmit`, eslint y `npm run build` frente a la línea base.
- Un test de contrato de marca nuevo para las reglas del lenguaje que se puedan comprobar en código.

## Behaviour
- Main path: al iniciar sesión, la persona ve el marco claro con la navegación. El elemento
  activo lo marca Índigo (fondo blanco, texto e icono Índigo, barra lateral de 3 px) y Lima queda
  para lo urgente. Cada pantalla abre con una cabecera que dice dónde
  está, las cifras clave y una sola acción principal en Índigo. Listas y tableros comparten la misma
  gramática.
- Movimiento: al cargar una pantalla, cabecera y contenido entran escalonados y breves. Hover y
  pulsación responden en los controles. Mover una tarjeta en el tablero se anima hasta su sitio.
  Con movimiento reducido, todo aparece en su estado final al instante.
- Navegación (escritorio): la sidebar deja el selector de secciones y pasa a una **lista plana**
  con todos los destinos actuales y sus etiquetas de hoy, agrupados: *Principal* (Inicio, Empresas,
  Contactos, Tareas, Proyectos), *Ventas* (Pipeline de ventas, Clientes, Formularios, Cotizaciones),
  *Calendario* (Tipos de Cita, Disponibilidad, Citas Agendadas) y *Espacios* (Correo, Docs,
  Asistente, Bóveda, Gestión de contenido).
- Navegación contextual: al entrar en Correo, Docs, Gestión de contenido o Asistente, la sidebar
  muestra el submenú que esa sección tiene hoy (carpetas y cuentas, árbol de páginas, calendarios,
  conversaciones) con un control «Volver» que regresa a la lista plana. Ninguna función de esos
  submenús se pierde.
- Móvil: el marco claro se convierte en barra superior y barra inferior sólidas (sin vidrio). La
  barra inferior tiene Inicio, Contactos, Pipeline, Tareas y «Más»; «Más» abre la navegación
  completa (la misma lista plana, y el submenú contextual cuando corresponde) en un panel.
  Las tablas pasan a una presentación apta para 375 px sin scroll horizontal de la página.
- Edge: sin datos, cada lista o widget muestra un estado vacío que explica cómo llenarlo. Con
  muchos datos, la densidad se mantiene legible. Los textos largos se truncan con el contenido
  completo accesible.
- Error: si la base de datos no responde, el aviso existente sigue visible con la nueva gramática.
  Un fallo de carga de un bloque muestra su estado de error sin romper el resto de la pantalla.
- Temas: con un tema personal distinto del predeterminado, el marco usa el tono de sidebar de ese
  tema y el activo su color de acción, sin bajar nunca del contraste AA.

## Acceptance criteria
- Given una sesión iniciada con el tema predeterminado, When se abre cualquier pantalla del alcance
  en escritorio, Then la navegación lateral y la barra superior tienen el fondo de sidebar del tema
  (Lavanda en el predeterminado), el elemento activo se distingue con el color de acción y por algo
  más que el color, y el contenido va en una hoja separada del marco.
- Given cualquier pantalla del alcance, When se renderiza a 375 px, Then el documento no tiene
  scroll horizontal y todos los controles táctiles miden al menos 44 px.
- Given cualquier pantalla del alcance, When se inspecciona el texto visible, Then ningún texto
  funcional mide menos de 12 px.
- Given el chrome móvil, When se inspeccionan sus estilos, Then no hay `backdrop-filter` ni sombra
  con blur mayor de 8 px.
- Given cada uno de los 10 temas, When se calculan los pares texto/fondo y acción/primer plano del
  marco y del contenido, Then todos cumplen 4.5:1 (texto normal) o 3:1 (texto grande y gráficos).
- Given `prefers-reduced-motion: reduce`, When se carga una pantalla del alcance o se mueve una
  tarjeta del tablero, Then no se reproduce ninguna animación de entrada ni de desplazamiento.
- Given una lista del alcance sin registros, When se abre, Then se ve un estado vacío con una acción
  o explicación para llenarla.
- Given las siete pantallas del alcance, When se comparan sus cabeceras, listas, estados vacíos y de
  carga, Then usan las mismas piezas comunes (comprobable en el código: ninguna pantalla define su
  propia versión).
- Given una pantalla pública (`/form/:id` como representante), When se abre, Then su aspecto y su
  ausencia de movimiento no cambian respecto a antes del rediseño.
- Given la sidebar de escritorio en una pantalla de *Principal*, When se recorre, Then contiene los
  17 destinos actuales con sus etiquetas y rutas de hoy, agrupados en Principal, Ventas, Calendario
  y Espacios, sin selector de secciones.
- Given una ruta de Correo, Docs, Gestión de contenido o Asistente, When se abre, Then la sidebar
  muestra el submenú de esa sección con «Volver», y cada enlace del submenú de hoy sigue presente.
- Given 375 px, When se pulsa «Más» en la barra inferior, Then se abre un panel con la navegación
  completa, operable con teclado y cerrable con Escape.
- Given el usuario con un tema guardado, When entra tras el despliegue, Then sigue viendo su tema.
- Given el repositorio tras el cambio, When se ejecutan `npm test`, tsc, eslint y `npm run build`,
  Then no hay fallos ni errores nuevos sobre la línea base de la constitution.
- Given `DESIGN.md` y `PRODUCT.md`, When se leen tras el cambio, Then describen el lenguaje
  «marco claro», incluida la regla de movimiento enmendada, y el registro de enmiendas lo
  anota.

## Points to clarify
- **suposición tomada** (validada 2026-11-05; revisada a claro) — La barra superior de escritorio comparte el tono del marco (marco en «L»).
  *Base:* la opción elegida habla de sidebar y barra superior. *Riesgo:* si se prefiere solo la
  marco solo lateral, cambia la referencia, no el resto del spec.
- **suposición tomada** (validada 2026-11-05) — Las entradas escalonadas solo ocurren en la primera carga de una pantalla,
  no al refiltrar ni al paginar, y duran menos de medio segundo en total. *Base:* jornadas largas;
  el movimiento repetido en cada filtro cansa. *Riesgo:* si se quiere animar también al refiltrar,
  cambia el criterio de movimiento.
- **suposición tomada** (validada 2026-11-05) — Pipeline incluye la lista de Clientes (`/pipeline/clientes`) y el
  historial; Proyectos incluye la lista y la cabecera del detalle; «calendario» privado significa
  Citas agendadas. *Base:* auditoría y navegación actual. *Riesgo:* ampliar a tipos de cita y
  disponibilidad suma dos pantallas.
- **suposición tomada** (validada 2026-11-05) — Los iconos se unifican en una sola familia (la que ya usa la mayoría del
  código). *Base:* `DESIGN.md` exige una gramática y la auditoría vio dos familias mezcladas.
  *Riesgo:* bajo.
- **suposición tomada** (validada 2026-11-05) — La verificación en navegador se hace contra la base de datos de
  producción con la sesión del dueño, solo leyendo. *Base:* no hay seed ni entorno de pruebas.
  *Riesgo:* cualquier acción de escritura durante la verificación tocaría datos reales, así que no
  se hace ninguna.
- **decisión diferida** — Modo oscuro completo de la aplicación. Otro ciclo.
- **decisión diferida** — Llevar el lenguaje a las pantallas privadas fuera del alcance (correo,
  Docs, asistente, bóveda…). Otro ciclo.
- **área no formulable** — Cómo se lleva el «marco claro» a las superficies públicas si algún día
  se quiere coherencia. Hoy quedan fuera por la Private-Scope Rule.

## Revisions
- 2026-11-05 — Borrador. Decisiones del dueño: lenguaje B «Obsidiana estructural» (frente a
  «Precisión monocroma» y «Color de marca expresivo»); se mantienen paleta, Open Sauce Two y los
  10 temas; sin modo oscuro; movimiento «Expresivo» (enmienda la regla de `DESIGN.md` contra las
  secuencias de entrada). Motivo de B frente a A: el lenguaje actual se ve genérico, poco moderno
  y con jerarquía débil.
- 2026-11-05 — Clarify (ronda 1): cada tema personal tiene su propio marco oscuro tintado (el
  predeterminado, Obsidiana); entrega en un único commit a `main` al terminar y verificar (*riesgo
  aceptado:* `main` no ve nada hasta el final y el despliegue concentra todo el cambio); modo de la
  cadena: parar para aprobación en cada fase (no autopilot). Referencia visual propuesta: maqueta.
- 2026-11-05 — Maqueta aprobada por el dueño («Apruebo la maqueta»). Se cierra la última pregunta
  abierta; quedan suposiciones por validar y decisiones diferidas.
- 2026-11-05 — **Spec aprobada por el dueño** («Apruebo el spec»), con las cinco suposiciones
  validadas tal como están escritas. Estado → `clarified`. Siguiente fase: `plan`.
- 2026-11-05 — **Revisión del dueño tras aprobar:** «lo único que quiero que cambies es el color del
  sidebar, que sea claro» → opción «Ajuste: marco claro». Se mantiene todo el rediseño; sidebar y
  barra superior pasan a claro (tono de sidebar de cada tema). Consecuencias: el activo pasa de Lima
  a Índigo (Lima sobre Lavanda da 1.02:1); se anula la decisión «marco oscuro tintado por tema»;
  la maqueta se rehace y vuelve a necesitar aprobación. Estado → `draft` hasta reaprobar.
- 2026-11-05 — Maqueta con marco claro aprobada por el dueño («Apruebo marco claro»). El spec
  revisado queda aprobado (la reaprobación se condicionó a esta maqueta). Estado → `clarified`.
- 2026-11-05 — **Enmienda de navegación** (hallazgo F1 de `analyze`): el dueño elige adoptar la
  navegación de la maqueta. Decisiones: sidebar plana con todos los destinos actuales agrupados;
  submenú contextual en Correo, Docs, Contenido y Asistente con «Volver»; barra móvil Inicio ·
  Contactos · Pipeline · Tareas · Más; solo los contadores que ya existen. Se sustituye el non-goal
  «etiquetas de la navegación principal» por «etiquetas de los destinos». Estado → `draft` hasta
  aprobar la enmienda.
- 2026-11-05 — Enmienda de navegación aprobada por el dueño («Apruebo, empieza T001»). Estado → `clarified`.
- 2026-11-06 — **Ronda 2, pedida por el dueño** tras ver la ronda 1: «hace falta aplicar el nuevo
  diseño en varias secciones», «no me gusta ese icono… simplificarlo», «el sidebar se ve muy
  saturado… dividirlo y categorizarlo». Decisiones del dueño:
  - **Marca:** isotipo oficial azul (`public/Isotipo_Azul.svg`, 20 px, sin cuadro de fondo) +
    «Noxy».
  - **Navegación por áreas con submenú:** primer nivel Inicio · Contactos › · Tareas · Proyectos;
    «Áreas»: Ventas › · Agenda ›; «Espacios»: Correo › · Docs › · Asistente · Bóveda › ·
    Contenido ›. Contactos agrupa Contactos y Empresas; Ventas agrupa Pipeline de ventas, Clientes,
    Cotizaciones y Formularios; Agenda agrupa Citas agendadas, Tipos de cita y Disponibilidad. Cada
    área abre su submenú con «Volver», como ya hace Correo. Mismas rutas, etiquetas de destino y
    permisos; la barra móvil no cambia.
  - **Alcance:** todas las pantallas privadas listadas arriba, incluidos sus detalles
    (`/forms/:id`, `/cotizaciones/:folio`, etc.).
  - *Suposición tomada:* dos niveles de trabajo. **Recomponer** (piezas comunes: PageHeader, listas,
    estados) en las pantallas de lista; **pasada de lenguaje** (PageHeader donde la página tiene
    título propio, tokens, suelo de 12 px, sin mayúsculas con tracking, una familia de iconos,
    toques de 44 px, estados de carga/error donde hay datos) en editores y detalles grandes
    (constructor de formularios, editor de Docs, calendario de contenido, detalle de deal). *Base:*
    reescribir editores de 1000+ líneas multiplica el riesgo sin cambiar lo que se ve. *Riesgo:* si
    el dueño quiere esos editores reestructurados, es otra ronda.
  Estado → `draft` hasta que el dueño apruebe la ronda 2.

- 2026-11-06 — Ronda 2 aprobada por el dueño («Apruebo, empieza T015»). Estado → `clarified`.
- 2026-11-07 — **Ronda 3, pedida por el dueño** tras ver el shell con ramas en línea: «no debe existir un navbar
  arriba, quítalo», «el sidebar se muestra como un menú desplegable… se ve saturado y apretado cuando aparecen los
  nuevos menús… puede estar dividido en secciones como Claude con chat y cowork». Decisiones del dueño (opciones
  recomendadas elegidas en las tres preguntas):
  - **Sidebar por modos tipo Claude:** un selector de 3 modos arriba (Trabajo, Ventas, Espacios). Cada modo muestra
    solo su lista plana y corta, sin ramas desplegables. Trabajo = Inicio, Tareas, Proyectos, Contactos, Empresas y,
    en un grupo «Agenda», Citas agendadas, Tipos de cita y Disponibilidad. Ventas = Pipeline de ventas, Clientes,
    Historial de tratos, Cotizaciones, Formularios. Espacios = Correo, Docs, Asistente, Bóveda, Gestión de contenido.
    Mismas rutas, etiquetas y permisos; un modo sin destinos visibles no aparece. Ajustes y la cuenta quedan fijos al pie.
  - **Listas internas en una segunda columna:** Correo, Docs, Bóveda y Contenido muestran su lista (carpetas, árbol,
    clientes, mini calendario) en un panel de 240 px entre el sidebar y la página, plegable y con su estado guardado. El
    sidebar principal no cambia ni se aprieta. En móvil, la lista va dentro del cajón, debajo de la lista del modo.
  - **Sin barra superior:** se elimina `Header` del shell. La búsqueda (⌘K) y las notificaciones pasan a la cabecera del
    sidebar (en móvil, al cajón de «Más»). El orden, los filtros, la insignia, el botón de volver, el botón principal y
    las acciones pasan a la cabecera de cada página (`PageHeader`), o a la barra propia de la pantalla en editores sin
    `PageHeader`.
  - *Suposición tomada:* el Asistente conserva su chrome propio (sidebar flotante o fijada con sus conversaciones
    debajo de la lista, sin segunda columna). *Base:* la spec ya lo excluye del rediseño y su barra tiene un control de
    fijar propio. *Riesgo:* si el dueño quiere la segunda columna también ahí, es otra tarea.
  Estado → `clarified` (el dueño eligió las opciones y pidió continuar).
