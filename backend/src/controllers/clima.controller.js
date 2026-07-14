const pool = require("../config/database");

const WL_BASE_URL = "https://api.weatherlink.com/v2";

// Cache simple en memoria para no golpear la API de WeatherLink en cada
// refresco del dashboard (evita límites de tasa y acelera la respuesta).
let cacheClimaActual = { data: null, expira: 0 };
const CACHE_MS = 60 * 1000; // 60 segundos

let stationIdDetectado = null; // cache del station_id auto-descubierto

async function resolverStationId() {
  if (process.env.WEATHERLINK_STATION_ID) {
    return process.env.WEATHERLINK_STATION_ID;
  }
  if (stationIdDetectado) {
    return stationIdDetectado;
  }

  const data = await llamarWeatherLink("/stations");
  const estaciones = data.stations || [];
  if (estaciones.length === 0) {
    const error = new Error(
      "Tu cuenta de WeatherLink no tiene estaciones asociadas a esta API Key."
    );
    error.status = 500;
    throw error;
  }

  // Si hay una sola estación, la usamos directo. Si hay varias, tomamos la
  // primera pero avisamos por consola para que definan WEATHERLINK_STATION_ID
  // explícitamente si no es la correcta.
  if (estaciones.length > 1) {
    console.warn(
      `[clima] Se encontraron ${estaciones.length} estaciones WeatherLink; usando "${estaciones[0].station_name}" (${estaciones[0].station_id}). ` +
        "Define WEATHERLINK_STATION_ID en backend/.env si no es la correcta."
    );
  }

  stationIdDetectado = estaciones[0].station_id;
  return stationIdDetectado;
}

function credencialesWeatherLink() {
  const apiKey = process.env.WEATHERLINK_API_KEY;
  const apiSecret = process.env.WEATHERLINK_API_SECRET;
  if (!apiKey || !apiSecret) {
    const error = new Error(
      "Faltan WEATHERLINK_API_KEY / WEATHERLINK_API_SECRET en backend/.env"
    );
    error.status = 500;
    throw error;
  }
  return { apiKey, apiSecret };
}

async function llamarWeatherLink(path) {
  const { apiKey, apiSecret } = credencialesWeatherLink();
  const url = `${WL_BASE_URL}${path}${path.includes("?") ? "&" : "?"}api-key=${apiKey}`;

  const respuesta = await fetch(url, {
    headers: { "X-Api-Secret": apiSecret },
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => "");
    const error = new Error(
      `WeatherLink respondió ${respuesta.status}: ${texto || respuesta.statusText}`
    );
    error.status = 502;
    throw error;
  }

  return respuesta.json();
}

// Extrae de la respuesta cruda de /current los campos mas relevantes para
// el dashboard, tomando el primer sensor que reporte cada variable
// (una estacion puede tener varios sensores: ISS, barometro, interior, etc.)
function resumirClimaActual(raw) {
  const campos = {};
  for (const sensor of raw.sensors || []) {
    for (const dato of sensor.data || []) {
      for (const [clave, valor] of Object.entries(dato)) {
        if (valor === null || valor === undefined) continue;
        if (campos[clave] === undefined) campos[clave] = valor;
      }
    }
  }

  return {
    estacion_id: raw.station_id,
    actualizado: raw.generated_at ? raw.generated_at * 1000 : null,
    temperatura_f: campos.temp ?? null,
    sensacion_termica_f: campos.temp_out ?? campos.wind_chill ?? campos.heat_index ?? null,
    humedad: campos.hum ?? null,
    presion_barometrica_in: campos.bar_sea_level ?? campos.bar_absolute ?? null,
    viento_velocidad_mph: campos.wind_speed_last ?? campos.wind_speed_avg_last_10_min ?? null,
    viento_rafaga_mph: campos.wind_speed_hi_last_10_min ?? null,
    viento_direccion: campos.wind_dir_last ?? campos.wind_dir_scalar_avg_last_10_min ?? null,
    lluvia_dia_in: campos.rainfall_daily_in ?? campos.rain_day_in ?? null,
    lluvia_tasa_in_h: campos.rain_rate_last_in ?? null,
    uv: campos.uv_index ?? null,
    radiacion_solar_wm2: campos.solar_rad ?? null,
    _crudo: campos,
  };
}

exports.obtenerEstaciones = async (req, res) => {
  try {
    const data = await llamarWeatherLink("/stations");
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.obtenerClimaActual = async (req, res) => {
  try {
    const ahora = Date.now();
    if (cacheClimaActual.data && cacheClimaActual.expira > ahora) {
      return res.json(cacheClimaActual.data);
    }

    const stationId = await resolverStationId();
    const raw = await llamarWeatherLink(`/current/${stationId}`);
    const resumen = resumirClimaActual(raw);

    cacheClimaActual = { data: resumen, expira: ahora + CACHE_MS };
    res.json(resumen);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

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