const pool  = require('../config/db')
const dayjs = require('dayjs')

const fechaHoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

// ── POST /api/ausencias ───────────────────────────────────────
async function crear(req, res) {
  try {
    const { fecha, motivo } = req.body
    const usuarioId = req.user.id

    if (!fecha || !motivo?.trim()) {
      return res.status(400).json({ mensaje: 'Fecha y motivo son obligatorios' })
    }

    // Debe comunicarse con al menos 7 días de antelación
    const diasAntelacion = dayjs(fecha).diff(dayjs(fechaHoy()), 'day')
    if (diasAntelacion < 7) {
      return res.status(400).json({
        mensaje: 'La ausencia debe comunicarse con al menos 7 días de antelación',
      })
    }

    const [[dup]] = await pool.query(
      'SELECT id FROM ausencias WHERE usuario_id = ? AND fecha = ?',
      [usuarioId, fecha]
    )
    if (dup) return res.status(400).json({ mensaje: 'Ya existe una ausencia registrada para esa fecha' })

    const [result] = await pool.query(
      'INSERT INTO ausencias (usuario_id, fecha, motivo) VALUES (?, ?, ?)',
      [usuarioId, fecha, motivo.trim()]
    )

    const [[ausencia]] = await pool.query('SELECT * FROM ausencias WHERE id = ?', [result.insertId])
    res.status(201).json({ mensaje: 'Ausencia registrada', ausencia })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al registrar ausencia' })
  }
}

// ── GET /api/ausencias/mias ───────────────────────────────────
async function getMias(req, res) {
  try {
    const [ausencias] = await pool.query(
      `SELECT a.*, u2.nombre AS jefe_nombre
       FROM ausencias a
       LEFT JOIN usuarios u2 ON u2.id = (SELECT jefe_id FROM usuarios WHERE id = a.usuario_id)
       WHERE a.usuario_id = ?
       ORDER BY a.fecha DESC`,
      [req.user.id]
    )
    res.json({ ausencias })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener ausencias' })
  }
}

// ── GET /api/ausencias ────────────────────────────────────────
async function getAll(req, res) {
  try {
    const limite = parseInt(req.query.limite) || 200

    const [ausencias] = await pool.query(`
      SELECT a.*,
        JSON_OBJECT('id', u.id, 'nombre', u.nombre, 'email', u.email, 'area', u.area) AS usuario,
        JSON_OBJECT('id', j.id, 'nombre', j.nombre) AS jefe
      FROM ausencias a
      JOIN  usuarios u ON u.id = a.usuario_id
      LEFT JOIN usuarios j ON j.id = u.jefe_id
      ORDER BY a.fecha DESC
      LIMIT ?
    `, [limite])

    res.json({ ausencias: ausencias.map(parse) })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener ausencias' })
  }
}

// ── GET /api/ausencias/area/:area ─────────────────────────────
async function getByArea(req, res) {
  try {
    const { area } = req.params

    if (req.user.rol === 'jefe' && req.user.area !== area) {
      return res.status(403).json({ mensaje: 'Solo puedes ver tu área' })
    }

    const [ausencias] = await pool.query(`
      SELECT a.*,
        JSON_OBJECT('id', u.id, 'nombre', u.nombre, 'email', u.email, 'area', u.area) AS usuario
      FROM ausencias a
      JOIN usuarios u ON u.id = a.usuario_id AND u.area = ? AND u.activo = 1
      ORDER BY a.fecha DESC
    `, [area])

    res.json({ ausencias: ausencias.map(parse) })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener ausencias del área' })
  }
}

// ── PATCH /api/ausencias/:id/aprobar ─────────────────────────
async function aprobar(req, res) {
  try {
    const ausencia = await getAusenciaOFail(req, res)
    if (!ausencia) return

    if (req.user.rol === 'jefe') {
      const [[practicante]] = await pool.query(
        'SELECT area FROM usuarios WHERE id = ?',
        [ausencia.usuario_id]
      )
      if (!practicante || practicante.area !== req.user.area) {
        return res.status(403).json({ mensaje: 'Solo puedes aprobar ausencias de tu área' })
      }
    }

    await pool.query(
      'UPDATE ausencias SET aprobado = 1, aprobado_por = ?, aprobado_en = NOW() WHERE id = ?',
      [req.user.id, ausencia.id]
    )
    res.json({ mensaje: 'Ausencia aprobada' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al aprobar ausencia' })
  }
}

// ── PATCH /api/ausencias/:id/rechazar ────────────────────────
async function rechazar(req, res) {
  try {
    const ausencia = await getAusenciaOFail(req, res)
    if (!ausencia) return

    if (req.user.rol === 'jefe') {
      const [[practicante]] = await pool.query(
        'SELECT area FROM usuarios WHERE id = ?',
        [ausencia.usuario_id]
      )
      if (!practicante || practicante.area !== req.user.area) {
        return res.status(403).json({ mensaje: 'Solo puedes rechazar ausencias de tu área' })
      }
    }

    await pool.query(
      'UPDATE ausencias SET aprobado = 0, aprobado_por = ?, aprobado_en = NOW() WHERE id = ?',
      [req.user.id, ausencia.id]
    )
    res.json({ mensaje: 'Ausencia rechazada' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al rechazar ausencia' })
  }
}

// ── Helpers ───────────────────────────────────────────────────
async function getAusenciaOFail(req, res) {
  const [[ausencia]] = await pool.query('SELECT * FROM ausencias WHERE id = ?', [req.params.id])
  if (!ausencia) { res.status(404).json({ mensaje: 'Ausencia no encontrada' }); return null }
  return ausencia
}

function parse(a) {
  return {
    ...a,
    usuario: typeof a.usuario === 'string' ? JSON.parse(a.usuario) : a.usuario,
    jefe:    typeof a.jefe    === 'string' ? JSON.parse(a.jefe)    : a.jefe,
  }
}

module.exports = { crear, getMias, getAll, getByArea, aprobar, rechazar }
