# API de Leads de Formularios

Sistema de API configurable para consultar los leads registrados en cada formulario.

## 🚀 Características

- **API Configurable por Formulario**: Cada formulario puede tener su propia configuración de API
- **Acceso Público o Privado**: 
  - Público: GET sin autenticación
  - Privado: Requiere Bearer Token
- **Generación Automática de Tokens**: Tokens seguros generados automáticamente
- **Paginación**: Soporte para paginar resultados (hasta 100 por página)
- **Interfaz de Configuración**: Panel integrado en la sección de formularios

## 📋 Instalación

### 1. Ejecutar la Migración de Base de Datos

```bash
# Opción A: Usando script npm (recomendado)
npm run db:migrate

# Opción B: Aplicar manualmente el SQL
mysql -u usuario -p nombre_db < prisma/migrations/add_form_api_config.sql
```

### 2. Regenerar Cliente de Prisma

```bash
npm run postinstall
# o
npx prisma generate
```

## 🎯 Uso

### Configurar la API desde la Interfaz

1. Ve a **Formularios** en el CRM
2. Selecciona el formulario
3. Haz clic en la pestaña **API**
4. Configura:
   - **Habilitar API**: Activa/desactiva el acceso
   - **Acceso Público**: Define si requiere token o no
   - **Bearer Token**: Se genera automáticamente (solo para acceso privado)

### Consultar la API

#### API Pública (sin token)

```bash
curl "https://tu-dominio.com/api/forms/{formId}/leads?page=1&limit=50"
```

#### API Privada (con token)

```bash
curl "https://tu-dominio.com/api/forms/{formId}/leads?page=1&limit=50" \
  -H "Authorization: Bearer noxy_abc123..."
```

### Respuesta de la API

```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "clxxx",
        "firstName": "Juan",
        "lastName": "Pérez",
        "email": "juan@example.com",
        "phone": "+52123456789",
        "source": "Form: Contacto",
        "sourceVariantId": "clyyy",
        "createdAt": "2026-09-04T18:00:00.000Z",
        "updatedAt": "2026-09-04T18:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 127,
      "totalPages": 3
    }
  }
}
```

### Parámetros de Consulta

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | 1 | Número de página |
| `limit` | number | 50 | Leads por página (máximo 100) |

## 🔒 Seguridad

### Tokens

- Formato: `noxy_{64 caracteres hexadecimales}`
- Generados con `crypto.randomBytes(32)`
- Únicos por formulario
- Se pueden regenerar en cualquier momento

### Validación

1. **API Deshabilitada**: HTTP 403
2. **Token Inválido**: HTTP 401
3. **Formulario No Encontrado**: HTTP 404
4. **Acceso Correcto**: HTTP 200

### Buenas Prácticas

- 🔒 **No compartas los tokens públicamente**
- 🔄 **Regenera tokens si se comprometen**
- 📝 **Usa acceso privado para datos sensibles**
- 🌐 **Usa acceso público solo para datos no confidenciales**

## 📊 Endpoints

### GET `/api/forms/[id]/leads`

Consulta los leads registrados en un formulario.

**Autenticación**: Opcional (según configuración)

**Headers** (solo si es privada):
```
Authorization: Bearer {apiToken}
```

**Query Parameters**:
- `page`: Número de página (default: 1)
- `limit`: Resultados por página (default: 50, max: 100)

**Respuestas**:
- `200`: Lista de leads con paginación
- `401`: Token inválido o faltante
- `403`: API no habilitada
- `404`: Formulario no encontrado
- `500`: Error interno

### GET `/api/forms/[id]/api-config`

Obtiene la configuración actual de la API (requiere autenticación del CRM).

### POST `/api/forms/[id]/api-config`

Crea o actualiza la configuración de la API (requiere autenticación del CRM).

**Body**:
```json
{
  "isEnabled": true,
  "isPublic": false
}
```

### PATCH `/api/forms/[id]/api-config`

Regenera el token de la API (requiere autenticación del CRM).

**Body**:
```json
{
  "regenerateToken": true
}
```

## 🛠️ Arquitectura

```
┌─────────────────┐
│   Formulario    │
│   Configuración │
└────────┬────────┘
         │
         ├─── isEnabled (bool)
         ├─── isPublic (bool)
         └─── apiToken (string|null)
         
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
         ├─── Validar Habilitada
         │
         ├─── Validar Acceso
         │    ├─── Público: ✓
         │    └─── Privado: Verificar Token
         │
         └─── Retornar Leads
              └─── Paginación
```

## 📝 Notas

- Los leads se obtienen filtrando por `sourceFormId`
- Los leads incluyen información de la variante si procede de una
- La paginación está limitada a 100 resultados por página para optimizar rendimiento
- Los leads se ordenan por `createdAt` descendente (más recientes primero)

## 🐛 Troubleshooting

### Error: "La API no está habilitada"
✅ Ve a la pestaña API y activa el switch "Habilitar API"

### Error: "Token de autorización inválido"
✅ Verifica que el token sea correcto y esté en el header `Authorization: Bearer {token}`
✅ Asegúrate de que el acceso no sea público (si es público, no necesitas token)

### Error: "Formulario no encontrado"
✅ Verifica que el ID del formulario sea correcto
✅ Verifica que el formulario pertenezca a tu organización

## 🎨 Interfaz de Usuario

La configuración de API incluye:

- ✅ Toggle para habilitar/deshabilitar API
- ✅ Toggle para configurar acceso público/privado
- ✅ Visualización del token (solo acceso privado)
- ✅ Botón para regenerar token
- ✅ Botones para copiar URL y token
- ✅ Ejemplo de uso con curl
- ✅ Documentación de parámetros inline

## 📚 Ejemplo de Integración

### JavaScript/TypeScript

```typescript
const formId = "clxxxx";
const apiToken = "noxy_abc123..."; // Solo si es privado
const apiUrl = `https://tu-dominio.com/api/forms/${formId}/leads`;

// Público
const response = await fetch(`${apiUrl}?page=1&limit=50`);

// Privado
const response = await fetch(`${apiUrl}?page=1&limit=50`, {
  headers: {
    'Authorization': `Bearer ${apiToken}`
  }
});

const data = await response.json();
console.log(data.data.leads);
```

### Python

```python
import requests

form_id = "clxxxx"
api_token = "noxy_abc123..."  # Solo si es privado
api_url = f"https://tu-dominio.com/api/forms/{form_id}/leads"

# Público
response = requests.get(f"{api_url}?page=1&limit=50")

# Privado
headers = {"Authorization": f"Bearer {api_token}"}
response = requests.get(f"{api_url}?page=1&limit=50", headers=headers)

data = response.json()
print(data["data"]["leads"])
```

## 🎉 ¡Listo!

Ahora puedes consultar los leads de tus formularios desde cualquier aplicación o servicio externo.
