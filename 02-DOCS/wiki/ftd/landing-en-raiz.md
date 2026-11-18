---
author: Noeli
branch: feat/landing-en-raiz
status: done
merged: 2026-11-18
pr: #9
---
# Landing en la raíz

## Intent
La landing que hoy vive en `/demo` debe servir en `/` para visitas sin sesión. El botón «Iniciar sesión» del navbar solo en escritorio. Los cards de «Empieza en minutos…» con fondo claro y borde, como el resto.

## Scope
- In: ruta pública `/` (landing si no hay sesión; panel si hay sesión + CRM), redirect `/demo` → `/`, navbar desktop, estilos HowItWorks, permisos/AppShell/tests, instalar impeccable y taste-skill.
- Out: rediseño completo de la landing, cambios de copy, móvil del login.

## Checklist
- [x] Instalar `impeccable` y `Leonxlnx/taste-skill` — check: comandos OK (`skills-lock.json` + dirs locales)
- [x] `/` muestra la landing sin sesión — check: `app/page.tsx` + `isPublicPagePath("/")`
- [x] Con sesión + CRM, `/` sigue siendo el panel — check: `hasPermission(..., "crm")` en page; AppShell con `useSession`
- [x] `/demo` redirige a `/` — check: `app/demo/page.tsx` → `redirect("/")`
- [x] Botón «Iniciar sesión» solo desktop — check: `hidden md:inline-flex` en LandingHeader
- [x] Cards HowItWorks claros con borde — check: `border border-line bg-surface-elevated`
- [x] Tests de permisos actualizados — check: `node --test src/lib/permissions.test.ts` → 8 pass

## Evidence
- `npx impeccable install` → Done (project `.cursor`/`.claude`)
- `npx skills add Leonxlnx/taste-skill` → design-taste-frontend en `.agents/skills/`
- `node --test src/lib/permissions.test.ts src/lib/editorial-data.test.ts` → 14 pass, 0 fail
- `npx @ericrisco/rsc risk` → tier 1 (default, docs)
- Revisión tier 1: halló burbuja IA, test editorial, flash shell; corregidos (AiProvider + HomeDashboardShell + editorial-data.test)

## Next
Fusionado en main el 2026-11-18 (fb97e52).
