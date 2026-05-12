# Radares-Profesion 🎯

**30 radares especializados por profesión** agrupados en 6 categorías, conectados al backend `crm-agente-api.onrender.com`. 
Sitio 100% estático con diseño moderno, tracker de leads persistente, y sistema de validación robusto generado dinámicamente desde `professions.json`.

---

## 🚀 Desarrollo Local

### Instalar dependencias
```bash
npm install
```

### Iniciar servidor de desarrollo
```bash
npm start
# Abre http://localhost:8080
```

### Regenerar radares (después de cambios en professions.json)
```bash
npm run generate
```

### Modo watch (regenera automáticamente)
```bash
npm run watch
```

### Ejecutar tests
```bash
npm test
```

### Validar professions.json
```bash
npm run validate
```

### Generar screenshots automáticos
```bash
npm run screenshot
```

---

## 📁 Estructura

```
.
├── generate.js              # Generador de HTMLs + tracker (incluye watch mode)
├── serve.js                 # Servidor estático con caching y GZIP
├── validate.js              # Validador de schema para professions.json
├── test.js                  # Tests unitarios e integración
├── screenshot.js            # Generador automático de screenshots
├── styles.css               # Estilos modernos responsive (compartidos)
├── professions.json         # Datos de profesiones (30 radares en 6 categorías)
├── index.html               # Página principal con categorías (auto-generada)
├── tracker.html             # Panel de gestión de leads (auto-generada)
├── lead.html                # Ficha de detalle de lead (auto-generada)
├── .nojekyll                # Config GitHub Pages
├── .github/workflows/       # CI/CD automation
│   └── build-deploy.yml     # GitHub Actions workflow
└── radar-*.html             # 30 radares especializados (auto-generados)
```

---

## ✨ Características

**Interfaz moderna:**
- 📐 Tipografía sofisticada (Inter, system fonts)
- 🌊 Gradientes lineales dinámicos por profesión
- ✨ Animaciones sutiles (hover, transiciones fluidas)
- 🎭 Efectos visuales en cards
- ♿ Accesibilidad WCAG AA+ (light mode + dark mode persistente)
- 📱 Responsive (mobile, tablet, desktop)

**Funcionalidades:**
- 🏘️ **6 categorías** de profesiones (Inmobiliario, Legal & Fiscal, Construcción, Servicios, Tecnología, Básicos)
- 🔍 **Búsqueda por ciudad** con integración a CRM backend
- 📋 **Tracker persistente** de leads con localStorage
- ⭐ **Favoritos y notas** por lead
- 📊 **Panel de estadísticas** con filtros por profesión y estado
- 📥 **Exportación** a CSV y JSON
- 💾 **Importación** de leads
- 🌙 **Toggle dark/light mode** con persistencia
- ✅ **Validación de datos** automática en build-time

**Seguridad y Calidad:**
- 🛡️ XSS protection (HTML escaping)
- ✓ Tests automatizados (21 tests incluidos)
- 🔄 CI/CD con GitHub Actions
- 📦 Compresión GZIP automática
- 🚀 Deploy automático a GitHub Pages

---

## 📝 Agregar/Editar Profesiones

Edita `professions.json`:

```json
{
  "nueva_profesion": {
    "label": "Nueva Profesión",
    "icon": "🆕",
    "color": "#1e40af",
    "query": "búsqueda en Google Places",
    "multiplier": 1.5,
    "sources": ["source1", "source2"],
    "services": ["Servicio 1", "Servicio 2"]
  }
}
```

Luego regenera:
```bash
node generate.js
```

---

## 🔌 Fuentes de Datos

`professions.json` lista fuentes operativas por profesión:
- **boe_subastas**, **borme_inmobiliarias** — Boletín Oficial
- **google_alerts_reforma** — Google Alerts
- Fallback genérico: Foursquare, OSM, Google Places

---

## 🌐 Deploy

Sitio 100% estático (sin build step). Compatible con:
- ✅ Cloudflare Pages
- ✅ Vercel
- ✅ Netlify
- ✅ GitHub Pages
- ✅ Cualquier servidor de archivos estáticos

### CORS
Backend acepta: `localhost`, `*.pages.dev`, `*.vercel.app`, orígenes IWPro.
Para agregar origen: edita `crm-agente-api/src/app.js`.

### GitHub Pages (Automático con CI/CD)
1. Push a rama `main` activa el workflow `.github/workflows/build-deploy.yml`
2. Se valida `professions.json`, se generan radares, corren tests
3. Se despliega automáticamente a GitHub Pages
4. Sitio disponible en `https://tu-usuario.github.io/radares-profesion`

**Para dominio personalizado:**
1. Descomenta `cname: tu-dominio.com` en el workflow
2. Configura DNS CNAME en tu registrador
3. Habilita "Enforce HTTPS" en GitHub Pages settings

---

## 📊 Estadísticas

- **30 radares** especializados en 6 categorías
- **~1000 líneas CSS** con dark/light mode y variables dinámicas
- **~300 líneas JS** por radar (inline, autocontenido)
- **~10 KB HTML promedio** por radar
- **21 tests** automatizados (100% pass rate)
- **100% responsive** (mobile, tablet, desktop)
- **Validación de schema** en tiempo de build

---

## 🐛 Bugs Recientes (Arreglados)

✅ XSS vulnerability en escapado de comillas (escapeH)
✅ Pluralización incorrecta ("1 fuentes" → "1 fuente")
✅ Paréntesis sin cerrar en mensajes de error

---

## 💡 Roadmap

### ✅ Completado (Fases 1-4)
- [x] Validación de schema en professions.json
- [x] Tests unitarios e integración (21 tests)
- [x] Dark/light mode persistente
- [x] Tracker de leads con localStorage
- [x] Filtros y búsqueda avanzada
- [x] Exportación CSV/JSON
- [x] GitHub Pages setup con .nojekyll
- [x] CI/CD GitHub Actions workflow

### ⏳ Mejoras Futuras
- [ ] Minificación CSS/JS (opcional)
- [ ] Screenshot automático en CI/CD (en desarrollo)
- [ ] Service worker para offline
- [ ] Análisis de performance (Lighthouse)
- [ ] Panel de administración para editar professions.json
- [ ] Búsqueda multi-profesión
- [ ] Estadísticas de leads por radar
- [ ] Integración con Slack/Email para notificaciones

---

**Made with ❤️ for Inmoworking Pro**
