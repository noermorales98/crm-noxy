# Noxy: inicio editorial

Estilo: Editorial greeting. Shell: Open plane. Identidad conservada: isotipo oficial, Open Sauce Two e índigo. Rostro: organización y hecho operativo del día. Firma candidata: el pulso del equipo, enlazado a la siguiente tarea pendiente. Sin gráficos porque la pregunta se resuelve con listas.

## Integración

`/` conserva autenticación, autorización, datos de organización y preferencias de widgets y pestañas. Las rutas secundarias siguen usando sus implementaciones existentes. No se sustituyen por estados de muestra.

`/design-preview` usa exclusivamente el módulo local `src/lib/editorial-data.ts`. Sus destinos hash son vistas de muestra, nunca accesos públicos al CRM. Los cambios se guardan bajo la clave local `noxy.editorial.sample.v1`, sin peticiones de escritura al backend. `?state=empty`, `?state=loading` y `?state=error` permiten comprobar estados deterministas; Reintentar recupera el conjunto local.

## Pregunta de cada vista

- Inicio: ¿qué trabajo necesita atención hoy?
- Contactos: ¿a quién dar seguimiento? Empresas: ¿qué empresas están registradas?
- Tareas: ¿qué queda y quién lo atiende? Proyectos y su detalle: ¿qué proyecto y tareas retomar?
- Pipeline: ¿en qué etapa está cada oportunidad? Clientes: ¿qué clientes siguen activos? Historial: ¿qué tratos terminaron?
- Cotizaciones: ¿qué propuestas están guardadas? Formularios: ¿qué formularios reciben solicitudes?
- Citas: ¿con quién y cuándo reunirse? Tipos: ¿cuánto dura cada cita? Disponibilidad: ¿qué horarios se pueden reservar?
- Correo: ¿qué conversación necesita respuesta? Docs: ¿qué documento abrir? Asistente: ¿qué consulta retomar?
- Bóveda: ¿qué acceso consultar? Contenido: ¿qué pieza está pendiente?
- General: ¿cómo está configurado el espacio? Equipo: ¿quién pertenece a la organización? Modelos: ¿qué proveedor está disponible? Resumen: ¿cuándo recibiría el resumen?

## Ajustes a la ficha

- El requisito posterior de hit boxes de 44x44 prevalece sobre el paso de navegación de 34px. Se usa paso de 44px con píldora visible de 32px. Los controles tienen caja de 44px y forma visible de 38px.
- La fuente y el índigo existentes prevalecen sobre los de la ficha. Cifras tabulares por defecto verificadas en los archivos de fuente; no se exige que `tnum` cambie un ancho que ya es uniforme.
- El esquema real Project no tiene estado activo ni responsable. En el inicio integrado se presenta el total de proyectos sin inventar estados. La distinción activo/archivado pertenece solo al conjunto de muestra.
- El preset compacto corresponde solo a la muestra. Los catorce widgets predeterminados y las preferencias reales siguen disponibles. Por ello, una cuenta real con todos los widgets puede tener contenido adicional bajo el primer pliegue.
- El kit CSS completo está encapsulado en una capa y un scope para no rediseñar las vistas existentes. Se preservan las cabeceras MIT. charts.js se conserva íntegro, pero no se carga porque no se dibujan gráficos.

## Verify before publishing:

Todos los valores representativos viven en `src/lib/editorial-data.ts`: organización y reloj fijo, tres miembros, seis contactos y correos example.test, ocho tareas y sus responsables y fechas, tres proyectos, tres citas y cuatro oportunidades por 60,000 MXN. No son clientes, resultados ni actividad real. La etiqueta Sample data se conserva una vez por vista. Las preferencias de muestra del navegador también deben distinguirse de las preferencias reales.

La carga de fuentes en navegador, medidas exactas de 390/820/1440px, contraste calculado, consola de aserciones y auditoría DOM completa quedan sujetos a Preview y Review cuando no puedan comprobarse en el entorno local. La inspección visual de escritorio no sustituye esas comprobaciones ni demuestra la duración de las transiciones.
