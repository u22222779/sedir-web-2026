# sedir-web-2026_ACTUALIZADO CON 333 NOTICIAS DE LA BASE DE DATOS MYSQL

Base web de SEDIR con frontend en `public/` y backend activo en `backend/` usando Node.js, Express y PostgreSQL.

## Requisitos

- Node.js 18 o superior.
- PostgreSQL 14 o superior, localmente o con Docker.

## Estructura activa

- `backend/src/app.js`: configuracion de Express.
- `backend/src/server.js`: arranque de la API y validacion de conexion a PostgreSQL.
- `backend/src/config/database.js`: pool de `pg` y prueba `SELECT 1;`.
- `backend/src/routes/health.routes.js`: endpoint `GET /health`.
- `backend/src/middleware/errorHandler.js`: manejo de errores y 404.
- `public/`: frontend estático servido por el backend.

## Variables de entorno

Usa `backend/.env` o copia `backend/.env` como base.

Variables disponibles:

- `PORT`
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PGSSL`

## Base de datos

Este proyecto espera una instancia de PostgreSQL externa configurada mediante las
variables de entorno en `backend/.env` (`PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, `PGDATABASE`, `PGSSL`).

Anteriormente se incluía un servicio `postgres` en `docker-compose.yml` para
desarrollo local; se ha retirado porque se asume que usas una base de datos
real/externa. Si necesitas levantar Postgres localmente, puedes volver a añadir
un servicio en `docker-compose.yml` o ejecutar un contenedor separado y ajustar
`backend/.env` para apuntar a `localhost:<puerto>`.

## Ejecutar la API

```bash
cd backend
npm install
npm run dev
```

La API queda disponible en:

```text
http://localhost:3000
```

Endpoint de verificacion:

- `GET /health`

## Conexion esperada

Cuando la conexion a PostgreSQL es correcta, la consola muestra:

```text
Conexión exitosa a PostgreSQL
```
