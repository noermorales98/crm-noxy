# Workspace anidado por proyecto ("mini CRM" scoped a un proyecto)

## Contexto

`/projects/[id]` hoy es una sola página con una cuadrícula de tarjetas compactas (Tareas, Docs, Formularios, Campañas). El usuario pidió que, al entrar a un proyecto, la experiencia se sienta como un CRM completo pero acotado a ese proyecto — con secciones propias, navegación dedicada, y vistas a tamaño completo en vez de tarjetas chicas.

Investigación previa (agente Explore) estableció que:
- El módulo de Correo (`app/emails/page.tsx`) está fuertemente acoplado a `EmailContext` (singleton global) y a `useHeader()` — no reutilizable tal cual. Sí es reutilizable su capa de API (`/api/emails?companyId=&folder=`), y `Project.emailAccountCompanyId` ya existe en el esquema pero no se consume en ningún lado.
- El módulo de Tareas (`app/tasks/page.tsx`, `TasksContent`) no está exportado y también depende de `useHeader()` global. Reutilizable: la API de tareas y el patrón de filtrado por `projectId` ya presente.
- El módulo de Docs no tiene un componente de árbol reutilizable fuera de `KbContext` (singleton global), pero `src/components/ProjectDocsManager.tsx` (construido en la sesión anterior) ya implementa exactamente el patrón correcto (lista plana vía `KbPageRelation`) y se reutiliza casi tal cual.
- `src/components/DashboardShell.tsx` ya tiene un precedente para que una ruta controle su propio header: `isHideHeaderRoute()` desactiva el `<Header/>` global para `/kb/[id]` y `/assistant`. Para proyectos NO se oculta el header global (se decidió mantenerlo por acceso a búsqueda/notificaciones/perfil), solo se le cambia el título vía `useHeader().setConfig()`, el mismo mecanismo que ya usa cada página.

## Estructura de rutas

```
app/projects/[id]/
  layout.tsx        (nuevo) — sidebar secundario + fetch del proyecto + set del título del header global
  page.tsx           (Resumen — reemplaza el contenido actual)
  tareas/page.tsx     (nuevo)
  docs/page.tsx       (nuevo)
  correo/page.tsx     (nuevo, condicional a emailAccountCompanyId)
  info/page.tsx       (nuevo)
```

## `layout.tsx`

Server Component. Hace `prisma.project.findUnique` (mismo include ya usado: `clientCompany`, `contact`, `client`, `emailAccountCompany`, `_count` de `tasks`/`forms`/`campaigns`, más un count de `KbPageRelation` para el badge de Docs). Si no existe, `notFound()`.

Renderiza:
- `<ProjectHeaderSetter project={...} />` (client, ver abajo) — no pinta nada visible, solo hace `setConfig({ title: ... })` una vez, reactivo a la sub-ruta activa vía `usePathname()`.
- Layout de dos columnas: sidebar secundario (`ProjectSidebar`, client component) + `<div>{children}</div>` para el contenido de la sub-ruta activa.

### `ProjectHeaderSetter` (client)

Usa `useHeader()` + `usePathname()`. Título = `{icono} {nombre del proyecto}` seguido de `· {Sección}` según la sub-ruta activa (Resumen/Tareas/Docs/Correo/Info). Igual patrón que `WelcomeHeaderTitle.tsx` u otras páginas: `setConfig({ title })` en un `useEffect`, `return () => setConfig({})` al desmontar (se desmonta al salir de `/projects/[id]/*` por completo, no entre sub-rutas hermanas).

### `ProjectSidebar` (client, ancho ~220px, `border-r border-border-subtle bg-white`)

De arriba a abajo:
1. Link "← Proyectos" → `/projects`.
2. Ícono del proyecto + nombre (truncado) + botón lápiz pequeño → abre `ProjectAssociationsEditor` (ya existe, se reutiliza tal cual).
3. Badges compactos (Empresa/Cliente/Contacto/Correo) — envueltos, mismo estilo de pill ya usado en la página actual, siempre visibles sin importar la sub-ruta.
4. Separador.
5. Nav (mismo patrón visual que `navItemClass` del sidebar principal, resaltando la ruta activa vía `usePathname()`):
   - Resumen → `/projects/[id]`
   - Tareas (badge con conteo) → `/projects/[id]/tareas`
   - Docs (badge con conteo) → `/projects/[id]/docs`
   - Correo → `/projects/[id]/correo` (item omitido por completo si no hay `emailAccountCompanyId`)
   - Info → `/projects/[id]/info`
6. Si hay `clientId`: separador + link "Ver bóveda" → `/pipeline/clientes`.

## Sub-páginas

### Resumen (`page.tsx`)
Grid de 4 stat cards (Tareas pendientes, Docs, Formularios, Campañas, cada una con link a su pestaña) + dos columnas con "Últimas tareas" (5) y "Últimos docs" (5). Reemplaza el contenido actual de la página (el header grande con badges se elimina de aquí porque ahora vive en el sidebar secundario).

### Tareas (`tareas/page.tsx`)
Componente nuevo `ProjectTasksView({ projectId })` (client): lista completa de tareas del proyecto (reutiliza `/api/tasks` existente, filtra por `projectId` — se añade soporte de query param `?projectId=` en el GET de `/api/tasks` para filtrar server-side en vez de traer todo y filtrar en cliente), con su propio botón "Nueva tarea" (modal ya existente en `app/tasks/page.tsx`, se replica el formulario mínimo necesario ya con `projectId` fijo), toggle completada/pendiente, eliminar. Sin `useHeader()` — es un componente autocontenido, el título ya lo puso el layout.

### Docs (`docs/page.tsx`)
Reutiliza `ProjectDocsManager` tal cual (ya construido), pero embebido a ancho completo en vez de como tarjeta de dashboard — se le agrega una prop `size="full"` opcional o simplemente se envuelve en un contenedor más amplio; el componente en sí no necesita cambios funcionales.

### Correo (`correo/page.tsx`)
Componente nuevo `ProjectInboxView({ companyId })` (client): bandeja de entrada ligera y autocontenida (no usa `EmailContext` ni `useHeader()`) — lista de correos (`GET /api/emails?companyId=&folder=inbox`), panel de detalle al seleccionar uno, folders inbox/enviados/archivados como tabs simples internos. Sin compose/AI-draft/config SMTP en esta primera versión (eso se sigue gestionando desde `/emails` y `/settings`) — es una vista de lectura + folders, no un reemplazo completo del cliente de correo.

### Info (`info/page.tsx`)
Contenido detallado de asociaciones (lo que hoy muestra el header de la página actual): descripción completa, badges expandidos con nombre completo de cada entidad asociada y link directo a su página (`/companies/[id]`, `/contacts/[id]`, `/pipeline/clientes`), botón "Editar asociaciones", y las tarjetas de Formularios/Campañas de solo lectura que hoy están en el dashboard (se mueven aquí).

## Cambios a archivos existentes

- `app/api/tasks/route.ts` (GET): acepta `?projectId=` opcional para filtrar server-side.
- `app/api/emails/route.ts`: ya soporta `companyId`/`folder` — sin cambios.
- `src/components/ProjectAssetsManager.tsx` y `src/components/ProjectAssociationsEditor.tsx`: sin cambios funcionales, se re-importan donde corresponda.
- `app/projects/page.tsx` (lista): sin cambios — sigue enlazando a `/projects/[id]` que ahora es la nueva Resumen.

## Fuera de alcance

- No se toca `/emails`, `/tasks`, `/kb` como páginas — siguen funcionando igual para su uso general en toda la organización.
- La vista de Correo del proyecto es de solo lectura + folders en esta primera versión; no incluye componer, IA, ni configuración SMTP/IMAP.
- La vista de Docs del proyecto sigue siendo una lista plana (no árbol recursivo) — igual que `ProjectDocsManager` ya construido.
