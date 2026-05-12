"use strict";
/**
 * Generador de radares especializados por profesión.
 * Lee professions.json y produce un HTML autocontenido por cada profesión
 * + un index.html que lista todos los radares.
 *
 * Uso: node generate.js [--watch]
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PROFS_FILE = path.join(ROOT, "professions.json");
const API_BASE = "https://crm-agente-api.onrender.com";

// Load professions.json
let PROFS = {};
function loadProfs() {
  try {
    PROFS = JSON.parse(fs.readFileSync(PROFS_FILE, "utf8"));
  } catch (e) {
    console.error("❌ Error reading professions.json:", e.message);
    process.exit(1);
  }
}

// Validate professions schema
function validateProfs() {
  const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
  const KEY_REGEX = /^[a-z0-9_]+$/;
  const REQUIRED_FIELDS = ['label', 'icon', 'color', 'query', 'multiplier', 'sources', 'services'];

  const errors = [];
  const keys = Object.keys(PROFS);

  for (const key of keys) {
    // Validate key format
    if (!KEY_REGEX.test(key)) {
      errors.push(`Key "${key}" must be lowercase alphanumeric with underscores only`);
    }

    const prof = PROFS[key];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(field in prof)) {
        errors.push(`"${key}": Missing required field "${field}"`);
      }
    }

    // Validate types and values
    if (prof.label && typeof prof.label !== 'string') {
      errors.push(`"${key}".label: Must be a string`);
    }
    if (prof.color && !HEX_COLOR_REGEX.test(prof.color)) {
      errors.push(`"${key}".color: Must be valid hex color (#RRGGBB), got "${prof.color}"`);
    }
    if (typeof prof.multiplier !== 'number' || prof.multiplier < 1.0 || prof.multiplier > 2.0) {
      errors.push(`"${key}".multiplier: Must be number between 1.0-2.0, got ${prof.multiplier}`);
    }
    if (!Array.isArray(prof.services) || prof.services.length === 0) {
      errors.push(`"${key}".services: Must be non-empty array`);
    }
    if (!Array.isArray(prof.sources)) {
      errors.push(`"${key}".sources: Must be array`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ Validation errors (${errors.length}):`);
    errors.forEach(e => console.error(`   ${e}`));
    process.exit(1);
  }
}

loadProfs();
validateProfs();

function htmlEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function radarHtml(key, p) {
  const services = p.services.map(s => `<li>${htmlEscape(s)}</li>`).join("");
  const sources = p.sources.length
    ? p.sources.map(s => `<code>${htmlEscape(s)}</code>`).join(" · ")
    : `<em>Directorios públicos (OSM · Google Places · Foursquare)</em>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Radar ${htmlEscape(p.label)} — IWPro</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="styles.css">
<style>
:root{--c:${p.color}}
</style>
</head>
<body>
<header class="radar-header" style="display:flex;justify-content:space-between;align-items:flex-start">
  <div style="flex:1">
    <a href="index.html" class="back">← Todos los radares</a>
    <div class="icon">${p.icon}</div>
    <h1>Radar ${htmlEscape(p.label)}</h1>
    <p>Captación de leads especializada para ${htmlEscape(p.label.toLowerCase())}</p>
  </div>
  <button id="radarThemeToggle" style="background:none;border:none;font-size:24px;cursor:pointer;margin-top:8px">🌙</button>
</header>
<main class="radar-main">
  <div id="fileWarn" class="file-warn" style="display:none">
  ⚠ Estás abriendo este radar como archivo local. El backend rechaza CORS desde <code>file://</code>.<br>
  Ejecuta <code>node serve.js</code> en <code>C:\\Radares-Profesion</code> y abre <code>http://localhost:8080</code>.
  </div>
  <script>if(location.protocol==='file:')document.getElementById('fileWarn').style.display='block';</script>
  <section class="panel">
    <h2>Buscar leads</h2>
    <div class="row">
      <input id="city" type="text" placeholder="Ciudad (ej. Madrid)" value="Madrid">
      <input id="count" type="number" min="1" max="50" value="10" style="max-width:90px">
      <button id="go">Generar leads</button>
    </div>
    <div id="history" style="margin-top:8px;font-size:12px;color:#94a3b8"></div>
    <div class="row" style="margin-top:10px">
      <input id="email" type="email" placeholder="Email del CRM" autocomplete="username">
      <input id="pass" type="password" placeholder="Contraseña" autocomplete="current-password">
      <button id="login" type="button" style="background:#334155">Iniciar sesión</button>
    </div>
    <div id="authStatus" style="font-size:12px;color:#94a3b8;margin-top:6px"></div>
    <div id="err" class="error"></div>
    <div class="meta" style="margin-top:14px">
      <span>Profesión: <b>${htmlEscape(p.label)}</b></span>
      <span>Multiplicador score: <b>×${p.multiplier}</b></span>
      <span>Query: <b>${htmlEscape(p.query)}</b></span>
    </div>
  </section>

  <section class="panel">
    <h2>Servicios cubiertos</h2>
    <ul class="services">${services}</ul>
  </section>

  <section class="panel">
    <h2>Fuentes activas</h2>
    <p style="margin:0;color:#cbd5e1;font-size:13px">${sources}</p>
  </section>

  <section class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">Resultados</h2>
      <button id="csvBtn" style="background:#334155;padding:8px 12px;border:1px solid #475569;border-radius:6px;color:#f0f4f8;font-size:12px;cursor:pointer;display:none">📥 Descargar CSV</button>
    </div>
    <div id="results"><div class="empty">Pulsa "Generar leads" para empezar</div></div>
  </section>
</main>
<footer>Inmoworking Pro · Radar Especializado · ${htmlEscape(p.label)}</footer>
<script>
const PROFESSION = ${JSON.stringify(key)};
const API_BASE = ${JSON.stringify(API_BASE)};
const $ = sel => document.querySelector(sel);
const btn = $('#go'), errBox = $('#err'), out = $('#results');

function token(){ return localStorage.getItem('iwp_token') || localStorage.getItem('iwpro_token') || ''; }
function setTok(v){ localStorage.setItem('iwp_token', v); localStorage.setItem('iwpro_token', v); }
function clearTok(){ localStorage.removeItem('iwp_token'); localStorage.removeItem('iwpro_token'); }

const authStatus = $('#authStatus');
function refreshAuthUi(){
  if(token()){ authStatus.innerHTML = '✅ Sesión activa <a href="#" id="logout" style="color:#fca5a5;margin-left:8px">cerrar sesión</a>'; const lo = document.getElementById('logout'); if(lo) lo.onclick=(e)=>{e.preventDefault();clearTok();refreshAuthUi();}; }
  else { authStatus.textContent = 'No hay sesión — introduce email y contraseña del CRM'; }
}
refreshAuthUi();
$('#email').value = localStorage.getItem('iwp_email') || '';

async function doLogin(){
  const email = $('#email').value.trim();
  const password = $('#pass').value;
  if(!email || !password){ authStatus.textContent='Faltan email o contraseña'; return; }
  authStatus.textContent='Iniciando sesión…';
  try{
    const r = await fetch(API_BASE + '/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const data = await r.json().catch(()=>({error:'respuesta no-JSON'}));
    if(!r.ok) throw new Error(data.error || ('HTTP '+r.status));
    if(!data.token) throw new Error('Login sin token en respuesta');
    setTok(data.token);
    localStorage.setItem('iwp_email', email);
    $('#pass').value='';
    refreshAuthUi();
  }catch(e){ authStatus.style.color='#fca5a5'; authStatus.textContent='Error: '+e.message; setTimeout(()=>{authStatus.style.color='';refreshAuthUi();},3500); }
}
$('#login').addEventListener('click', doLogin);
$('#pass').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

async function generate(){
  errBox.textContent = '';
  const city = $('#city').value.trim();
  const count = parseInt($('#count').value,10) || 10;
  const cityInput = $('#city');
  if(!city){ errBox.textContent='Introduce una ciudad'; cityInput.classList.add('input-invalid'); setTimeout(()=>cityInput.classList.remove('input-invalid'),2500); return; }
  cityInput.classList.remove('input-invalid'); cityInput.classList.add('input-valid');
  if(!token() && $('#email').value.trim() && $('#pass').value){
    await doLogin();
    if(!token()) return;
  }
  btn.disabled = true; btn.innerHTML = '<span class="spinner">⏳</span> Buscando…';
  out.innerHTML = '<div class="empty">Consultando fuentes…</div>';
  document.getElementById('csvBtn').style.display = 'none';
  const hist = JSON.parse(localStorage.getItem('iwp_history')||'[]');
  if(!hist.includes(city)){ hist.unshift(city); hist.splice(5); localStorage.setItem('iwp_history', JSON.stringify(hist)); }
  updateHistory();
  try{
    const r = await fetch(API_BASE + '/api/radar/admin/generate', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...(token() ? {'Authorization':'Bearer '+token()} : {})
      },
      body: JSON.stringify({ profession: PROFESSION, city, count })
    });
    const data = await r.json().catch(()=>({error:'respuesta no-JSON'}));
    if(!r.ok){ throw new Error(data.error || ('HTTP '+r.status)); }
    window.lastData = data;
    render(data);
    if(data.leads && data.leads.length > 0) document.getElementById('csvBtn').style.display = 'block';
  }catch(e){
    const tip = location.protocol === 'file:' ? ' — ABRE ESTA PÁGINA VÍA http://localhost (ejecuta: node serve.js)' : ' — revisa token o conexión';
    errBox.textContent = 'Error: ' + e.message + tip;
    out.innerHTML = '<div class="empty">Sin resultados</div>';
  }finally{
    btn.disabled = false; btn.textContent = 'Generar leads';
  }
}
function updateHistory(){
  const hist = JSON.parse(localStorage.getItem('iwp_history')||'[]');
  const histEl = document.getElementById('history');
  if(hist.length === 0){ histEl.innerHTML = ''; return; }
  histEl.innerHTML = 'Últimas: ' + hist.map(c => '<button style="background:none;border:none;color:#3b82f6;cursor:pointer;text-decoration:underline;font-size:12px;padding:0;margin-right:8px" data-city="'+c+'">'+c+'</button>').join('');
  histEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => { $('#city').value = btn.dataset.city; generate(); });
  });
}
$('#city').addEventListener('input', () => {
  const city = $('#city').value.trim();
  if(city.length > 0){ $('#city').classList.add('input-valid'); $('#city').classList.remove('input-invalid'); }
  else{ $('#city').classList.remove('input-valid'); }
});
document.getElementById('csvBtn').addEventListener('click', () => {
  const data = window.lastData || {};
  const leads = data.leads || [];
  if(!leads.length){ showToast('Sin leads para exportar'); return; }
  const rows = [['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Score', 'Fecha']];
  leads.forEach(l => {
    const raw = l.raw_data || {};
    rows.push([l.name || '', l.email || '', l.phone || '', raw.city || '', raw.priority_score || l.priority_score || '', new Date().toLocaleDateString()]);
  });
  const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', PROFESSION + '-' + new Date().toISOString().split('T')[0] + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('✓ CSV descargado');
});
updateHistory();

function render(data){
  const leads = data.leads || [];
  if(!leads.length){ out.innerHTML = '<div class="empty">No se encontraron leads'+(data.message ? ': '+escapeH(data.message) : '')+'</div>'; return; }
  out.innerHTML = leads.map((l, i) => {
    const raw = l.raw_data || {};
    const score = raw.priority_score || l.priority_score || '';
    const email = l.email || '';
    const phone = l.phone || '';
    const name = l.name || '(sin nombre)';
    const city = raw.city || '';
    return '<div class="lead" style="animation-delay:'+(i*50)+'ms">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
      +'<div style="flex:1"><h3 style="margin:0">'+escapeH(name)+(score?'<span class="score">'+score+'</span>':'')+'</h3></div>'
      +'<button class="fav-btn" data-email="'+escapeH(email)+'" data-phone="'+escapeH(phone)+'" data-name="'+escapeH(name)+'" data-city="'+escapeH(city)+'" style="background:none;border:none;font-size:18px;cursor:pointer;padding:0;flex-shrink:0">☆</button>'
      +'</div>'
      +'<div class="l-meta">'
      + (phone?'<span class="copyable" style="cursor:pointer;border-bottom:1px dashed #666;padding:0 2px" title="Click para copiar">📞 '+escapeH(phone)+'</span> · ':'')
      + (email?'<span class="copyable" style="cursor:pointer;border-bottom:1px dashed #666;padding:0 2px" title="Click para copiar">✉ '+escapeH(email)+'</span> · ':'')
      + (city?'📍 '+escapeH(city):'')
      + '</div>'
      + (l.notes?'<div class="l-meta" style="margin-top:6px">'+escapeH(l.notes)+'</div>':'')
      +'</div>';
  }).join('');
  setupRadarListeners();
}
function setupRadarListeners(){
  document.querySelectorAll('.fav-btn').forEach(btn=>{
    const key = btn.dataset.email + '|' + btn.dataset.phone;
    const favs = JSON.parse(localStorage.getItem('iwp_favs')||'{}');
    if(favs[key]) btn.textContent='⭐';
    btn.addEventListener('click',e=>{
      e.preventDefault();
      const favs = JSON.parse(localStorage.getItem('iwp_favs')||'{}');
      if(favs[key]){ delete favs[key]; btn.textContent='☆'; showToast('✓ Eliminado de favoritos'); }
      else{ favs[key]={email:btn.dataset.email,phone:btn.dataset.phone,name:btn.dataset.name,city:btn.dataset.city,prof:PROFESSION,date:new Date().toISOString()}; btn.textContent='⭐'; showToast('✓ Favorito guardado'); }
      localStorage.setItem('iwp_favs', JSON.stringify(favs));
    });
  });
  document.querySelectorAll('.copyable').forEach(el=>{
    el.addEventListener('click',e=>{
      const text = el.textContent.split(' ')[1];
      navigator.clipboard.writeText(text).then(()=>showToast('✓ Copiado: '+text)).catch(()=>showToast('❌ Error'));
    });
  });
}
function showToast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:20px;right:20px;background:#1e293b;color:#f0f4f8;padding:12px 16px;border-radius:8px;font-size:13px;z-index:9999;border:1px solid #333;animation:slideIn 0.3s ease';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}
function escapeH(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
btn.addEventListener('click', generate);
$('#city').addEventListener('keydown', e=>{ if(e.key==='Enter') generate(); });
</script>
</body>
</html>`;
}

function indexHtml(profs) {
  const byCategory = {};
  const categoryOrder = ['Inmobiliario', 'Legal & Fiscal', 'Construcción & Reforma', 'Servicios Especializados', 'Decoración & Tecnología', 'Servicios Básicos'];

  for (const [key, p] of Object.entries(profs)) {
    const cat = p.category || 'Otros';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push([key, p]);
  }

  // Generate data JSON for search
  const profsData = Object.entries(profs).map(([key, p]) => ({
    key,
    label: p.label,
    category: p.category,
    icon: p.icon,
    color: p.color,
    multiplier: p.multiplier,
    sources: p.sources,
    services: p.services
  }));

  const sections = categoryOrder
    .filter(cat => byCategory[cat])
    .map(cat => {
      const entries = byCategory[cat];
      const cards = entries.map(([key, p]) => {
        const sourcesText = p.sources.length
          ? p.sources.length + (p.sources.length === 1 ? ' fuente' : ' fuentes')
          : 'directorios públicos';
        return `
    <a class="card" href="radar-${key}.html" style="--c:${p.color}" data-key="${key}" data-category="${p.category}">
      <div class="ico">${p.icon}</div>
      <div class="lbl">${htmlEscape(p.label)}</div>
      <div class="sub">×${p.multiplier} · ${sourcesText}</div>
    </a>`;
      }).join("");
      return `
  <section class="category" data-category="${cat}">
    <h2>${cat} (<span class="cat-count">${entries.length}</span>)</h2>
    <div class="grid">${cards}</div>
  </section>`;
    }).join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Radares por Profesión — IWPro</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="styles.css">
<script>const t=localStorage.getItem('theme')||'auto';const d=window.matchMedia('(prefers-color-scheme:dark)').matches;const isDark=t==='auto'?d:t==='dark';document.documentElement.classList.toggle('dark-mode',isDark);</script>
</head>
<body>
<header style="display:flex;justify-content:space-between;align-items:center">
  <div>
    <h1>Radares Especializados por Profesión</h1>
    <p>${Object.keys(profs).length} radares agrupados en ${categoryOrder.length} categorías · Conectado a CRM Propium</p>
  </div>
  <button id="themeToggle" style="background:none;border:none;font-size:24px;cursor:pointer;height:fit-content">🌙</button>
</header>
<main>
  <section class="search-section">
    <input type="text" id="searchInput" class="search-input" placeholder="Buscar por profesión, categoría o servicio...">
    <div class="filters">
      <select id="categoryFilter" class="filter-select">
        <option value="">Todas las categorías</option>
        ${categoryOrder.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
      <input type="range" id="multiplierFilter" class="filter-range" min="1" max="2" step="0.1" value="2" title="Multiplicador máximo">
      <span id="multiplierValue" class="filter-value">Todas (×1.0-×2.0)</span>
      <button id="resetBtn" class="reset-btn">Limpiar filtros</button>
    </div>
  </section>

  <div id="results">${sections}</div>

  <div id="noResults" class="empty-state" style="display:none">
    <p>❌ No se encontraron radares con esos criterios</p>
  </div>
</main>
<footer>Cada radar dispara las fuentes específicas de su profesión y aplica el multiplicador de score sectorial.</footer>
<script>
const PROFESSIONS = ${JSON.stringify(profsData)};
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const multiplierFilter = document.getElementById('multiplierFilter');
const multiplierValue = document.getElementById('multiplierValue');
const resetBtn = document.getElementById('resetBtn');
const resultsDiv = document.getElementById('results');
const noResults = document.getElementById('noResults');

function updateMultiplierLabel() {
  const val = parseFloat(multiplierFilter.value);
  multiplierValue.textContent = '×1.0 hasta ×' + val.toFixed(1);
}

function filterRadares() {
  const search = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const maxMult = parseFloat(multiplierFilter.value);

  const cards = document.querySelectorAll('.card');
  let visibleCount = 0;
  let visibleByCategory = {};

  cards.forEach(card => {
    const key = card.dataset.key;
    const prof = PROFESSIONS.find(p => p.key === key);

    const matchSearch = !search ||
      prof.label.toLowerCase().includes(search) ||
      prof.category.toLowerCase().includes(search) ||
      prof.services.some(s => s.toLowerCase().includes(search));

    const matchCategory = !category || prof.category === category;
    const matchMult = prof.multiplier <= maxMult;

    const visible = matchSearch && matchCategory && matchMult;
    card.style.display = visible ? 'block' : 'none';

    if (visible) {
      visibleCount++;
      if (!visibleByCategory[prof.category]) visibleByCategory[prof.category] = 0;
      visibleByCategory[prof.category]++;
    }
  });

  // Update category counts and visibility
  document.querySelectorAll('.category').forEach(section => {
    const cat = section.dataset.category;
    const count = visibleByCategory[cat] || 0;
    section.style.display = count > 0 ? 'block' : 'none';
    section.querySelector('.cat-count').textContent = count;
  });

  noResults.style.display = visibleCount === 0 ? 'block' : 'none';
}

searchInput.addEventListener('input', filterRadares);
categoryFilter.addEventListener('change', filterRadares);
multiplierFilter.addEventListener('input', () => {
  updateMultiplierLabel();
  filterRadares();
});
resetBtn.addEventListener('click', () => {
  searchInput.value = '';
  categoryFilter.value = '';
  multiplierFilter.value = '2';
  updateMultiplierLabel();
  filterRadares();
});

updateMultiplierLabel();

const themeToggle = document.getElementById('themeToggle');
function updateThemeButton(){
  const t = localStorage.getItem('theme') || 'auto';
  themeToggle.textContent = t === 'dark' ? '☀️' : t === 'light' ? '🌙' : '⚪';
}
themeToggle.addEventListener('click', () => {
  const themes = ['auto', 'light', 'dark'];
  const curr = localStorage.getItem('theme') || 'auto';
  const next = themes[(themes.indexOf(curr) + 1) % themes.length];
  localStorage.setItem('theme', next);
  const d = window.matchMedia('(prefers-color-scheme:dark)').matches;
  const isDark = next === 'auto' ? d : next === 'dark';
  document.documentElement.classList.toggle('dark-mode', isDark);
  updateThemeButton();
});
updateThemeButton();
</script>
</body></html>`;
}

// ── Generación ─────────────────────────────────────────────────────────────
function generate() {
  let count = 0;
  for (const [key, p] of Object.entries(PROFS)) {
    const file = path.join(ROOT, `radar-${key}.html`);
    fs.writeFileSync(file, radarHtml(key, p), "utf8");
    count++;
    console.log(`✓ radar-${key}.html`);
  }
  fs.writeFileSync(path.join(ROOT, "index.html"), indexHtml(PROFS), "utf8");
  console.log(`✓ index.html\n${count} radares generados en ${ROOT}`);
}

// Modo generación normal
if (!process.argv.includes('--watch')) {
  generate();
} else {
  // Modo watch con debouncing
  let watchTimeout;
  console.log('👀 Modo watch activado. Regenerando cuando cambie professions.json...\n');
  generate();
  fs.watchFile(PROFS_FILE, () => {
    clearTimeout(watchTimeout);
    watchTimeout = setTimeout(() => {
      console.log('\n📝 professions.json cambió, regenerando...\n');
      try {
        loadProfs();
        validateProfs();
        generate();
      } catch (e) {
        console.error('❌ Error:', e.message);
      }
    }, 200);
  });
}
