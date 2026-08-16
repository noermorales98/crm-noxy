# Sistema de temas personales del CRM

## Objetivo

Permitir que cada usuario autenticado seleccione una paleta clara desde Configuración y que esa preferencia se aplique de forma inmediata y consistente a toda la interfaz privada del CRM. La selección se sincronizará entre dispositivos sin modificar datos de negocio, colores semánticos, integraciones, gráficas, documentos exportados ni formularios públicos.

## Alcance

El sistema cubrirá el shell autenticado, navegación, dashboard, asistente, configuración, tablas, formularios internos, modales, paneles y estados interactivos que ya consumen tokens semánticos. Los formularios públicos, páginas de agenda, cotizaciones públicas, documentos compartidos y temas editoriales conservarán la identidad Noxy canónica para que una preferencia personal no altere la experiencia de clientes externos.

La primera versión incluirá diez temas claros predefinidos. No incluirá modo oscuro, edición libre de colores, temas por organización ni personalización independiente por sección.

## Alternativas consideradas

### Registro de tokens semánticos — elegido

Cada tema define los mismos roles (`surface-app`, `surface-sidebar`, `surface-elevated`, `text-primary`, `text-secondary`, `nav-active`, `nav-hover`, `border-subtle`, `action-primary`, `action-primary-foreground`, `action-secondary`, `focus` y `highlight`). El tema activo se representa mediante `data-crm-theme` en la raíz privada del CRM. Los componentes siguen usando sus clases semánticas existentes.

Esta opción ofrece propagación global, cambios instantáneos, contraste verificable y un único lugar para mantener el catálogo.

### Mapas de clases Tailwind por componente — descartado

Cambiar clases en cada componente permitiría ajustes locales, pero duplicaría lógica, dificultaría asegurar cobertura global y haría costoso añadir nuevos temas.

### Constructor libre de colores — descartado

Un selector de colores arbitrarios ofrecería más flexibilidad, pero permitiría combinaciones con contraste deficiente y convertiría el mantenimiento en un problema de validación y soporte innecesario para esta versión.

## Catálogo inicial

Todos los temas usan colores oficiales del manual Noxy o mezclas claras derivadas de ellos para superficies y estados suaves.

1. **Noxy Índigo**: identidad actual; acción `#3545D6`, fondo `#F5F6FB`, lateral `#EBEDFA`.
2. **Obsidiana**: acción `#0B0B18`, fondo blanco, lateral `#F5F6FB` y selección Lavanda.
3. **Discord**: acción `#5363EE`, superficies Jazmín y selección Azul Recuerdo suavizada.
4. **Recuerdo**: acción `#7F96F9` con texto Obsidiana, fondo blanco y lateral Lavanda.
5. **Lima**: acción `#C8FE37` con texto Obsidiana, fondo Jazmín y selecciones Lima suavizadas.
6. **Lavanda**: fondo `#EBEDFA`, superficies blancas y acción Índigo.
7. **Jazmín**: fondo `#F5F6FB`, lateral blanco, acción Discord y divisores Lavanda.
8. **Plata**: superficies blancas, laterales derivados de Plata y acción accesible `#555B6E`.
9. **Índigo suave**: acción Índigo, selección Azul Recuerdo y superficies con menos contraste cromático.
10. **Noxy monocromo**: blanco, Jazmín, grises accesibles y acción Obsidiana.

Los temas Recuerdo y Lima necesitan `action-primary-foreground: #0B0B18`; los demás usarán blanco cuando el contraste lo permita. El catálogo incluirá etiquetas, descripción breve y muestras de color para Configuración.

## Arquitectura

### Registro de temas

`src/lib/crm-themes.ts` será la fuente única de verdad. Exportará:

- el tipo estable `CrmThemeId`;
- el tema por defecto `noxy-indigo`;
- metadatos y muestras visuales de cada tema;
- una función de validación para valores externos;
- una función de resolución que devuelva el tema por defecto ante valores desconocidos.

La hoja global declarará las variables base y un bloque por selector `[data-crm-theme="..."]`. Las clases Tailwind semánticas existentes continuarán resolviendo a variables CSS, por lo que el cambio no requerirá variantes condicionales en cada página.

### Proveedor de tema

`ThemeProvider` envolverá únicamente el shell autenticado. Sus responsabilidades serán:

- aplicar el tema seleccionado a la raíz privada;
- exponer tema activo, catálogo, estado de sincronización y función de selección;
- usar una copia local para respuesta inmediata y reducir el parpadeo inicial;
- reconciliar esa copia con la preferencia de la cuenta al iniciar sesión;
- volver al tema Noxy Índigo si el valor almacenado ya no existe;
- restaurar el valor anterior y mostrar un error accesible si falla el guardado.

La clave local incluirá el identificador del usuario para evitar que dos cuentas del mismo navegador compartan accidentalmente la preferencia.

### Persistencia

El modelo `User` recibirá un campo `crmTheme` con valor por defecto `noxy-indigo`. El cambio aditivo se aplicará mediante `npm run db:push`, la convención del proyecto para el MySQL alojado que no permite una base sombra de `prisma migrate dev`. Antes de aplicarlo se inspeccionará el diff SQL para confirmar que la única operación sea añadir esa columna con su valor por defecto.

Un endpoint dedicado `/api/settings/theme` ofrecerá:

- `GET`: devuelve el tema validado del usuario autenticado;
- `PATCH`: acepta únicamente un identificador del catálogo y rechaza valores desconocidos con `400`;
- respuestas `401` para sesiones ausentes;
- actualización exclusiva del usuario de la sesión.

El endpoint separado evita que cambiar la apariencia escriba configuraciones de teléfono, calendario o credenciales de CallMeBot.

## Experiencia en Configuración

La página incorporará al inicio una sección **Apariencia**. En escritorio mostrará una cuadrícula de dos columnas; en móvil, una columna. Cada opción será un botón real con:

- nombre y descripción;
- miniatura de fondo, lateral y acción primaria;
- cuatro muestras de color;
- estado seleccionado visible sin depender únicamente del color;
- foco claro, `aria-pressed` y área táctil mínima de 44 px.

La selección se aplicará inmediatamente. Un estado textual con `role="status"` comunicará “Guardando”, “Tema guardado” o el error correspondiente. No habrá un segundo botón de confirmación porque la previsualización directa y el guardado automático reducen pasos.

## Compatibilidad visual

El sistema cambiará únicamente roles de marca y superficie. Permanecerán intactos:

- colores de éxito, advertencia, error e información;
- colores de Google, Stripe y otras integraciones;
- colores de categorías, citas, calendarios y gráficas;
- temas de documentos, PDF y contenido exportado;
- estilos canónicos del constructor y formulario público.

Los botones primarios migrarán de texto blanco fijo a `action-primary-foreground` para que Recuerdo y Lima cumplan contraste. Los usos de blanco que formen parte de superficies o elementos no asociados a una acción primaria se conservarán.

## Estados y errores

- Mientras se obtiene la preferencia remota, se utilizará la copia local o Noxy Índigo.
- Un identificador inválido en base de datos o almacenamiento local resolverá a Noxy Índigo.
- Si falla el guardado, la UI regresará al tema previamente confirmado y anunciará el error.
- Cambios rápidos consecutivos ignorarán respuestas obsoletas y conservarán la última selección.
- La interfaz seguirá siendo utilizable si `localStorage` no está disponible.

## Accesibilidad

Cada pareja de texto/fondo y acción/foreground se comprobará contra WCAG AA. La selección tendrá indicador textual e iconográfico. El foco usará el token del tema con separación suficiente. El cambio de paleta no añadirá movimiento; `prefers-reduced-motion` continuará vigente y `/form/:id` seguirá completamente estático.

## Pruebas y validación

La implementación seguirá TDD y añadirá pruebas para:

- catálogo completo, identificadores únicos y fallback;
- presencia de diez temas claros y del tema Obsidiana requerido;
- contraste AA de texto, superficies y botones primarios;
- validación del endpoint y aislamiento por usuario;
- aplicación, persistencia local y rollback del proveedor;
- contrato de tokens CSS y foreground dinámico de botones;
- exclusión de rutas públicas del tema personal.

La verificación final incluirá la suite existente, lint de archivos modificados, build de producción y revisión visual del dashboard, Configuración, asistente y un formulario interno a 390, 768 y 1440 px. También se comprobarán teclado, foco, estados de guardado, ausencia de desbordamiento y contraste automatizado. El diff de esquema y la aplicación mediante `db:push` quedarán registrados en la validación.

## Migración y compatibilidad

Los usuarios actuales recibirán `noxy-indigo` por defecto. No se modificarán APIs de negocio ni datos guardados. El valor será un identificador estable, no un objeto de colores, lo que permite ajustar tokens internamente sin migrar cada cuenta.
