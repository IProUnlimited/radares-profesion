# Radares-Profesion 🎯

**22 radares especializados por profesión** conectados al backend `crm-agente-api.onrender.com`. 
Sitio 100% estático con diseño moderno, generado dinámicamente desde `professions.json`.

---

## 🚀 Desarrollo Local

### Iniciar servidor
```bash
node serve.js
# Abre http://localhost:8080
```

### Regenerar radares (después de cambios en professions.json)
```bash
node generate.js
```

### Modo watch (regenera automáticamente)
```bash
node generate.js --watch
```

---

## 📁 Estructura

```
.
├── generate.js              # Generador de HTMLs (incluye watch mode)
├── serve.js                 # Servidor de desarrollo
├── styles.css               # Estilos modernos (compartidos)
├── professions.json         # Datos de profesiones (22 radares)
├── index.html               # Página principal (auto-generada)
└── radar-*.html             # 22 radares especializados (auto-generados)
```

---

## 🎨 Diseño

**Sistema moderno minimalista:**
- 📐 Tipografía sofisticada (Inter, system fonts)
- 🌊 Gradientes lineales dinámicos por profesión
- ✨ Animaciones sutiles (hover, transiciones fluidas)
- 🎭 Efectos de reflex en cards
- ♿ Accesibilidad WCAG AA+ (light mode + dark mode)
- 📱 Responsive (mobile, tablet, desktop)

**Colores dinámicos:**
Cada profesión tiene su propio color (`--c` variable CSS), aplicado a headers, botones y accents.

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

---

## 📊 Estadísticas

- **22 radares** especializados
- **~450 líneas CSS** (externo, compartido)
- **~200 líneas JS** por radar (inline, autocontenido)
- **~7 KB HTML promedio** por radar
- **100% responsive**

---

## 🐛 Bugs Recientes (Arreglados)

✅ XSS vulnerability en escapado de comillas (escapeH)
✅ Pluralización incorrecta ("1 fuentes" → "1 fuente")
✅ Paréntesis sin cerrar en mensajes de error

---

## 💡 Roadmap

- [ ] Screenshot automático en CI/CD
- [ ] Tests de validación para professions.json
- [ ] Minificación CSS/JS
- [ ] Service worker para offline
- [ ] Análisis de performance (Lighthouse)

---

**Made with ❤️ for Inmoworking Pro**
