"use strict";
/**
 * Generador de radares especializados por profesión.
 * Lee professions.json y produce un HTML autocontenido por cada profesión
 * + un index.html que lista todos los radares.
 *
 * Uso: node generate.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PROFS = JSON.parse(fs.readFileSync(path.join(ROOT, "professions.json"), "utf8"));
const API_BASE = "https://crm-agente-api.onrender.com";

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
<style>
:root{--c:${p.color};--bg:#0b1220;--panel:#111a2e;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
header{padding:32px 24px;background:linear-gradient(135deg,var(--c) 0%,#0b1220 80%);border-bottom:1px solid var(--border)}
header .icon{font-size:48px;line-height:1}
header h1{margin:8px 0 4px;font-size:28px}
header p{margin:0;color:#cbd5e1}
.back{color:#cbd5e1;text-decoration:none;font-size:14px}
main{max-width:980px;margin:0 auto;padding:24px}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px}
.panel h2{margin:0 0 12px;font-size:16px;color:var(--c);text-transform:uppercase;letter-spacing:.5px}
.row{display:flex;gap:12px;flex-wrap:wrap}
.row input,.row select{flex:1;min-width:160px;background:#0b1220;border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px;font-size:14px}
.row button{background:var(--c);border:0;color:#fff;font-weight:600;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px}
.row button:hover{filter:brightness(1.1)}
.row button:disabled{opacity:.5;cursor:not-allowed}
ul.services{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px 16px;list-style:none;padding:0;margin:0}
ul.services li{padding:6px 0;color:#cbd5e1;font-size:14px;border-bottom:1px dashed var(--border)}
.meta{display:flex;gap:24px;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.meta b{color:var(--text)}
#results{display:grid;gap:10px}
.lead{background:#0b1220;border:1px solid var(--border);border-radius:8px;padding:12px}
.lead h3{margin:0 0 4px;font-size:15px}
.lead .l-meta{color:var(--muted);font-size:12px}
.score{display:inline-block;background:var(--c);color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;margin-left:8px}
.empty{color:var(--muted);text-align:center;padding:24px;font-size:14px}
.error{color:#fca5a5;font-size:13px;margin-top:8px}
footer{text-align:center;padding:24px;color:var(--muted);font-size:12px}
</style>
</head>
<body>
<header>
  <a href="index.html" class="back">← Todos los radares</a>
  <div class="icon">${p.icon}</div>
  <h1>Radar ${htmlEscape(p.label)}</h1>
  <p>Captación de leads especializada para ${htmlEscape(p.label.toLowerCase())}</p>
</header>
<main>
  <div id="fileWarn" style="display:none;background:#7f1d1d;color:#fee2e2;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px">
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
    <h2>Resultados</h2>
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
  if(!city){ errBox.textContent='Introduce una ciudad'; return; }
  if(!token() && $('#email').value.trim() && $('#pass').value){
    await doLogin();
    if(!token()) return;
  }
  btn.disabled = true; btn.textContent = 'Buscando…';
  out.innerHTML = '<div class="empty">Consultando fuentes…</div>';
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
    render(data);
  }catch(e){
    const tip = location.protocol === 'file:' ? ' — ABRE ESTA PÁGINA VÍA http://localhost (ejecuta: node serve.js)' : ' — revisa token o conexión';
    errBox.textContent = 'Error: ' + e.message + tip;
    out.innerHTML = '<div class="empty">Sin resultados</div>';
  }finally{
    btn.disabled = false; btn.textContent = 'Generar leads';
  }
}

function render(data){
  const leads = data.leads || [];
  if(!leads.length){ out.innerHTML = '<div class="empty">No se encontraron leads ('+(data.message||'')+'</div>'; return; }
  out.innerHTML = leads.map(l => {
    const raw = l.raw_data || {};
    const score = raw.priority_score || l.priority_score || '';
    return '<div class="lead">'
      +'<h3>'+escapeH(l.name||'(sin nombre)')+(score?'<span class="score">'+score+'</span>':'')+'</h3>'
      +'<div class="l-meta">'
      + (l.phone?'📞 '+escapeH(l.phone)+' · ':'')
      + (l.email?'✉ '+escapeH(l.email)+' · ':'')
      + (raw.city?'📍 '+escapeH(raw.city):'')
      + '</div>'
      + (l.notes?'<div class="l-meta" style="margin-top:6px">'+escapeH(l.notes)+'</div>':'')
      +'</div>';
  }).join('');
}
function escapeH(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]));}
btn.addEventListener('click', generate);
$('#city').addEventListener('keydown', e=>{ if(e.key==='Enter') generate(); });
</script>
</body>
</html>`;
}

function indexHtml(profs) {
  const cards = Object.entries(profs).map(([key, p]) => `
    <a class="card" href="radar-${key}.html" style="--c:${p.color}">
      <div class="ico">${p.icon}</div>
      <div class="lbl">${htmlEscape(p.label)}</div>
      <div class="sub">×${p.multiplier} · ${p.sources.length ? p.sources.length + ' fuentes' : 'directorios públicos'}</div>
    </a>`).join("");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Radares por Profesión — IWPro</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1220;color:#e5e7eb}
header{padding:48px 24px;text-align:center;background:linear-gradient(135deg,#1e3a8a,#0b1220)}
header h1{margin:0 0 8px;font-size:34px}
header p{margin:0;color:#cbd5e1}
main{max-width:1200px;margin:0 auto;padding:32px 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{display:block;background:#111a2e;border:1px solid #1e293b;border-top:4px solid var(--c);border-radius:12px;padding:20px;text-decoration:none;color:#e5e7eb;transition:transform .15s,border-color .15s}
.card:hover{transform:translateY(-2px);border-color:var(--c)}
.ico{font-size:36px;margin-bottom:8px}
.lbl{font-weight:600;font-size:16px;margin-bottom:4px}
.sub{color:#94a3b8;font-size:12px}
footer{text-align:center;padding:24px;color:#94a3b8;font-size:12px}
</style></head>
<body>
<header><h1>Radares Especializados por Profesión</h1>
<p>22 radares conectados al CRM Propium · Inmoworking Pro</p></header>
<main><div class="grid">${cards}</div></main>
<footer>Cada radar dispara las fuentes específicas de su profesión y aplica el multiplicador de score sectorial.</footer>
</body></html>`;
}

// ── Generación ─────────────────────────────────────────────────────────────
let count = 0;
for (const [key, p] of Object.entries(PROFS)) {
  const file = path.join(ROOT, `radar-${key}.html`);
  fs.writeFileSync(file, radarHtml(key, p), "utf8");
  count++;
  console.log(`✓ radar-${key}.html`);
}
fs.writeFileSync(path.join(ROOT, "index.html"), indexHtml(PROFS), "utf8");
console.log(`✓ index.html\n\n${count} radares generados en ${ROOT}`);
