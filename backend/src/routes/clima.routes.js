const express = require("express");
const router = express.Router();
const climaController = require("../controllers/clima.controller");

router.post("/guardar", climaController.guardarClima);

module.exports = router;