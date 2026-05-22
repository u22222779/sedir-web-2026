# sedir-web-2026

Base web de SEDIR con backend en Node.js, Express y PostgreSQL.

## Requisitos

- Node.js 18 o superior.
- PostgreSQL 14 o superior, localmente o con Docker.

## Estructura del backend

- `src/app.js`: configuracion de Express.
- `src/server.js`: arranque de la API y validacion de conexion a PostgreSQL.
- `src/config/database.js`: pool de `pg` y prueba `SELECT 1;`.
- `src/routes/health.routes.js`: endpoint `GET /health`.
- `src/middleware/errorHandler.js`: manejo de errores y 404.

## Variables de entorno

Usa `.env` o copia `.env.example`.

Variables disponibles:

- `PORT`
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PGSSL`

## Levantar PostgreSQL con Docker

```bash
docker compose up -d postgres
```

El contenedor usa PostgreSQL 14 y expone el puerto de host `55432`.

## Ejecutar la API

```bash
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
