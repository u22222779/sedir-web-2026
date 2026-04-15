# sedir-web-2026

Rediseño integral del sitio web de SEDIR - 2026. Este repositorio ahora incluye una base backend para convertir el sitio en una plataforma web dinamica.

## Requisitos

- Node.js 18+

## Ejecucion local

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar servidor:

```bash
npm run dev
```

3. Abrir en navegador:

```text
http://localhost:3000
```

## Endpoints API iniciales

- `GET /api/health`: estado del servicio.
- `GET /api/noticias`: noticias de ejemplo en JSON.
- `GET /api/proyectos`: proyectos de ejemplo en JSON.
- `GET /api/dashboard`: indicadores para dashboard (produccion + clima).

## Datos

Los datos iniciales viven en `data/` para una transicion rapida a base de datos en el siguiente paso:

- `data/noticias.json`
- `data/proyectos.json`
- `data/indicadores.json`

## Siguiente fase recomendada

1. Migrar `data/*.json` a PostgreSQL.
2. Agregar capa de servicios y validaciones.
3. Implementar autenticacion para acceso al dashboard administrativo.
