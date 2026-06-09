const bcrypt = require('bcryptjs')
const pool   = require('../config/db')

const SAFE_COLS = 'id, nombre, email, rol, area, jefe_id, horario_entrada, horario_salida, dias_trabajo, activo, creado_en'

const DIAS_VALIDOS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']

function validarDias(dias) {
  const lista = Array.isArray(dias) ? dias : String(dias).split(',').map(d => d.trim())
  if (!lista.length) return null
  for (const d of lista) {
    if (!DIAS_VALIDOS.includes(d)) return null
  }
  return lista.join(',')
}

function validarHora(hora) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(hora)
}

// ── GET /api/usuarios ─────────────────────────────────────────
async function getAll(req, res) {
  try {
    const [usuarios] = await pool.query(
      `SELECT ${SAFE_COLS} FROM usuarios WHERE activo = 1 ORDER BY rol, nombre`
    )
    res.json({ usuarios })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener usuarios' })
  }
}

// ── GET /api/usuarios/area/:area ──────────────────────────────
async function getByArea(req, res) {
  try {
    const { area } = req.params

    if (req.user.rol === 'jefe' && req.user.area !== area) {
      return res.status(403).json({ mensaje: 'Solo puedes ver tu área' })
    }

    const [usuarios] = await pool.query(
      `SELECT ${SAFE_COLS} FROM usuarios WHERE area = ? AND activo = 1 ORDER BY rol, nombre`,
      [area]
    )
    res.json({ usuarios })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener usuarios' })
  }
}

// ── POST /api/usuarios ────────────────────────────────────────
async function crear(req, res) {
  try {
    const { nombre, email, password, rol, area, jefe_id, horario_entrada, horario_salida, dias_trabajo } = req.body
    const creador = req.user

    // Jefe solo puede crear practicantes en su propia área
    if (creador.rol === 'jefe') {
      if (rol !== 'practicante') {
        return res.status(403).json({ mensaje: 'Solo puedes crear practicantes' })
      }
      if (area !== creador.area) {
        return res.status(403).json({ mensaje: 'Solo puedes crear practicantes en tu área' })
      }
    }

    if (!nombre || !email || !password || !rol || !area) {
      return res.status(400).json({ mensaje: 'Nombre, email, contraseña, rol y área son obligatorios' })
    }

    if (!['practicante', 'jefe', 'admin'].includes(rol)) {
      return res.status(400).json({ mensaje: 'Rol inválido' })
    }

    if (password.length < 4) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 4 caracteres' })
    }

    // Horario obligatorio solo para practicantes
    if (rol === 'practicante') {
      if (!horario_entrada || !horario_salida || !dias_trabajo) {
        return res.status(400).json({ mensaje: 'Horario de entrada, salida y días de trabajo son obligatorios para practicantes' })
      }
      if (!validarHora(horario_entrada) || !validarHora(horario_salida)) {
        return res.status(400).json({ mensaje: 'Formato de hora inválido. Use HH:MM' })
      }
    }

    const diasStr = dias_trabajo ? validarDias(dias_trabajo) : 'lunes,martes,miercoles,jueves,viernes'
    if (dias_trabajo && !diasStr) {
      return res.status(400).json({ mensaje: `Días inválidos. Use: ${DIAS_VALIDOS.join(', ')}` })
    }

    const [[dup]] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()])
    if (dup) return res.status(400).json({ mensaje: 'Ya existe un usuario con ese email' })

    const hash = await bcrypt.hash(password, 10)

    // Si es jefe creando, asigna automáticamente su propio ID como jefe_id
    const jefeAsignado = creador.rol === 'jefe' ? creador.id : (jefe_id || null)

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol, area, jefe_id, horario_entrada, horario_salida, dias_trabajo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        email.toLowerCase().trim(),
        hash,
        rol,
        area.trim(),
        jefeAsignado,
        horario_entrada || '08:00:00',
        horario_salida  || '17:00:00',
        diasStr,
      ]
    )

    const [[user]] = await pool.query(`SELECT ${SAFE_COLS} FROM usuarios WHERE id = ?`, [result.insertId])
    res.status(201).json({ mensaje: 'Usuario creado', usuario: user })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al crear usuario' })
  }
}

// ── PUT /api/usuarios/:id ─────────────────────────────────────
async function actualizar(req, res) {
  try {
    const { id } = req.params
    const { nombre, area, jefe_id, horario_entrada, horario_salida, dias_trabajo, activo } = req.body

    if (horario_entrada && !validarHora(horario_entrada)) {
      return res.status(400).json({ mensaje: 'Formato de hora de entrada inválido. Use HH:MM' })
    }
    if (horario_salida && !validarHora(horario_salida)) {
      return res.status(400).json({ mensaje: 'Formato de hora de salida inválido. Use HH:MM' })
    }

    let diasStr = undefined
    if (dias_trabajo) {
      diasStr = validarDias(dias_trabajo)
      if (!diasStr) return res.status(400).json({ mensaje: `Días inválidos. Use: ${DIAS_VALIDOS.join(', ')}` })
    }

    await pool.query(
      `UPDATE usuarios SET
        nombre          = COALESCE(?, nombre),
        area            = COALESCE(?, area),
        jefe_id         = COALESCE(?, jefe_id),
        horario_entrada = COALESCE(?, horario_entrada),
        horario_salida  = COALESCE(?, horario_salida),
        dias_trabajo    = COALESCE(?, dias_trabajo),
        activo          = COALESCE(?, activo)
       WHERE id = ?`,
      [nombre, area, jefe_id, horario_entrada || null, horario_salida || null, diasStr || null, activo, id]
    )

    const [[user]] = await pool.query(`SELECT ${SAFE_COLS} FROM usuarios WHERE id = ?`, [id])
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' })

    res.json({ mensaje: 'Usuario actualizado', usuario: user })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al actualizar usuario' })
  }
}

// ── DELETE /api/usuarios/:id ──────────────────────────────────
async function eliminar(req, res) {
  try {
    const { id } = req.params

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta' })
    }

    const [[user]] = await pool.query('SELECT id, rol FROM usuarios WHERE id = ?', [id])
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    if (user.rol === 'admin') return res.status(400).json({ mensaje: 'No se puede eliminar una cuenta admin' })

    await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id])
    res.json({ mensaje: 'Usuario eliminado' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar usuario' })
  }
}

module.exports = { getAll, getByArea, crear, actualizar, eliminar }
