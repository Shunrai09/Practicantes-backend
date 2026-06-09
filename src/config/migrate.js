const mysql = require('mysql2/promise')
const fs    = require('fs')
const path  = require('path')
require('dotenv').config()

const DB_NAME = process.env.DB_NAME || 'cardenascorp'

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  )
  return rows.length > 0
}

async function migrate() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  })

  // ── Tablas base ───────────────────────────────────────────
  const sql = fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf8')
  console.log('⏳  Creando tablas...')
  await conn.query(sql)

  // ── Columnas nuevas en usuarios ───────────────────────────
  const colsUsuarios = [
    { name: 'horario_entrada', def: "TIME NOT NULL DEFAULT '08:00:00'" },
    { name: 'horario_salida',  def: "TIME NOT NULL DEFAULT '17:00:00'" },
    { name: 'dias_trabajo',    def: "VARCHAR(100) NOT NULL DEFAULT 'lunes,martes,miercoles,jueves,viernes'" },
  ]

  for (const col of colsUsuarios) {
    if (!(await columnExists(conn, 'usuarios', col.name))) {
      await conn.query(`ALTER TABLE usuarios ADD COLUMN ${col.name} ${col.def}`)
      console.log(`   + usuarios.${col.name} agregada`)
    }
  }

  // ── Columnas eliminadas de ausencias ──────────────────────
  const colsEliminar = ['dia_recuperar', 'recuperado', 'fecha_recuperacion']

  for (const col of colsEliminar) {
    if (await columnExists(conn, 'ausencias', col)) {
      await conn.query(`ALTER TABLE ausencias DROP COLUMN ${col}`)
      console.log(`   - ausencias.${col} eliminada`)
    }
  }

  console.log('✅  Migración completada')
  await conn.end()
}

migrate().catch((err) => {
  console.error('❌  Error en migración:', err.message)
  process.exit(1)
})
