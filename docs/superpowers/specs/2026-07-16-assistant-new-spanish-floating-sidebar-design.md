# `/assistant/new` en español con sidebar flotante

## Objetivo

Simplificar la experiencia visual exclusiva de `/assistant/new`, traducir toda su interfaz al español y dar prioridad al prompt. En esta ruta, el sidebar del CRM dejará de ocupar espacio permanente: iniciará como una pestaña flotante mínima y podrá desplegarse u ocultarse sin mover el contenido.

## Alcance

Los cambios se limitan a la presentación de `/assistant/new` y al modo en que `DashboardShell` aloja el sidebar en esa ruta. Las conversaciones existentes, las demás páginas del CRM, la autenticación, las APIs, Prisma, NextAuth y la navegación normal conservarán su comportamiento actual.

## Texto en español

La experiencia mostrará:

- Título: `Encontremos las referencias adecuadas para tu trabajo`.
- Subtítulo: `¿Qué tipo de referencias estás buscando?`.
- Etiqueta accesible del prompt: `Describe las referencias que estás buscando`.
- Ayuda accesible: `Presiona Enter para enviar o Shift + Enter para una nueva línea.`.
- Ejemplos animados:
  1. `Crea el diseño de un dashboard financiero`
  2. `Diseña una identidad de marca con la letra M`
  3. `Crea un efecto de cristal líquido`
  4. `Diseña una animación de carga`
  5. `Crea una landing page para SaaS`
- Texto legal: `Al enviar un mensaje a ChatBot, aceptas nuestros Términos y confirmas que leíste nuestra Política de privacidad.`.
- Etiquetas accesibles de las tres tarjetas decorativas en español.

Los nombres propios de modelos de IA y las etiquetas que provienen de la configuración del CRM no se traducirán.

## Composer simplificado

El composer conservará únicamente:

1. El selector de modelo de IA existente.
2. El botón animado de enviar.

Se eliminarán de la interfaz del composer:

- El selector visible de clave `K1/K2`.
- Los botones de imagen y capas.
- El separador.
- El botón para agregar.
- La etiqueta `UI Design`.

La preferencia de clave continuará administrada internamente por `ChatView`; solo se retirará su control visual de esta experiencia. La selección de modelo, creación de conversación, envío, streaming y actualización de URL conservarán la lógica actual.

Las tarjetas flotantes no ejecutan acciones, por lo que pasarán de elementos `button` a elementos decorativos no interactivos. Mantendrán sus animaciones de entrada y flotación, pero se eliminarán el estado de hover, la pausa colectiva, el cursor de acción y los handlers asociados.

## Sidebar flotante

### Estado cerrado

- Aplica únicamente cuando `pathname === "/assistant/new"`.
- Es el estado inicial cada vez que se entra a la ruta.
- El sidebar completo no ocupa ancho dentro del layout.
- Se muestra una pestaña flotante de 44 por 44 píxeles en el borde izquierdo, con icono de menú y etiqueta accesible `Mostrar barra lateral`.
- La pestaña mantiene contraste, foco visible y un área táctil mínima de 44 píxeles.

### Estado abierto

- El sidebar existente se renderiza dentro de un contenedor flotante de 256 píxeles de ancho.
- El panel queda separado 12 píxeles de los bordes superior, inferior e izquierdo.
- Usa esquinas redondeadas, borde suave y sombra para distinguirse del fondo, sin cambiar los estilos internos del sidebar.
- El panel no desplaza ni redimensiona el contenido de `/assistant/new`.
- Un botón en la esquina superior exterior permite ocultarlo y usa la etiqueta accesible `Ocultar barra lateral`.
- `Escape` cierra el panel y devuelve el foco a la pestaña de apertura.

### Escritorio y móvil

- En escritorio y tablet el panel flota sobre la experiencia sin backdrop.
- En pantallas menores a 640 píxeles se agrega un backdrop tenue detrás del panel.
- En móvil, tocar el backdrop cierra el panel.
- El panel conserva un margen seguro y un ancho máximo de `calc(100vw - 24px)`.
- La experiencia sigue soportando 320 píxeles de ancho sin desbordamiento horizontal.

### Otras rutas

- `/assistant`, `/assistant/[id]` y el resto del CRM mantienen el sidebar acoplado actual.
- Cuando el primer mensaje cambia la URL de `/assistant/new` a `/assistant/[id]`, `DashboardShell` vuelve automáticamente al modo normal de esa ruta.
- No se persiste el estado abierto entre navegaciones ni en almacenamiento local.

## Arquitectura

`DashboardShell` detectará la ruta exacta y delegará el modo flotante a un componente cliente enfocado, `AssistantNewSidebar`. Este componente será responsable exclusivamente del estado abierto/cerrado, los controles de accesibilidad, el backdrop móvil y el posicionamiento del `Sidebar` existente.

`Sidebar` aceptará una opción visual limitada para adaptar su altura, bordes y radios cuando viva dentro del contenedor flotante. Su navegación, datos, notificaciones y menús no se duplicarán.

`AssistantNewExperience` se limitará a los textos en español, la simplificación del composer y la conversión de tarjetas a decoración. No asumirá responsabilidades del shell ni del sidebar.

## Accesibilidad

- Los controles de abrir y cerrar serán elementos `button` con `aria-label` y `aria-expanded`.
- El botón de apertura recibirá nuevamente el foco al cerrar con `Escape` o con el botón de cierre.
- El backdrop móvil no será el único mecanismo de cierre.
- El panel flotante tendrá un nombre accesible mediante `aria-label="Barra lateral principal"`.
- Se conservarán los estilos de foco visibles del selector de modelo, prompt y botón de enviar.
- Las tarjetas decorativas quedarán fuera del orden de tabulación.
- `prefers-reduced-motion` reducirá las transiciones del panel junto con las reglas existentes de la experiencia.

## Pruebas y validación

- Añadir pruebas unitarias para la detección del modo de sidebar por ruta y para el contrato del toolbar simplificado cuando sea viable con las herramientas existentes.
- Ejecutar primero las pruebas en rojo y después en verde.
- Ejecutar el test existente de matemáticas de `PixelGrid`.
- Ejecutar ESLint focalizado sobre todos los archivos creados o modificados.
- Ejecutar `npx tsc --noEmit`.
- Ejecutar `npm run build` y confirmar que `/assistant/new`, `/assistant` y `/assistant/[id]` estén presentes.
- Ejecutar `npm run lint` y comparar cualquier resultado con el baseline conocido del repositorio.
- Verificar a 320, 768 y 1440 píxeles que el sidebar cerrado no reserve espacio, que el panel abierto no mueva el contenido y que el composer solo muestre el selector de modelo y el botón de enviar.
- Verificar navegación con teclado, cierre con `Escape`, foco restaurado y movimiento reducido.

## Criterios de aceptación

1. Toda la copia propia de la experiencia `/assistant/new` está en español.
2. El composer visible contiene únicamente el selector de modelo y el botón de enviar.
3. El sidebar inicia como pestaña flotante en `/assistant/new` y puede abrirse y cerrarse.
4. El sidebar flotante no altera el ancho ni la posición del contenido principal.
5. En móvil, el panel puede cerrarse mediante backdrop, botón y teclado.
6. Las conversaciones existentes y todas las demás rutas conservan el sidebar normal.
7. La creación y el envío de conversaciones continúan funcionando con la lógica existente.
8. TypeScript y el build de producción finalizan correctamente y no se introducen nuevas infracciones de lint.
