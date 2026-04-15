const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const noticias = require('./data/noticias.json');
const proyectos = require('./data/proyectos.json');
const indicadores = require('./data/indicadores.json');

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/noticias', (req, res) => {
  res.json({
    ok: true,
    total: noticias.length,
    data: noticias,
    updatedAt: new Date().toISOString()
  });
});

app.get('/api/proyectos', (req, res) => {
  res.json({
    ok: true,
    total: proyectos.length,
    data: proyectos,
    updatedAt: new Date().toISOString()
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json({
    ok: true,
    data: indicadores,
    updatedAt: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'sedir-api', uptime: process.uptime() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SEDIR server running on http://localhost:${PORT}`);
});