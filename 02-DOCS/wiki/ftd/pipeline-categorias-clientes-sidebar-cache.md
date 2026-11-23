---
author: Noeli
branch: main
status: in-progress
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

## Pendiente (esperando decisión)
Mover contactos y formularios de los clientes a sus sub-cuentas (hoy Noxy Digital conserva los originales y las sub-cuentas tienen copias).
