---
author: Noeli
branch: main
status: done
---
# IA: varias cuentas, cambio automático y todos los modelos en los selectores

## Problema
OpenRouter dejó de funcionar (sin crédito). Solo se podía guardar una cuenta de NVIDIA, las de OpenRouter solo por variables de entorno (máx. 2), no había cambio de modelo si uno fallaba y el selector (p. ej. en Resumen diario) no mostraba los modelos de NVIDIA vigentes.

## Hecho (sin cambios de base de datos)
- **Varias cuentas por proveedor** (OpenRouter y NVIDIA), guardadas cifradas en la fila existente de `AiProviderKey` como JSON v2 (una clave antigua se lee como «Principal»). `src/lib/ai-key-pool.ts` (puro, 9 pruebas): agregar, quitar, apagar/encender, subir/bajar, enfriamiento (30 min si falló por clave o sin crédito, 2 min por límite de ritmo), enmascarado. Las variables de entorno se suman al final como «Servidor 1/2».
- **Cambio automático:** `completeWithAiDetailed` prueba las cuentas del modelo pedido y, si ninguna sirve, otro modelo (respaldos fijados y luego los ligeros de NVIDIA y el gratuito de OpenRouter). Si el pedido falló por algo permanente (401/402/403/404 en todas sus cuentas) y otro respondió, **ese queda como predeterminado** (preferencias de la organización y los resúmenes que usaban el que falló). `src/lib/ai-failover.ts` (puro, 5 pruebas).
- El **chat del asistente** usa las mismas cuentas y el mismo cambio (cabeceras `X-AI-Model-Used` / `X-AI-Model-Requested` cuando cambia).
- **Ajustes › Modelos de IA:** lista de cuentas por proveedor (estado, encender/apagar, orden, quitar, agregar con comprobación contra el proveedor), modelo predeterminado, interruptor de cambio automático y hasta 3 respaldos. APIs: `/api/settings/ai-accounts` y `/api/settings/ai-prefs` (solo OWNER/ADMIN escriben).
- **Selector de modelo** (Resumen diario, asistente, etc.): ahora lee `/api/ai/models`, que incluye los de NVIDIA vigentes y marca los de un proveedor sin cuenta.
- El modelo predeterminado de la organización manda sobre el del resumen diario cuando una función no recibe modelo.

## Sin probar
Nada se ejecutó contra OpenRouter ni NVIDIA reales ni en navegador; la lógica de cuentas y cambio está probada con funciones puras. `npm test`: 566 pasan, 4 fallan (previos y ajenos).
