# Guía de Testing para Correcciones de Formularios en iframe

## Requisitos Previos

1. **Base de Datos Configurada**:
   - Configurar `DATABASE_URL` en `.env.local`
   - Ejecutar `npm run db:push` para sincronizar el esquema
   
2. **Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```
   Debe estar corriendo en http://localhost:3000

3. **Formulario de Prueba**:
   - Crear un formulario en el CRM
   - Marcar como "activo"
   - Anotar el ID del formulario

## Tests Manuales Recomendados

### Test 1: Carga Normal del Formulario

**Objetivo**: Verificar que el formulario carga correctamente en condiciones normales

**Pasos**:
1. Navegar a `http://localhost:3000/form/[FORM_ID]`
2. Observar el spinner de carga
3. Verificar que el formulario se muestra en < 2 segundos

**Resultado Esperado**:
- ✅ Spinner animado visible durante la carga
- ✅ Formulario se muestra con todos los campos
- ✅ No hay errores en la consola

### Test 2: Formulario en iframe

**Objetivo**: Verificar que el formulario funciona cuando está embebido en un iframe

**Pasos**:
1. Crear un archivo HTML de prueba:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test iframe</title>
</head>
<body>
    <h1>Formulario Embebido</h1>
    <iframe 
        src="http://localhost:3000/form/[FORM_ID]" 
        width="100%" 
        height="800" 
        frameborder="0"
        style="border:none;border-radius:16px;"
    ></iframe>
</body>
</html>
```

2. Abrir el archivo en un navegador
3. Verificar que el formulario carga correctamente

**Resultado Esperado**:
- ✅ Formulario se carga dentro del iframe
- ✅ No hay errores de CORS en la consola
- ✅ Los campos son interactivos

### Test 3: Simulación de Conexión Lenta

**Objetivo**: Verificar el comportamiento con conexión lenta

**Pasos**:
1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Network"
3. Seleccionar "Slow 3G" en el throttling dropdown
4. Recargar la página del formulario

**Resultado Esperado**:
- ✅ Spinner se muestra durante todo el tiempo de carga
- ✅ Formulario eventualmente carga (puede tomar 10-15 segundos)
- ✅ Si tarda > 15 segundos, muestra error de timeout con botón "Reintentar"

### Test 4: Simulación de Sin Conexión

**Objetivo**: Verificar el manejo de errores cuando no hay conexión

**Pasos**:
1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Network"
3. Seleccionar "Offline" en el throttling dropdown
4. Recargar la página del formulario

**Resultado Esperado**:
- ✅ Muestra mensaje de error claro: "No se pudo conectar al servidor. Verifica tu conexión a internet."
- ✅ Botón "Reintentar" está visible
- ✅ Al hacer click en "Reintentar", intenta cargar de nuevo
- ✅ Error se loguea en console con `console.error()`

### Test 5: Verificación de Headers CORS

**Objetivo**: Verificar que los headers CORS están correctamente configurados

**Pasos**:
1. Abrir Chrome DevTools (F12)
2. Ir a la pestaña "Network"
3. Recargar la página del formulario
4. Buscar la petición a `/api/public/forms/[FORM_ID]`
5. Ver los headers de respuesta

**Headers Esperados**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Accept-Language
Cache-Control: public, max-age=60, s-maxage=120, stale-while-revalidate=300
Content-Type: application/json; charset=utf-8
Vary: Accept-Encoding, Accept-Language
```

### Test 6: Verificación de Caché

**Objetivo**: Verificar que el caché funciona correctamente

**Pasos**:
1. Cargar el formulario por primera vez
2. Anotar el tiempo de carga en Network tab
3. Recargar la página inmediatamente
4. Verificar que la segunda carga es más rápida

**Resultado Esperado**:
- ✅ Primera carga: fetch real al servidor
- ✅ Segunda carga (< 60s después): posible cache hit del navegador
- ✅ Header `Cache-Control` presente en la respuesta

### Test 7: Test de Envío de Formulario

**Objetivo**: Verificar que el envío funciona correctamente

**Pasos**:
1. Llenar todos los campos requeridos del formulario
2. Click en "Enviar Formulario"
3. Observar el comportamiento

**Resultado Esperado**:
- ✅ Botón muestra "Enviando..." durante el proceso
- ✅ Si tiene éxito, muestra mensaje de éxito o redirige
- ✅ Si falla, muestra error claro con opción de reintentar
- ✅ Timeout de 30 segundos si la conexión es muy lenta

### Test 8: Test de Formulario con Citas

**Objetivo**: Verificar que el calendario de citas carga correctamente

**Requisito**: El formulario debe estar vinculado a un tipo de cita

**Pasos**:
1. Cargar formulario con appointment type
2. Verificar que el calendario aparece al lado
3. Seleccionar una fecha
4. Verificar que se cargan los horarios disponibles

**Resultado Esperado**:
- ✅ Calendario se muestra correctamente
- ✅ Al seleccionar fecha, muestra "Consultando horarios disponibles…"
- ✅ Horarios se cargan (o muestra "No hay horarios disponibles")
- ✅ Headers de caché en `/api/public/appointment-types/[id]/slots`:
  ```
  Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=120
  ```

## Tests Automatizados (Futuros)

### Sugerencias para Playwright/Cypress

```typescript
// test/forms.spec.ts
describe('Public Form Loading', () => {
  it('loads form successfully', async () => {
    await page.goto('/form/test-form-id');
    await expect(page.locator('h1')).toContainText('Test Form');
  });

  it('shows retry button on error', async () => {
    await page.route('**/api/public/forms/**', route => route.abort());
    await page.goto('/form/test-form-id');
    await expect(page.locator('button:has-text("Reintentar")')).toBeVisible();
  });

  it('works in iframe', async () => {
    await page.setContent(`
      <iframe src="/form/test-form-id"></iframe>
    `);
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('h1')).toBeVisible();
  });
});
```

## Verificación en Producción

### Después del Deploy

1. **Verificar desde diferentes ubicaciones**:
   - Usar VPN o servicios como BrowserStack
   - Probar desde: México, Ecuador, USA, Europa
   
2. **Verificar headers con curl**:
```bash
curl -I https://tu-dominio.com/api/public/forms/FORM_ID
```

3. **Verificar CORS con curl**:
```bash
curl -X OPTIONS https://tu-dominio.com/api/public/forms/FORM_ID \
  -H "Origin: https://ejemplo.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

4. **Verificar en Vercel Analytics**:
   - Revisar error rates por región
   - Verificar cache hit rates
   - Monitorear tiempos de respuesta

### Métricas a Monitorear

- **Error Rate**: Debe ser < 5% globalmente
- **P95 Load Time**: Debe ser < 3 segundos
- **Cache Hit Rate**: Debe ser > 70%
- **Timeout Errors**: Deben ser raros (< 1%)

## Troubleshooting

### Problema: Formulario no carga en iframe

**Verificar**:
1. Headers CORS en Network tab
2. Console errors relacionados con CORS
3. Si el sitio padre usa HTTPS pero el formulario HTTP (mixed content)

### Problema: Caché no funciona

**Verificar**:
1. Headers `Cache-Control` en la respuesta
2. Si hay proxies intermedios que ignoran caché
3. Browser cache settings (puede estar deshabilitado en DevTools)

### Problema: Timeouts frecuentes

**Verificar**:
1. Latencia de red hacia el servidor
2. Tamaño de la respuesta (puede ser muy grande)
3. Problemas de DNS o routing
4. Considerar aumentar timeout si la conexión del usuario es legitimamente lenta

## Contacto para Issues

Si encuentras problemas no cubiertos por esta guía, revisar:
- Console del navegador para errores específicos
- Network tab para ver requests fallidos
- Headers de respuesta para verificar CORS y caché
- Logs del servidor si tienes acceso
