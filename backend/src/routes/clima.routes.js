const express = require("express");
const router = express.Router();
const climaController = require("../controllers/clima.controller");

router.get("/estaciones", climaController.obtenerEstaciones);
router.get("/actual", climaController.obtenerClimaActual);

module.exports = router;