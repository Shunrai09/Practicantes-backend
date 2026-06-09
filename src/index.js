require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const routes  = require('./routes')

const app        = express()
const PORT       = process.env.PORT       || 3000
const HOST       = process.env.HOST       || '0.0.0.0'
const STATIC_DIR = process.env.STATIC_DIR || null

// ── CORS (solo necesario en desarrollo; en prod todo es mismo origen) ─
if (!STATIC_DIR) {
  app.use(cors({
    origin:      process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }))
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Logging básico ────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString().slice(11,19)}  ${req.method.padEnd(6)} ${req.path}`)
  next()
})

// ── API ───────────────────────────────────────────────────────
app.use('/api', routes)

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

// ── 404 para rutas /api no encontradas ───────────────────────
app.use('/api/*', (_req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }))

// ── Frontend estático (producción) ────────────────────────────
if (STATIC_DIR) {
  app.use(express.static(STATIC_DIR))
  // SPA fallback: cualquier ruta no-API devuelve index.html
  app.get('*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')))
} else {
  app.use((_req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }))
}

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Error no controlado:', err)
  res.status(500).json({ mensaje: 'Error interno del servidor' })
})

// ── Arrancar ──────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  const local = `http://localhost:${PORT}`
  console.log(`\n🚀  CardenasCorp corriendo en ${local}`)
  if (STATIC_DIR) console.log(`   Frontend: ${STATIC_DIR}`)
  console.log(`   Health:   ${local}/health\n`)
})
