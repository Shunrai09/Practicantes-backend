const jwt  = require('jsonwebtoken')
const pool = require('../config/db')

// ── Verifica token JWT ────────────────────────────────────────
async function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar que el usuario aún existe y está activo
    const [[user]] = await pool.query(
      'SELECT id, nombre, email, rol, area, jefe_id, horario_entrada, horario_salida, dias_trabajo, activo FROM usuarios WHERE id = ?',
      [payload.id]
    )

    if (!user || !user.activo) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado o desactivado' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' })
  }
}

// ── Verifica roles permitidos ─────────────────────────────────
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ mensaje: 'No autenticado' })
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para esta acción' })
    }
    next()
  }
}

module.exports = { auth, requireRol }
