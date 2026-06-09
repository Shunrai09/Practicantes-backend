const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const pool   = require('../config/db')

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Email y contraseña requeridos' })
  }

  const [[user]] = await pool.query(
    'SELECT id, nombre, email, password, rol, area, jefe_id, activo FROM usuarios WHERE email = ?',
    [email.toLowerCase().trim()]
  )

  if (!user || !user.activo) {
    return res.status(401).json({ mensaje: 'Credenciales incorrectas' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ mensaje: 'Credenciales incorrectas' })
  }

  const token = jwt.sign(
    { id: user.id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

  const { password: _, ...usuarioSinPass } = user
  res.json({ token, usuario: usuarioSinPass })
}

// GET /api/auth/me
async function me(req, res) {
  const { password: _, ...user } = req.user
  res.json({ usuario: user })
}

module.exports = { login, me }
