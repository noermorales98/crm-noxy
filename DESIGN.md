---
name: Noxy CRM
description: Sistema operativo preciso, confiable y ágil para la gestión diaria de Noxy Digital.
colors:
  action-primary: "#3545D6"
  action-secondary: "#5363EE"
  selection-soft: "#7F96F9"
  highlight-lime: "#C8FE37"
  ink-obsidian: "#0B0B18"
  surface-app: "#F5F6FB"
  surface-panel: "#EBEDFA"
  surface-elevated: "#FFFFFF"
  text-secondary: "#6B7184"
  text-secondary-strong: "#555B6E"
  border-subtle: "#DCDFE6"
  placeholder: "#555B6E"
typography:
  headline:
    fontFamily: "Open Sauce Two, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Open Sauce Two, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Open Sauce Two, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Open Sauce Two, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  control: "10px"
  surface: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-primary}"
    textColor: "{colors.surface-elevated}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.ink-obsidian}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-obsidian}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-obsidian}"
    rounded: "{rounded.surface}"
    padding: "20px"
  navigation-active:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.action-primary}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  chip-highlight:
    backgroundColor: "{colors.highlight-lime}"
    textColor: "{colors.ink-obsidian}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
---

# Design System: Noxy CRM

## Overview

**Creative North Star: "El Centro de Operaciones Noxy"**

La interfaz funciona como un centro de operaciones luminoso y preciso: la información domina, los controles se reconocen sin aprendizaje y la identidad Noxy aparece en los lugares que orientan una decisión. La composición es restringida, plana por defecto y densa cuando el trabajo lo exige, con ritmo suficiente para escanear sin fatiga.

El sistema rechaza explícitamente los clones de Notion, las plantillas SaaS genéricas, el glassmorphism, las tarjetas repetidas y el movimiento decorativo. La personalidad surge de Open Sauce Two, la relación entre Jazmín, Lavanda y Obsidiana, y el uso escaso de Índigo, Azul Recuerdo y Lima.

**Key Characteristics:**

- Jerarquía clara y densidad operativa.
- Una sola gramática de componentes.
- Acentos saturados limitados a acciones y selección.
- Bordes y capas tonales antes que sombras.
- Respuesta inmediata, accesible y predecible.

## Colors

La paleta Noxy combina un núcleo frío y luminoso con Obsidiana para estructura y Lima para énfasis excepcional.

### Primary

- **Confianza Índigo:** acción principal, foco visible, selección fuerte y enlaces críticos.
- **Púrpura Discord:** acción secundaria y acentos interactivos que requieren menor prioridad.
- **Azul Recuerdo:** fondos seleccionados y señales suaves, siempre con texto Obsidiana.

### Secondary

- **Grafiti Lima:** resaltados puntuales, badges importantes y confirmaciones de marca con texto Obsidiana. Nunca se usa como texto ni con blanco.

### Neutral

- **Obsidiana Negra:** texto, iconos y controles de máxima prioridad.
- **Blanco Jazmín:** fondo principal de la aplicación.
- **Lavanda Relajación:** sidebar, toolbars y agrupaciones secundarias.
- **Blanco elevado:** contenido que necesita separación real del fondo.
- **Ansiedad Gris:** texto secundario solo sobre blanco o Jazmín.
- **Gris accesible:** texto secundario y placeholder sobre superficies tintadas.
- **Borde Plata:** divisores y contornos derivados de Plata Apple para mantener contraste sin ruido.

**The Restricted Accent Rule.** Los colores saturados ocupan como máximo aproximadamente el 10% de una pantalla operativa. La rareza del acento conserva su significado.

**The Contrast Pair Rule.** Índigo y Discord aceptan texto blanco; Azul Recuerdo y Lima siempre utilizan Obsidiana.

## Typography

**Display Font:** Open Sauce Two (with system-ui fallback)  
**Body Font:** Open Sauce Two (with system-ui fallback)  
**Label/Mono Font:** Open Sauce Two para etiquetas; monospace del sistema únicamente para código y valores técnicos.

**Character:** Una sola sans humanista mantiene continuidad entre datos, controles y comunicación pública. Los pesos crean jerarquía sin introducir una segunda voz.

### Hierarchy

- **Headline** (600, 24px, 1.25): títulos principales de página; espaciado mínimo de -0.02em.
- **Title** (600, 16px, 1.4): encabezados de panel, sección y modal.
- **Body** (400, 14px, 1.5): interfaz y contenido; el texto corrido se limita a 65–75ch.
- **Control** (500, 14px, 1.4): botones, campos y navegación.
- **Label** (600, 12px, 1.4): etiquetas y metadatos; mayúsculas solo cuando el significado lo exige.

**The One-Family Rule.** Open Sauce Two es obligatoria en toda la interfaz y superficies públicas. Solo los temas editoriales elegidos por el usuario y las exportaciones pueden usar otra familia.

**The Twelve-Pixel Floor.** Ningún texto funcional baja de 12px. Si una etiqueta necesita ser más pequeña para caber, debe reescribirse o redistribuirse.

## Elevation

La profundidad se expresa mediante capas tonales, separación y bordes. Las superficies permanecen planas en reposo; dropdowns, modales y overlays pueden usar una sombra estructural corta sin combinarla con un borde decorativo.

### Shadow Vocabulary

- **Overlay estructural** (`0 8px 8px rgba(11, 11, 24, 0.10)`): dropdowns, menús flotantes y modales únicamente.

**The Flat-by-Default Rule.** Una tarjeta en reposo no utiliza sombra. Si un elemento combina borde con una sombra de blur mayor a 8px, el tratamiento es incorrecto.

## Components

Los componentes son familiares, sobrios y consistentes; cada estado responde con la misma gramática visual.

### Buttons

- **Shape:** esquinas modernas y contenidas (10px); altura mínima de 40px en escritorio y 44px en móvil.
- **Primary:** Índigo con blanco, peso 600 y padding horizontal de 16px.
- **Hover / Focus:** Discord en hover; foco exterior de 2px en Índigo con offset de 2px; transición funcional de 180ms.
- **Secondary / Ghost:** Lavanda u origen transparente con Obsidiana; nunca simulan una acción primaria.

### Chips

- **Style:** píldora solo para estados y filtros; Lavanda para neutral, Lima para énfasis excepcional.
- **State:** la selección añade contraste de texto o fondo, nunca depende solo de un punto de color.

### Cards / Containers

- **Corner Style:** curva contenida (12px).
- **Background:** blanco elevado sobre Jazmín; Lavanda para panel secundario.
- **Shadow Strategy:** plana por defecto.
- **Border:** Borde Plata cuando la separación tonal no sea suficiente.
- **Internal Padding:** 16–24px según densidad.

### Inputs / Fields

- **Style:** blanco, borde sutil, altura mínima de 44px y esquinas de 10px.
- **Focus:** borde y anillo Índigo visibles sin desplazar el layout.
- **Error / Disabled:** texto cercano al campo, icono o copy además del color; el estado disabled conserva legibilidad.

### Navigation

- El estado activo usa Lavanda, texto Índigo y peso 600. Hover es una tinta suave de Azul Recuerdo. En móvil, el objetivo táctil mínimo es 44px y la jerarquía no cambia.

### Public Form

- Comparte tokens y controles con el constructor. No contiene spinners, escalas, rebotes, entradas, rotaciones ni transiciones; los cambios son instantáneos y los estados de carga se anuncian con texto estático.

## Do's and Don'ts

### Do:

- **Do** usar Obsidiana para jerarquía, Índigo para acciones y Lavanda para agrupación.
- **Do** mantener texto secundario con contraste WCAG AA y usar el gris accesible sobre Lavanda.
- **Do** separar contenido con espacio, alineación y divisores antes de crear otra tarjeta.
- **Do** implementar default, hover, focus, active, disabled, loading y error en cada control.
- **Do** respetar `prefers-reduced-motion` en todo el CRM y eliminar movimiento completamente en `/form/:id`.

### Don't:

- **Don't** crear clones de Notion ni plantillas SaaS genéricas con gradientes decorativos o glassmorphism.
- **Don't** anidar tarjetas, repetir grids de tarjetas idénticas ni combinar borde con sombra amplia.
- **Don't** usar redondeos superiores a 16px en tarjetas o campos.
- **Don't** usar etiquetas funcionales menores de 12px ni abusar de mayúsculas con tracking amplio.
- **Don't** añadir movimiento decorativo, rebotes o secuencias de entrada al cargar.
- **Don't** reemplazar colores semánticos, de integraciones, visualizaciones o configurados por usuarios con la paleta de marca.
