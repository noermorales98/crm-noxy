# Prompt para diseñar un SaaS tipo HubSpot

Actúa como un **arquitecto senior de software especializado en SaaS, CRM y plataformas de marketing automation**. Necesito que me ayudes a **diseñar la arquitectura completa de una aplicación web tipo HubSpot**, enfocada en **CRM, email marketing, gestión de múltiples clientes y notificaciones por WhatsApp**.

El objetivo es crear un **MVP funcional pero escalable**, que posteriormente pueda convertirse en una plataforma SaaS completa.

---

# Contexto del proyecto

La aplicación será utilizada principalmente por:

- agencias de marketing  
- freelancers  
- equipos de ventas  

El sistema debe permitir **administrar múltiples empresas/clientes desde una sola cuenta**.

Cada usuario podrá:

- gestionar varios clientes
- manejar contactos
- enviar campañas de email
- organizar procesos de ventas
- ver métricas de marketing
- recibir **notificaciones por WhatsApp**

El sistema debe diseñarse como **una arquitectura multi-tenant (multi empresa)**.

---

# Stack tecnológico

Diseña el sistema usando estas tecnologías:

## Frontend
- Next.js

## Backend
- API Routes de Next.js o Node.js

## Base de datos
- MariaDB

## Autenticación
- JWT o sistema de sesiones

## Email
- SMTP  
- Resend  
- SendGrid  
- Amazon SES  

## Notificaciones
- **WhatsApp usando CallMeBot API**

## Infraestructura
- preparado para desplegar en **Vercel o Docker**

---

# Módulos principales del sistema

## 1. Autenticación y gestión de usuarios

Debe incluir:

- registro
- login
- recuperación de contraseña
- roles de usuario
- gestión de equipos

### Roles sugeridos

- owner
- admin
- member

---

## 2. Sistema multi-cliente (multi-tenant)

Un usuario puede administrar **varias empresas o clientes** dentro del mismo panel.

Cada empresa tendrá:

- contactos
- campañas de email
- pipelines de ventas
- métricas
- actividades
- notificaciones

---

## 3. CRM

Gestión completa de contactos:

- contactos
- empresas
- etiquetas
- notas
- historial de actividad
- tareas
- timeline de interacciones

### Campos comunes

- nombre
- email
- teléfono
- empresa
- estado
- etiquetas

---

## 4. Pipeline de ventas

Sistema tipo **kanban** para gestionar oportunidades.

Funciones:

- crear pipelines personalizados
- crear etapas
- mover oportunidades entre etapas
- asignar responsables
- historial de cambios

### Ejemplo de etapas

- lead
- contacto
- negociación
- cierre ganado
- cierre perdido

---

## 5. Email marketing

Funciones principales:

- crear campañas de email
- editor simple tipo newsletter
- listas de contactos
- segmentación
- programación de envíos
- plantillas reutilizables

### Métricas

- open rate
- click rate
- rebotes
- unsubscribes

---

## 6. Automatizaciones básicas

Workflows simples como:

- enviar email cuando se crea un contacto
- enviar email cuando cambia etapa del pipeline
- secuencias de emails

---

## 7. Notificaciones por WhatsApp

Integrar **CallMeBot** para enviar notificaciones automáticas por WhatsApp.

### Ejemplos de uso

- notificar cuando entra un nuevo lead
- recordatorio de tareas
- aviso cuando cambia una etapa del pipeline
- notificación cuando una campaña termina
- alertas del sistema

Las notificaciones deben poder configurarse por:

- usuario
- empresa
- tipo de evento

---

## 8. Dashboard y analíticas

Panel con métricas como:

- leads generados
- contactos totales
- oportunidades abiertas
- campañas enviadas
- tasa de apertura de emails
- conversiones

Debe poder filtrarse por **empresa/cliente**.

---

## 9. Gestión de tareas

Sistema de tareas:

- crear tareas
- asignar a usuarios
- fechas límite
- recordatorios
- tareas asociadas a:
  - contactos
  - negocios
  - empresas

Las tareas pueden enviar **recordatorios por WhatsApp**.

---

# Arquitectura que necesito que diseñes

Explícame detalladamente:

1. arquitectura general del sistema  
2. modelo multi-tenant con MariaDB  
3. diseño de base de datos (tablas y relaciones)  
4. estructura de carpetas del proyecto Next.js  
5. endpoints principales de la API  
6. sistema de envío masivo de emails  
7. sistema de colas para envíos  
8. integración con CallMeBot  
9. cómo escalar la aplicación  

---

# Diseño de base de datos

Propón:

- esquema de tablas
- relaciones
- claves primarias y foráneas
- índices necesarios

### Ejemplos de tablas esperadas

- users
- organizations
- organization_members
- contacts
- companies
- deals
- pipelines
- pipeline_stages
- email_campaigns
- email_templates
- email_sends
- tasks
- activities
- tags
- notifications
- whatsapp_logs

---

# Entregables esperados

La respuesta debe incluir:

1. mapa completo de funcionalidades  
2. arquitectura del sistema  
3. diagrama de base de datos  
4. esquema de tablas en MariaDB  
5. flujo de usuarios  
6. estructura del proyecto en Next.js  
7. endpoints de API  
8. sistema de notificaciones WhatsApp  
9. recomendaciones para escalar el SaaS  

---

# Objetivo final

Crear un **CRM + Email Marketing similar a HubSpot**, pero simplificado y enfocado en **agencias y freelancers que manejan múltiples clientes**, con **notificaciones por WhatsApp usando CallMeBot**.