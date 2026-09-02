# Documentación de Replicación — CRM Noxy

Esta carpeta documenta el proyecto **crm-noxy** a profundidad, con el objetivo de que pueda **clonarse y adaptarse a otro negocio** con el mínimo esfuerzo.

## Contenido

| Archivo | Qué contiene |
|---|---|
| [01-descripcion-general.md](01-descripcion-general.md) | Qué es el producto, para quién es, módulos funcionales |
| [02-arquitectura.md](02-arquitectura.md) | Stack técnico, estructura de carpetas, integraciones externas |
| [03-rutas.md](03-rutas.md) | Mapa completo de páginas, API routes, autenticación, webhooks, crons y servidor MCP |
| [04-base-de-datos.md](04-base-de-datos.md) | Estructura completa de la BD: 38 modelos, 14 enums, relaciones |
| [05-inicializacion-y-variables.md](05-inicializacion-y-variables.md) | Cómo levantar el proyecto desde cero: instalación, BD, variables de entorno |
| [06-guia-de-adaptacion.md](06-guia-de-adaptacion.md) | Qué cambiar para replicarlo en otro negocio (marca, dominios, seeds, localización) |
| [env.example](env.example) | Plantilla de variables de entorno (el repo original no tiene `.env.example`) |

## Resumen en 30 segundos

CRM multi-tenant hecho a medida para la agencia de marketing **Noxy Digital** (México). Next.js 16 + React 19 + Prisma sobre MySQL + NextAuth v5. Incluye pipeline de ventas Kanban, cotizaciones con cobro Stripe, inbox de correo IMAP/SMTP por empresa, campañas drip, formularios de captación, agendamiento de citas con Google Calendar, gestión de contenido para RRSS, knowledge base tipo Notion, asistente de IA (OpenRouter/Chatbase), notificaciones WhatsApp (CallMeBot) y un servidor MCP para conectar el CRM a Claude/ChatGPT.

## Quick start (nuevo negocio)

```bash
git clone <repo> mi-crm && cd mi-crm
cp docs-replicacion/env.example .env.local   # rellenar valores
# crear BD MySQL vacía y apuntar DATABASE_URL a ella
npm install          # postinstall ejecuta prisma generate
npm run db:push      # crea todas las tablas
npm run dev          # http://localhost:3000
```

Luego abre `/register`, crea el primer usuario — el registro genera automáticamente la organización, el pipeline "Sales Pipeline" y las 5 etapas por defecto. No hay seed que correr. Detalles completos en [05-inicializacion-y-variables.md](05-inicializacion-y-variables.md).
