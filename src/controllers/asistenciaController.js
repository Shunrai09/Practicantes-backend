const pool  = require('../config/db')

// ── Helpers ───────────────────────────────────────────────────
const horaActual = () => {
  return new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'America/Lima',
  })
}

const fechaHoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

// ── POST /api/asistencia/entrada ──────────────────────────────
async function marcarEntrada(req, res) {
  try {
    const usuarioId = req.user.id
    const fecha     = fechaHoy()
    const hora      = horaActual()

    const [[existente]] = await pool.query(
      'SELECT id, entrada FROM asistencias WHERE usuario_id = ? AND fecha = ?',
      [usuarioId, fecha]
    )

    if (existente?.entrada) {
      return res.status(400).json({ mensaje: 'Ya marcaste tu entrada hoy' })
    }

    // Tardanza: si llega después de su horario_entrada exacto
    const tardanza = hora > req.user.horario_entrada ? 1 : 0

    let registro
    if (existente) {
      await pool.query(
        'UPDATE asistencias SET entrada = ?, tardanza = ? WHERE id = ?',
        [hora, tardanza, existente.id]
      )
      const [[updated]] = await pool.query('SELECT * FROM asistencias WHERE id = ?', [existente.id])
      registro = updated
    } else {
      const [result] = await pool.query(
        'INSERT INTO asistencias (usuario_id, fecha, entrada, tardanza) VALUES (?, ?, ?, ?)',
        [usuarioId, fecha, hora, tardanza]
      )
      const [[inserted]] = await pool.query('SELECT * FROM asistencias WHERE id = ?', [result.insertId])
      registro = inserted
    }

    res.json({
      mensaje: tardanza
        ? `Entrada registrada con tardanza: ${hora} (horario: ${req.user.horario_entrada})`
        : `Entrada registrada: ${hora}`,
      registro,
    })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al marcar entrada' })
  }
}

// ── POST /api/asistencia/salida ───────────────────────────────
async function marcarSalida(req, res) {
  try {
    const usuarioId = req.user.id
    const fecha     = fechaHoy()
    const hora      = horaActual()

    const [[existente]] = await pool.query(
      'SELECT id, entrada, salida FROM asistencias WHERE usuario_id = ? AND fecha = ?',
      [usuarioId, fecha]
    )

    if (!existente?.entrada) {
      return res.status(400).json({ mensaje: 'Debes marcar tu entrada primero' })
    }
    if (existente.salida) {
      return res.status(400).json({ mensaje: 'Ya marcaste tu salida hoy' })
    }

    await pool.query('UPDATE asistencias SET salida = ? WHERE id = ?', [hora, existente.id])
    const [[updated]] = await pool.query('SELECT * FROM asistencias WHERE id = ?', [existente.id])
    res.json({ mensaje: `Salida registrada: ${hora}`, registro: updated })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al marcar salida' })
  }
}

// ── GET /api/asistencia/hoy ───────────────────────────────────
async function getHoy(req, res) {
  try {
    const { user } = req
    const fecha = fechaHoy()

    if (user.rol === 'practicante') {
      const [[registro]] = await pool.query(
        'SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ?',
        [user.id, fecha]
      )
      return res.json({ registro: registro || null })
    }

    const whereArea = user.rol === 'jefe' ? `AND u.area = ${pool.escape(user.area)}` : ''

    const [registros] = await pool.query(`
      SELECT u.id AS usuario_id, u.nombre, u.email, u.area,
             u.horario_entrada, u.horario_salida, u.dias_trabajo,
             a.id, a.entrada, a.salida, a.tardanza, a.fecha
      FROM usuarios u
      LEFT JOIN asistencias a ON a.usuario_id = u.id AND a.fecha = ?
      WHERE u.rol = 'practicante' AND u.activo = 1 ${whereArea}
      ORDER BY u.nombre
    `, [fecha])

    res.json({ registros, fecha })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener asistencia de hoy' })
  }
}

// ── GET /api/asistencia/mia ───────────────────────────────────
async function getMia(req, res) {
  try {
    const { mes } = req.query
    const mesStr  = mes || fechaHoy().slice(0, 7)

    const [registros] = await pool.query(
      `SELECT * FROM asistencias
       WHERE usuario_id = ? AND DATE_FORMAT(fecha, '%Y-%m') = ?
       ORDER BY fecha DESC`,
      [req.user.id, mesStr]
    )

    res.json({ registros, mes: mesStr })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener historial' })
  }
}

// ── GET /api/asistencia ───────────────────────────────────────
async function getAll(req, res) {
  try {
    const { mes, usuario_id } = req.query
    const mesStr = mes || fechaHoy().slice(0, 7)

    const conditions = [`DATE_FORMAT(a.fecha, '%Y-%m') = ?`]
    const params     = [mesStr]

    if (usuario_id) {
      conditions.push('a.usuario_id = ?')
      params.push(usuario_id)
    }

    const [registros] = await pool.query(`
      SELECT a.*, u.nombre, u.email, u.area,
             JSON_OBJECT('nombre', u.nombre, 'email', u.email, 'area', u.area) AS usuario
      FROM asistencias a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.fecha DESC, u.nombre
    `, params)

    const data = registros.map((r) => ({
      ...r,
      usuario: typeof r.usuario === 'string' ? JSON.parse(r.usuario) : r.usuario,
    }))
    res.json({ registros: data, mes: mesStr })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener asistencias' })
  }
}

// ── GET /api/asistencia/area/:area ────────────────────────────
async function getByArea(req, res) {
  try {
    const { area } = req.params
    const { fecha, mes } = req.query

    if (req.user.rol === 'jefe' && req.user.area !== area) {
      return res.status(403).json({ mensaje: 'Solo puedes ver tu área' })
    }

    let whereFecha = ''
    const params   = [area]

    if (fecha) {
      whereFecha = 'AND a.fecha = ?'
      params.push(fecha)
    } else if (mes) {
      whereFecha = `AND DATE_FORMAT(a.fecha, '%Y-%m') = ?`
      params.push(mes)
    }

    const [registros] = await pool.query(`
      SELECT a.*, u.nombre, u.email,
             JSON_OBJECT('nombre', u.nombre, 'email', u.email, 'area', u.area) AS usuario
      FROM asistencias a
      JOIN usuarios u ON u.id = a.usuario_id AND u.area = ? AND u.rol = 'practicante'
      WHERE 1=1 ${whereFecha}
      ORDER BY a.fecha DESC, u.nombre
    `, params)

    const data = registros.map((r) => ({
      ...r,
      usuario: typeof r.usuario === 'string' ? JSON.parse(r.usuario) : r.usuario,
    }))
    res.json({ registros: data })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener asistencias del área' })
  }
}

module.exports = { marcarEntrada, marcarSalida, getHoy, getMia, getAll, getByArea }
