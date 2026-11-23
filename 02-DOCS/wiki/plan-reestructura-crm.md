# Plan de reestructura del CRM Noxy

Fecha: 2026-11-23. Basado en lectura del código (no se tocó nada). Lo que no pude verificar (cron-job.org, la base de producción) está marcado como **por verificar**.

---

## 1. Qué hace hoy el CRM

| Área | Qué hay |
|---|---|
| Contactos | Contactos y Empresas (`Company` = cliente que administras, con su SMTP/IMAP propio). |
| Ventas | Pipeline Kanban (varios pipelines y etapas), Clientes recurrentes (MRR, cobros mensuales), Historial, Cotizaciones (PDF, enlace público `/cotizar/[token]`, Stripe, anticipo+final, evento «VISTA»), Formularios públicos (crean contacto + deal + tarea). |
| Agenda | Citas, tipos de cita, disponibilidad, Google Calendar, sugerencias desde reuniones de Granola/Notion. |
| Operación | Tareas, **Proyectos** (se crean solos al ganar un deal, con tareas de plantilla; portal público), Correo (IMAP/SMTP por empresa, campañas). |
| Espacios | Correo, Docs (KB en markdown/PDF), Asistente (chat IA multi-modelo), Bóveda (credenciales de clientes), Gestión de contenido (calendario por cliente, avisos de grabación, métricas de video). |
| Automatización | 12 crons (`/api/cron/*`): digest WhatsApp, follow-ups, recordatorios de citas/contenido/Google, alertas de cobro, auto-archivo, Granola, Notion. WhatsApp vía **CallMeBot** (no oficial). |
| MCP / bot | ~45 herramientas (leads, contactos, cotizaciones, contenido, Notion). Escrituras con aprobación. |

Arquitectura clave: todo cuelga de `Organization` (multi-tenant ya existe en el esquema), pero **no hay selector de organización en la UI ni ruta para crear otra**. Un usuario vive en una sola organización.

---

## 2. Diagnóstico de tus problemas (causa en el código)

### 2.1 Correos/avisos de «follow vencido» que no quieres
`app/api/cron/followups/route.ts` corre cada 15 min y manda un WhatsApp «⏰ Follow-up vencido» por cada deal con `followUpAt` en las últimas 24 h. **No hay marca de «ya avisado»**, así que el mismo deal puede avisar hasta ~96 veces en un día. Tampoco filtra `isArchived`. Es la única fuente de ese texto.
**Arreglo:** un solo aviso por seguimiento (campo `followUpNotifiedAt`), ignorar archivados, y mover «vencidos» al resumen diario en vez de mensaje suelto.

### 2.2 No llega el resumen diario
Causas probables, de más a menos probable:
1. `DigestSchedule.enabled` es `false` por defecto y el cron solo procesa horarios que **existen y están activos**. Si nunca lo guardaste en Configuración, no sale nada. (por verificar en la base)
2. El cron `/api/cron/digest` debe estar dado de alta en cron-job.org cada ≤15 min (`vercel.json` está vacío `{}`; la ventana de envío es de 15 min exactos). (por verificar)
3. Modelo por defecto `google/gemma-4-31b-it:free`: si falla, el error se traga en `errors[]` y nadie se entera.
4. CallMeBot sin teléfono/clave configurados para tu usuario.
5. **El resumen no incluye el calendario de contenido** (pendiente / en edición / editado / subido / quién sube hoy). Solo trae pipeline, tareas, citas, Google Calendar y correos. Por eso, aunque llegara, no tendría lo que esperas.

### 2.3 MCP: estados del calendario, cotizaciones, correos, enlaces
- `update_content_item` **sí** acepta `publishStatus`, pero los estados válidos son solo `pendiente | en_edicion | editado | subido` (`src/lib/content-publish.ts`). **«Aprobado» no existe.** Hay que agregarlo (propongo: pendiente → en edición → editado → **aprobado** → subido).
- **No existe `update_quote`** (solo crear, listar, ver, ligar a deal). No se puede editar una cotización por MCP.
- «Agregar correos»: no hay herramienta para crear/enviar/borrador de correos; `list_emails`/`get_email` son de solo lectura. *(Supuesto: te refieres a correo de la bandeja y a email del cliente en cotización/contacto. Confírmalo.)*
- Ninguna herramienta devuelve **enlace**: `create_quote_for_deal` devuelve id y folio, pero no `/cotizar/<publicToken>` ni la URL del deal/contenido en el CRM.

### 2.4 Deals ganados que no se van («sin mes»)
- `Deal` **no tiene fecha de cierre** (`wonAt`). `loadWonSales` usa `updatedAt`, que cambia con cualquier edición; por eso «ganado este mes» es poco fiable y el total histórico aparece siempre.
- El resumen de WhatsApp siempre imprime «VENTAS GANADAS TOTAL» (`digest.ts`).
- El auto-archivo (`/api/cron/auto-archive`, 30 días tras `updatedAt`) **no está listado en `CRON.md`**: probablemente nunca corre. (por verificar)
- No existe guardado mensual: no hay tabla de cierres por mes ni pantalla de «mi resumen de octubre».

### 2.5 Lo archivado sigue apareciendo
Estas consultas **no filtran `isArchived`**:
- Búsqueda global `app/api/search/route.ts:55`
- Contexto del Asistente IA `src/lib/ai-context.ts:49`
- Dashboard: valor del pipeline, seguimientos vencidos, tratos recientes (`src/lib/dashboardData.ts:240,381,412`)
- Métricas de ventas `app/api/sales/metrics` y `src/lib/mcp/sales-metrics.ts` (total, ganados, tasa de cierre)
- Selector del KB `app/api/kb/search-entities/route.ts:112`
- `list_deals` del MCP lo filtra bien (con `includeArchived`).
Además solo se pueden archivar **deals** (correos también); contactos, empresas, tareas, cotizaciones y contenido no tienen archivado.

### 2.6 Proyectos no sirve
Hoy un Proyecto es: un deal ganado + lista de tareas de plantilla + portal público. No tiene cliente propio ni pipeline, solo duplica Tareas. Su único valor real (portal para el cliente y vínculo formulario→proyecto) se puede absorber en el modelo de «Cliente/Espacio» (sección 4).

### 2.7 Tu problema de fondo: todo cae en tu CRM principal
`Pipeline`, `Stage` y `Deal` solo se ligan a `Organization`. `Company` es solo una etiqueta (`Deal.companyId`, `Form.companyId`). Un formulario de la empresa X crea el deal **en el pipeline general** y el contacto en la misma lista. No hay aislamiento por cliente.

---

## 3. Qué hacen HubSpot, Monday y otros (a grandes rasgos)

| Herramienta | Cómo resuelve «varios clientes, cada uno separado» | Cómo trata los deals ganados |
|---|---|---|
| **HubSpot** | Cuentas separadas por cliente (agencias usan «Partner portal»/multi-account) o **Business Units** dentro de una cuenta (Enterprise). Pipelines, formularios y propiedades por unidad. | El deal ganado se queda en el pipeline pero lo gobierna `closedate`: los reportes se filtran por periodo y el tablero oculta «cerrados hace >N días». Hay forecast y reportes por mes. |
| **Monday CRM** | **Workspaces** y tableros por cliente; cada tablero con sus grupos y automatizaciones. | Se usa un grupo «Ganados» y una automatización: «cuando estado = Ganado, mover a grupo del mes»; el tablero se archiva al final. |
| **Pipedrive** | Una cuenta por cliente o filtros/visibilidad por equipo. | Los ganados salen del tablero; se consultan por filtro «ganado en: este mes». Metas por periodo. |
| **GoHighLevel** (el CRM de agencias) | **Sub-cuentas**: cada cliente tiene su propio CRM (pipeline, contactos, formularios, calendarios) y tú ves todo con un cambiador de cuenta. | Pipeline por sub-cuenta; reportes por cuenta y periodo. |
| Odoo / Zoho | Multi-compañía con selector arriba. | Igual: fecha de cierre + reportes por periodo. |

Patrón común: (a) un **selector de cuenta** que cambia todo el contexto, (b) los ganados se gobiernan por **fecha de cierre**, no por «estado eterno», y (c) los reportes mensuales son una **foto guardada**, no un cálculo en vivo.

---

## 4. Opciones para dividir por cliente (decisión pendiente)

**Opción A — Cada cliente = una Organización («sub-cuenta», estilo GoHighLevel).** *(Recomendada)*
Reutiliza lo que ya existe: todo ya filtra por `organizationId`, así que pipelines, contactos, formularios, citas, KB y MCP quedan aislados sin reescribir consultas. Falta: selector de organización en la UI, crear organización, que tú seas miembro de todas, y un panel «agencia» que reúna lo tuyo. «Empresas» pasa a ser tu lista de clientes y cada una abre su espacio. Riesgos: crons y digest se ejecutan por organización (hay que decidir qué recibes tú y qué recibe el cliente); datos compartidos (plantillas, claves de IA) deben vivir en la organización principal.

**Opción B — Un «Espacio» dentro de una sola Organización (columna `companyId` en Pipeline/Contact/Deal/Form/Task).**
Un solo login y un solo resumen, pero toca ~40 consultas y es fácil que un filtro olvidado mezcle datos (el mismo bug de «archivados que se cuelan», multiplicado). Más rápido de ver, más frágil.

**Opción C — Solo vistas filtradas.** Barato, pero no resuelve «cada uno por separado»: los datos siguen mezclados.

**Qué pasa con «Proyectos» en A:** se reemplaza por «Clientes» (tu lista de cuentas) con tarjeta: pipeline del cliente, contactos, formularios, resumen mensual, portal. Los proyectos de entrega pasan a ser tareas/etapas dentro del cliente.

---

## 5. Reparto de IAs

| IA | Qué le toca | Por qué |
|---|---|---|
| **Claude** | Esquema Prisma y migraciones, cron y digest, métricas mensuales, cifrado de bóveda, multi-organización, rediseño de Proyectos. | Riesgo alto: datos reales, dinero, seguridad. |
| **Cursor** | Filtros de archivados, herramientas MCP, separar la sidebar, ajustes de UI. | Cambios acotados y repetitivos con criterios claros. |
| **Kimi K3** | Textos de la landing, documentación, `CRON.md`, pruebas, limpieza de datos con reporte. | Trabajo de bajo riesgo y mucho texto. |

Reglas para todas: trabajar en `main` (está abierta), **un commit por tarea**, correr `npm test` antes de dar por hecho, nunca borrar datos, mostrar evidencia (salida de pruebas) al final.

### Orden y dependencias
```
Ola 1 (en paralelo, sin conflicto):   T1 Claude · T3 Cursor · T5 Cursor(sidebar)
Ola 2:                                T2 Claude (digest) → T4 Claude (cierre mensual; toca digest.ts)
                                      T6 Cursor (MCP) · T7 Claude (bóveda)
Ola 3 (tras decidir la opción):       T8 Claude (multi-cuenta) → T9 Cursor (UI selector) → T10 Claude (Proyectos→Clientes)
Cierre:                               T11 Kimi (landing) · T12 Kimi (docs/CRON/pruebas)
```

---

## 6. Prompts, paso a paso

Pega cada prompt completo en la IA indicada. Cada uno es autónomo.

### T1 · Claude · Un solo aviso de follow-up (y ninguno de archivados)
```text
Proyecto: /Users/noeli/Documents/Develop/crm/crm-noxy (Next.js + Prisma). Trabaja en main.
Problema: app/api/cron/followups/route.ts manda un WhatsApp «Follow-up vencido» por cada deal con
followUpAt en las últimas 24 h, cada 15 min, sin marca de «ya avisado» y sin filtrar isArchived.
Tarea:
1. Agrega a Deal el campo followUpNotifiedAt DateTime? en prisma/schema.prisma (db:push es el flujo; deja SQL en prisma/sql/ con su .down.sql, como en fase1_crm).
2. En el cron: avisar solo si followUpNotifiedAt es null o menor que followUpAt; filtrar isArchived:false; al enviar bien, guardar followUpNotifiedAt = now. Si followUpAt cambia, vuelve a poder avisar (resetea en app/api/deals/route.ts PATCH cuando cambie followUpAt).
3. No mandes un mensaje por deal: agrupa en UN mensaje por dueño con la lista (máx. 5 y «+N más»).
4. Pruebas con node --test en src/lib (extrae la lógica de decisión a una función pura, p. ej. src/lib/followup-notify.ts, con test).
Criterio de hecho: npm test pasa; muestra la salida; explica en 3 líneas el cambio. No borres datos. Un commit.
```

### T2 · Claude · Que el resumen diario llegue y traiga el calendario de contenido
```text
Proyecto: crm-noxy. Trabaja en main. Archivos: src/lib/digest.ts, app/api/cron/digest/route.ts, app/settings (donde se edita DigestSchedule).
Problema: el resumen diario no llega y, aunque llegara, no incluye el calendario de contenido.
Tarea:
1. Diagnóstico sin tocar datos: lista (solo lectura, script en scripts/) cuántos DigestSchedule hay, cuáles enabled, y si el usuario tiene CallMeBot. Reporta, no corrijas datos.
2. En el cron digest: no tragar errores. Si un envío falla, crear una Notification in-app tipo error y devolverlo en la respuesta JSON.
3. Si la IA falla (modelo gratis caído), enviar igualmente un resumen determinista en texto plano (sin IA) en vez de nada.
4. Agregar al contexto del digest una sección «CONTENIDO» con ContentItem de la organización: por cada estado (pendiente, en_edicion, editado, aprobado si existe, subido) cuántas piezas hoy; lista de piezas que «se suben hoy» (date = hoy) con cliente y estado; y las pendientes de los próximos 3 días. Respeta la zona horaria de Organization.timezone.
5. Quitar «VENTAS GANADAS TOTAL» del mensaje (solo mes en curso); ya no es relevante.
6. Incluir «seguimientos vencidos» como UNA línea con la cantidad y los 3 primeros (reemplaza el aviso suelto de T1).
7. Que la pantalla de Configuración muestre claramente si el digest está activo, su próxima hora de envío y un botón «Enviar prueba ahora» (ya existe runDigestForUser con skipScheduleCheck).
Criterio de hecho: npm test; pruebas para la función que arma la sección de contenido; muestra un resumen de ejemplo generado con datos de prueba. Un commit.
```

### T3 · Cursor · Lo archivado no debe aparecer en consultas
```text
Proyecto crm-noxy (Next.js + Prisma), rama main. Tarea mecánica con criterio claro.
Los deals tienen isArchived. Estas consultas NO lo filtran y deben filtrarlo (isArchived:false), salvo que el usuario pida ver archivados:
- app/api/search/route.ts (deal.findMany ~línea 55)
- src/lib/ai-context.ts (~49)
- src/lib/dashboardData.ts (~240, ~381, ~412 y los deal.count de ~249/252)
- app/api/sales/metrics/route.ts y src/lib/mcp/sales-metrics.ts (totalDeals, dealsThisMonth, ganados/perdidos, tasa de cierre, followUps)
- app/api/kb/search-entities/route.ts (~112)
Pasos:
1. Crea src/lib/deal-filters.ts con export const ACTIVE_DEALS = { isArchived: false } y úsalo en todos esos sitios (un solo lugar para el criterio).
2. Para el MCP search_crm (src/lib/mcp/tools.ts ~1301) y la búsqueda global, agrega parámetro opcional includeArchived (por defecto false).
3. Añade prueba en src/lib/deal-filters.test.ts. No cambies el comportamiento de /api/deals/archived ni de /pipeline/historial.
4. Corre `grep -rn "prisma.deal" app src` y confirma que ninguna consulta de lectura de listados se quedó sin criterio; lista las que dejaste a propósito y por qué.
Hecho cuando: npm test pasa y entregas la lista del paso 4. Un commit.
```

### T4 · Claude · Cierre por mes de las ventas ganadas
```text
Proyecto crm-noxy, main. Hazlo DESPUÉS de T2 (comparten digest.ts).
Problema: Deal no tiene fecha de cierre; «ganado este mes» usa updatedAt (se mueve al editar); no hay guardado mensual ni forma de consultar un mes pasado; los ganados no se archivan solos.
Tarea:
1. Schema: Deal.wonAt DateTime? y modelo MonthlySnapshot { id, organizationId, year, month, metrics Json, createdAt, @@unique([organizationId,year,month]) }. SQL + down en prisma/sql/.
2. Backfill de wonAt: para deals en etapa ganada, usar la fecha del ActivityLog de cambio de etapa si existe; si no, updatedAt. Script en scripts/ que primero imprime lo que haría (--dry-run) y exige --apply. No lo ejecutes con --apply; pídeme confirmación.
3. Al mover un deal a etapa isWon (app/api/deals/route.ts PATCH y donde se cambie de etapa) fijar wonAt = now; al sacarlo de ganado, null.
4. loadWonSales y summarizeWonSales: «mes» usa wonAt, no updatedAt; añade parámetro de mes (YYYY-MM).
5. Nuevo cron /api/cron/monthly-close (día 1, 00:30 hora de la organización): para el mes anterior guarda MonthlySnapshot con: deals creados, ganados (cantidad y monto por moneda), perdidos, tasa de cierre, pipeline abierto al cierre, cobros recibidos, MRR. Idempotente. Luego archiva (isArchived=true) los deals ganados con wonAt del mes cerrado. Reemplaza al auto-archive por updatedAt (déjalo pero desactivado documentado).
6. UI: en /pipeline/historial agrega selector de mes que lee MonthlySnapshot (y calcula en vivo el mes en curso). Nada de «total histórico» como cifra principal.
7. MCP: get_sales_metrics acepta `month` (YYYY-MM) y devuelve el snapshot guardado si existe.
Criterio: npm test; pruebas para el cálculo por mes (incluye cambio de mes y zona horaria America/Cancun). Un commit por paso 1–3 y otro por 4–7.
```

### T5 · Cursor · Separar «Espacios» en dos secciones
```text
Proyecto crm-noxy, main. Archivos: src/lib/crm-navigation.ts (+ su .test.ts), src/components/Sidebar.tsx, src/components/sidebar-parts.tsx, src/components/MobileMoreSheet.tsx, src/components/context-navs.tsx.
Hoy el grupo «Espacios» contiene Correo, Docs, Asistente, Bóveda y Gestión de contenido.
Cambio: deja «Espacios» con Correo, Bóveda y Gestión de contenido, y crea un grupo nuevo «Conocimiento e IA» con Docs y Asistente.
- No cambies rutas ni permisos (kb y assistant se mantienen).
- Actualiza NAV_GROUPS, los tests de contrato (crm-navigation.test.ts, crm-navigation-modes.test.ts, assistant-sidebar-navigation-contract.test.ts, redesign-shell-contract.test.ts) y el menú móvil.
- Texto del documento 02-DOCS/wiki/index.md si menciona los espacios.
Hecho cuando: npm test pasa sin romper pruebas que ya pasaban (4 fallan desde antes: contratos de diseño y favicon; no las toques) y revisas en el navegador (npm run dev) escritorio y móvil con captura.
```

### T6 · Cursor · MCP: «aprobado», editar cotizaciones, enlaces y correos
```text
Proyecto crm-noxy, main. Archivos: src/lib/content-publish.ts, src/lib/mcp/content-input.ts, src/lib/mcp/content-tools.ts, src/lib/mcp/tools.ts, src/lib/url.ts, app/api/quotes/[id]/route.ts.
1. Estado «aprobado»: agrégalo a PUBLISH_STATUSES entre «editado» y «subido» (orden: pendiente, en_edicion, editado, aprobado, subido), con etiqueta «Aprobado» y color (usa uno de la paleta del CRM) en publishStatusLabel/publishStatusColor; actualiza el z.enum STATUS de content-tools.ts, los filtros de la UI de /contenido y las pruebas. No cambies el significado de uploadedAt (solo «subido»).
2. Nueva herramienta MCP update_quote (con el mismo mecanismo de aprobación gateWrite/canonicalAction que las demás escrituras): permite cambiar items (recalcula totales con computeQuoteTotals), taxRate, validUntil, notes, terms, clientName/clientCompany/clientEmail/clientPhone. Solo si status es BORRADOR o ENVIADA; para otros devuelve error claro. Registra QuoteEvent tipo EDITADA con actor «mcp».
3. Enlaces: crea una función publicUrls en src/lib/url.ts (usa la URL base de la app desde env) y haz que create_quote_for_deal, get_quote, list_quotes devuelvan `publicUrl` (/cotizar/<publicToken>) y `crmUrl` (/cotizaciones/<folio>); create_deal/get_deal devuelvan `crmUrl`; create_content_item/get_content_item devuelvan su `crmUrl`.
4. Correos (decidido: es el email del cliente, no la bandeja): que update_contact acepte/edite `email` (revisa que ya lo haga y que valide formato) y que update_quote (punto 2) acepte clientEmail. No crees herramientas de envío ni borradores.
Hecho cuando: npm test pasa, pruebas nuevas para (1) y (2), y muestras la respuesta JSON de una cotización con sus dos enlaces.
```

### T7 · Claude · La Bóveda no está cifrada (la landing dice que sí)
```text
Proyecto crm-noxy, main. Hallazgo: ClientVaultEntry.password se guarda en texto plano (app/api/clients/[id]/vault/route.ts) aunque la landing promete «Bóveda cifrada». Ya existe src/lib/secret-box.ts (appSecretKey, encryptSecret, decryptSecret) usado para claves de IA y Notion.
Tarea:
1. Cifrar password (y notes cuando type sea credential) al guardar y descifrar al leer en esa ruta y en cualquier otro lector (grep ClientVaultEntry/clientVaultEntry y DeleteClientVaultDialog).
2. Script de migración scripts/encrypt-vault.mjs con --dry-run por defecto: cuenta cuántas filas están sin cifrar; con --apply las cifra de forma idempotente (detecta el prefijo del formato de secret-box). No lo apliques tú: pídeme confirmar y que antes haga un respaldo.
3. Revisa si Company.smtpPass / imapPass se guardan cifrados (app/api/companies/[id]/smtp/route.ts); si no, repórtalo y propón el mismo tratamiento en una tarea aparte (no lo cambies sin avisarme).
4. Pruebas de ida y vuelta (cifrar → descifrar) y de que la API nunca devuelva texto cifrado crudo.
Hecho cuando: npm test pasa y me dices el comando exacto para aplicar la migración.
```

### T8 · Claude · Multi-cuenta: cada cliente con su propio CRM (Opción A)
*Empezar solo después de confirmar la opción en la sección 4.*
```text
Proyecto crm-noxy, main. Decisión tomada: cada cliente que administro es una Organization (sub-cuenta) y yo soy miembro de todas. Hoy todo filtra por organizationId y la sesión guarda currentOrganizationId (auth.ts, auth.config.ts), pero no hay selector ni forma de crear organizaciones.
Primero escribe la spec corta en 02-DOCS/wiki/ftd/multi-cuenta.md (intención, alcance, qué NO entra, checklist) y muéstramela; sigue solo cuando la apruebe.
Alcance:
1. API: GET /api/organizations (las mías), POST /api/organizations (crear sub-cuenta: nombre, zona horaria; siembra pipeline por defecto con pipeline-setup.ts, plantillas de proyecto y me hace OWNER), POST /api/organizations/switch (actualiza currentOrganizationId con la mecánica de update de next-auth que ya existe en auth.config.ts; valida membresía).
2. Empresas → Clientes: una Company existente puede «convertirse» en sub-cuenta: crea la Organization, copia sus contactos, deals y formularios que ya apuntan a esa companyId (script con --dry-run; no mueve nada sin --apply; no borra el original, solo marca companyId.migratedToOrgId si añades ese campo).
3. Formularios públicos: el deal y el contacto deben crearse en la organización dueña del formulario (revisa app/api/public/forms y src/lib/form-lead.ts) y no en la principal.
4. Crons: digest, followups, content-reminders y payment-alerts ya recorren organizaciones; confirma que no mandan a un cliente cosas de otro. Mis avisos van solo a mi usuario (CallMeBot) y el dueño de cada sub-cuenta decide los suyos.
5. Pruebas de aislamiento: un usuario de la org A no puede leer ni escribir datos de la org B (rutas de deals, contacts, forms, quotes, mcp).
Entrega por pasos, un commit cada uno, y detente tras el paso 1 para que yo pruebe.
```

### T9 · Cursor · Selector de cuenta en la interfaz
```text
Proyecto crm-noxy, main. Hazlo DESPUÉS de T8 (paso 1: API /api/organizations y /switch).
Agrega un selector de cuenta arriba del Sidebar (src/components/Sidebar.tsx y AccountMenu.tsx) y en móvil (MobileTopBar):
- Muestra el nombre de la cuenta activa con un menú: mis cuentas, «Crear cuenta de cliente».
- Al cambiar, llama a /api/organizations/switch, actualiza la sesión y recarga la vista actual.
- Indica visualmente en qué cuenta estoy (color/inicial) para no editar la equivocada.
- Respeta el diseño existente (tokens de src/styles y DESIGN.md); sin librerías nuevas.
Hecho cuando: npm run dev, pruebo cambiar entre dos cuentas, y envías captura escritorio y móvil. npm test sigue igual.
```

### T10 · Claude · De «Proyectos» a «Clientes»
*Tras T8–T9.*
```text
Proyecto crm-noxy, main. Con multi-cuenta activo, «Proyectos» pierde su razón de ser. Propuesta: la sección «Proyectos» del Sidebar pasa a llamarse «Clientes» y es el panel de agencia: lista de mis sub-cuentas con, por cada una, deals abiertos, ganados del mes, tareas vencidas, cobros pendientes y enlace al portal público.
Escribe antes la spec en 02-DOCS/wiki/ftd/proyectos-a-clientes.md y espera mi aprobación. Puntos a cubrir:
- Qué se conserva del modelo Project (portal público project-public.ts, plantillas de tareas por servicio, ensureProjectForWonDeal) y qué se elimina; migración de proyectos existentes sin borrar nada.
- Cómo se relaciona con /pipeline/clientes (Client = cliente recurrente con MRR) para no tener dos «clientes».
- Resumen mensual por cliente (reusa MonthlySnapshot de T4).
No implementes hasta tener la spec aprobada.
```

### T11 · Kimi K3 · Landing: que diga solo lo cierto
```text
Proyecto crm-noxy. Archivo: src/components/landing/LandingPage.tsx (y mocks en LandingMocks.tsx). Solo cambia textos; no toques estilos ni estructura.
Corrige estas afirmaciones (mantén el tono corto y claro, en español, sin signos de exclamación):
1. «Bóveda cifrada» y «Credenciales cifradas»: deja el texto como está SOLO si T7 ya está hecha y aplicada; si no, cámbialo por «Bóveda de acceso restringido».
2. «Un resumen en tu WhatsApp cada mañana»: cámbialo por «Un resumen opcional en tu WhatsApp, a la hora que elijas».
3. «Cada persona ve solo lo suyo» / «Permisos por módulo»: cámbialo por «Permisos por módulo para cada integrante» (hoy es por módulo, no por registro).
4. «Ninguna sugerencia crea nada por sí sola»: cámbialo por «Las sugerencias de la IA se crean solo cuando tú las apruebas. Los avisos y tareas de seguimiento sí son automáticos y los puedes apagar».
5. «Cotizaciones que se siguen solas / cuándo darle seguimiento»: cámbialo por «Sabes cuándo abrieron tu cotización».
6. «Empieza en minutos, no en semanas»: bórralo si no hay onboarding guiado.
Entrega el diff y una lista de lo que cambiaste. No inventes funciones nuevas.
```

### T12 · Kimi K3 · Documentación, crons y pruebas
```text
Proyecto crm-noxy. Tareas de bajo riesgo:
1. CRON.md: agrega las entradas que faltan (auto-archive, notion-sync y, cuando existan, monthly-close) con frecuencia sugerida, y un apartado «Cómo comprobar que un cron corre» (curl con Bearer y respuesta esperada).
2. 02-DOCS/wiki/pendientes-crm.md: marca lo hecho por T1–T7 y agrega «dar de alta en cron-job.org: digest (cada 15 min), monthly-close (día 1), auto-archive».
3. Escribe pruebas node --test para src/lib/digest.ts: isDigestDue (ventana de 15 min, zona America/Cancun, mismo día no repite, frecuencia weekly/monthly/custom).
4. Genera un reporte (solo lectura) de qué consultas prisma.* de lectura en app/ y src/ no filtran organizationId; no corrijas, solo lista archivo:línea.
Hecho cuando: npm test pasa y entregas el reporte del punto 4.
```

---

## 7. Decisiones tomadas y pendientes
- ✅ Separación por cliente: **Opción A** (sub-cuenta = Organization). T8–T10 quedan habilitadas.
- ✅ «Agregar correos» en el MCP = email del cliente en contacto y cotización (T6.4).
- ⏳ Dar de alta los crons en cron-job.org y revisar si tu `DigestSchedule` está activo (T2 te dirá cuántos hay).
