import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import searchService from './services/searchService.js';
import { parseJwt, verifyToken } from './middleware/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'users.json');

// Cargar usuarios
let USERS = {};
try {
  USERS = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  console.log(`✓ Cargados ${Object.keys(USERS).length} usuarios`);
} catch (e) {
  console.warn('⚠️ No se pudo leer users.json, usando solo credenciales por env var');
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - permitir frontend en Render y dominio personalizado
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://nexoleads.inmoworkingpro.es',
  'https://radares-profesion.pages.dev',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Login endpoint - verifica contra users.json
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Validación básica
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  // Verificar credenciales contra users.json
  const user = USERS[email];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Generar token simple (en producción: JWT con firma)
  const token = Buffer.from(JSON.stringify({
    email,
    name: user.name,
    loginTime: Date.now()
  })).toString('base64');

  res.json({
    success: true,
    token,
    user: {
      email,
      name: user.name
    },
    expiresIn: 86400 // 24 horas
  });
});

// Search endpoint - REQUIERE AUTENTICACIÓN
app.get('/api/search', verifyToken, async (req, res) => {
  try {
    const { profession, city, category } = req.query;

    if (!profession || !city) {
      return res.status(400).json({
        error: 'Parámetros requeridos: profession, city'
      });
    }

    console.log(`[SEARCH] profession=${profession}, city=${city}, user=${req.user.email}`);

    const results = await searchService.searchLeads({
      profession,
      city,
      category
    });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({
      error: 'Error en búsqueda',
      message: error.message
    });
  }
});

// Search con reviews (version mejorada)
app.get('/api/search-with-reviews', verifyToken, async (req, res) => {
  try {
    const { profession, city } = req.query;

    if (!profession || !city) {
      return res.status(400).json({
        error: 'Parámetros requeridos: profession, city'
      });
    }

    const results = await searchService.searchLeadsWithReviews({
      profession,
      city
    });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({
      error: 'Error en búsqueda',
      message: error.message
    });
  }
});

// Listar profesiones disponibles
app.get('/api/professions', (req, res) => {
  const professions = [
    'hospitales', 'hoteles', 'museos', 'estadios',
    'constructoras', 'polideportivos', 'naves_industriales',
    'comunidades_vecinos', 'bancos', 'farmacias',
    'restaurantes', 'agencias_inmobiliarias'
  ];

  res.json({ professions });
});

// Error 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend escuchando en puerto ${PORT}`);
  console.log(`📍 CORS habilitado para: ${allowedOrigins.join(', ')}`);
  console.log(`🔐 POST /auth/login - Autenticación`);
  console.log(`🔎 GET /api/search - Búsqueda de leads`);
  console.log(`⭐ GET /api/search-with-reviews - Búsqueda con reviews`);
});
