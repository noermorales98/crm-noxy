---
author: Noeli
branch: main
status: done
---
# Pipeline por categorías, alta de clientes, sección propia de Conocimiento e IA y caché

## Hecho
- **/pipeline:** vista «Todos» (todos los pipelines juntos, cada uno con su título) y filtro por categoría (Sales Pipeline, Noxy Editorial, …); la elección se recuerda. «Nueva categoría» crea un pipeline en la base (`POST /api/pipelines`, etapas Nuevo / En proceso / Ganado / Perdido). `src/lib/pipeline-categories.ts` + 3 pruebas.
- **/clientes:** botón «Nuevo cliente» (crea la sub-cuenta y refresca el panel). `AgencyNewClient`.
- **Barra lateral:** quinta sección «Conocimiento e IA» (Docs y Asistente); «Espacios» queda con Correo y Bóveda. Contratos de navegación actualizados.
- **Carga:** `app/loading.tsx` ahora pinta la barra lateral real en Inicio (`/`) y no muestra nada en pantallas públicas; en el resto el marco ya viene del layout.
- **Caché:** `experimental.staleTimes` (30 s dinámico, 300 s estático) en `next.config.ts` y caché en memoria con revalidación en segundo plano en `/pipeline` (`src/lib/client-cache.ts` + 2 pruebas).

## Sin probar
Nada se vio en navegador. La caché del router puede mostrar datos de hasta 30 s en pantallas de servidor; las que guardan datos usan `router.refresh()`.

## Mover contactos y formularios a sus sub-cuentas (hecho, aprobado por Noeli: «mover los originales»)
`scripts/move-company-data.ts` (simulacro por defecto, `--apply` con respaldo, una transacción por empresa). Los originales cambiaron de organización conservando id, enlace público de formularios, historial de correos y tareas; las copias de la migración se borraron.
- **Eilen Centro Terapéutico:** 147 contactos, 1 formulario, 1 tarea. **Dreams Club:** 63 contactos, 2 formularios, 59 tareas (65 en total con las suyas).
- **Noxy Digital** pasó de 216 a 6 contactos y de 9 a 6 formularios. **J&H Multiservices** se queda como está: su contacto tiene deal, cotización y proyecto en Noxy.
- **Se perdió a propósito:** el vínculo del formulario de Eilen con su proyecto y su correo de bienvenida (viven en Noxy), y 2 campañas de Noxy que apuntaban a ese formulario (`targetFormId` a nulo). Hay que volver a ligar el correo de bienvenida desde la sub-cuenta de Eilen.
- Verificado: 0 contactos cuyo formulario sea de otra organización.
- Respaldo local con datos personales en `backups/mover-*.json` (git lo ignora): bórralo cuando verifiques.

## Ajuste de la barra lateral (5 secciones)
Las pestañas medían 44 px (móvil) o 36 px (escritorio) con huecos fijos y, con 5, no cabían. Ahora la fila es una rejilla de 5 columnas iguales (`auto-cols-fr`), cada pestaña de 36 px centrada: caben siempre. El nombre de la sección activa se muestra justo debajo de las pestañas (no cabe dentro de la pestaña sin cortar «Conocimiento e IA»). Sin probar en navegador.
