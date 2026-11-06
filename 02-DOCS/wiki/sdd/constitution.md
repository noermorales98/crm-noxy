---
type: constitution
title: crm-noxy — Constitution
description: Principios no negociables que obedece cada fase de rsc-sdd en Noxy CRM.
tags: [sdd, constitution]
timestamp: 2026-11-06T02:30:00Z
topic: sdd
status: draft
version: v1.0.0-rc
---

# crm-noxy — Constitution

> Versión: v1.0.0-rc (pendiente de ratificar) · Ratificada: — · Última enmienda: 2026-11-06
> Las reglas que obedece cada fase de rsc-sdd. La mecánica de cada herramienta vive en su
> config (`tsconfig.json`, `eslint.config.mjs`, `prisma/schema.prisma`); aquí solo va la regla.

**Objetivo:** Noxy CRM: centralizar la operación comercial y de servicio de la agencia.
Software · alcance `complex` · los cambios van directo a `main`.

## 1. Stack canon

1. TypeScript sobre Node 24, con Next.js 16 App Router y React 19. Cambiar de framework es una
   enmienda MAJOR.
2. Datos: Prisma 6 sobre MySQL. Todo acceso a BD pasa por el cliente de `src/lib/db.ts`; nadie
   instancia otro `PrismaClient`.
3. Auth: NextAuth v5 (`auth.ts`, `auth.config.ts`, `middleware.ts`). Pagos: Stripe.
4. Gestor de paquetes: npm. Un único lockfile (`package-lock.json`), siempre commiteado.

## 2. Quality bar

5. Tests con `node --test` (`npm test`). Un cambio no puede añadir ningún test en rojo. Línea base
   del 2026-11-06: 75 tests, **4 fallos conocidos** en `src/lib/noxy-brand-contract.test.ts`
   (favicon, forms públicos sin animación ×2, token del botón primario). Son deuda registrada,
   no permiso para fallar más.
6. Toda lógica nueva en `src/lib/` lleva su `*.test.ts` al lado. Un bug corregido lleva un test
   que fallaba antes del arreglo.
7. Tipos `strict` (`tsconfig.json`). `npx tsc --noEmit` no puede subir de la línea base
   (**66 errores** el 2026-11-06) y ningún archivo tocado puede ganar errores nuevos.
8. Lint: `npx eslint app src auth.ts auth.config.ts middleware.ts` no puede subir de la línea
   base (**572 errores** el 2026-11-06). Los archivos tocados no ganan errores nuevos.
9. `npm run build` termina sin errores antes de dar por cerrado cualquier cambio.

## 3. Conventions

10. Rutas de UI en `app/<módulo>/`, APIs en `app/api/<módulo>/route.ts`, lógica compartida en
    `src/lib/`, componentes en `src/components/`. Imports con el alias `@/`.
11. Toda ruta de `app/api/**` fuera de `app/api/public/**`, `app/api/auth/**` y
    `app/api/oauth/**` exige sesión (`auth()` o `requireTeamManager`) antes de tocar datos.
12. Los errores de API se devuelven con `jsonFromUnknownError` (`src/lib/api-db.ts`); nunca se
    filtra un stack trace ni un mensaje de Prisma al cliente.
13. La UI respeta los tokens de `DESIGN.md` y la voz de `PRODUCT.md`. Texto visible en español.
14. Commits: gitmoji + Conventional Commits, con la descripción en español —
    `✨ feat(emails): adjuntar archivos al redactar`. Lo impone `.rsc/gitmoji-guard.mjs`.

## 4. Branching & shipping

15. Los cambios van directo a `main` (decisión del onboarding). Cada commit deja `main`
    desplegable en Vercel.
16. **La autoría git es humana.** Ni `Co-Authored-By` de una IA ni pies "generated with".
    Lo hace cumplir la fase `ship`.

## 5. Security & privacy floor

17. Ningún secreto se commitea. Viven en `.env` / `.env.local` (gitignored) o en
    `01-TOOLS/<proveedor>/.env`. Ninguna credencial va en código, docs ni permisos de agente.
18. Las rutas `app/api/public/**` validan el token o recurso de la URL y solo devuelven los
    campos que la vista pública necesita. Nunca exponen datos de otro cliente.
19. Los cambios en auth y permisos (`auth.ts`, `auth.config.ts`, `middleware.ts`,
    `app/api/auth/**`, `app/api/oauth/**`, `src/lib/permissions.ts`, `src/lib/require-team.ts`)
    y en `app/api/public/**` no se dan por terminados sin la revisión de una persona.
20. Todo input externo (body, query, webhook) se valida con zod o equivalente antes de usarse.

## 6. UX / accessibility floor

21. Controles alcanzables con teclado y con foco visible; los avisos de estado usan `role="status"`
    o `aria-live`.
22. Cada pantalla nueva funciona a 375 px de ancho sin scroll horizontal.

## 7. Performance budgets

23. Ninguna consulta de lista trae registros sin límite: toda `findMany` sobre tablas que crecen
    (contactos, leads, emails, tareas) lleva `take` o paginación.

## 8. Knowledge & decisions

24. Toda decisión relevante se anota en `02-DOCS/wiki/harness/decisions.md` con fecha, opciones
    y el porqué. Esta constitution es el registro de decisiones de mayor rango.

## Definition of Done (la barra que ejecuta `verify`)

- [ ] `npm test`: ningún fallo además de los 4 conocidos (P5).
- [ ] Hay tests nuevos para la lógica nueva o el bug corregido (P6).
- [ ] `npx tsc --noEmit` ≤ 66 errores y ninguno nuevo en archivos tocados (P7).
- [ ] eslint ≤ 572 errores y ninguno nuevo en archivos tocados (P8).
- [ ] `npm run build` pasa (P9).
- [ ] Las rutas privadas tocadas exigen sesión; las públicas solo exponen lo necesario (P11, P18).
- [ ] Ningún secreto en el diff (P17).
- [ ] Revisión humana si el diff toca auth, permisos o `app/api/public/**` (P19).
- [ ] Commit en formato gitmoji y sin autoría de IA (P14, P16).

## Amendment log (append-only)

| Date | Version | Change | Why |
|------|---------|--------|-----|
| 2026-11-06 | draft | Borrador generado por `rsc onboard`. | El suelo SDD necesita una constitution; ratificarla es de la fase `constitution`. |
| 2026-11-06 | v1.0.0-rc | Principios 1–24 y DoD redactados a partir del repo y de 3 decisiones del dueño (gitmoji, sin fallos nuevos, revisión humana en auth y rutas públicas). | Completar el borrador; pendiente de ratificación explícita. |
