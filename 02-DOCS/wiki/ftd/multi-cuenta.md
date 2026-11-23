---
author: Noeli
branch: multi-cuenta
status: verificado (pasos 1-5); pendiente de integrar a main
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
3. (resuelta: solo esas tres) ¿Qué otras entidades con `companyId` copia el paso 2 (proyectos, cotizaciones, pagos), o solo contactos, deals y formularios como pediste? Propongo solo esos tres.

## Checklist
- [x] P1 `GET/POST /api/organizations` + `switch` — prueba: crear org siembra pipeline y plantillas, y me deja OWNER (prueba unitaria + prueba manual tuya).
- [x] P1 JWT valida membresía y recalcula rol/permisos — prueba: un `update()` con org ajena no cambia la sesión.
- [x] P1 orden determinista de la org inicial.
- [ ] P1 selector en la interfaz — prueba en navegador (tuya).
- [x] **Parada tras el paso 1** — aprobado por Noeli.
- [x] P2 `scripts/company-to-org.ts`: simulacro por defecto, `--apply` explícito, una transacción, informe con cómo deshacer, se niega a repetir si `migratedToOrgId` ya está. Supuestos: original intacto (P1), solo contactos/deals/formularios (P3).
- [x] P2 SQL `company-migrated-org.up.sql` aplicado en la base (columna `Company.migratedToOrgId` VARCHAR(191) NULL, verificada), `prisma generate` hecho, simulacro corrido con las 3 empresas de cliente.
- [x] P2 `--apply` ejecutado en orden: Dreams Club, Eilen Centro Terapeutico, J&H Multiservices, Noxy Digital (la empresa propia). Sin dump previo: `mysqldump` no autentica (plugin `mysql_native_password` ausente en el cliente); los informes por conversión están en `backups/` (local, ignorado por git).
- [x] P3 `submit` ya escribía todo en `form.organizationId`; ahora además ignora enlaces a otra org (empresa, correo de bienvenida, tipo de cita, proyecto) y elige el OWNER de forma determinista (`pickNotifyOwner`: el más antiguo con WhatsApp). Pruebas en `organizations.test.ts`.
- [x] P4 auditoría de crons: `digest` y `content-reminders` ya aislaban por organización (sin cambios); `followups` mezclaba en un mensaje los seguimientos de todas las orgs del mismo dueño y `followups`/`payment-alerts` elegían OWNER sin orden → ahora agrupan por organización, usan `pickNotifyOwner` (`src/lib/org-owner.ts`) y el mensaje lleva el nombre de la sub-cuenta.
- [x] P5 pruebas de aislamiento A↔B (deals, contacts, forms, quotes, mcp): `src/lib/org-isolation.test.ts`. Encontró y cerró huecos reales: ids de otra org aceptados en el cuerpo de `deals` (POST/PATCH, con fuga de datos del contacto en la respuesta), `tasks`, `forms` PUT, `clients` PATCH, `quotes` PUT, `projects` (POST/PUT; el PUT escribía el nombre del contacto ajeno en la actividad), `appointment-types`, `task-categories`. Nueva `assertOrgRefs` (`src/lib/org-refs.ts`).

## Evidence
P1: `npm test` 484 (477 pasan; los 7 fallos son previos y sin relación: contratos de diseño, fallan igual en main). 7 pruebas nuevas en `src/lib/organizations.test.ts`. `tsc` y `eslint` sin errores en lo tocado. Falta: prueba manual en navegador y con la base real (la siembra transaccional no tiene prueba automática: necesita base).

## Next
Aprobar o corregir esta spec y responder las 3 preguntas (la 1 y la 2 no bloquean el paso 1).

P2: `npm test` 490 (483 pasan, los mismos 7 fallos previos). 6 pruebas nuevas en `src/lib/company-to-org.test.ts` (casado de pipelines, qué se copia y qué se deja fuera, simulacro antes de la transacción, sin borrados). El script NO se ha ejecutado contra la base.

P2 simulacro (base real, solo lectura): Dreams Club 63 contactos/2 deals/2 formularios; Eilen Centro Terapeutico 147/0/1; J&H Multiservices 1/0/0.
P3: `npm test` 493 (486 pasan; los mismos 7 fallos previos). `tsc` limpio. `eslint` solo marca 2 `any` ya existentes en `submit/route.ts`.

Decisiones de Noeli (2026-11-23): los clientes NO entran al CRM; solo el equipo (Noelí y Esthefani). La regla de destinatario de avisos queda en «OWNER más antiguo con WhatsApp» = Noelí, sin ambigüedad.
Usuarios: la cuenta duplicada «Noeli» (noe.rmorales98@gmail.com, ADMIN) se borró; quedó solo «Noelí» (noepumasnoe@gmail.com, OWNER, con WhatsApp). La duplicada solo tenía 1 membresía y 1 preferencia de dashboard (respaldo en `backups/usuario-duplicado-*.json`).
Sub-cuentas creadas (miembros: Noelí OWNER, Esthefani ADMIN): Dreams Club (63 contactos, 2 deals, 2 formularios; verificado contra el origen), Eilen Centro Terapeutico (147/0/1), J&H Multiservices LLC (1/0/0), Noxy Digital (5/0/6; ojo: mismo nombre que la org principal).

Unión Noxy: la sub-cuenta «Noxy Digital» (copia de la empresa propia) se borró; la empresa original conserva 5 contactos y 6 formularios y `migratedToOrgId` volvió a NULL (respaldo en `backups/deshacer-noxy-copia-*.json`).
P4: `npm test` 495 (488 pasan; mismos 7 fallos previos). `tsc` y `eslint` limpios en lo tocado. Pendiente (no automatizable): ver llegar un aviso real con el nombre de la sub-cuenta.

## Verificación de cierre (2026-11-23, rama multi-cuenta vs main 4cf0890; main no se había movido)
- `npm test`: 503 pruebas, 496 pasan, 7 fallan. Esos 7 son EXACTAMENTE los mismos que fallan en main sin la rama (comparados por nombre): contratos de diseño ajenos a este trabajo. Gate estricto = no verde por ellos; sin regresiones.
- `tsc --noEmit` sobre todo el proyecto (sin `*.test.ts`): 0 errores. Ojo: durante el gate encontré que mi comprobación anterior filtraba solo `app|src|auth` y no veía `scripts/`; el build lo detectó y quedó corregido.
- `next build` (con `DATABASE_URL`/`AUTH_SECRET` ficticios; sin ellos falla al recoger datos, igual que cualquier ruta con Prisma): compila y genera 140 páginas, exit 0.
- `eslint`: en los 9 archivos preexistentes que toca la rama, 4 errores (en main: 6); en los nuevos, 0 (el script lleva `eslint-disable no-explicit-any`, como `fase1-etapas.ts`). El lint repo-completo de main no se pudo comparar (se cae por memoria).
- Criterios: P1–P5 con evidencia arriba; P2 además ejecutado en producción y verificado contra el origen (Dreams Club).

### Capas no ejecutadas
- **NO EJECUTADO** — `createSubAccount` (alta de sub-cuenta desde la API) contra una base real: solo cubierto por pruebas de funciones puras; el script de P2 usa la misma lógica y sí corrió en producción, pero es otro código.
- **NO EJECUTADO** — selector en navegador y cambio de organización de extremo a extremo; el `jwt` está cubierto por prueba de contrato (lee el código), no por una sesión real.
- **SUSTITUIDA** — aislamiento entre organizaciones: pruebas con base simulada + lectura estática de las rutas, no peticiones HTTP reales con dos sesiones. No detecta una ruta que valide mal en tiempo de ejecución.
- **SUSTITUIDA** — mysqldump: no hay respaldo SQL de la base (el cliente no autentica); solo informes/respaldos JSON por operación.
- **HERRAMIENTA-AUSENTE** — Vitest (el proyecto usa `node --test`); el paso de tests de `verify.sh` no aplica.
