# Radares-Profesion (Lendar)

Sitio estático con 22 radares especializados por profesión, conectados al backend
`crm-agente-api.onrender.com`. Cada profesión tiene su propio HTML autogenerado
desde `professions.json` por `generate.js`.

## Desarrollo local

```bash
node serve.js   # http://localhost:8080
```

## Regenerar HTMLs

```bash
node generate.js
```

Lee `professions.json` y produce `index.html` + `radar-<profesion>.html` × 22.

## Fuentes

`professions.json` lista las fuentes operativas por profesión (subset honesto
alineado con `lead-generator.js` del backend, post-audit
`5-config-docs/DECISION-gap-fuentes-radar.md`). Las profesiones sin fuente
específica usan el fallback genérico (Foursquare / OSM / Google Places).

## Deploy

Sitio 100% estático (sin build step). Compatible con Cloudflare Pages, Vercel,
Netlify, GitHub Pages, o cualquier subdominio que sirva los HTMLs sueltos.

CORS: el backend acepta `localhost`, `*.pages.dev`, `*.vercel.app` y los
orígenes IWPro. Para otros, añadir el origen al allowlist en
`crm-agente-api/src/app.js`.
