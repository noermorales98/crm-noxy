---
author: Noeli
branch: main
status: done
---
# Apariencia: modo oscuro (automático o manual), radio de esquinas y bordes

## Hecho (Ajustes › Apariencia y sonidos › «Modo, esquinas y bordes»)
- **Modo:** Automático (sigue el del dispositivo con `prefers-color-scheme`), Claro u Oscuro. Cada uno de los 18 temas tiene variante oscura calculada de su color de acción (`darkTheme`): superficies casi negras con el matiz del tema, texto claro y acción aclarada hasta 4.5:1; la prueba recorre los 18 y comprueba texto, secundario, tinta de acción, botón, foco y activo en todas las superficies. En automático el CSS de oscuro se emite con `!important` dentro de la media query (las variables claras van en línea), así el primer pintado ya sale bien, sin parpadeo.
- **Esquinas:** Cuadrado (2 px), Suave (6/8), Normal (10/12, el actual) y Redondo (16/24); escribe `--radius-control/surface/ui` del marco.
- **Bordes:** Con bordes, Suaves (se funden 60 % con la tarjeta) y Sin bordes (transparentes + sombra ligera en tarjetas y menús).
- Se guarda en la cookie `noxy-appearance` (por dispositivo, como el modo oscuro del sistema) y el servidor la lee en el layout: la primera carga ya sale con la apariencia elegida. Sin cambios en la base de datos.
- Los colores escritos a mano en el código (`bg-white`, grises y pasteles de Tailwind) se llevan al oscuro con una hoja de ajustes (`darkPaletteOverrides`) acotada al marco: fondos pastel → mismo matiz traslúcido, textos de matiz → más claros.

## Límites
- La apariencia vive en el marco del CRM; los menús que se pintan fuera de él (portales) y las páginas públicas siguen claros.
- Es una cookie por navegador, no una preferencia de la cuenta (no viaja entre dispositivos).
- Sin ver en navegador: el modo oscuro puede dejar detalles sueltos donde haya colores escritos a mano que la hoja de ajustes no cubra.

## Evidence
`npm test`: 574 pasan, 4 fallan (previos). 8 pruebas nuevas en `appearance.test.ts` (modelo, radios, bordes, oscuro AA de los 18 temas, hoja de estilos).

## Ajuste: el radio y el tema no llegaban al Spotlight
Causa: el Spotlight (y los menús en `body`) se pintan **fuera** del marco, donde se ponían las variables, así que no heredaban radio, tema ni modo oscuro. Ahora el marco también publica esas variables en `<html>` mientras el CRM está abierto (y las quita al salir; en automático sigue al dispositivo). Además, con un radio distinto del normal, las esquinas escritas a mano (`rounded-md/lg/xl/2xl/3xl`) siguen el radio elegido mediante `html[data-crm-radius]`. Sin ver en navegador.
