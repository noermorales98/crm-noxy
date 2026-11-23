---
author: Noeli
branch: main
status: spec-pendiente-de-aprobacion
---
# De «Proyectos» a «Clientes» (T10) — SPEC, sin implementar

> Esta nota es solo la spec. **No se ha cambiado código.** Espera tu aprobación y tus respuestas a las 3 preguntas de abajo.

## Intent
Con multi-cuenta (T8) cada cliente ya es una sub-cuenta (`Organization`). «Proyectos» dejó de ser el lugar donde separar a un cliente de otro. Lo que sí falta es **un panel de agencia**: ver de un vistazo todas mis sub-cuentas y entrar a la que toque.

## Lo que hay hoy (datos reales, 2026-11-23)
| Organización | Proyectos | Clientes con mensualidad | Tareas | Deals |
|---|---|---|---|---|
| Noxy Digital | 7 | 4 | 247 | 13 |
| Dreams Club | 0 | 0 | 6 | 2 |
| Eilen Centro Terapéutico, J&H Multiservices, Test Agency | 0 | 0 | 0 | 0 |

Los 7 proyectos de Noxy Digital son de tres tipos:
- **Contenedores de un cliente** (ligados a una empresa): «Leads libros», «Instalación de Correos», «¿Y si programar…?» (con 1 campaña), «Alumnos Eilen» (**público, 152 tareas**). Hoy hacen el trabajo que ahora hacen las sub-cuentas.
- **Entregas que nacen de un deal ganado** (ligados a `dealId`): «Hugo Montenegro», «Libro de Leticia Arroyave». Las crea `ensureProjectForWonDeal` con una plantilla de tareas por servicio.
- **Sueltos**: «Libro de Yolanda».

`Project` está en ~74 archivos (formularios, tareas, campañas, actividad, portal público). 164 tareas dependen de un proyecto.

## Propuesta (recomendada)
1. **Nueva pantalla `Clientes` (`/clientes`) = panel de agencia.** Una tarjeta por sub-cuenta de la que soy miembro: nombre, deals abiertos, ganados del mes, tareas vencidas, cobros pendientes, último cierre mensual (de `MonthlySnapshot`) y botón «Abrir» (usa el cambio de cuenta que ya existe). Se alimenta con una API que recorre mis membresías, comprueba el permiso `crm` en cada una y no lee nada de organizaciones donde no soy miembro.
2. **«Proyectos» sale del menú principal y pasa a llamarse «Entregas».** No se elimina el modelo ni las rutas: se conserva todo lo que funciona (portal público `project-public.ts`, plantillas por servicio, `ensureProjectForWonDeal`, tareas, formularios, campañas). La entrada pasa a vivir dentro de cada sub-cuenta (y desde el deal ganado), no como sección global.
3. **No se borra ni se migra nada de golpe.** Los 7 proyectos se quedan donde están. El panel no depende de ellos.
4. **Un solo «cliente».** Hoy hay dos: `Client` (cliente recurrente con mensualidad, `/pipeline/clientes`) y, con multi-cuenta, la sub-cuenta. Propuesta: la sub-cuenta es «Cliente» (el panel nuevo); `/pipeline/clientes` pasa a llamarse **«Suscripciones»** (es lo que realmente es: cobros mensuales). El modelo `Client` no cambia.
5. **Resumen mensual por cliente:** el panel muestra el último `MonthlySnapshot` cerrado de cada sub-cuenta y enlaza a `/pipeline/historial` de esa cuenta. No hay modelo nuevo.

## Qué NO entra
- Eliminar el modelo `Project`, sus tablas o el portal público.
- Mover los 7 proyectos o sus 164 tareas a otra organización.
- Vista que mezcle datos de varias sub-cuentas más allá de los números de la tarjeta.
- Invitar clientes como usuarios; permisos nuevos.
- Cambios de esquema de base de datos (todo se calcula con lo que ya existe).

## Criterios de aceptación
- [ ] `/clientes` lista solo las organizaciones de las que soy miembro y con permiso `crm`; una organización ajena nunca aparece (prueba con dos usuarios).
- [ ] Cada tarjeta muestra deals abiertos, ganados del mes, tareas vencidas, cobros pendientes y último cierre, **sin deals archivados** (usa `ACTIVE_DEALS`).
- [ ] «Abrir» cambia de cuenta y entra en su pipeline.
- [ ] El menú ya no dice «Proyectos»; `/projects` sigue funcionando (enlace directo y desde el deal ganado) con el nombre «Entregas».
- [ ] `/pipeline/clientes` se llama «Suscripciones» en menú, migas y títulos.
- [ ] `npm test` sin fallos nuevos; pruebas del cálculo de la tarjeta y del aislamiento entre organizaciones.

## Riesgos
- Renombrar rutas visibles puede romper favoritos o los textos de la landing y del MCP («proyectos»): se revisa con una búsqueda antes de cambiar.
- La API del panel lee varias organizaciones a la vez: es el punto donde un filtro olvidado mezclaría datos; por eso va con prueba de aislamiento.
- «Alumnos Eilen» (portal público con 152 tareas) vive en Noxy Digital pero es de un cliente: ver pregunta 2.

## Preguntas para ti (necesito respuesta antes de implementar)
1. **Nombres:** ¿«Clientes» (sub-cuentas), «Suscripciones» (antes `/pipeline/clientes`) y «Entregas» (antes Proyectos) te sirven, o prefieres otros?
2. **«Alumnos Eilen»** (y los otros proyectos de contenedor de un cliente): ¿los dejo en Noxy Digital tal cual, o los muevo/copio a la sub-cuenta del cliente (Eilen Centro Terapéutico)? Mover implica recrear tareas y portal; recomiendo dejarlos y no mover nada.
3. **Quién ve el panel:** ¿solo tú (OWNER en 2 o más organizaciones) o también cualquier miembro con permiso `crm` en su propia organización? Recomiendo lo primero.

## Siguiente
Aprobar la spec (o ajustarla) y contestar las 3 preguntas. Después: plan corto de implementación (≈4 pasos: API del panel + pruebas, pantalla, renombres de menú, revisión de textos) y se hace en `main`.
