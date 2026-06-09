const bcrypt = require('bcryptjs')
const pool   = require('./db')
require('dotenv').config()

async function seed() {
  console.log('⏳  Insertando datos de prueba...')

  const hash = (p) => bcrypt.hashSync(p, 10)

  // ── Jefes ────────────────────────────────────────────────
  await pool.query(
    `INSERT IGNORE INTO usuarios (nombre, email, password, rol, area)
     VALUES (?, ?, ?, 'jefe', ?)`,
    ['Carlos Mendoza', 'carlos@cardenascorp.pe', hash('jefe1'), 'Sistemas']
  )

  await pool.query(
    `INSERT IGNORE INTO usuarios (nombre, email, password, rol, area)
     VALUES (?, ?, ?, 'jefe', ?)`,
    ['Sandra Rojas', 'sandra@cardenascorp.pe', hash('jefe2'), 'Contabilidad']
  )

  const [[jefe1]] = await pool.query(`SELECT id FROM usuarios WHERE email = 'carlos@cardenascorp.pe'`)
  const [[jefe2]] = await pool.query(`SELECT id FROM usuarios WHERE email = 'sandra@cardenascorp.pe'`)

  // ── Practicantes ─────────────────────────────────────────
  await pool.query(
    `INSERT IGNORE INTO usuarios
       (nombre, email, password, rol, area, jefe_id, horario_entrada, horario_salida, dias_trabajo)
     VALUES (?, ?, ?, 'practicante', ?, ?, '08:00:00', '17:00:00', 'lunes,martes,miercoles,jueves,viernes')`,
    ['Ana García', 'ana@cardenascorp.pe', hash('1234'), 'Sistemas', jefe1.id]
  )

  await pool.query(
    `INSERT IGNORE INTO usuarios
       (nombre, email, password, rol, area, jefe_id, horario_entrada, horario_salida, dias_trabajo)
     VALUES (?, ?, ?, 'practicante', ?, ?, '09:00:00', '18:00:00', 'lunes,martes,miercoles,jueves,viernes')`,
    ['Luis Torres', 'luis@cardenascorp.pe', hash('1234'), 'Contabilidad', jefe2.id]
  )

  await pool.query(
    `INSERT IGNORE INTO usuarios
       (nombre, email, password, rol, area, jefe_id, horario_entrada, horario_salida, dias_trabajo)
     VALUES (?, ?, ?, 'practicante', ?, ?, '08:00:00', '17:00:00', 'lunes,martes,miercoles,jueves,viernes')`,
    ['María Quispe', 'maria@cardenascorp.pe', hash('1234'), 'Sistemas', jefe1.id]
  )

  // ── Admin ────────────────────────────────────────────────
  await pool.query(
    `INSERT IGNORE INTO usuarios (nombre, email, password, rol, area)
     VALUES (?, ?, ?, 'admin', ?)`,
    ['Administrador', 'admin@cardenascorp.pe', hash('admin123'), 'Administración']
  )

  console.log('✅  Usuarios de prueba creados:')
  console.log('   ana@cardenascorp.pe      / 1234       (Practicante - Sistemas       08:00-17:00 L-V)')
  console.log('   luis@cardenascorp.pe     / 1234       (Practicante - Contabilidad   09:00-18:00 L-V)')
  console.log('   maria@cardenascorp.pe    / 1234       (Practicante - Sistemas       08:00-17:00 L-V)')
  console.log('   carlos@cardenascorp.pe   / jefe1      (Jefe - Sistemas)')
  console.log('   sandra@cardenascorp.pe   / jefe2      (Jefe - Contabilidad)')
  console.log('   admin@cardenascorp.pe    / admin123   (Admin)')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌  Error en seed:', err.message)
  process.exit(1)
})
