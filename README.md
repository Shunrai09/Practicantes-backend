# CardenasCorp — Backend API

API REST en **Node.js + Express + MySQL** para el sistema de control de asistencia.

---

## Requisitos previos

- Node.js 18+
- MySQL 8.0+

---

## Instalación paso a paso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales de MySQL:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=Bd_BaseDeDatos
JWT_SECRET=una_clave_secreta_muy_larga_y_segura
JWT_EXPIRES_IN=8h
CLIENT_URL=http://localhost:5173
```

### 3. Crear la base de datos y tablas
```bash
npm run migrate
```

### 4. Insertar usuarios de prueba
```bash
npm run seed
```

### 5. Arrancar el servidor
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

El servidor corre en **http://localhost:3000**

---

## Usuarios de prueba (después del seed)

| Email | Contraseña | Rol |
|-------|-----------|-----|
| ana@cardenascorp.pe | 1234 | Practicante — Sistemas |
| luis@cardenascorp.pe | 1234 | Practicante — Contabilidad |
| maria@cardenascorp.pe | 1234 | Practicante — Sistemas |
| carlos@cardenascorp.pe | jefe1 | Jefe de área — Sistemas |
| sandra@cardenascorp.pe | jefe2 | Jefe de área — Contabilidad |
| admin@cardenascorp.pe | admin123 | Administrador |

---

## Estructura del proyecto

```
src/
├── index.js                    # Entry point — Express app
├── routes/
│   └── index.js                # Todas las rutas
├── controllers/
│   ├── authController.js       # login, me
│   ├── asistenciaController.js # entrada, salida, consultas
│   ├── ausenciaController.js   # CRUD + aprobar + recuperar
│   └── usuarioController.js    # CRUD usuarios
├── middleware/
│   └── auth.js                 # JWT verify + requireRol()
└── config/
    ├── db.js                   # Pool de conexiones MySQL
    ├── migrate.js              # Crea tablas (npm run migrate)
    └── seed.js                 # Datos de prueba (npm run seed)
sql/
└── schema.sql                  # DDL — tablas completas
```

---

## Endpoints

### Auth
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/auth/login` | Público | Login, devuelve JWT |
| GET  | `/api/auth/me`    | Todos   | Datos del usuario actual |

### Asistencia
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/asistencia/entrada` | practicante | Marcar entrada |
| POST | `/api/asistencia/salida`  | practicante | Marcar salida |
| GET  | `/api/asistencia/hoy`     | todos       | Registro de hoy |
| GET  | `/api/asistencia/mia`     | practicante | Mi historial `?mes=YYYY-MM` |
| GET  | `/api/asistencia/area/:area` | jefe/admin | Por área `?mes=&fecha=` |
| GET  | `/api/asistencia`         | admin       | Todos `?mes=&usuario_id=` |

### Ausencias
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST  | `/api/ausencias`                   | practicante | Registrar ausencia |
| GET   | `/api/ausencias/mias`              | practicante | Mis ausencias |
| GET   | `/api/ausencias/area/:area`        | jefe/admin  | Por área |
| GET   | `/api/ausencias`                   | admin       | Todas `?limite=` |
| PATCH | `/api/ausencias/:id/aprobar`       | jefe/admin  | Aprobar |
| PATCH | `/api/ausencias/:id/rechazar`      | jefe/admin  | Rechazar |
| PATCH | `/api/ausencias/:id/recuperada`    | practicante | Validar recuperación |

### Usuarios
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET    | `/api/usuarios`             | admin       | Todos |
| GET    | `/api/usuarios/area/:area`  | jefe/admin  | Por área |
| POST   | `/api/usuarios`             | admin       | Crear usuario |
| PUT    | `/api/usuarios/:id`         | admin       | Actualizar |
| DELETE | `/api/usuarios/:id`         | admin       | Eliminar (soft delete) |

---


---

## Notas de producción

- Configura `JWT_SECRET` con un valor largo y aleatorio (ej. `openssl rand -hex 64`).
- El soft delete en usuarios (`activo = 0`) preserva el historial de asistencias.
- La zona horaria está fijada a `America/Lima` (UTC-5) en los controladores.
