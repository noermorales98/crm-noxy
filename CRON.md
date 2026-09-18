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
| `GET /api/cron/followups` | Cada 15 min | Recordatorios WhatsApp de deals con follow-up |
| `GET /api/cron/appointment-reminders` | Cada 15 min | Recordatorios de citas (WhatsApp / email) |
| `GET /api/cron/digest` | Cada 15 min | Resumen CRM por WhatsApp (IA + CallMeBot) |
| `GET /api/cron/google-calendar-reminders` | Cada 15 min | Recordatorios WhatsApp de eventos Google Calendar |
| `GET /api/cron/content-reminders` | **1 vez al día** (ej. 8:00 am) | Avisa por WhatsApp a clientes qué contenido deben GRABAR al día siguiente (Gestión de contenido) |

**Producción:**

- App: `https://crm-noxy.vercel.app`
- Recordatorios (dominio alternativo): `https://www.noxthy.co/api/cron/appointment-reminders`

Si ambos dominios apuntan al mismo deploy de Vercel, usa el dominio canónico para todos los crons.

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
```

`content-reminders` es el que avisa por WhatsApp (CallMeBot) qué hay que grabar al día siguiente. Sin este job, el aviso automático no sale; el botón **Avisar por WhatsApp** y **Enviar prueba** en `/contenido` sí funcionan a mano.

Los números salen del panel WhatsApp de cada cliente en Gestión de contenido, no de Ajustes → CallMeBot.
