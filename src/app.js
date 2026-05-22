const express = require('express');
const path = require('path');

const healthRoutes = require('./routes/health.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;