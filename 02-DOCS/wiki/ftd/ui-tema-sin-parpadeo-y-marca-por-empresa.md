---
author: Noeli
branch: main
status: in-progress
---
# UI: tema sin parpadeo, selector de empresa en la cabecera e identidad por empresa

## Intent
1) Que la primera carga no muestre un instante otro tema. 2) El selector de empresa vive en la cabecera de la barra lateral (donde decía «Noxy»), sin bordes ajenos al sistema. 3) Cada empresa puede tener su color, icono y tema; Noxy conserva su isotipo. 4) `auto-archive` correcto antes de darlo de alta.

## Causa del parpadeo (verificada en el código)
El HTML del servidor siempre salía con el tema por defecto (Índigo). El tema real llegaba en dos saltos: al resolverse la sesión en el cliente (`useSession` empezaba en «cargando», sin usuario) y luego con `fetch /api/settings/theme`.

## Cambios
- `src/lib/theme-boot.ts`: el layout (servidor) resuelve sesión, tema y empresa antes de pintar; nunca lanza (si fallan las columnas nuevas, usa solo el nombre).
- `AuthProvider` recibe la sesión del servidor (sin estado «cargando»); `CrmThemeContext` toma el tema de ahí y ya no consulta al montar. El tema de la empresa, si lo tiene, gana al personal; si no, el de cada persona.
- Entrada del marco con fundido de 220 ms (`crm-shell-enter`, en reposo con «reducir movimiento») y `app/loading.tsx` con esqueleto mientras el servidor prepara una pantalla.
- `src/components/org/*`: `OrgMark` (isotipo de Noxy sin cuadro; otras empresas, cuadro de su color con su icono), `OrgSwitcherMenu` (cabecera, mismo panel que Notificaciones, sin bordes propios en el botón, crear sub-cuenta en línea, sin `window.prompt`), `OrgSwitchList` (móvil). Se quita el `<select>` nativo.
- `src/lib/org-brand.ts` (puro) + `OrgBrandEditor` en Ajustes → General + `PATCH /api/organizations/brand` (solo OWNER/ADMIN). Columnas nuevas en `Organization`: `brandColor`, `brandIcon`, `themeId` (`prisma/sql/org-brand.up.sql`).
- `auto-archive`: ahora solo la última etapa ganadora y contando desde `wonAt`; texto de Ajustes corregido; `CRON.md` con el alta paso a paso.

## Checklist
- [x] Módulo `org-brand` + 6 pruebas; `isAutoArchivable` + 1 prueba — Evidence: `npm test` verde salvo los 5 fallos previos.
- [x] `tsc` limpio en app/ y src/.
- [ ] **Aplicar `prisma/sql/org-brand.up.sql` a la base ANTES de desplegar** (sin las columnas, leer organizaciones falla). Bloqueado por permisos: lo aprueba Noxy.
- [ ] Probar en navegador: primera carga sin parpadeo (recarga forzada), menú de cuentas (escritorio, plegado y móvil), editor de identidad, cambio de tema por empresa.

## Sin probar
Nada se ha visto en navegador (se pidió no usar el navegador automático). El comportamiento del parpadeo se razona desde el código, no se midió.
