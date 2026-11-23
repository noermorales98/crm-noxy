---
author: Noeli
branch: multi-cuenta
status: in-progress (paso 1 aprobado; paso 2 hecho, a la espera de SQL y dry-run)
---
# Multi-cuenta: cada cliente es una Organization (sub-cuenta)

## Intent
Administrar varios clientes desde un solo usuario. Cada cliente es una `Organization` y Noeli es miembro (OWNER) de todas. Todo ya filtra por `organizationId` y la sesión guarda `currentOrganizationId`; faltan el selector, la forma de crear sub-cuentas y la garantía de aislamiento.

## Lo que el código ya dice (verificado)
- `auth.ts` elige `user.organizations[0]` **sin `orderBy`**: con varias membresías, la org con la que entras es arbitraria. Hay que ordenarla (última usada, o la más antigua).
- `auth.config.ts` (`jwt`, `trigger === "update"`) **acepta cualquier `currentOrganizationId` que mande el cliente**, sin comprobar membresía, y **no recalcula `role` ni `permissions`** al cambiar de org. Hoy cualquiera con sesión podría llamar a `update()` y operar en otra organización, y al cambiar de org arrastraría el rol/permisos de la anterior. Esto es un agujero real: el paso 1 lo cierra (ver «Decisiones del paso 1»).
- `app/api/public/forms/[id]/submit/route.ts` ya crea deal, contacto y tarea con `form.organizationId` (no con una org «principal»). El punto 3 es **verificar y blindar con prueba**, probablemente sin cambios de código.
- `followups` y `payment-alerts` envían al `OWNER` de la org con `members: { where: { role: "OWNER" }, take: 1 }` **sin orden**. Si una sub-cuenta tiene dos OWNER (tú y el cliente), el destinatario es arbitrario. Hay que fijar la regla.
- `pipeline-setup.ts` solo **planifica** etapas (`planStages`, `SALES_STAGES`, `EDITORIAL_STAGES`); quien las escribe es `scripts/fase1-etapas.ts`. Para sembrar una org nueva hay que extraer esa escritura a una función reutilizable.
- Las plantillas de proyecto ya se siembran perezosamente desde `DEFAULT_TEMPLATES` en `deal-won.ts` (`templateFor`). Se pueden sembrar de golpe al crear la org.

## Alcance (por pasos, un commit cada uno)
**Paso 1 — API de organizaciones** (me detengo aquí para que pruebes)
- `GET /api/organizations`: mis organizaciones (id, nombre, zona horaria, mi rol, cuál es la actual).
- `POST /api/organizations`: `{ name, timezone }`. En una transacción: crea la Organization, me hace OWNER, siembra pipeline comercial (+ editorial) con `SALES_STAGES`/`EDITORIAL_STAGES` y siembra `DEFAULT_TEMPLATES`. Valida nombre no vacío y zona horaria IANA válida.
- `POST /api/organizations/switch`: `{ organizationId }`. Valida membresía en el servidor y devuelve `{ currentOrganizationId, role, permissions }` de **esa** membresía; el cliente los pasa a `update()`.
- Cierre del agujero del JWT: en `auth.ts` (runtime Node, con acceso a la base) el callback `jwt` en `trigger === "update"` re-valida la membresía y toma `role`/`permissions` de la base, ignorando lo que mande el cliente. `auth.config.ts` (edge) deja de fiarse de ese valor.
- Orden determinista de la org inicial al iniciar sesión.
- Selector de organización en la interfaz (mínimo: menú en la barra lateral que llama a `switch` y recarga).

**Paso 2 — Empresa → sub-cuenta**
- Script `scripts/company-to-org.mjs`, `--dry-run` por defecto, `--apply` explícito, con respaldo JSON antes de escribir (mismo patrón que `encrypt-vault.mjs`).
- Crea la Organization, me hace OWNER, copia los contactos, deals y formularios con esa `companyId`. No borra ni mueve el original.
- Campo opcional `Company.migratedToOrgId` (SQL en `prisma/sql/`, **lo aplicas tú**). Con él, el script es idempotente y la pantalla puede mostrar «ya es sub-cuenta».

**Paso 3 — Formularios públicos**
- Revisión de `app/api/public/forms/*` y `src/lib/form-lead.ts`; pruebas que fijen que contacto, deal, tarea y cita usan `form.organizationId`.

**Paso 4 — Crons**
- Auditar `digest`, `followups`, `content-reminders`, `payment-alerts`: cada envío sale con datos de **una sola** org y a un destinatario definido.
- Regla de destinatario (ver pregunta 2): determinista, nunca `take: 1` sin orden.

**Paso 5 — Pruebas de aislamiento**
- Usuario de la org A contra recursos de la org B en rutas de deals, contacts, forms, quotes y MCP: 404/403, sin lectura ni escritura. Incluye la prueba del agujero del JWT.

## Qué NO entra
- Facturación, planes o límites por sub-cuenta.
- Invitar a los clientes como usuarios (solo yo soy miembro; la gestión de equipo existente no cambia).
- Mover datos entre organizaciones; el paso 2 **copia**.
- Compartir datos entre sub-cuentas o vista agregada de todas.
- Cambiar el modelo de permisos por módulo.
- Rediseño visual del selector más allá de lo mínimo funcional.

## Preguntas abiertas (necesito tu respuesta para el paso 2 y 4)
1. **Copiar contactos/deals deja datos duplicados** (original en la org principal + copia en la sub-cuenta). ¿Aceptas duplicado con el original intacto, o prefieres que tras verificar el original quede archivado?
2. **Avisos**: dices «mis avisos van solo a mi usuario» y «el dueño de cada sub-cuenta decide los suyos». Si yo soy OWNER de todas, cada org me avisaría a mí por defecto. Propuesta: destinatario = OWNER con CallMeBot configurado, ordenado por antigüedad; si un cliente se une después como OWNER y configura el suyo, pasa a recibirlos él y yo dejo de recibirlos de esa org. ¿Vale?
3. ¿Qué otras entidades con `companyId` copia el paso 2 (proyectos, cotizaciones, pagos), o solo contactos, deals y formularios como pediste? Propongo solo esos tres.

## Checklist
- [x] P1 `GET/POST /api/organizations` + `switch` — prueba: crear org siembra pipeline y plantillas, y me deja OWNER (prueba unitaria + prueba manual tuya).
- [x] P1 JWT valida membresía y recalcula rol/permisos — prueba: un `update()` con org ajena no cambia la sesión.
- [x] P1 orden determinista de la org inicial.
- [ ] P1 selector en la interfaz — prueba en navegador (tuya).
- [x] **Parada tras el paso 1** — aprobado por Noeli.
- [x] P2 `scripts/company-to-org.ts`: simulacro por defecto, `--apply` explícito, una transacción, informe con cómo deshacer, se niega a repetir si `migratedToOrgId` ya está. Supuestos: original intacto (P1), solo contactos/deals/formularios (P3).
- [ ] P2 aplicar `prisma/sql/company-migrated-org.up.sql` + `prisma generate` y probar el simulacro con una empresa real — lo haces tú.
- [ ] P3 pruebas de que el formulario escribe en la org dueña.
- [ ] P4 auditoría de crons + regla de destinatario fijada y probada.
- [ ] P5 pruebas de aislamiento A↔B (deals, contacts, forms, quotes, mcp).

## Evidence
P1: `npm test` 484 (477 pasan; los 7 fallos son previos y sin relación: contratos de diseño, fallan igual en main). 7 pruebas nuevas en `src/lib/organizations.test.ts`. `tsc` y `eslint` sin errores en lo tocado. Falta: prueba manual en navegador y con la base real (la siembra transaccional no tiene prueba automática: necesita base).

## Next
Aprobar o corregir esta spec y responder las 3 preguntas (la 1 y la 2 no bloquean el paso 1).

P2: `npm test` 490 (483 pasan, los mismos 7 fallos previos). 6 pruebas nuevas en `src/lib/company-to-org.test.ts` (casado de pipelines, qué se copia y qué se deja fuera, simulacro antes de la transacción, sin borrados). El script NO se ha ejecutado contra la base.
