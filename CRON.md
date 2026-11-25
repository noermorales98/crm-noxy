# Cron jobs — Noxy CRM

Los endpoints bajo `/api/cron/*` ejecutan tareas en segundo plano (IMAP, envíos, recordatorios). En producción requieren el header:

```
Authorization: Bearer <CRON_SECRET>
```

Define `CRON_SECRET` en Vercel → Settings → Environment Variables (mismo valor en cron-job.org y en el proyecto).

---

## Endpoints

| Endpoint | Frecuencia sugerida | Descripción |
|----------|---------------------|-------------|
| `GET /api/cron/fetch-emails` | **Cada 5 min** | Descarga correos nuevos vía IMAP y crea notificaciones in-app |
| `GET /api/cron/send-scheduled` | Cada 5 min | Envía correos programados (`scheduledAt`) |
| `GET /api/cron/process-emails` | Cada 5 min | Despacha cola de campañas (logs PENDING) |
| `GET /api/cron/followups` | Cada 15 min | Un solo aviso de WhatsApp por seguimiento vencido, agrupado por organización (no repite, no avisa de archivados). Además crea las tareas de seguimiento de leads, mueve a Perdido los leads sin respuesta en 14 días y **ejecuta el cierre mensual** (respaldo) |
| `GET /api/cron/appointment-reminders` | Cada 15 min | Recordatorios de citas (WhatsApp / email) |
| `GET /api/cron/digest` | Cada 15 min | Resumen CRM por WhatsApp (IA + CallMeBot; si la IA falla, manda el resumen sin IA y avisa en la campanita si no se pudo enviar). También **ejecuta el cierre mensual** |
| `GET /api/cron/google-calendar-reminders` | Cada 15 min | Recordatorios WhatsApp de eventos Google Calendar |
| `GET /api/cron/content-reminders` | **Cada 15 min** | Avisa por WhatsApp las piezas con recordatorio activo cuyo día de aviso es hoy (mismo día o N días antes; Gestión de contenido) |
| `GET /api/cron/granola` | **Cada 15 min** | Sincroniza las reuniones de Granola (resumen, notas y pasos) y las guarda en la cita que coincide. Después genera sugerencias y deja **un borrador de seguimiento por cita** (desde Noxy Digital, con una tarea para revisarlo); nunca envía correos |
| `GET /api/cron/auto-archive` | Cada día | Archiva los leads ganados en la última etapa ganadora, `autoArchiveDays` días después de ganarse (por organización) |
| `GET /api/cron/notion-sync` | Cada 5 min | Respaldo del auto-sync de documentos de `/kb`: envía a Notion los editados desde su último envío |
| `GET /api/cron/payment-alerts` | **Cada hora** | Avisa por WhatsApp los cobros (pagos de deals y mensualidades) que vencen en 2 días o menos; una sola vez por cobro |

**Producción:**

- App: `https://crm-noxy.vercel.app`
- Recordatorios (dominio alternativo): `https://www.noxthy.co/api/cron/appointment-reminders`

Si ambos dominios apuntan al mismo deploy de Vercel, usa el dominio canónico para todos los crons.

---

### Cierre mensual de ventas (no tiene cron propio)

No hay un job `monthly-close`: el cierre corre **dentro de `digest` y `followups`** (cada 15 min) y es idempotente. Si falta la foto de un mes ya terminado (`MonthlySnapshot`), la crea con las métricas del mes y archiva los leads ganados de ese mes que estén en la **última etapa ganada** de su pipeline. Con que uno de los dos crons esté dado de alta, el cierre se ejecuta. La respuesta JSON de ambos trae `monthlyClose`.

### `auto-archive` (corregido 2026-11-23)

Archiva los leads ganados que ya están en la **última etapa ganadora** de su pipeline («Entregado», «Ganado», «Publicación KDP») y llevan `autoArchiveDays` días (por defecto 30) desde que se ganaron (`wonAt`). Un lead en «Anticipo pagado» o «En producción» **no** se archiva: sigue siendo trabajo en curso. Usa la misma regla de «etapa final» que el cierre mensual, así que ambos mecanismos no se contradicen. Con `autoArchiveDays = 0` la organización queda excluida.

**Alta en cron-job.org:** Title `Noxy — Auto archive` · URL `https://crm-noxy.vercel.app/api/cron/auto-archive` · Schedule: una vez al día (p. ej. 03:00) · Método GET · en Advanced → Headers: `Authorization: Bearer TU_CRON_SECRET` · Save y «Run now». Respuesta esperada: `{"success":true,"processedOrganizations":5,"dealsArchived":0}`.

### Cómo comprobar que un cron corre

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://crm-noxy.vercel.app/api/cron/digest
```

| Cron | Respuesta esperada (200) |
|------|--------------------------|
| `digest` | `{"processed":1,"sent":0,"fallbacks":0,"errors":[],"monthlyClose":{…}}` (`sent` es 1 solo en la ventana de la hora configurada) |
| `followups` | `{"processed":0,"notified":0,"errors":[],"monthlyClose":{…}}` |
| `content-reminders` | JSON con los avisos enviados |
| `auto-archive` | `{"success":true,"processedOrganizations":5,"dealsArchived":0}` |
| `notion-sync` | `{"message":"Documentos pendientes enviados a Notion",…}` |

Una respuesta `401` significa que el `CRON_SECRET` del job no coincide con el de Vercel. Para ver si el resumen diario se envió, mira `lastSentAt` en `/settings/digest` o ejecuta `node scripts/digest-diagnostico.cjs` (solo lectura).

---

## Configurar fetch-emails en cron-job.org

Este job es **obligatorio** para recibir correos sin pulsar "Sincronizar" manualmente.

1. Entra en [cron-job.org](https://cron-job.org) → **Create cronjob**.
2. Configura:

   | Campo | Valor |
   |-------|--------|
   | Title | Noxy — Fetch emails |
   | URL | `https://crm-noxy.vercel.app/api/cron/fetch-emails` |
   | Schedule | Every 5 minutes |
   | Request method | GET |

3. En **Advanced** → **Headers**, añade:

   | Name | Value |
   |------|--------|
   | Authorization | `Bearer TU_CRON_SECRET` |

4. Guarda y pulsa **Run now**.

### Respuestas esperadas

**OK:**

```json
{
  "message": "Sincronización IMAP completada",
  "companiesProcessed": 1,
  "newEmailsFetched": 3,
  "errors": 0
}
```

**Sin IMAP configurado:**

```json
{ "message": "No hay empresas con IMAP configurado" }
```

→ Configura IMAP en Correos → icono ⚙ junto a la cuenta (no basta con SMTP).

**401 Unauthorized:**

→ `CRON_SECRET` en Vercel no coincide con el header del job.

---

## Checklist de verificación

- [ ] `CRON_SECRET` definido en Vercel (Production)
- [ ] Job `fetch-emails` en cron-job.org con header correcto
- [ ] Al menos una empresa con **IMAP** (host, usuario, contraseña)
- [ ] "Run now" devuelve 200 y `newEmailsFetched` ≥ 0
- [ ] Enviar email de prueba → aparece en `/emails` en ≤5 min sin clic manual
- [ ] Notificación in-app / toast Sileo tipo `NEW_EMAIL`

---

## Respaldo con sesión activa

Si un usuario tiene la app abierta, [`EmailContext`](src/context/EmailContext.tsx) también llama a `/api/cron/fetch-emails` cada 5 minutos (con cookie de sesión). Esto complementa el cron externo pero **no sustituye** cron-job.org cuando nadie está logueado.

---

## Otros jobs en cron-job.org

Duplica el mismo patrón (URL + header) para:

```
https://crm-noxy.vercel.app/api/cron/send-scheduled
https://crm-noxy.vercel.app/api/cron/process-emails
https://crm-noxy.vercel.app/api/cron/followups
https://www.noxthy.co/api/cron/appointment-reminders
https://crm-noxy.vercel.app/api/cron/digest
https://crm-noxy.vercel.app/api/cron/google-calendar-reminders
https://crm-noxy.vercel.app/api/cron/content-reminders
https://crm-noxy.vercel.app/api/cron/granola
https://crm-noxy.vercel.app/api/cron/notion-sync
https://crm-noxy.vercel.app/api/cron/payment-alerts
https://crm-noxy.vercel.app/api/cron/auto-archive
```

`content-reminders` envía por WhatsApp (CallMeBot) las piezas del calendario de contenido que tengan **recordatorio activado** y cuyo día de aviso (fecha de la pieza − días de anticipación) sea hoy, en la hora configurada por cliente en el panel WhatsApp. Sin este job, el aviso automático no sale; el botón **Avisar por WhatsApp** y **Enviar prueba** en `/contenido` sí funcionan a mano.

Los números salen del panel WhatsApp de cada cliente en Gestión de contenido, no de Ajustes → CallMeBot. En cada pieza puedes activar el recordatorio y elegir “el mismo día” o N días antes.

## Automatizaciones CRM y bot

Las instrucciones de conexión y reutilización están en `INSTRUCCIONES_CRON.txt`.
