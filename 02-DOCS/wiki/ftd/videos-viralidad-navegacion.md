---
title: Videos y viralidad en Contenido
---

# Videos y viralidad en Contenido

## Intención

Que la pantalla de videos sea fácil de encontrar y leer, con las tablas del mismo sistema visual que Contactos y una importación CSV discreta.

## Alcance

- Entrada «Videos y viralidad» en la barra lateral del modo Contenido.
- Ruta canónica `/contenido/videos`; `/videos` redirige para conservar enlaces previos.
- Tabla de videos registrados y tablas de mejor y peor 20 % con componente `DataTable`, filas móviles, estados vacíos y manejo de errores.
- Botón «Importar CSV» que abre un diálogo con vista previa y mapeo avanzado plegado.
- Sin cambios de esquema ni dependencias nuevas.

## Checklist

- [x] Revisadas las tablas de Contactos y el modelo de navegación de Contenido.
- [x] Ruta y entrada de navegación añadidas.
- [x] Vista y diálogo implementados.
- [x] Navegación: 17 pruebas pasaron, incluida la ruta nueva.
- [x] ESLint de archivos modificados y build local completaron sin errores.

## Evidencia

La página anterior mostraba dos tablas básicas y el formulario de importación siempre abierto. El endpoint `/api/videos` ya ofrecía la lista de videos, pero la página no la mostraba.

La nueva vista muestra videos registrados y la comparación semanal. El CSV se selecciona en un diálogo; el mapeo JSON queda plegado y la importación se habilita tras una vista previa válida.

## Siguiente paso

Verificar compilación y navegación, publicar en main y comprobar la ruta pública.
