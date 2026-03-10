# Roadmap de Desarrollo SaaS: CRM + Marketing Automation

Este documento define la hoja de ruta cronológica paso a paso para construir el MVP del SaaS tipo HubSpot. Este proyecto utiliza **Next.js** y **MariaDB**.

---

## Paso 1: Configuración Inicial del Proyecto y Base de Datos (MariaDB)

El objetivo es tener la estructura base y la conexión a la base de datos MariaDB funcionando.

1.  **Inicializar Next.js:** Asegurar que el proyecto usa App Router, TypeScript y Tailwind CSS.
2.  **Configurar Conexión a MariaDB:**
    *   Instalar dependencias necesarias (ej. `mysql2` si usamos SQL directo, o `prisma` / `drizzle-orm` para ORM).
    *   Configurar las variables de entorno (`.env`) con los datos de MariaDB:
        ```env
        DATABASE_URL="mysql://u627288392_noxybd:Mr@driguez98@82.197.82.158:3306/u627288392_noxybd"
        ```
3.  **Generar Tablas Base:** Crear las tablas de Usuarios (`users`) y Organizaciones/Tenants (`organizations`) en MariaDB.

---

## Paso 2: Autenticación y Sistema Multi-Tenant (Multi-Empresa)

Crear el sistema para que las agencias y freelancers puedan iniciar sesión y manejar sus diferentes clientes.

1.  **Instalar Auth:** Configurar NextAuth.js o un sistema basado en sesión (JWT).
2.  **Registro y Login:**
    *   Página `/register`: Crea el usuario en MariaDB y, al mismo tiempo, crea su organización (`organization`) por defecto.
    *   Página `/login`: Valida usuario y contraseña en MariaDB.
3.  **Protección de Rutas:** Middleware de Next.js para asegurar que solo usuarios logueados accedan al `/dashboard`.
4.  **Selector de Empresas:** Un componente en la UI que permite al usuario cambiar entre las distintas empresas que administra (esto cambia el `organization_id` activo).

---

## Paso 3: Core del CRM (Empresas y Contactos)

La gestión de la agenda de clientes (B2B y B2C).

1.  **Tablas CRM en MariaDB:** Crear tablas `companies` (Empresas) y `contacts` (Contactos), ambas vinculadas obligatoriamente a un `organization_id`.
2.  **Módulo de Empresas:**
    *   API Routes: `GET /api/companies`, `POST /api/companies` (filtrando siempre por empresa activa).
    *   UI: Tabla (lista) y formulario de creación.
3.  **Módulo de Contactos:**
    *   API Routes: `GET /api/contacts`, `POST /api/contacts`.
    *   UI: Tabla con filtros (etiquetas, estado) y perfil detallado de cada contacto.

---

## Paso 4: Pipeline de Ventas (Kanban de Negocios)

Seguimiento visual de la venta.

1.  **Tablas Pipeline en MariaDB:** Crear tablas `pipelines`, `pipeline_stages` (etapas como Lead, Negociación) y `deals` (negocios u oportunidades).
2.  **Auto-generación de Pipeline:** Al crear una nueva empresa (organización), generar un embudo de ventas genérico por defecto en DB.
3.  **Construcción del Tablero (UI):**
    *   Usar React Drag & Drop (ej. `@hello-pangea/dnd`) para crear columnas (Etapas) y tarjetas (Negocios).
4.  **Lógica Drag & Drop:** Al soltar una tarjeta en otra columna, ejecutar una mutación (`PATCH`) en la API para actualizar el `stage_id` en MariaDB.

---

## Paso 5: Tareas y Notificaciones por WhatsApp (CallMeBot)

Avisos y recordatorios asíncronos para agilizar las ventas.

1.  **Módulo de Tareas:**
    *   Tabla `tasks` en MariaDB.
    *   UI para asignar tareas a usuarios, ligadas a un `Deal` o `Contact`.
2.  **Integración CallMeBot:**
    *   Asegurar que cada usuario tenga su número (`phone`) y API Key (`apikey`) guardado en configuración.
    *   Crear la función utilidad `sendWhatsAppNotification` haciendo un `fetch` a la API de CallMeBot.
3.  **Automatizaciones Básicas (Triggers):**
    *   Si se gana un negocio en el Kanban (cambia de estado), llamar a `sendWhatsAppNotification` para avisar al dueño.
    *   Si entra un Lead nuevo por formulario, mandar alerta por WhatsApp.

---

## Paso 6: Email Marketing (Newsletters y Masivos)

Módulo complejo para conectar con suscriptores.

1.  **Modelado Email en MariaDB:** Tablas para `email_campaigns` y `email_sends` (historial/trackeo).
2.  **Editor de Campañas (UI):** Pantalla para redactar el Asunto, Mensaje HTML o Newsletter simple, y seleccionar listas segmentadas.
3.  **Sistema de Envíos en Background:**
    *   *Crítico:* No enviar todos los emails de golpe, porque bloquea el servidor.
    *   Usar Cron Jobs, QStash (Upstash) o una Cola (Redis) para que un trabajador (Worker) vaya enviando lotes de correos mediante Resend o AWS SMTP asíncronamente.

---

## Paso 7: Analíticas y Dashboard

El panel principal (Home) al que entra el usuario cada día.

1.  **Consultas a MariaDB:**
    *   Contar (`COUNT`) leads nuevos, contactos totales.
    *   Sumar (`SUM`) el valor de los negocios "ganados".
    *   Calcular el Open Rate de campañas de email.
2.  **Dashboard Visual:**
    *   Tarjetas resumen con estadísticas usando Tailwind CSS.
    *   (Opcional) Gráficos simples usando bibliotecas como Tremor o Recharts.

---

## Paso 8: Refinamiento, Testing y Despliegue

La puesta en marcha.

1.  **Validaciones estrictas:** Asegurar que los formularios verifiquen datos (ej. Zod) antes de impactar MariaDB.
2.  **Pruebas de seguridad (Multi-Tenant):** Auditar que un usuario de la Empresa "A" NUNCA pueda leer mediante API los contactos de la Empresa "B" accidentalmente por falta de condicionales SQL.
3.  **Despliegue a Producción:**
    *   Subir el frontend y la API (Next.js) a Vercel.
    *   Ejecutar las variables de producción y verificar acceso ininterrumpido a la IP remota de MariaDB.
