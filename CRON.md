Para activar la sincronización automática
Llama periódicamente a GET /api/cron/fetch-emails con el header Authorization: Bearer {CRON_SECRET} desde tu proveedor de crons (Vercel Cron, etc.).
Solo se ejecutara si el usuario tiene una cuenta de correo configurada.