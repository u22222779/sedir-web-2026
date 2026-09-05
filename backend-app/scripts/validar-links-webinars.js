#!/usr/bin/env node
/**
 * Valida los enlaces de los webinars (youtube/vimeo, drive pdf, afiches)
 * leyendo directamente la BD y escribiendo un reporte CSV.
 *
 * Uso:  node scripts/validar-links-webinars.js
 * Salida: scripts/reporte-links-webinars.csv
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CONCURRENCIA = 10;
const TIMEOUT_MS = 10000;
const SALIDA = path.join(__dirname, 'reporte-links-webinars.csv');

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fetchText(url) {
  let intentos = 0;
  while (intentos < 2) {
    intentos += 1;
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SEDIR-LinkValidator/1.0; +https://sedir.org.pe)',
        },
      });
      const contentType = res.headers.get('content-type') || '';
      const body = await res.text();
      return { status: res.status, body, contentType };
    } catch (error) {
      const last = intentos >= 2;
      const tipo =
        error && typeof error.name === 'string' && error.name === 'TimeoutError'
          ? 'timeout'
          : 'network';
      if (last) return { status: null, body: '', contentType: '', error: tipo };
    }
  }
  return { status: null, body: '', contentType: '', error: 'network' };
}

function estadoDesdeHttp(status) {
  if (status === 200) return 'OK';
  if (status === 404) return 'BROKEN';
  if (status === 403 || status === 401) return 'WARNING';
  return 'WARNING';
}

async function checkVideo(url) {
  const esVimeo = /vimeo\.com/.test(url);
  const oembed = esVimeo
    ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
    : `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  const { status, body, error } = await fetchText(oembed);

  if (error === 'timeout') {
    return { estado: 'WARNING', http: status, detalle: 'timeout' };
  }
  if (error) {
    return { estado: 'WARNING', http: status, detalle: 'error de red' };
  }
  if (status === 200) {
    try {
      const data = JSON.parse(body);
      return {
        estado: 'OK',
        http: 200,
        detalle: data.title ? `Título: ${data.title.slice(0, 80)}` : 'oEmbed OK',
      };
    } catch {
      return { estado: 'OK', http: 200, detalle: 'oEmbed OK (sin título)' };
    }
  }
  if (status === 404) {
    return {
      estado: 'BROKEN',
      http: 404,
      detalle: 'Eliminado o privado en la plataforma',
    };
  }
  return {
    estado: estadoDesdeHttp(status),
    http: status,
    detalle: `oEmbed HTTP ${status}`,
  };
}

function extraerDriveId(url) {
  const match =
    url.match(/\/file\/d\/([^/?]+)/) || url.match(/[?&]id=([^&]+)/);
  return match ? match[1] : null;
}

async function checkDrivePdf(url) {
  const id = extraerDriveId(url);
  if (!id) {
    return { estado: 'WARNING', http: null, detalle: 'No se pudo extraer file ID' };
  }

  const { status, contentType, error } = await fetchText(
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w320`
  );

  if (error === 'timeout') {
    return { estado: 'WARNING', http: status, detalle: 'timeout' };
  }
  if (error) {
    return { estado: 'WARNING', http: status, detalle: 'error de red' };
  }
  if (status === 200 && contentType.includes('image')) {
    return { estado: 'OK', http: 200, detalle: 'Archivo público en Drive' };
  }
  if (status === 400) {
    return { estado: 'BROKEN', http: 400, detalle: 'Archivo inexistente o sin acceso' };
  }
  return {
    estado: estadoDesdeHttp(status),
    http: status,
    detalle: `thumbnail HTTP ${status} (${contentType || 'sin content-type'})`,
  };
}

async function checkAfiche(url) {
  const { status, error } = await fetchText(url);
  if (error === 'timeout') {
    return { estado: 'WARNING', http: status, detalle: 'timeout' };
  }
  if (error) {
    return { estado: 'WARNING', http: status, detalle: 'error de red' };
  }
  if (status === 200) {
    return { estado: 'OK', http: 200, detalle: 'Imagen accesible' };
  }
  return {
    estado: estadoDesdeHttp(status),
    http: status,
    detalle: `HTTP ${status}`,
  };
}

async function runPool(items, limite, fn) {
  const resultados = new Array(items.length);
  let idx = 0;
  const workers = [];
  const cuantos = Math.min(limite, items.length);
  for (let i = 0; i < cuantos; i += 1) {
    workers.push(
      (async () => {
        while (idx < items.length) {
          const j = idx;
          idx += 1;
          resultados[j] = await fn(items[j]);
        }
      })()
    );
  }
  await Promise.all(workers);
  return resultados;
}

function csvField(valor) {
  const texto = String(valor ?? '');
  return `"${texto.replace(/"/g, '""')}"`;
}

async function main() {
  console.log('Consultando webinars en la BD...');
  const { rows } = await pool.query(
    `SELECT id_webinar AS id, codigo, url_youtube, url_pdf, afiche
     FROM webinar ORDER BY id_webinar`
  );

  const tareas = [];

  rows.forEach((w) => {
    const urlYoutube = w.url_youtube ? w.url_youtube.trim() : '';
    if (urlYoutube) {
      tareas.push({
        codigo: w.codigo,
        tipo: 'video',
        url: urlYoutube,
        check: () => checkVideo(urlYoutube),
      });
    }
    const urlPdf = w.url_pdf ? w.url_pdf.trim() : '';
    if (urlPdf) {
      tareas.push({
        codigo: w.codigo,
        tipo: 'pdf-drive',
        url: urlPdf,
        check: () => checkDrivePdf(urlPdf),
      });
    }
    const afiche = w.afiche ? w.afiche.trim() : '';
    if (afiche) {
      tareas.push({
        codigo: w.codigo,
        tipo: 'afiche',
        url: afiche,
        check: () => checkAfiche(afiche),
      });
    }
  });

  console.log(`\nValidando ${tareas.length} enlaces con concurrencia ${CONCURRENCIA}...`);
  const res = await runPool(tareas, CONCURRENCIA, async (t) => {
    const r = await t.check();
    return { codigo: t.codigo, tipo: t.tipo, url: t.url, ...r };
  });

  const lineas = [
    ['codigo', 'tipo', 'url', 'estado', 'http', 'detalle'].map(csvField).join(','),
    ...res.map((r) =>
      [r.codigo, r.tipo, r.url, r.estado, r.http, r.detalle].map(csvField).join(',')
    ),
  ];
  fs.writeFileSync(SALIDA, lineas.join('\n'), 'utf8');

  const resumen = { OK: 0, BROKEN: 0, WARNING: 0, total: res.length };
  res.forEach((r) => {
    resumen[r.estado] += 1;
  });

  console.log('\n=== RESUMEN ===');
  console.log(`Total:      ${resumen.total}`);
  console.log(`OK:         ${resumen.OK}`);
  console.log(`BROKEN:     ${resumen.BROKEN}`);
  console.log(`WARNING:    ${resumen.WARNING}`);
  console.log(`\nReporte: ${path.relative(process.cwd(), SALIDA)}`);

  const rotos = res.filter((r) => r.estado === 'BROKEN');
  if (rotos.length) {
    console.log('\n=== ENLACES ROTOS ===');
    rotos.forEach((r) => console.log(`- [${r.tipo}] ${r.codigo}: ${r.url}`));
  }

  const warning = res.filter((r) => r.estado === 'WARNING');
  if (warning.length) {
    console.log('\n=== WARNINGS (revisar manualmente) ===');
    warning.forEach((r) => console.log(`- [${r.tipo}] ${r.codigo}: ${r.detalle}`));
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error('Error:', error.message);
  await pool.end();
  process.exit(1);
});