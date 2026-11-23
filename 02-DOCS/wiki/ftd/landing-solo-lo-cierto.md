---
author: Noeli
branch: main
status: done
---
# Landing: que diga solo lo cierto (T11)

Solo texto, en `src/components/landing/LandingPage.tsx`.

| Antes | Ahora | Por qué |
|---|---|---|
| «Bóveda cifrada» | sin cambio | T7 hecha y fusionada (c24b6d5) |
| «Credenciales cifradas…» | «Las contraseñas de la Bóveda van cifradas…» | SMTP/IMAP de empresas siguen en texto plano |
| «Cada persona ve solo lo suyo» | «Permisos por módulo para cada integrante» | el permiso es por módulo, no por registro |
| «Cada quien, lo suyo» | «Acceso por módulo» | igual |
| «Ninguna sugerencia crea nada por sí sola» | «Las sugerencias de la IA se crean solo cuando tú las apruebas. Los avisos y tareas de seguimiento sí son automáticos y los puedes apagar» | los avisos y tareas de seguimiento sí se crean solos |
| «Un resumen en tu WhatsApp cada mañana» | «Un resumen opcional… a la hora que elijas» | es opcional y configurable |
| «Cotizaciones que se siguen solas» | «Sabes cuándo abrieron tu cotización» + «registra cuando el cliente abre el enlace por primera vez» | solo se registra la primera vista (`VISTA`) |
| «Empieza en minutos, no en semanas» | «De la reunión a la entrega, en un solo lugar» | no hay onboarding guiado |

Sin cambios de estilo ni estructura. Pendiente: que la landing se vea bien en navegador (no probado). Sigue sin cubrirse: «las notas privadas no llegan a la IA» no se verificó.
