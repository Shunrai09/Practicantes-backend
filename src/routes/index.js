const router   = require('express').Router()
const { auth, requireRol } = require('../middleware/auth')

const authCtrl       = require('../controllers/authController')
const asistenciaCtrl = require('../controllers/asistenciaController')
const ausenciaCtrl   = require('../controllers/ausenciaController')
const usuarioCtrl    = require('../controllers/usuarioController')

// ── Auth ──────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login)
router.get('/auth/me',     auth, authCtrl.me)

// ── Asistencia ────────────────────────────────────────────────
router.post('/asistencia/entrada',        auth, requireRol('practicante'), asistenciaCtrl.marcarEntrada)
router.post('/asistencia/salida',         auth, requireRol('practicante'), asistenciaCtrl.marcarSalida)
router.get('/asistencia/hoy',             auth, asistenciaCtrl.getHoy)
router.get('/asistencia/mia',             auth, requireRol('practicante'), asistenciaCtrl.getMia)
router.get('/asistencia/area/:area',      auth, requireRol('jefe','admin'), asistenciaCtrl.getByArea)
router.get('/asistencia',                 auth, requireRol('admin'), asistenciaCtrl.getAll)

// ── Ausencias ─────────────────────────────────────────────────
router.post('/ausencias',                      auth, requireRol('practicante'), ausenciaCtrl.crear)
router.get('/ausencias/mias',                  auth, requireRol('practicante'), ausenciaCtrl.getMias)
router.get('/ausencias/area/:area',            auth, requireRol('jefe','admin'), ausenciaCtrl.getByArea)
router.get('/ausencias',                       auth, requireRol('admin'), ausenciaCtrl.getAll)
router.patch('/ausencias/:id/aprobar',         auth, requireRol('jefe','admin'), ausenciaCtrl.aprobar)
router.patch('/ausencias/:id/rechazar',        auth, requireRol('jefe','admin'), ausenciaCtrl.rechazar)

// ── Usuarios ──────────────────────────────────────────────────
router.get('/usuarios',           auth, requireRol('admin'), usuarioCtrl.getAll)
router.get('/usuarios/area/:area',auth, requireRol('jefe','admin'), usuarioCtrl.getByArea)
router.post('/usuarios',          auth, requireRol('admin','jefe'), usuarioCtrl.crear)
router.put('/usuarios/:id',       auth, requireRol('admin'), usuarioCtrl.actualizar)
router.delete('/usuarios/:id',    auth, requireRol('admin'), usuarioCtrl.eliminar)

module.exports = router
