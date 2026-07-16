# Assistant New Visual Experience - Design Spec

**Fecha:** 2026-07-16

**Estado:** Aprobado

**Alcance de ruta:** Solo `/assistant/new`

## Resumen

Reemplazar el estado vacío actual de `/assistant/new` por una experiencia visual de pantalla completa dentro del área de contenido disponible del CRM. La experiencia recrea el brief de referencias con fondo azul grisáceo, composición de carpetas y tarjetas flotantes, dos grids de píxeles en canvas, un prompt funcional y microinteracciones con movimiento reducido accesible.

El cambio no crea `/references`, no modifica el comportamiento de `/assistant`, no altera conversaciones existentes en `/assistant/[id]` y no cambia autenticación, Prisma, APIs, navegación global ni integraciones.

## Decisión de integración

La experiencia se integra como variante explícita del estado vacío de `ChatView`.

- `app/assistant/new/page.tsx` seguirá siendo un Server Component con las validaciones de sesión y organización actuales.
- La página pasará una variante de estado vacío a `ChatView`.
- `ChatView` mantendrá toda la lógica actual de creación de conversación, selección de modelo, selección de key, streaming, reintentos e historial.
- Cuando no haya mensajes y la variante nueva esté activa, `ChatView` renderizará `AssistantNewExperience` en lugar del estado vacío y del `ChatInput` actuales.
- El prompt nuevo llamará al mismo `sendMessage` existente.
- Al enviar, `ChatView` añadirá los mensajes optimistas, creará la conversación mediante `/api/assistant/conversations`, actualizará la URL a `/assistant/[id]` y volverá automáticamente a la interfaz de conversación existente.
- Las rutas con mensajes seguirán usando `MessageBubble` y `ChatInput` sin cambios visuales.

Este enfoque evita duplicar estado, timers de streaming, manejo de errores y llamadas a la API.

## Diseño visual

### Contenedor

La experiencia ocupará el alto y ancho disponibles a la derecha del sidebar global. Usará `min-height: 100dvh` con una compensación segura para el shell que ya limita el contenido a la ventana. El fondo será `#EEF1F7`, la tipografía será Google Sans Flex y el overflow se controlará solo dentro del módulo CSS.

El sidebar global del CRM permanecerá visible. No se renderizarán el navbar de marca ni el sidebar flotante del brief porque duplicarían navegación ya existente.

### Orden de capas

1. Dos `PixelGrid` decorativos en canvas, anclados a izquierda y derecha.
2. Columna central con composición de carpetas, tarjetas, título, subtítulo y prompt.
3. Footer legal dentro de la experiencia.

La columna central conservará las medidas de escritorio del brief y se adaptará a 768px y 320px mediante media queries locales.

### Composición de carpetas y tarjetas

Todos los assets remotos usarán la constante `A = "https://qclay.design/lovable/sixsense"`. Los diez SVG se renderizarán dentro de un wrapper de `113.67px × 220px` en este orden de apilado:

| Capa | Asset | Posición | Tamaño | Entrada |
| --- | --- | --- | --- | --- |
| 1 | `blue-light-2.svg` | bottom 50, left 54.6, centrada en X | 104 × 170 | fade 0.8s, delay 1s |
| 2 | `blue-light.svg` | bottom 28, left 54.6, centrada en X | 104 × 170 | fade 0.8s, delay 1s |
| 3 | `light-1.svg` | bottom 35, left 57.2, centrada en X | 180.5 × 124.5 | fade 1s, delay 1s |
| 4 | `folder-3.svg` | bottom 60, left 23.4 | 69.71 × 45 | rise 0.6s, delay 0.8s |
| 5 | `small-light-2.svg` | bottom 55, left 67.6, centrada en X | 39 × 17 | fade 0.6s, delay 1.4s |
| 6 | `small-light.svg` | bottom 50, left 44.2, centrada en X | 39 × 25 | fade 0.6s, delay 1.4s |
| 7 | `folder-2.svg` | bottom 45, left 18.98 | 79 × 51 | rise 0.6s, delay 0.6s |
| 8 | `light-2.svg` | bottom 20, left 57.2, centrada en X | 109 × 162.5 | fade 1s, delay 1.1s |
| 9 | `folder-1.svg` | bottom 30, left 13 | 91 × 58 | rise 0.6s, delay 0.4s |
| 10 | `folder-0.svg?v=2` | bottom 0, left 0 | 113.67 × 76.5 | rise 0.6s, delay 0s |

Las entradas `rise` usarán `translateY(30px)` a `0` y `cubic-bezier(0.22, 1, 0.36, 1)`. Los fades usarán `ease-out`. Se usarán elementos `img` nativos con dimensiones reservadas para evitar layout shift.

Las tres tarjetas PNG empezarán sobre la carpeta, crecerán hacia sus posiciones finales y después usarán animaciones de flotación independientes. React solo guardará la tarjeta actualmente enfocada por hover o teclado. Al activar una tarjeta se pausarán las tres animaciones y la tarjeta activa escalará a `1.08`.

| Tarjeta | Asset | Inicio | Final | Rotación | Delay |
| --- | --- | --- | --- | --- | --- |
| 1 | `image-1.png` | 20 × 20, x -5, bottom 7 | 88.55 × 68.46, x -82, bottom 123 | -16deg | 0.6s |
| 2 | `image-2.png` | 20 × 20, x 35, bottom 33 | 105 × 87, x 68, bottom 124 | 24deg | 0.85s |
| 3 | `image-3.png` | 20 × 20, x -4, bottom 27 | 105 × 96, x -4, bottom 148 | -4deg | 1.1s |

La entrada de tarjetas durará 1.4s con `cubic-bezier(0.16, 1, 0.3, 1)`. Los ciclos de flotación durarán 6s, 7s y 8s respectivamente, con los desplazamientos verticales y variaciones de rotación especificados por el usuario.

Con movimiento reducido, todas las capas y tarjetas aparecerán directamente en su estado final.

### Prompt funcional

El prompt conservará la apariencia exacta del brief, pero será un control real:

- Se usará un `textarea` accesible de una línea, ampliable hasta un límite razonable.
- El texto animado funcionará como placeholder visual solo mientras el campo esté vacío y sin foco.
- Al escribir, el placeholder y el caret animado desaparecerán.
- `Enter` enviará y `Shift+Enter` insertará una línea nueva.
- El botón de envío estará deshabilitado si el texto está vacío.
- El pill de modelo abrirá el selector de modelos existente con styling adaptado al prompt.
- El selector de key existente seguirá disponible de forma compacta para modelos OpenRouter.
- Los botones de imagen, capa, añadir y tag serán controles accesibles sin integración de archivos, porque el brief no define una acción de producto para ellos. No dispararán llamadas ni modificarán datos.
- En pantallas estrechas se ocultarán primero los controles decorativos, manteniendo campo, modelo y envío visibles.

El placeholder animado recorrerá en orden:

1. `Create a finance dashboard design`
2. `Branding with M letter`
3. `Liquid glass effect`
4. `Loader animation`
5. `SaaS landing page`

Escribirá cada carácter cada `22ms + random(0..25ms)`, pausará 1400ms y borrará cada carácter cada 14ms. Mantendrá un solo timeout y un caret de 2 × 18px con blink de 1s. El wrapper medirá 702px como máximo, con padding de 4px y radio de 24px; la tarjeta interior medirá 116px de alto con radio de 20px.

### Botón de envío

El botón usará el halo, cuadrado azul, puntos, aro cónico, brillo y swap de flecha especificados. Un único loop de `requestAnimationFrame` actualizará la rotación del aro mediante una variable CSS. El loop arrancará en hover o foco, reducirá gradualmente su velocidad al salir y se cancelará al desmontar.

El brillo se reproducirá una vez por cada entrada de hover o foco. La flecha entrante permanecerá visible al terminar la interacción. Con movimiento reducido no habrá rotación, brillo ni swap animado.

### Footer legal

No existen rutas legales en el repositorio. Los enlaces usarán `#terms` y `#privacy` como destinos seguros dentro de la página, con un comentario de código conciso que indique reemplazarlos cuando existan rutas legales reales.

El texto visible será: `By sending a message to ChatBot, you agree to our Terms and have read our Privacy Policy.`

## PixelGrid

Cada lado tendrá un canvas de 12 columnas por 16 filas, tiles de 32px y gap de 1px.

### Assets locales

Los seis assets requeridos no existían durante la inspección:

- `public/tiles/tile-empty.svg`
- `public/tiles/tile-1.svg`
- `public/tiles/tile-2.svg`
- `public/tiles/tile-3.svg`
- `public/tiles/tile-4.svg`
- `public/tiles/tile-5.svg`

Con aprobación del usuario, se crearán como sprites originales de 32x32px en una familia azul coherente con `#EEF1F7` y `#3D82DE`. No se sustituirán por imágenes ajenas.

### Carga y render

- Las seis imágenes se cargarán una sola vez mediante una caché Promise a nivel de módulo.
- Cada SVG se rasterizará a un canvas offscreen.
- El canvas visible usará `devicePixelRatio` limitado a 2.
- El estado mutable de celdas, reveal, hover y timers vivirá en refs o cierres, no en estado React.
- La base estable usará fill ratio `0.35` y un orden Fisher-Yates creado después del mount.
- El reveal procesará `ceil(192 / 18)` celdas por frame.
- El flicker ambiental cambiará tres celdas no hover entre 120 y 300ms.
- El pointer global se procesará como máximo una vez por frame.
- La región orgánica seguirá las fórmulas de radio y edge noise del brief, con fill ratio hover `0.7`.
- El hover flicker rerandomizará aproximadamente 18% de las celdas entre 70 y 160ms.
- Pointer listener, frames y timeouts se eliminarán al desmontar.
- Con movimiento reducido se pintará inmediatamente el estado base estable, sin reveal ni flicker.

La semilla visual se inicializará solo en cliente para evitar diferencias de hidratación.

El radio usará exactamente:

```text
sin(angle * 3 + time * 0.0011) * 0.55
+ sin(angle * 5 - time * 0.0017 + 1.3) * 0.30
+ sin(angle * 2 + time * 0.0007 + 2.1) * 0.20
```

El resultado se multiplicará por `0.95 + noise * 0.30`. Las celdas dentro de `rMax - 0.5` estarán activas y la franja hasta `rMax + 0.4` usará `(sin(x * 12.9898 + y * 78.233 + time * 0.002) + 1) * 0.5 > 0.45`.

## Componentes y archivos

### Archivos de aplicación

- `app/assistant/new/page.tsx`: activar la variante de estado vacío nueva sin convertir la página en Client Component.
- `app/assistant/[id]/_components/ChatView.tsx`: aceptar la variante y delegar el estado vacío al componente nuevo, reutilizando `sendMessage` y preferencias existentes.
- `app/assistant/new/_components/AssistantNewExperience.tsx`: estructura interactiva de la experiencia y coordinación del prompt.
- `app/assistant/new/_components/PixelGrid.tsx`: canvas, caché de sprites, reveal, pointer blob y limpieza.
- `app/assistant/new/_components/AnimatedSendButton.tsx`: aro, brillo, flechas y loop de velocidad.
- `app/assistant/new/assistant-new.module.css`: layout, capas, responsive, focus, keyframes y reduced motion.

### Assets

- `public/tiles/tile-empty.svg`
- `public/tiles/tile-1.svg`
- `public/tiles/tile-2.svg`
- `public/tiles/tile-3.svg`
- `public/tiles/tile-4.svg`
- `public/tiles/tile-5.svg`

No se modificarán `app/globals.css`, `app/layout.tsx`, `next.config.ts`, Prisma, NextAuth, APIs, variables de entorno ni dependencias.

## Estado y limpieza

- React state se limitará al valor del prompt, tarjeta activa, foco del prompt, contador de brillo y estado del selector existente.
- Pointer coordinates, velocidad angular, ángulo, celdas base, hover set, sprite cache, frame IDs y timeout IDs no producirán rerenders continuos.
- Cada `useEffect` que registre listeners, frames o timers tendrá una limpieza completa.
- El typewriter mantendrá un único timeout activo.
- Cada `PixelGrid` mantendrá un reveal frame, un pointer frame y como máximo dos timers de flicker.
- `AnimatedSendButton` mantendrá como máximo un frame activo.

## Accesibilidad

- Todos los controles serán botones o campos semánticos.
- Los botones de icono tendrán `aria-label`.
- El textarea tendrá label accesible aunque la etiqueta no altere la composición visual.
- Hover y focus producirán estados equivalentes.
- Se añadirán focus rings visibles con contraste sobre fondos claros.
- Imágenes decorativas usarán `alt=""`; las tarjetas usarán descripciones breves.
- El prompt funcionará sin hover y con teclado.
- `prefers-reduced-motion: reduce` desactivará entradas, flotación, reveal, flicker, typewriter, brillo, aro y swap de flecha.

## Responsive

### Escritorio, 1440px

- Prompt de 702px.
- Composición de carpeta a escala 1.
- Dos PixelGrid visibles.
- Footer absoluto si la altura permite que no se solape.

### Tablet, 768px

- Prompt limitado a 32px de margen total.
- Composición centrada y reducida solo cuando sea necesario.
- Ambos grids permanecen con menor opacidad si no interfieren con el contenido.

### Móvil, 320px

- Padding lateral mínimo de 16px.
- Título de 28px.
- Composición de tarjetas escalada proporcionalmente.
- Grid derecho oculto para reducir ruido.
- Controles secundarios del toolbar ocultos o compactados.
- Contenido con scroll vertical cuando la altura disponible sea insuficiente.
- Footer en flujo normal en alturas limitadas para evitar solaparse con el prompt.

## Errores y degradación

- Si un asset remoto falla, el espacio reservado se mantiene y el prompt sigue siendo usable.
- Si los sprites locales no cargan, el canvas se limpia y se omite sin bloquear el resto de la experiencia.
- Si falla la creación de conversación o el endpoint de chat, se conserva el comportamiento actual de `ChatView`; no se introducirán nuevas escrituras ni nuevas notificaciones.
- Navegadores sin soporte de máscara mostrarán el borde estático de fallback del botón.
- Navegadores sin backdrop filter usarán fondos sólidos suficientemente opacos.

## Validación

No existe un runner de tests automatizados configurado en el repositorio. La validación usará las herramientas existentes y pruebas de navegador dirigidas:

1. Ejecutar `npm run lint`.
2. Ejecutar `npm run build`.
3. Verificar `/assistant/new` autenticado a 320px, 768px y 1440px.
4. Enviar un mensaje y confirmar creación de conversación, cambio a `/assistant/[id]` y streaming normal.
5. Abrir una conversación existente y confirmar que conserva la UI anterior.
6. Confirmar que `/assistant` conserva su redirect actual.
7. Activar reduced motion y confirmar un estado estático usable.
8. Navegar solo con teclado y comprobar foco, textarea, modelo y envío.
9. Montar y desmontar repetidamente la ruta mientras se inspeccionan listeners, timers y frames.
10. Revisar el resto de rutas mediante build y smoke checks del shell.

## Criterios de aceptación

- La nueva composición aparece exclusivamente en el estado vacío de `/assistant/new`.
- Enviar desde el prompt usa la infraestructura real de Assistant.
- Conversaciones existentes no cambian de apariencia ni comportamiento.
- Los seis tiles locales existen y se usan en ambos canvas.
- La página se adapta a 320px, 768px y 1440px sin overflow horizontal.
- Reduced motion elimina el movimiento continuo y conserva toda la funcionalidad.
- No quedan listeners, timeouts ni animation frames activos después del unmount.
- Lint y build terminan con exit code 0.
