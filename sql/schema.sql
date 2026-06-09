-- ============================================================
--  CardenasCorp — Migración inicial
--  Ejecutar: npm run migrate
-- ============================================================

CREATE DATABASE IF NOT EXISTS cardenascorp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cardenascorp;

-- ── Usuarios ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id               INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(120)    NOT NULL,
  email            VARCHAR(180)    NOT NULL UNIQUE,
  password         VARCHAR(255)    NOT NULL,
  rol              ENUM('practicante','jefe','admin') NOT NULL DEFAULT 'practicante',
  area             VARCHAR(100)    NOT NULL,
  jefe_id          INT UNSIGNED    NULL,
  horario_entrada  TIME            NOT NULL DEFAULT '08:00:00',
  horario_salida   TIME            NOT NULL DEFAULT '17:00:00',
  dias_trabajo     VARCHAR(100)    NOT NULL DEFAULT 'lunes,martes,miercoles,jueves,viernes',
  activo           TINYINT(1)      NOT NULL DEFAULT 1,
  creado_en        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jefe_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Asistencias ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asistencias (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED    NOT NULL,
  fecha       DATE            NOT NULL,
  entrada     TIME            NULL,
  salida      TIME            NULL,
  tardanza    TINYINT(1)      NOT NULL DEFAULT 0,
  creado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_fecha (usuario_id, fecha),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Ausencias ────────────────────────────────────────────────
-- aprobado: NULL=pendiente, 1=aprobado, 0=rechazado
-- Se requiere comunicar con al menos 7 días de antelación
CREATE TABLE IF NOT EXISTS ausencias (
  id           INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT UNSIGNED   NOT NULL,
  fecha        DATE           NOT NULL,
  motivo       TEXT           NOT NULL,
  aprobado     TINYINT(1)     NULL,
  aprobado_por INT UNSIGNED   NULL,
  aprobado_en  DATETIME       NULL,
  creado_en    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_fecha (usuario_id, fecha),
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

