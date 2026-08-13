#!/usr/bin/env node
/**
 * Valida solo los enlaces de vídeo (YouTube o Vimeo) de los webinars
 * y escribe un reporte CSV dedicado.
 *
 * Uso:  node scripts/validar-links-videos.js
 * Salida: scripts/reporte-links-videos.csv
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CONCURRENCIA = 10;
const TIMEOUT_MS = 10000;
const SALIDA = path.join(__dirname, 'reporte-links-videos.csv');

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
      const body = await res.text();
      return { status: res.status, body };
    } catch (error) {
      const last = intentos >= 2;
      const tipo =
        error && typeof error.name === 'string' && error.name === 'TimeoutError'
          ? 'timeout'
          : 'network';
      if (last) return { status: null, body: '', error: tipo };
    }
  }
  return { status: null, body: '', error: 'network' };
}

function plataforma(url) {
  return /vimeo\.com/.test(url) ? 'vimeo' : 'youtube';
}

function videoId(url) {
  if (plataforma(url) === 'vimeo') {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  }
  const m =
    url.match(/[?&]v=([^&#]+)/) ||
    url.match(/youtu\.be\/([^?#]+)/) ||
    url.match(/youtube\.com\/embed\/([^?#]+)/);
  return m ? m[1] : null;
}

async function checkVideo(url) {
  const esVimeo = plataforma(url) === 'vimeo';
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
  if (status === 403 || status === 401) {
    return {
      estado: 'WARNING',
      http: status,
      detalle: 'Existe pero restringe el embed (¿privado?)',
    };
  }
  return {
    estado: 'WARNING',
    http: status,
    detalle: `oEmbed HTTP ${status}`,
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
    `SELECT id_webinar AS id, codigo, url_youtube
     FROM webinar ORDER BY id_webinar`
  );

  const tareas = rows
    .filter((w) => w.url_youtube && w.url_youtube.trim())
    .map((w) => {
      const url = w.url_youtube.trim();
      return { codigo: w.codigo, url, check: () => checkVideo(url) };
    });

  console.log(`\nValidando ${tareas.length} enlaces de vídeo con concurrencia ${CONCURRENCIA}...`);
  const res = await runPool(tareas, CONCURRENCIA, async (t) => {
    const r = await t.check();
    return {
      codigo: t.codigo,
      estado: r.estado,
      http: r.http,
      plataforma: plataforma(t.url),
      id_video: videoId(t.url) || '',
      url: t.url,
      detalle: r.detalle,
    };
  });

  const lineas = [
    ['codigo', 'estado', 'http', 'plataforma', 'id_video', 'url', 'detalle'].map(csvField).join(','),
    ...res.map((r) =>
      [r.codigo, r.estado, r.http, r.plataforma, r.id_video, r.url, r.detalle]
        .map(csvField)
        .join(',')
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

  const porPlataforma = { youtube: { OK: 0, BROKEN: 0 }, vimeo: { OK: 0, BROKEN: 0 } };
  res.forEach((r) => {
    if (porPlataforma[r.plataforma]) {
      porPlataforma[r.plataforma][r.estado] += 1;
    }
  });
  console.log('\n=== POR PLATAFORMA ===');
  console.log(`YouTube: OK ${porPlataforma.youtube.OK} / BROKEN ${porPlataforma.youtube.BROKEN}`);
  console.log(`Vimeo:   OK ${porPlataforma.vimeo.OK} / BROKEN ${porPlataforma.vimeo.BROKEN}`);

  const ok = res.filter((r) => r.estado === 'OK');
  console.log('\n=== VIDEOS OK ===');
  ok.forEach((r) => console.log(`- [${r.plataforma}] ${r.codigo}: ${r.url}`));

  const warning = res.filter((r) => r.estado === 'WARNING');
  if (warning.length) {
    console.log('\n=== WARNINGS ===');
    warning.forEach((r) => console.log(`- [${r.plataforma}] ${r.codigo}: ${r.detalle}`));
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error('Error:', error.message);
  await pool.end();
  process.exit(1);
});