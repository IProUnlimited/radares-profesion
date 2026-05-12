# Nexo Leads Backend API

Backend gratuito para generación de leads usando OpenStreetMap y datos públicos de Google Maps.

## Arquitectura

```
┌─────────────────────┐
│  Frontend           │
│ nexoleads.inmowork  │
└──────────┬──────────┘
           │ HTTP + Token
           ▼
┌─────────────────────────────────────┐
│  Backend API (Node.js + Express)    │
│  - /auth/login → Generar token      │
│  - /api/search → Búsqueda leads     │
│  - /api/search-with-reviews → +data │
└──────┬──────────────────┬───────────┘
       │                  │
       ▼                  ▼
┌──────────────────┐  ┌─────────────┐
│ Overpass API     │  │ Google Maps │
│ (OSM Database)   │  │ (Reviews)   │
│ - Hospitales     │  │ - Ratings   │
│ - Hoteles        │  │ - Reviews   │
│ - Constructoras  │  │ - Metadata  │
│ (100% Gratuito)  │  │(Scraping OK)│
└──────────────────┘  └─────────────┘
```

## Features

✅ **Búsqueda de POIs** - Hospitales, hoteles, constructoras, etc.  
✅ **Teléfono y dirección** - Desde OpenStreetMap  
✅ **Reviews y ratings** - Desde Google Maps (responsable)  
✅ **Cache en memoria** - Resultados almacenados 1-6 horas  
✅ **Autenticación por token** - Login requerido  
✅ **100% Gratuito** - Sin APIs de pago  

## Setup Local

```bash
cd backend-api
npm install
npm start
```

Servidor corre en `http://localhost:3000`

## Deploy en Render

### Opción 1: Desde GitHub (Recomendado)

1. Push a GitHub: `git push origin main`
2. En Render: New → Web Service
3. Conectar repositorio
4. Build command: `cd backend-api && npm install`
5. Start command: `cd backend-api && npm start`
6. Agregar env vars:
   - `CORS_ORIGIN=https://nexoleads.inmoworkingpro.es`
   - `LOGIN_PASSWORD=nexoleads123` (cambiar en producción)

### Opción 2: Deploy Manual

```bash
# Crear nuevo Web Service en Render
# Copiar URL: https://nexo-leads-api.onrender.com

# En frontend, cambiar endpoint a:
const API_URL = 'https://nexo-leads-api.onrender.com';
```

## Endpoints

### POST /auth/login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"nexoleads123"}'

# Response:
{
  "success": true,
  "token": "eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJsb2dpblRpbWUiOjE3MTAwMDAwMDB9",
  "user": {"email":"user@example.com"},
  "expiresIn": 86400
}
```

### GET /api/search
```bash
curl -X GET "http://localhost:3000/api/search?profession=hospitales&city=Madrid" \
  -H "Authorization: Bearer TOKEN_AQUI"

# Response:
{
  "success": true,
  "count": 42,
  "data": [
    {
      "id": 123456,
      "name": "Hospital San Juan",
      "address": "Calle Principal 123, Madrid",
      "phone": "+34-912-345-678",
      "website": "https://hospital-sanjuan.es",
      "city": "Madrid",
      "category": "hospitales",
      "source": "OpenStreetMap"
    },
    ...
  ]
}
```

### GET /api/search-with-reviews
```bash
curl -X GET "http://localhost:3000/api/search-with-reviews?profession=hoteles&city=Barcelona" \
  -H "Authorization: Bearer TOKEN_AQUI"

# Response:
{
  "success": true,
  "count": 28,
  "data": [
    {
      "id": 654321,
      "name": "Hotel Magna",
      "address": "Paseo de Gracia 45, Barcelona",
      "phone": "+34-933-456-789",
      "rating": 4.5,
      "reviewCount": 234,
      "recentReviews": [
        {
          "author": "Carlos M.",
          "rating": 5,
          "text": "Excelente atención",
          "date": "2024-03-15"
        }
      ]
    },
    ...
  ]
}
```

## Datos Soportados

### Profesiones

| Profesión | OSM Tag | Ejemplo |
|-----------|---------|---------|
| Hospitales | `amenity=hospital` | Hospital San Juan |
| Hoteles | `tourism=hotel` | Hotel Magna |
| Museos | `tourism=museum` | Museo del Prado |
| Estadios | `leisure=stadium` | Estadio Santiago Bernabéu |
| Constructoras | `shop=doityourself` | Materiales de Construcción |
| Polideportivos | `leisure=sports_centre` | Polideportivo Municipal |
| Farmacias | `amenity=pharmacy` | Farmacia López |
| Bancos | `amenity=bank` | Banco Bilbao Vizcaya |

## Optimizaciones Futuras

- [ ] Database PostgreSQL para persistencia
- [ ] Cache distribuido (Redis)
- [ ] Búsqueda multi-profesión
- [ ] Filtros por rating/reviews
- [ ] Export a CSV
- [ ] Stats y analytics
- [ ] API Key por usuario

## Límites y Consideraciones

⚠️ **Overpass API**: 
- Máx 3 requests/segundo por IP
- Queries complejas pueden tardar 10-30s
- Sin limitaciones de volumen

⚠️ **Google Maps Scraping**:
- Responsable: delays de 2-3s entre requests
- Respeta robots.txt
- No usar para automatización masiva
- Para volumen alto: usar SerpAPI (con costo bajo)

## Troubleshooting

### "No se encontraron leads"
- Verificar nombre de profesión (use minúsculas)
- Verificar ciudad existe en OSM
- Probar con ciudad mayor (ej: Madrid en lugar de pueblo)

### "Token inválido"
- Verificar header: `Authorization: Bearer TOKEN`
- Token expira en 24 horas
- Login nuevamente

### Búsqueda lenta
- Normal: primera búsqueda tarda 10-30s (Overpass)
- Segunda búsqueda es instantánea (cache)
- Cache dura 1 hora para búsquedas simples

## Licencia

Datos de OpenStreetMap (ODbL)  
Respeto a términos de Google Maps
