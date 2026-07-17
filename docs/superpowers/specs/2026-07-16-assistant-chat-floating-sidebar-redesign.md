# Sidebar flotante persistente y rediseño de conversaciones del asistente

## Objetivo

Unificar la experiencia visual de todas las rutas del asistente y eliminar dos fallas perceptibles de navegación:

1. El historial desaparece brevemente al abrir o cambiar de conversación.
2. El control `Nueva conversación` algunas veces no muestra respuesta al primer clic.

El resultado aplicará a `/assistant/new` y `/assistant/[id]`. Todas las rutas del asistente usarán un sidebar flotante, ocultable y cerrado inicialmente. Las conversaciones con contenido adoptarán la dirección visual aprobada `A. Tarjetas suaves`, coherente con la experiencia de nueva conversación.

Esta especificación reemplaza únicamente las secciones de la especificación anterior que indicaban que `/assistant/[id]` debía volver a un sidebar acoplado. El resto del comportamiento aprobado para `/assistant/new` continúa vigente.

## Diagnóstico

### Parpadeo del historial

`DashboardShell` alterna actualmente entre `AssistantNewSidebar` y `Sidebar` según la ruta. Al pasar de `/assistant/new` a `/assistant/[id]`, React desmonta una implementación y monta la otra. `AssistantNav` inicia entonces con `conversations = []` y vuelve a consultar `/api/assistant/conversations`, por lo que muestra temporalmente `Sin conversaciones` aunque ya existan datos.

El sidebar flotante también desmonta internamente el `Sidebar` cuando se cierra. Cada reapertura pierde el snapshot anterior y repite la carga.

### Primer clic de nueva conversación

`Nueva conversación` depende solamente de `router.push("/assistant/new")`. El panel no reacciona de inmediato y, si la ruta ya es `/assistant/new` o existe una transición en curso, la interfaz puede parecer inmóvil. El usuario interpreta ese estado sin retroalimentación como un clic perdido y vuelve a pulsar.

## Enfoques considerados

### 1. Shell persistente del asistente — seleccionado

Mantener una sola instancia del sidebar para todas las rutas `/assistant`, conservarla montada aunque visualmente esté cerrada y cerrar el panel de forma inmediata cuando se activa una navegación.

Ventajas:

- El historial conserva su snapshot entre rutas y aperturas.
- Evita el remount que produce el parpadeo.
- La navegación responde visualmente en el primer clic.
- Reutiliza el `Sidebar` y sus capacidades existentes.

### 2. Caché global con paneles desmontables

Mover el historial a un contexto o store global y mantener el montaje condicional actual. Conserva los datos, pero añade estado compartido y no elimina todas las transiciones entre shells.

### 3. Recarga con skeletons

Mantener el flujo actual y sustituir el estado vacío por placeholders. Reduce el impacto visual, pero no elimina las consultas redundantes ni corrige la sensación de clic perdido.

## Arquitectura aprobada

### Shell flotante único

`DashboardShell` renderizará un único componente de sidebar flotante cuando `pathname` pertenezca a `/assistant`, `/assistant/new` o `/assistant/[id]`. El resto del CRM conservará el sidebar acoplado actual.

El shell del asistente:

- Inicia cerrado en cada carga de página.
- Se cierra al cambiar de ruta dentro del asistente.
- Mantiene el contenido del panel montado mientras está cerrado.
- Usa transformación y opacidad para ocultarlo sin reservar ancho.
- Aplica `inert`, `aria-hidden` y `pointer-events: none` cuando está cerrado.
- Conserva la trampa de foco, `role="dialog"`, `aria-modal`, backdrop y cierre con `Escape` en móvil.
- Devuelve el foco al disparador cuando el usuario lo cierra manualmente.

Mantener el panel montado permite que `AssistantNav` conserve sus conversaciones, estados de carga, menús y suscripciones entre aperturas y cambios de conversación.

### Estado y carga del historial

`AssistantNav` diferenciará explícitamente:

- `loading`: primera consulta sin snapshot previo.
- `ready`: lista cargada, incluida una lista legítimamente vacía.
- `refreshing`: consulta en segundo plano conservando el snapshot anterior.
- `error`: mantiene el último snapshot disponible y ofrece retroalimentación discreta.

Durante `refreshing` nunca se reemplazará la lista por un arreglo vacío. La primera carga usará skeletons con la misma altura de los elementos de historial en lugar del texto incorrecto `Sin conversaciones`.

Cada nueva consulta cancelará la anterior mediante `AbortController`; el controller y los listeners se limpiarán al desmontar.

### Navegación de conversaciones

Los destinos de conversaciones y `Nueva conversación` usarán navegación semántica de Next.js con precarga. Al activar cualquiera:

1. El panel flotante se cierra inmediatamente.
2. El control muestra estado presionado mediante CSS.
3. Next.js realiza la navegación precargada.
4. El historial visible se conserva mientras cualquier actualización ocurre en segundo plano.

Si `Nueva conversación` se activa estando ya en `/assistant/new`, el cierre inmediato del panel sigue dando retroalimentación al primer clic y la experiencia permanece en su estado de nueva conversación.

## Diseño visual seleccionado: A. Tarjetas suaves

### Lienzo

- Fondo del área del chat: `#EEF1F7`.
- Fuente scoped: `"Google Sans Flex Variable", "Google Sans Flex", sans-serif`.
- Contenido centrado con ancho máximo de 760 píxeles.
- Patrón de píxeles decorativo del diseño nuevo reutilizado con intensidad reducida en los bordes y sin interferir con la lectura.
- El fondo y las decoraciones quedan aislados a rutas del asistente.

### Mensajes

Mensajes del usuario:

- Alineados a la derecha.
- Fondo azul marino `#11315D`.
- Texto blanco con contraste suficiente.
- Radio asimétrico que indique dirección sin usar una cola ornamental.
- Ancho máximo responsive y saltos de línea seguros.

Respuestas del asistente:

- Alineadas a la izquierda.
- Tarjeta `rgba(255,255,255,0.94)` con borde `rgba(34,106,205,0.08)`.
- Sombra `0 16px 42px rgba(50,84,126,0.09)`, consistente con la iluminación del prompt nuevo.
- Tipografía azul oscuro y longitud de lectura limitada.
- Streaming representado por un caret discreto, respetando movimiento reducido.
- Markdown, tablas, código, imágenes y `ActionCard` continúan funcionando.

Los controles de metadatos —modelo, copiar, reintentar y pantalla completa— se mantendrán debajo de la respuesta con mejor contraste, foco visible y targets accesibles. No se eliminará funcionalidad existente.

### Compositor

El compositor de conversaciones existentes adoptará la misma familia visual de `/assistant/new`:

- Marco exterior translúcido azul con blur.
- Superficie interior blanca y radios suaves.
- Textarea autoajustable.
- Selector de modelo de IA.
- Botón de enviar con gradiente azul, halo y estados hover/focus.
- Durante streaming, el botón cambia a detener sin desplazar el layout.

El selector visible `K1/K2` se retirará del compositor para mantener el contrato visual aprobado de mostrar solo selector de modelo y enviar/detener. La preferencia de clave continuará administrada internamente por `ChatView`.

### Sidebar

- Disparador cerrado de 44 por 44 píxeles en la esquina superior izquierda.
- Panel de 256 píxeles, separado 12 píxeles de los bordes y con altura disponible completa.
- Fondo blanco translúcido, borde azul suave y sombra teñida.
- Animación de entrada y salida mediante `transform` y `opacity` durante 240 ms.
- `prefers-reduced-motion` elimina el desplazamiento y reduce la transición a un cambio directo de visibilidad.

## Responsive

### Escritorio y tablet

- El sidebar flota sobre el chat y no modifica el ancho del contenido.
- El compositor conserva el ancho máximo del nuevo diseño.
- Las tarjetas de respuesta permiten tablas y código con scroll horizontal local.

### Móvil desde 320 píxeles

- El sidebar usa backdrop y semántica modal.
- El panel mantiene 12 píxeles de margen seguro.
- Mensajes y compositor conservan al menos 16 píxeles de margen lateral.
- Los metadatos pueden envolver líneas sin crear overflow horizontal.
- El patrón decorativo se reduce o se oculta para mantener legibilidad.

## Accesibilidad

- Todos los iconos interactivos usan botones semánticos y etiquetas accesibles.
- Abrir, cerrar y navegar funcionan con teclado.
- El foco no entra al panel mientras está cerrado.
- En móvil abierto, Tab y Shift+Tab permanecen dentro del diálogo.
- Escape cierra el panel.
- Los enlaces de historial indican la conversación activa.
- Skeletons usan `aria-hidden`; la región del historial expone un estado de carga no intrusivo.
- Colores de mensajes, metadatos, focos y controles cumplen contraste suficiente.
- Se respeta `prefers-reduced-motion` en sidebar, caret y compositor.

## Manejo de errores

- Si falla la primera carga del historial, el panel muestra un mensaje breve con acción para reintentar.
- Si falla una actualización, conserva el snapshot anterior y no muestra un estado vacío falso.
- Una navegación no se bloquea por un refresh del historial.
- La lógica de streaming y el mensaje visible de error implementado para respuestas fallidas se mantienen.

## Pruebas

Se desarrollará con pruebas primero para cubrir:

1. Detección de todas las rutas que usan el shell flotante.
2. Estado cerrado inicial y cierre al navegar.
3. El panel permanece montado pero inerte cuando está cerrado.
4. La lista conserva el snapshot durante `refreshing`.
5. La primera carga diferencia `loading` de una lista vacía real.
6. `Nueva conversación` cierra el panel aun si el destino ya es `/assistant/new`.
7. Los chats conservan selector de modelo y enviar/detener sin mostrar `K1/K2`.
8. Las respuestas mantienen Markdown, acciones, copia, reintento y pantalla completa.

Validación final:

- Pruebas focalizadas en rojo y luego en verde.
- ESLint focalizado sobre archivos modificados.
- `npx tsc --noEmit`.
- `npm run build` y presencia de `/assistant/new` y `/assistant/[id]`.
- `npm run lint`, comparando con el baseline preexistente.
- QA responsive a 320, 768 y 1440 píxeles.
- QA de teclado, movimiento reducido, primera apertura, reapertura, cambio de conversación y nueva conversación con un solo clic.

## Criterios de aceptación

1. Todas las rutas del asistente usan sidebar flotante cerrado inicialmente.
2. El sidebar puede abrirse y cerrarse sin desplazar el contenido.
3. El historial no desaparece durante reaperturas, navegación o refresh en segundo plano.
4. La primera carga usa skeletons y no muestra un estado vacío falso.
5. `Nueva conversación` responde al primer clic, cierra el panel y navega cuando corresponde.
6. Los chats con mensajes usan el diseño `A. Tarjetas suaves` aprobado.
7. El compositor existente coincide visualmente con `/assistant/new` y solo muestra selector de modelo más enviar/detener.
8. Toda la funcionalidad de mensajes y acciones CRM existente se conserva.
9. Las rutas ajenas al asistente mantienen su sidebar acoplado y su diseño actual.
10. TypeScript y el build de producción finalizan correctamente sin nuevas infracciones de lint.
