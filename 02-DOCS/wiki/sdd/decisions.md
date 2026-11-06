# SDD decisions (append-only)

## 2026-11-05 — Rediseño del CRM privado: lenguaje B «Obsidiana estructural»

- Opciones: A (aplicar el DESIGN.md actual), B (lenguaje nuevo), no hacer nada. Elegida **B** por el dueño: el lenguaje actual se ve genérico, poco moderno y con jerarquía débil.
- Objeción registrada (no bloqueante): el problema medido dominante es el incumplimiento (278 textos < 12 px, 389 colores fuera de tokens). Mitigación exigida en el spec: el lenguaje vive en tokens y piezas comunes.
- Lenguaje: «Obsidiana estructural» frente a «Precisión monocroma» y «Color de marca expresivo».
- Se mantienen paleta Noxy, Open Sauce Two y los 10 temas personales. Sin modo oscuro en este ciclo.
- Movimiento «Expresivo»: enmienda la regla de DESIGN.md contra secuencias de entrada; /form sigue sin movimiento.
- Spec: `specs/rediseno-obsidiana-estructural.md`.
