# Continuación del marco claro

## Intención y alcance

Aplicar la ficha Framed sheet al CRM privado existente sin sustituir Next.js, las rutas, los servicios ni los permisos. La cara es el marco Lavanda con Open Sauce Two y el isotipo oficial. La firma es la franja operativa, con «Atender hoy» únicamente cuando una tarea pendiente está vencida.

Se reutilizaron los cambios previos del espacio de trabajo. Las rutas operativas de producción conservan sus implementaciones. El Inicio autenticado usa el shell real; `/design-preview` mantiene la muestra aislada con navegación local y estado del navegador. No se inició ningún servidor nuevo.

## Decisiones y supuestos

- La muestra representa un equipo ficticio. No representa clientes ni actividad real de Noxy Digital.
- Índigo en acciones y selección, Open Sauce Two y la pastilla de navegación son excepciones de marca frente a la ficha neutral.
- La franja es un contenedor dividido; la lista de tareas sustituye al gráfico principal porque responde a la pregunta operativa sin inventar una serie temporal.
- Los controles tienen cajas de al menos 44px. El botón visible conserva los 32px de la ficha mediante fondo interior.
- Los dígitos de los archivos existentes ya son tabulares por defecto. `tnum` está presente; no se exige que activarlo cambie un ancho que ya es tabular.
- No se crearon imágenes ni dependencias. Las iniciales se dibujan como texto. Los gráficos opcionales y preferencias existentes se conservan.
- Las operaciones de muestra son locales. No se simulan envíos, invitaciones externas, publicación, OAuth ni sincronización.

## Preguntas por vista

| Vista | Pregunta principal |
| --- | --- |
| Inicio | ¿Qué trabajo necesita atención hoy? |
| Contactos | ¿Qué persona necesito consultar o actualizar? |
| Empresas | ¿Qué empresa está vinculada a cada relación? |
| Tareas | ¿Qué tarea sigue y qué falta por terminar? |
| Proyectos | ¿Qué proyectos siguen activos? |
| Crear proyecto | ¿Qué proyecto vamos a registrar? |
| Proyecto | ¿Qué tareas e información pertenecen a este proyecto? |
| Información del proyecto | ¿Qué datos del proyecto están guardados? |
| Tareas del proyecto | ¿Qué entregables faltan en este proyecto? |
| Actividad del proyecto | ¿Qué cambios se han registrado? |
| Docs del proyecto | ¿Qué documentos están vinculados? |
| Registros del proyecto | ¿Qué registros pertenecen al proyecto? |
| Correo del proyecto | ¿Qué conversaciones están vinculadas? |
| Pipeline de ventas | ¿En qué etapa está cada oportunidad? |
| Trato | ¿Qué hace falta para avanzar esta oportunidad? |
| Clientes | ¿Qué clientes tienen pagos por atender? |
| Historial de tratos | ¿Qué oportunidades ya se cerraron? |
| Cotizaciones | ¿Qué cotización necesita revisión? |
| Crear o editar cotización | ¿Qué conceptos e importes se proponen? |
| Configuración de cotizaciones | ¿Qué preferencias se aplican a las propuestas? |
| Formularios | ¿Qué formulario o respuesta necesito revisar? |
| Detalle de formulario | ¿Cómo está configurado y qué respuestas tiene? |
| Citas Agendadas | ¿Qué reuniones están próximas? |
| Tipos de Cita | ¿Qué tipos de reunión están configurados? |
| Disponibilidad | ¿Cuándo se pueden agendar citas? |
| Correo | ¿Qué conversación necesita respuesta? |
| Campañas | ¿Qué campaña necesita edición o revisión? |
| Docs | ¿Qué documento necesito abrir o escribir? |
| Documento | ¿Qué contenido necesito consultar o editar? |
| Bóveda | ¿Qué información protegida del cliente necesito consultar? |
| Gestión de contenido | ¿Qué piezas están programadas o pendientes? |
| Ajustes | ¿Cómo está configurado el espacio de trabajo? |
| Equipo | ¿Quién puede trabajar en la organización? |
| Modelos de IA | ¿Qué modelos están configurados y disponibles? |
| Resumen por WhatsApp | ¿Cuándo y con qué contenido se entrega el resumen? |
| Perfil | ¿Qué datos personales están guardados? |

Asistente permanece en su ruta y diseño independiente.

## Evidencia

- [x] Kit copiado dentro de `src/styles/editorial-kit.css` y `src/lib/vendor/app-charts.js`; comentario de licencia conservado. El archivo de gráficos coincide byte a byte con el kit recibido. Licencia completa en `src/lib/vendor/tasteskill-LICENSE.txt`.
- [x] Datos derivados y comprobaciones de conciliación en `src/lib/editorial-data.ts`.
- [x] Seis pruebas específicas de datos pasan, incluida restauración de registros locales y rechazo de fechas inválidas.
- [x] Suite general: 183 de 187 pruebas pasan; los mismos cuatro fallos estaban presentes antes del trabajo.
- [x] ESLint no reporta errores en los módulos trabajados. El análisis general conserva deuda fuera de esos módulos.
- [x] TypeScript no reporta errores nuevos en los módulos trabajados; persisten 21 errores previos al regenerarse los tipos de rutas.
- [x] Comprobación numérica de contraste: pares de texto y acción de los diez temas y pares de estados de marca alcanzan 4.5:1.
- [x] Compilación Webpack del diseño correcta. El build completo se detiene en el error previo de exportación `ShareAccessError` de `app/api/public/kb/share/[token]/route.ts`.
- [ ] Auditoría visual y de interacción en Preview: 375, 390, 768, 1100 y 1440px; un h1; cajas interactivas; alineación y alturas; fuentes cargadas; consola; teclado y movimiento reducido. Yab no puede arrancar porque falta su aplicación y Computer Use no tiene navegadores disponibles. No se sustituyen estas comprobaciones por una captura estática.

## Verify before publishing:

- `src/lib/editorial-data.ts`: instante del 7 de noviembre de 2026, tres responsables, seis contactos con correos `example.test`, ocho tareas, tres proyectos, tres citas y cuatro oportunidades por 60,000.00 MXN. Todos son datos de muestra.
- `src/components/editorial/SampleViews.tsx`: estados vacíos de los otros módulos, tipos de cita derivados, preferencias de muestra, perfil ficticio y valores iniciales de los formularios.
- `src/components/editorial/EditorialWorkspace.tsx`: navegación local de la muestra, aviso Sample data y preferencias de presentación. La producción recibe sus datos desde `app/page.tsx` y conserva sus servicios existentes.
- Los registros de muestra creados durante el uso viven en las claves locales `noxy.editorial.sample.v1` y `noxy.sample.records.v1`. No deben migrarse a producción como actividad real.

## Siguiente paso

TasteCode Preview debe ejecutar la auditoría visual e interactiva pendiente. El build de producción requiere corregir la exportación inválida y la deuda de tipos previa; no se desactivaron validaciones para ocultarlas.
