const WL_BASE_URL = "https://api.weatherlink.com/v2";

// Cache simple en memoria para no golpear la API de WeatherLink en cada
// refresco del dashboard (evita límites de tasa y acelera la respuesta).
let cacheClimaActual = { data: null, expira: 0 };
const CACHE_MS = 30 * 1000; // 30 segundos (antes 60s, para reducir el desfase con el panel oficial)

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
// el dashboard. Las estaciones Davis reportan varios "sensores" (ISS,
// barometro interno, consola, etc.) y cada uno trae un bloque de datos con
// su propio "data_structure_type". El bloque principal de condiciones
// exteriores (temperatura, humedad, viento, lluvia, UV) siempre viene con
// data_structure_type 1 (ISS) o 2 (Vue/otros modelos con anemómetro
// separado). Priorizamos ese bloque para evitar mezclar temperatura de un
// sensor con máx/mín de otro, que era la causa de pequeños desfases (ej.
// 18.2°C en el sitio vs 18.1°C en el panel oficial de WeatherLink).
function resumirClimaActual(raw) {
  const campos = {};
  const bloquesPrincipales = [];
  const otrosBloques = [];

  for (const sensor of raw.sensors || []) {
    for (const dato of sensor.data || []) {
      if (dato.data_structure_type === 1 || dato.data_structure_type === 2) {
        bloquesPrincipales.push(dato);
      } else {
        otrosBloques.push(dato);
      }
    }
  }

  // Primero llenamos con el bloque principal (ISS/Vue), luego completamos
  // con cualquier otro sensor solo para los campos que falten.
  for (const dato of [...bloquesPrincipales, ...otrosBloques]) {
    for (const [clave, valor] of Object.entries(dato)) {
      if (valor === null || valor === undefined) continue;
      if (campos[clave] === undefined) campos[clave] = valor;
    }
  }

  return {
    estacion_id: raw.station_id,
    actualizado: raw.generated_at ? raw.generated_at * 1000 : null,
    temperatura_f: campos.temp ?? null,
    temperatura_max_f: campos.temp_hi_day ?? null,
    temperatura_max_hora: campos.temp_hi_time_day ?? null,
    temperatura_min_f: campos.temp_lo_day ?? null,
    temperatura_min_hora: campos.temp_lo_time_day ?? null,
    sensacion_termica_f: campos.temp_out ?? campos.wind_chill ?? campos.heat_index ?? null,
    wind_chill_f: campos.wind_chill ?? null,
    heat_index_f: campos.heat_index ?? null,
    dew_point_f: campos.dew_point ?? null,
    wet_bulb_f: campos.wet_bulb ?? null,
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