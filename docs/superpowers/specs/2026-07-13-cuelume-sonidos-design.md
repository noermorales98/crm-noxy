# Integración de sonidos de interacción (cuelume)

## Objetivo

Añadir feedback auditivo sutil a las interacciones principales de la app (botones, navegación, notificaciones) usando [cuelume](https://cuelume-site.pages.dev/), una librería de sonidos sintetizados vía Web Audio (cero dependencias, ESM-only, sin ficheros de audio).

## Contexto

La app (`crm-noxy`, Next.js 16 + React 19) no tiene un componente `Button` ni `Link` compartido: existen ~76 archivos con `<button>` propio y ~30 con `<Link>` de Next.js, cada uno con su propio JSX y clases Tailwind. Refactorizar todos esos archivos para añadir atributos `data-cuelume-*` (la API nativa de cuelume) sería un cambio masivo y arriesgado.

En su lugar, se usa **delegación de eventos** para lograr cobertura total sin tocar los archivos existentes, llamando directamente a la API imperativa de cuelume (`play()`, `setEnabled()`) en vez de su sistema de atributos (`bind()` + `data-cuelume-*`).

La app sigue un patrón consistente de providers globales anidados en `app/layout.tsx` (`AuthProvider`, `ToastProvider`, `ConfirmContext`, `HeaderContext`, `NotificationContext`, `AiProvider`) definidos en `src/context/*.tsx`. La nueva pieza sigue ese mismo patrón.

## Alcance

### 1. Dependencia

`npm install cuelume` (paquete `cuelume@0.1.0`, sin dependencias runtime).

### 2. `SoundContext` (nuevo — `src/context/SoundContext.tsx`)

- `"use client"`.
- Expone el hook `useSoundSettings()` → `{ enabled: boolean, toggle: () => void }`.
- Persistencia en `localStorage` bajo la clave `noxy-sound-enabled` (valores `"1"` / `"0"`), leída una vez al montar (por defecto: activado si no existe la clave). Se usa acceso directo a `localStorage`, sin capa de abstracción, siguiendo el patrón ya existente en `src/components/kb/KbPublicViewer.tsx` y `src/lib/kb-draft.ts`.
- Al llamar a `toggle()`: actualiza el estado React, persiste en `localStorage` y llama a `setEnabled()` de cuelume (que hace que `play()` sea un no-op mientras esté desactivado).
- En un único `useEffect` de montaje, registra dos listeners globales en `document`:
  - `pointerdown` sobre cualquier `<button>` no deshabilitado (`event.pointerType === "mouse"`) → `play("press")`.
  - `pointerup` con la misma condición → `play("release")`.
  - Estos listeners cubren automáticamente **todos** los botones de la app, presentes y futuros, sin necesidad de editar cada componente.
- El provider se añade a la cadena de `app/layout.tsx` (junto al resto de providers globales).

### 3. Hover de navegación — Sidebar (`src/components/Sidebar.tsx`)

- Se añade una `ref` al contenedor raíz del sidebar.
- En un `useEffect`, se registra un listener delegado (`pointerover`/`pointerout`) **acotado a ese contenedor** (no a todo el documento), que detecta cuándo el puntero entra a un `<Link>` de navegación distinto al anterior y llama a `play("tick")`.
- Se rastrea el último enlace sobre el que estuvo el puntero para no repetir el sonido mientras el puntero permanece dentro del mismo enlace.
- Alcance intencionalmente limitado a la navegación del sidebar (no a tablas ni listados largos de contactos/proyectos, para evitar ruido excesivo).

### 4. Notificaciones — Toast (`src/context/ToastContext.tsx`)

- En `addToast`, tras invocar el método de `sileo` correspondiente:
  - `type === "success"` → `play("success")`.
  - `type === "error"` → `play("droplet")`.
  - `warning` / `info` → sin sonido.

### 5. Toggle en Ajustes (`app/settings/page.tsx`)

- Nueva sección "Sonidos de interacción" con un botón-switch (mismo patrón ad-hoc de botón-toggle que ya usan `app/settings/digest/page.tsx` y `app/settings/ai-models/page.tsx`; no existe un componente `Switch` compartido).
- Conectado a `useSoundSettings()`: refleja el estado `enabled` y llama a `toggle()` al pulsar.

## Fuera de alcance

- No se añaden atributos `data-cuelume-*` a componentes individuales (se usa solo la API imperativa `play`/`setEnabled`).
- No se aplica sonido de hover a tablas, listados de contactos/proyectos, ni enlaces fuera del sidebar.
- No se distingue un sonido "toggle" especial para botones que actúan como interruptores (quedan cubiertos por el `press`/`release` genérico de botones).
- No hay sincronización de la preferencia entre dispositivos/sesiones (solo `localStorage` local).

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `package.json` | Añadir dependencia `cuelume` |
| `src/context/SoundContext.tsx` | Nuevo — provider + listeners globales de botones |
| `app/layout.tsx` | Envolver con `SoundProvider` |
| `src/components/Sidebar.tsx` | Listener de hover acotado al nav |
| `src/context/ToastContext.tsx` | Sonido en toasts de éxito/error |
| `app/settings/page.tsx` | Toggle de encendido/apagado |
