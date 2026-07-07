const pool = require("../config/database");

exports.guardarClima = async (req, res) => {
  try {

    const {
      temperatura,
      humedad,
      sensacion,
      precipitacion,
      uv,
      fecha
    } = req.body;

    await pool.query(
      `INSERT INTO clima_historico
      (
        temperatura,
        humedad,
        sensacion_termica,
        precipitacion,
        radiacion_uv,
        fecha_registro
      )
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        temperatura,
        humedad,
        sensacion,
        precipitacion,
        uv,
        fecha
      ]
    );

    res.json({ ok: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};