# Deploy Backend en Render

## Paso 1: Crear nuevo Web Service en Render

1. **Abre https://dashboard.render.com**
2. **New → Web Service**
3. **Conecta tu repositorio GitHub**: `radares-profesion`
4. **Configura el servicio:**

   - **Name**: `nexo-leads-api` (o similar)
   - **Runtime**: Node
   - **Build Command**: `cd backend-api && npm install`
   - **Start Command**: `cd backend-api && npm start`
   - **Region**: Frankfurt (Europe) - cercano a España

5. **Agregar Environment Variables** (clic en "Advanced"):

   ```
   PORT = 3000
   NODE_ENV = production
   CORS_ORIGIN = https://nexoleads.inmoworkingpro.es
   LOGIN_PASSWORD = nexoleads123
   ```

   ⚠️ **Importante**: Cambiar `LOGIN_PASSWORD` a algo más seguro en producción

6. **Deploy**: Clic en "Create Web Service"

## Paso 2: Obtener URL del Backend

Después del deploy, Render te asignará una URL como:
```
https://nexo-leads-api.onrender.com
```

**Guarda esta URL**, la necesitas en el Paso 3.

## Paso 3: Actualizar Frontend en generate.js

En `C:\Radares-Profesion\generate.js`, línea 14:

**Cambiar de:**
```javascript
const API_BASE = "https://crm-agente-api.onrender.com";
```

**A:**
```javascript
const API_BASE = "https://nexo-leads-api.onrender.com"; // o la URL que Render te asignó
```

Luego regenera los HTML:
```bash
npm run generate
```

## Paso 4: Verificar Endpoints

Prueba que el backend funcione:

```bash
# Health check
curl https://nexo-leads-api.onrender.com/health

# Login
curl -X POST https://nexo-leads-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"nexoleads123"}'
```

## Paso 5: Deployar Frontend Actualizado

Después de actualizar `generate.js`:

```bash
git add generate.js
git commit -m "Update API endpoint to new Nexo Leads backend"
git push origin main
```

GitHub Actions deployará automáticamente en GitHub Pages.

## Troubleshooting

### "Backend no responde"
- Espera 5-10 minutos para el primer deploy en Render
- Verifica que CORS_ORIGIN esté correcto en env vars
- Chequea logs en Render dashboard

### "CORS error al hacer login"
- Verificar que `CORS_ORIGIN` en Render sea exacto: `https://nexoleads.inmoworkingpro.es`
- No incluir trailing slash

### "Búsquedas lentas"
- Normal: Overpass API toma 10-30s en primera búsqueda
- Resultado se cachea 1 hora (búsquedas posteriores son instantáneas)

## Monitoreo

En Render dashboard puedes ver:
- **Logs**: Actividad del backend
- **Metrics**: CPU, Memoria, Bandwidth
- **Events**: Deploy history

## Próximos Pasos (Opcional)

- Cambiar `LOGIN_PASSWORD` a contraseña más segura
- Implementar base de datos (PostgreSQL) para persistencia
- Agregar Redis para cache distribuido
- Implementar JWT con firma criptográfica en lugar de base64 simple

## URLs Importantes

| Componente | URL |
|-----------|-----|
| **Frontend** | https://nexoleads.inmoworkingpro.es |
| **Backend API** | https://nexo-leads-api.onrender.com |
| **Repositorio** | https://github.com/IProUnlimited/radares-profesion |
| **Render Dashboard** | https://dashboard.render.com |
