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
<footer style="border-top:1px solid #333;padding:12px;margin-top:24px;display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:12px;color:#94a3b8"><span>Inmoworking Pro · ${htmlEscape(p.label)}</span><span style="display:flex;gap:12px"><a href="privacy.html" style="color:#60a5fa;text-decoration:none">Privacidad</a> · <a href="cookies.html" style="color:#60a5fa;text-decoration:none">Cookies</a></span></footer>
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

function extractLeadFields(l){
  const raw = l.raw_data || {};
  return {
    name: l.name || raw.name || '(sin nombre)',
    phone: l.phone || raw.phone || raw.telephone || raw.international_phone_number || '',
    email: l.email || raw.email || '',
    website: l.website || raw.website || raw.url || raw.site || '',
    city: l.city || raw.city || raw.locality || '',
    address: raw.address || raw.formatted_address || raw.vicinity || '',
    rating: raw.rating || '',
    reviews_count: raw.user_ratings_total || raw.reviews_count || '',
    score: raw.priority_score || l.priority_score || '',
    notes: l.notes || raw.notes || ''
  };
}
function makeLeadId(f){
  return btoa(unescape(encodeURIComponent(PROFESSION + '|' + f.name + '|' + f.phone))).replace(/[=+/]/g,'_');
}
window.currentLeads = {};
function render(data){
  const allLeads = data.leads || [];
  const withPhone = allLeads.filter(l => { const f = extractLeadFields(l); return !!f.phone; });
  const skipped = allLeads.length - withPhone.length;
  if(!withPhone.length){
    out.innerHTML = '<div class="empty">No se encontraron leads con teléfono'+(skipped?' ('+skipped+' descartados sin teléfono)':'')+(data.message ? '<br><span style="font-size:12px">'+escapeH(data.message)+'</span>' : '')+'</div>';
    return;
  }
  window.currentLeads = {};
  const header = skipped ? '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">📊 '+withPhone.length+' leads con teléfono ('+skipped+' sin teléfono descartados)</div>' : '';
  out.innerHTML = header + withPhone.map((l, i) => {
    const f = extractLeadFields(l);
    const id = makeLeadId(f);
    window.currentLeads[id] = { raw: l, fields: f };
    const isPremium = f.email && f.website;
    return '<div class="lead" data-lead-id="'+id+'" style="animation-delay:'+(i*50)+'ms">'
      +'<div class="lead-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;cursor:pointer">'
      +'<div style="flex:1">'
      +'<h3 style="margin:0">'
      + (isPremium?'<span title="Lead premium (web+email)" style="margin-right:6px">⭐</span>':'')
      + escapeH(f.name)
      + (f.score?'<span class="score">'+f.score+'</span>':'')
      + (f.rating?'<span style="margin-left:8px;font-size:12px;color:#f59e0b">★ '+f.rating+(f.reviews_count?' ('+f.reviews_count+')':'')+'</span>':'')
      +'</h3>'
      +'</div>'
      +'<span class="lead-toggle" style="font-size:14px;color:var(--text-muted);user-select:none">▼</span>'
      +'</div>'
      +'<div class="l-meta" style="margin-top:6px">'
      + '<span class="copyable" data-copy="'+escapeH(f.phone)+'" style="cursor:pointer;border-bottom:1px dashed #666;padding:0 2px" title="Click para copiar">📞 '+escapeH(f.phone)+'</span>'
      + (f.email?' · <span class="copyable" data-copy="'+escapeH(f.email)+'" style="cursor:pointer;border-bottom:1px dashed #666;padding:0 2px" title="Click para copiar">✉ '+escapeH(f.email)+'</span>':'')
      + (f.website?' · <a href="'+escapeH(f.website)+'" target="_blank" rel="noopener" style="color:var(--c);text-decoration:none" onclick="event.stopPropagation()">🌐 Web</a>':'')
      + (f.city?' · 📍 '+escapeH(f.city):'')
      +'</div>'
      +'<div class="lead-details" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border)">'
      + (f.address?'<div style="margin-bottom:8px;font-size:13px"><b>Dirección:</b> '+escapeH(f.address)+'</div>':'')
      + (f.notes?'<div style="margin-bottom:8px;font-size:13px"><b>Notas:</b> '+escapeH(f.notes)+'</div>':'')
      +'<details style="margin:10px 0"><summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">Ver datos crudos del backend</summary>'
      +'<pre style="background:var(--input-bg);padding:10px;border-radius:6px;font-size:11px;overflow-x:auto;max-height:240px;margin-top:6px">'+escapeH(JSON.stringify(l,null,2))+'</pre>'
      +'</details>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'
      +'<button class="track-btn" data-lead-id="'+id+'" style="background:var(--c);border:0;color:white;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">💾 Guardar en tracker</button>'
      +'<button class="open-lead" data-lead-id="'+id+'" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">📋 Ver ficha completa</button>'
      +'<button class="fav-btn" data-lead-id="'+id+'" style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">☆ Favorito</button>'
      +'</div>'
      +'</div>'
      +'</div>';
  }).join('');
  setupRadarListeners();
}
function saveToTracker(id){
  const data = window.currentLeads[id];
  if(!data) return null;
  const f = data.fields;
  const tracker = JSON.parse(localStorage.getItem('iwp_tracker')||'{}');
  if(!tracker[id]){
    tracker[id] = {
      id: id,
      profession: PROFESSION,
      professionLabel: document.title.replace(/^Radar /,'').replace(/ — IWPro$/,''),
      name: f.name, phone: f.phone, email: f.email, website: f.website,
      city: f.city, address: f.address, score: f.score,
      rating: f.rating, reviews_count: f.reviews_count, notes: f.notes,
      raw_data: data.raw.raw_data || {},
      status: 'pendiente',
      contact_date: '',
      tracker_notes: '',
      events: [{date:new Date().toISOString(),type:'added',note:'Añadido desde radar '+PROFESSION}],
      added_at: new Date().toISOString()
    };
  } else {
    tracker[id].events = tracker[id].events || [];
    tracker[id].events.push({date:new Date().toISOString(),type:'reseen',note:'Re-visto en radar'});
  }
  localStorage.setItem('iwp_tracker', JSON.stringify(tracker));
  return tracker[id];
}
function setupRadarListeners(){
  document.querySelectorAll('.lead-header').forEach(h=>{
    h.addEventListener('click',e=>{
      const lead = h.closest('.lead');
      const det = lead.querySelector('.lead-details');
      const tog = lead.querySelector('.lead-toggle');
      const open = det.style.display !== 'none';
      det.style.display = open ? 'none' : 'block';
      tog.textContent = open ? '▼' : '▲';
    });
  });
  document.querySelectorAll('.track-btn').forEach(btn=>{
    const id = btn.dataset.leadId;
    const tracker = JSON.parse(localStorage.getItem('iwp_tracker')||'{}');
    if(tracker[id]) btn.textContent = '✓ En tracker';
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      saveToTracker(id);
      btn.textContent = '✓ En tracker';
      showToast('✓ Guardado en tracker');
    });
  });
  document.querySelectorAll('.open-lead').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const id = btn.dataset.leadId;
      saveToTracker(id);
      window.open('lead.html?id='+id, '_blank');
    });
  });
  document.querySelectorAll('.fav-btn').forEach(btn=>{
    const id = btn.dataset.leadId;
    const favs = JSON.parse(localStorage.getItem('iwp_favs')||'{}');
    if(favs[id]) btn.textContent='⭐ Favorito';
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const favs = JSON.parse(localStorage.getItem('iwp_favs')||'{}');
      if(favs[id]){ delete favs[id]; btn.textContent='☆ Favorito'; showToast('✓ Eliminado de favoritos'); }
      else{ const data = window.currentLeads[id]; if(data){ favs[id]={...data.fields,prof:PROFESSION,date:new Date().toISOString()}; btn.textContent='⭐ Favorito'; showToast('✓ Favorito guardado'); } }
      localStorage.setItem('iwp_favs', JSON.stringify(favs));
    });
  });
  document.querySelectorAll('.copyable').forEach(el=>{
    el.addEventListener('click',e=>{
      e.stopPropagation();
      const text = el.dataset.copy || el.textContent;
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
  <div style="display:flex;gap:12px;align-items:center;height:fit-content">
    <a href="tracker.html" style="text-decoration:none;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);padding:8px 16px;border-radius:8px;color:var(--accent);font-weight:600;font-size:13px">📋 Tracker</a>
    <button id="themeToggle" style="background:none;border:none;font-size:24px;cursor:pointer">🌙</button>
  </div>
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
<footer style="border-top:1px solid var(--border);padding:16px 24px;margin-top:40px;display:flex;justify-content:space-between;align-items:center;gap:24px;font-size:13px;color:var(--text-muted)"><span>Inmoworking Pro · Radares Especializados</span><span style="display:flex;gap:16px"><a href="privacy.html" style="color:var(--accent);text-decoration:none">Privacidad</a> · <a href="cookies.html" style="color:var(--accent);text-decoration:none">Cookies</a></span></footer>
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

// ── Tracker ────────────────────────────────────────────────────────────────
function trackerHtml(profs) {
  const profOpts = Object.entries(profs).map(([k, p]) => `<option value="${k}">${htmlEscape(p.label)}</option>`).join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Tracker de Leads — IWPro</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="styles.css">
<script>const t=localStorage.getItem('theme')||'auto';const d=window.matchMedia('(prefers-color-scheme:dark)').matches;const isDark=t==='auto'?d:t==='dark';document.documentElement.classList.toggle('dark-mode',isDark);</script>
<style>
:root{--c:#3b82f6}
.tracker-table{width:100%;border-collapse:collapse;font-size:13px}
.tracker-table th{background:var(--input-bg);padding:10px 8px;text-align:left;font-weight:600;border-bottom:2px solid var(--border);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);position:sticky;top:0;z-index:1}
.tracker-table td{padding:10px 8px;border-bottom:1px solid var(--border);vertical-align:middle}
.tracker-table tr:hover{background:var(--input-bg)}
.tracker-table select,.tracker-table input{background:transparent;border:1px solid var(--border);padding:6px 8px;border-radius:6px;color:var(--text);font-size:12px;font-family:inherit;width:100%;min-width:90px}
.tracker-table select:focus,.tracker-table input:focus{outline:none;border-color:var(--c)}
.status-pendiente{color:#f59e0b;border-color:#f59e0b !important}
.status-contactado{color:#3b82f6;border-color:#3b82f6 !important}
.status-interesado{color:#06b6d4;border-color:#06b6d4 !important}
.status-cliente{color:#10b981;border-color:#10b981 !important;font-weight:700}
.status-descartado{color:#94a3b8}
.del-btn{background:transparent !important;border:0 !important;cursor:pointer;color:#fca5a5;font-size:16px;padding:4px 8px !important;width:auto !important;min-width:0 !important}
.del-btn:hover{color:#ef4444}
.lead-link{color:var(--c);text-decoration:none;font-weight:600}
.lead-link:hover{text-decoration:underline}
.stat-card{background:var(--input-bg);padding:14px;border-radius:10px;text-align:center}
.stat-card .num{font-size:24px;font-weight:700;color:var(--c)}
.stat-card .lbl{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px}
</style>
</head>
<body>
<header class="radar-header" style="display:flex;justify-content:space-between;align-items:flex-start">
  <div style="flex:1">
    <a href="index.html" class="back">← Todos los radares</a>
    <h1>📋 Tracker de Leads</h1>
    <p id="trackerCount">Cargando…</p>
  </div>
  <button id="themeToggle" style="background:none;border:none;font-size:24px;cursor:pointer;margin-top:8px">🌙</button>
</header>
<main class="radar-main" style="max-width:1500px">
  <section class="panel">
    <h2>Resumen</h2>
    <div id="stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px"></div>
  </section>
  <section class="panel">
    <h2>Filtros y exportación</h2>
    <div class="row">
      <select id="filterProf" class="filter-select"><option value="">Todas las profesiones</option>${profOpts}</select>
      <select id="filterStatus" class="filter-select">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="contactado">Contactado</option>
        <option value="interesado">Interesado</option>
        <option value="cliente">Cliente</option>
        <option value="descartado">Descartado</option>
      </select>
      <input id="filterSearch" type="text" placeholder="Buscar nombre, ciudad, email…" style="flex:1;min-width:200px;background:var(--input-bg);border:1px solid var(--border);padding:10px;border-radius:6px;color:var(--text);font-family:inherit">
      <button id="exportCSV" style="background:linear-gradient(135deg,var(--c) 0%,#0284c7 100%);border:0;color:white;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-family:inherit">📥 CSV</button>
      <button id="exportJSON" style="background:#475569;border:0;color:white;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-family:inherit">📦 JSON</button>
      <button id="importBtn" style="background:#475569;border:0;color:white;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-family:inherit">📤 Importar</button>
      <input id="importFile" type="file" accept=".json" style="display:none">
    </div>
  </section>
  <section class="panel">
    <h2>Leads guardados</h2>
    <div style="overflow-x:auto">
      <table class="tracker-table">
        <thead>
          <tr>
            <th>Profesión</th><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Web</th>
            <th>Ciudad</th><th>Estado</th><th>Fecha contacto</th><th>Notas</th><th></th>
          </tr>
        </thead>
        <tbody id="leadsBody"></tbody>
      </table>
    </div>
  </section>
</main>
<footer style="border-top:1px solid var(--border);padding:16px 24px;margin-top:40px;display:flex;justify-content:space-between;align-items:center;gap:24px;font-size:13px;color:var(--text-muted)"><span>Inmoworking Pro · Radares Especializados</span><span style="display:flex;gap:16px"><a href="privacy.html" style="color:var(--accent);text-decoration:none">Privacidad</a> · <a href="cookies.html" style="color:var(--accent);text-decoration:none">Cookies</a></span></footer>
<script>
function getTracker(){ return JSON.parse(localStorage.getItem('iwp_tracker')||'{}'); }
function saveTracker(t){ localStorage.setItem('iwp_tracker', JSON.stringify(t)); }
function escapeH(s){return String(s||'').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function showToast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:20px;right:20px;background:#1e293b;color:#f0f4f8;padding:12px 16px;border-radius:8px;font-size:13px;z-index:9999;border:1px solid #333';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

function renderStats(){
  const tracker = getTracker();
  const leads = Object.values(tracker);
  const counts = {total:leads.length,pendiente:0,contactado:0,interesado:0,cliente:0,descartado:0};
  leads.forEach(l => { counts[l.status] = (counts[l.status]||0)+1; });
  document.getElementById('stats').innerHTML =
    '<div class="stat-card"><div class="num">'+counts.total+'</div><div class="lbl">Total</div></div>'
    +'<div class="stat-card"><div class="num" style="color:#f59e0b">'+counts.pendiente+'</div><div class="lbl">Pendiente</div></div>'
    +'<div class="stat-card"><div class="num" style="color:#3b82f6">'+counts.contactado+'</div><div class="lbl">Contactado</div></div>'
    +'<div class="stat-card"><div class="num" style="color:#06b6d4">'+counts.interesado+'</div><div class="lbl">Interesado</div></div>'
    +'<div class="stat-card"><div class="num" style="color:#10b981">'+counts.cliente+'</div><div class="lbl">Cliente</div></div>'
    +'<div class="stat-card"><div class="num" style="color:#94a3b8">'+counts.descartado+'</div><div class="lbl">Descartado</div></div>';
}

function render(){
  const tracker = getTracker();
  const allLeads = Object.values(tracker);
  const profFilter = document.getElementById('filterProf').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const search = document.getElementById('filterSearch').value.toLowerCase();
  const filtered = allLeads.filter(l => {
    if(profFilter && l.profession !== profFilter) return false;
    if(statusFilter && l.status !== statusFilter) return false;
    if(search){
      const txt = (l.name+' '+l.city+' '+l.email+' '+l.phone+' '+(l.professionLabel||'')).toLowerCase();
      if(!txt.includes(search)) return false;
    }
    return true;
  }).sort((a,b)=>(b.added_at||'').localeCompare(a.added_at||''));
  document.getElementById('trackerCount').textContent = filtered.length + ' de ' + allLeads.length + ' leads';
  renderStats();
  const body = document.getElementById('leadsBody');
  if(!filtered.length){
    body.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:32px">'+(allLeads.length?'Ningún lead coincide con los filtros':'No hay leads guardados todavía. Ve a un radar, busca leads y pulsa "Guardar en tracker" sobre uno.')+'</td></tr>';
    return;
  }
  body.innerHTML = filtered.map(l => {
    const statuses = ['pendiente','contactado','interesado','cliente','descartado'];
    return '<tr data-id="'+l.id+'">'
      +'<td>'+escapeH(l.professionLabel||l.profession)+'</td>'
      +'<td><a class="lead-link" href="lead.html?id='+l.id+'">'+escapeH(l.name)+'</a></td>'
      +'<td>'+(l.phone?'<a class="lead-link" href="tel:'+escapeH(l.phone)+'">'+escapeH(l.phone)+'</a>':'<span style="color:var(--text-muted)">—</span>')+'</td>'
      +'<td>'+(l.email?'<a class="lead-link" href="mailto:'+escapeH(l.email)+'">'+escapeH(l.email)+'</a>':'<span style="color:var(--text-muted)">—</span>')+'</td>'
      +'<td>'+(l.website?'<a class="lead-link" href="'+escapeH(l.website)+'" target="_blank" rel="noopener">🌐</a>':'<span style="color:var(--text-muted)">—</span>')+'</td>'
      +'<td>'+escapeH(l.city||'—')+'</td>'
      +'<td><select class="status-sel status-'+l.status+'" data-id="'+l.id+'">'
        + statuses.map(s=>'<option value="'+s+'"'+(l.status===s?' selected':'')+'>'+s+'</option>').join('')
      +'</select></td>'
      +'<td><input class="contact-input" type="date" data-id="'+l.id+'" value="'+escapeH(l.contact_date||'')+'"></td>'
      +'<td><input class="notes-input" type="text" data-id="'+l.id+'" value="'+escapeH(l.tracker_notes||'')+'" placeholder="…"></td>'
      +'<td><button class="del-btn" data-id="'+l.id+'" title="Eliminar">🗑️</button></td>'
      +'</tr>';
  }).join('');
  bindRow();
}

function updateLead(id, field, value){
  const tracker = getTracker();
  if(!tracker[id]) return;
  const old = tracker[id][field];
  if(old === value) return;
  tracker[id][field] = value;
  tracker[id].events = tracker[id].events || [];
  tracker[id].events.push({date:new Date().toISOString(),type:'update',note:field+': '+(old||'∅')+' → '+(value||'∅')});
  saveTracker(tracker);
}

function bindRow(){
  document.querySelectorAll('.status-sel').forEach(s => s.addEventListener('change', () => {
    updateLead(s.dataset.id, 'status', s.value);
    s.className = 'status-sel status-' + s.value;
    renderStats();
    showToast('✓ Estado actualizado');
  }));
  document.querySelectorAll('.contact-input').forEach(i => i.addEventListener('change', () => updateLead(i.dataset.id,'contact_date',i.value)));
  document.querySelectorAll('.notes-input').forEach(i => i.addEventListener('change', () => updateLead(i.dataset.id,'tracker_notes',i.value)));
  document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => {
    if(!confirm('¿Eliminar este lead del tracker? No se puede deshacer.')) return;
    const t = getTracker(); delete t[b.dataset.id]; saveTracker(t); render(); showToast('✓ Eliminado');
  }));
}

document.getElementById('filterProf').addEventListener('change', render);
document.getElementById('filterStatus').addEventListener('change', render);
document.getElementById('filterSearch').addEventListener('input', render);

document.getElementById('exportCSV').addEventListener('click', () => {
  const tracker = getTracker();
  const rows = [['Profesión','Nombre','Teléfono','Email','Web','Ciudad','Dirección','Estado','Fecha contacto','Notas','Score','Rating','Añadido','Eventos']];
  Object.values(tracker).forEach(l => rows.push([
    l.professionLabel||l.profession, l.name, l.phone, l.email, l.website, l.city, l.address||'',
    l.status, l.contact_date||'', l.tracker_notes||'', l.score||'', l.rating||'',
    new Date(l.added_at).toLocaleString(),
    (l.events||[]).length
  ]));
  const csv = rows.map(r => r.map(c => '"'+String(c||'').replace(/"/g,'""')+'"').join(',')).join('\\n');
  const blob = new Blob(['\\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'tracker-leads-' + new Date().toISOString().split('T')[0] + '.csv';
  a.click(); showToast('✓ CSV descargado');
});

document.getElementById('exportJSON').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getTracker(),null,2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'tracker-leads-' + new Date().toISOString().split('T')[0] + '.json';
  a.click(); showToast('✓ JSON descargado');
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const current = getTracker();
      const merged = {...current, ...data};
      if(!confirm('Importar '+Object.keys(data).length+' leads? Se fusionarán con los actuales.')) return;
      saveTracker(merged); render(); showToast('✓ Importados '+Object.keys(data).length+' leads');
    } catch(err) { showToast('❌ Archivo inválido'); }
  };
  reader.readAsText(file);
});

render();

const themeToggle = document.getElementById('themeToggle');
function updateThemeBtn(){
  const t = localStorage.getItem('theme') || 'auto';
  themeToggle.textContent = t === 'dark' ? '☀️' : t === 'light' ? '🌙' : '⚪';
}
updateThemeBtn();
themeToggle.addEventListener('click', () => {
  const t = localStorage.getItem('theme') || 'auto';
  const next = t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto';
  localStorage.setItem('theme', next);
  const d = window.matchMedia('(prefers-color-scheme:dark)').matches;
  const isDark = next==='auto'?d:next==='dark';
  document.documentElement.classList.toggle('dark-mode', isDark);
  updateThemeBtn();
});
</script>
</body></html>`;
}

// ── Lead detail page ──────────────────────────────────────────────────────
function leadHtml() {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Ficha de Lead — IWPro</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="styles.css">
<script>const t=localStorage.getItem('theme')||'auto';const d=window.matchMedia('(prefers-color-scheme:dark)').matches;const isDark=t==='auto'?d:t==='dark';document.documentElement.classList.toggle('dark-mode',isDark);</script>
<style>
:root{--c:#3b82f6}
.field{margin-bottom:14px}
.field label{display:block;font-size:11px;color:var(--text-muted);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.field input,.field select,.field textarea{width:100%;background:var(--input-bg);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:6px;font-size:14px;font-family:inherit}
.field input:focus,.field select:focus,.field textarea:focus{outline:none;border-color:var(--c)}
.field textarea{min-height:90px;resize:vertical}
.field input[readonly]{opacity:0.6;cursor:not-allowed}
.event{padding:10px 12px;border-left:3px solid var(--c);background:var(--input-bg);margin-bottom:8px;border-radius:0 6px 6px 0}
.event .ev-date{font-size:11px;color:var(--text-muted)}
.event .ev-note{font-size:13px;margin-top:4px}
.event.ev-update{border-left-color:#06b6d4}
.event.ev-added{border-left-color:#10b981}
.event.ev-manual{border-left-color:#f59e0b}
.event.ev-reseen{border-left-color:#94a3b8}
</style>
</head>
<body>
<header class="radar-header" style="display:flex;justify-content:space-between;align-items:flex-start">
  <div style="flex:1">
    <a href="tracker.html" class="back">← Volver al tracker</a>
    <h1 id="leadName">Cargando…</h1>
    <p id="leadMeta"></p>
  </div>
  <button id="themeToggle" style="background:none;border:none;font-size:24px;cursor:pointer;margin-top:8px">🌙</button>
</header>
<main class="radar-main">
  <div id="content"><div class="empty">Cargando…</div></div>
</main>
<footer style="border-top:1px solid var(--border);padding:16px 24px;margin-top:40px;display:flex;justify-content:space-between;align-items:center;gap:24px;font-size:13px;color:var(--text-muted)"><span>Inmoworking Pro · Radares Especializados</span><span style="display:flex;gap:16px"><a href="privacy.html" style="color:var(--accent);text-decoration:none">Privacidad</a> · <a href="cookies.html" style="color:var(--accent);text-decoration:none">Cookies</a></span></footer>
<script>
function getTracker(){ return JSON.parse(localStorage.getItem('iwp_tracker')||'{}'); }
function saveTracker(t){ localStorage.setItem('iwp_tracker', JSON.stringify(t)); }
function escapeH(s){return String(s||'').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function showToast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:20px;right:20px;background:#1e293b;color:#f0f4f8;padding:12px 16px;border-radius:8px;font-size:13px;z-index:9999;border:1px solid #333';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

function renderEvents(){
  const tracker = getTracker();
  const lead = tracker[id];
  if(!lead) return;
  const events = (lead.events||[]).slice().reverse();
  const html = events.length
    ? events.map(e => '<div class="event ev-'+escapeH(e.type)+'"><div class="ev-date">'+new Date(e.date).toLocaleString()+' · '+escapeH(e.type)+'</div><div class="ev-note">'+escapeH(e.note)+'</div></div>').join('')
    : '<div style="color:var(--text-muted);text-align:center;padding:14px">Sin eventos todavía</div>';
  const el = document.getElementById('eventsList');
  if(el) el.innerHTML = html;
}

function render(){
  const tracker = getTracker();
  const lead = tracker[id];
  if(!lead){
    document.getElementById('content').innerHTML = '<section class="panel"><div class="empty">Lead no encontrado en el tracker.<br><br>Para verlo aquí, primero pulsa <b>"Guardar en tracker"</b> desde el radar.</div></section>';
    document.getElementById('leadName').textContent = 'Lead no encontrado';
    return;
  }
  document.getElementById('leadName').textContent = lead.name || '(sin nombre)';
  document.getElementById('leadMeta').textContent = (lead.professionLabel||lead.profession) + ' · Añadido ' + new Date(lead.added_at).toLocaleDateString();
  const statuses = ['pendiente','contactado','interesado','cliente','descartado'];
  document.getElementById('content').innerHTML =
    '<section class="panel"><h2>Información de contacto</h2>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">'
    +'<div class="field"><label>Nombre</label><input id="f-name" type="text" value="'+escapeH(lead.name)+'"></div>'
    +'<div class="field"><label>Teléfono</label><input id="f-phone" type="tel" value="'+escapeH(lead.phone)+'"></div>'
    +'<div class="field"><label>Email</label><input id="f-email" type="email" value="'+escapeH(lead.email)+'"></div>'
    +'<div class="field"><label>Web</label><input id="f-website" type="url" value="'+escapeH(lead.website)+'"></div>'
    +'<div class="field"><label>Ciudad</label><input id="f-city" type="text" value="'+escapeH(lead.city)+'"></div>'
    +'<div class="field"><label>Dirección</label><input id="f-address" type="text" value="'+escapeH(lead.address||'')+'"></div>'
    +'<div class="field"><label>Score (radar)</label><input type="text" value="'+escapeH(lead.score)+'" readonly></div>'
    +'<div class="field"><label>Rating (reseñas)</label><input type="text" value="'+escapeH(lead.rating?(lead.rating+(lead.reviews_count?' ('+lead.reviews_count+' reseñas)':'')):'')+'" readonly></div>'
    +'</div>'
    +'<div style="margin-top:6px"><a href="https://www.google.com/search?q='+encodeURIComponent((lead.name||'')+' '+(lead.city||''))+'" target="_blank" style="color:var(--c);font-size:13px;text-decoration:none">🔍 Buscar en Google</a></div>'
    +'</section>'
    +'<section class="panel"><h2>Seguimiento</h2>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    +'<div class="field"><label>Estado</label><select id="f-status">'
    + statuses.map(s=>'<option value="'+s+'"'+(lead.status===s?' selected':'')+'>'+s+'</option>').join('')
    +'</select></div>'
    +'<div class="field"><label>Fecha de contacto</label><input id="f-contact" type="date" value="'+escapeH(lead.contact_date||'')+'"></div>'
    +'</div>'
    +'<div class="field"><label>Notas de seguimiento</label><textarea id="f-notes">'+escapeH(lead.tracker_notes||'')+'</textarea></div>'
    +'<button id="saveBtn" style="background:linear-gradient(135deg,var(--c) 0%,#0284c7 100%);border:0;color:white;padding:12px 22px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit">💾 Guardar cambios</button>'
    +'</section>'
    +'<section class="panel"><h2>Historial de eventos</h2>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'
    +'<input id="newEvent" type="text" placeholder="Añadir entrada al historial (ej: llamé, no contesta; cliente confirmó reunión…)" style="flex:1;background:var(--input-bg);border:1px solid var(--border);padding:10px;border-radius:6px;color:var(--text);font-family:inherit">'
    +'<button id="addEventBtn" style="background:var(--c);border:0;color:white;padding:10px 18px;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:600">+ Añadir</button>'
    +'</div>'
    +'<div id="eventsList"></div>'
    +'</section>'
    +'<section class="panel"><h2>Datos completos del backend</h2>'
    +'<details><summary style="cursor:pointer;font-size:13px;color:var(--text-muted)">Ver raw_data</summary>'
    +'<pre style="background:var(--input-bg);padding:14px;border-radius:6px;font-size:12px;overflow-x:auto;max-height:400px;margin-top:8px">'+escapeH(JSON.stringify(lead.raw_data||{},null,2))+'</pre>'
    +'</details>'
    +'</section>'
    +'<section class="panel" style="border-color:rgba(239,68,68,0.3)"><h2 style="color:#fca5a5">Zona de peligro</h2>'
    +'<button id="deleteBtn" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;padding:10px 18px;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:600">🗑 Eliminar del tracker</button>'
    +'</section>';
  renderEvents();
  document.getElementById('saveBtn').addEventListener('click', saveChanges);
  document.getElementById('addEventBtn').addEventListener('click', addEvent);
  document.getElementById('deleteBtn').addEventListener('click', deleteLead);
  document.getElementById('newEvent').addEventListener('keydown', e => { if(e.key==='Enter') addEvent(); });
}

function saveChanges(){
  const tracker = getTracker();
  const lead = tracker[id];
  const updates = {
    name: document.getElementById('f-name').value,
    phone: document.getElementById('f-phone').value,
    email: document.getElementById('f-email').value,
    website: document.getElementById('f-website').value,
    city: document.getElementById('f-city').value,
    address: document.getElementById('f-address').value,
    status: document.getElementById('f-status').value,
    contact_date: document.getElementById('f-contact').value,
    tracker_notes: document.getElementById('f-notes').value
  };
  let changed = [];
  for(const k of Object.keys(updates)){
    if((lead[k]||'') !== updates[k]){
      changed.push(k+': '+(lead[k]||'∅')+' → '+(updates[k]||'∅'));
      lead[k] = updates[k];
    }
  }
  if(changed.length){
    lead.events = lead.events || [];
    lead.events.push({date:new Date().toISOString(),type:'update',note:changed.join(', ')});
    saveTracker(tracker);
    document.getElementById('leadName').textContent = lead.name || '(sin nombre)';
    showToast('✓ Guardado ('+changed.length+' campos)');
    renderEvents();
  } else {
    showToast('Sin cambios');
  }
}

function addEvent(){
  const inp = document.getElementById('newEvent');
  const note = inp.value.trim();
  if(!note) return;
  const tracker = getTracker();
  tracker[id].events = tracker[id].events || [];
  tracker[id].events.push({date:new Date().toISOString(),type:'manual',note});
  saveTracker(tracker);
  inp.value = '';
  renderEvents();
  showToast('✓ Evento añadido');
}

function deleteLead(){
  if(!confirm('¿Eliminar este lead del tracker? No se puede deshacer.')) return;
  const tracker = getTracker();
  delete tracker[id];
  saveTracker(tracker);
  window.location.href = 'tracker.html';
}

render();

const themeToggle = document.getElementById('themeToggle');
function updateThemeBtn(){
  const t = localStorage.getItem('theme') || 'auto';
  themeToggle.textContent = t === 'dark' ? '☀️' : t === 'light' ? '🌙' : '⚪';
}
updateThemeBtn();
themeToggle.addEventListener('click', () => {
  const t = localStorage.getItem('theme') || 'auto';
  const next = t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto';
  localStorage.setItem('theme', next);
  const d = window.matchMedia('(prefers-color-scheme:dark)').matches;
  const isDark = next==='auto'?d:next==='dark';
  document.documentElement.classList.toggle('dark-mode', isDark);
  updateThemeBtn();
});
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
  console.log(`✓ index.html`);
  fs.writeFileSync(path.join(ROOT, "tracker.html"), trackerHtml(PROFS), "utf8");
  console.log(`✓ tracker.html`);
  fs.writeFileSync(path.join(ROOT, "lead.html"), leadHtml(), "utf8");
  console.log(`✓ lead.html`);
  console.log(`${count} radares + tracker + ficha generados en ${ROOT}`);
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
