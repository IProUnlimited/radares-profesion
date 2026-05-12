// Middleware de autenticación simple (token en base64)
// En producción: JWT con firma criptográfica

export function parseJwt(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado o formato inválido' });
  }

  const token = authHeader.substring(7); // Remover "Bearer "
  const decoded = parseJwt(token);

  if (!decoded || !decoded.email) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // Verificar expiración (24 horas desde login)
  const now = Date.now();
  const loginTime = decoded.loginTime || 0;
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas

  if (now - loginTime > maxAge) {
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  req.user = decoded;
  next();
}
