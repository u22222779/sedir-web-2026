/**
 * ============================================================================
 * PRUEBAS UNITARIAS — clima.controller.js (Conexión con API estación
 * meteorológica / WeatherLink)
 * ============================================================================
 * Cubre:
 *  - obtenerEstaciones: éxito, credenciales faltantes, cuenta sin estaciones
 *  - obtenerClimaActual: éxito + mapeo de campos, auto-descubrimiento de
 *    station_id, uso de WEATHERLINK_STATION_ID explícito, caché en memoria,
 *    credenciales faltantes, error propagado por WeatherLink (502)
 *
 * El controlador usa `fetch` global (Node >= 18), así que se reemplaza por
 * un mock en cada prueba. Como el módulo mantiene estado propio en memoria
 * (caché de /current y station_id auto-descubierto), se recarga con
 * `jest.resetModules()` antes de cada test para partir de un estado limpio.
 * ============================================================================
 */

const ENV_ORIGINAL = { ...process.env };

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

/** Carga una copia "fresca" del controlador (sin caché ni station_id previos). */
function requireControladorFresco() {
  jest.resetModules();
  return require("./clima.controller");
}

describe("clima.controller", () => {
  beforeEach(() => {
    process.env = { ...ENV_ORIGINAL };
    delete process.env.WEATHERLINK_API_KEY;
    delete process.env.WEATHERLINK_API_SECRET;
    delete process.env.WEATHERLINK_STATION_ID;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = ENV_ORIGINAL;
  });

  describe("obtenerEstaciones", () => {
    test("responde 500 si faltan las credenciales de WeatherLink", async () => {
      const controlador = requireControladorFresco();
      const req = {};
      const res = mockRes();

      await controlador.obtenerEstaciones(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/WEATHERLINK_API_KEY/) })
      );
    });

    test("devuelve la lista de estaciones cuando la API responde bien", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";

      const cuerpoRespuesta = {
        stations: [{ station_id: 111, station_name: "Sedir Moro" }],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => cuerpoRespuesta,
      });

      const controlador = requireControladorFresco();
      const req = {};
      const res = mockRes();

      await controlador.obtenerEstaciones(req, res);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [urlLlamada, opciones] = global.fetch.mock.calls[0];
      expect(urlLlamada).toContain("/stations");
      expect(urlLlamada).toContain("api-key=key-123");
      expect(opciones.headers["X-Api-Secret"]).toBe("secret-123");
      expect(res.json).toHaveBeenCalledWith(cuerpoRespuesta);
    });

    test("propaga un 502 si WeatherLink responde con error", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "credenciales inválidas",
      });

      const controlador = requireControladorFresco();
      const res = mockRes();

      await controlador.obtenerEstaciones({}, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/401/) })
      );
    });
  });

  describe("obtenerClimaActual", () => {
    const rawCurrentIss = {
      station_id: 222,
      generated_at: 1_700_000_000,
      sensors: [
        {
          data: [
            {
              data_structure_type: 1, // bloque principal ISS
              temp: 68.4,
              hum: 71,
              wind_speed_last: 3.2,
              wind_dir_last: 180,
              rainfall_daily_in: 0.02,
              uv_index: 5.1,
              solar_rad: 420,
              bar_sea_level: 29.92,
            },
          ],
        },
        {
          data: [
            {
              data_structure_type: 3, // consola/otro sensor secundario
              temp: 999, // no debe pisar el valor del bloque principal (ISS)
              bar_absolute: 29.5,
            },
          ],
        },
      ],
    };

    test("responde 500 si faltan las credenciales de WeatherLink", async () => {
      const controlador = requireControladorFresco();
      const res = mockRes();

      await controlador.obtenerClimaActual({}, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test("usa WEATHERLINK_STATION_ID cuando está definido, sin llamar a /stations", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";
      process.env.WEATHERLINK_STATION_ID = "999";

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => rawCurrentIss,
      });

      const controlador = requireControladorFresco();
      const res = mockRes();

      await controlador.obtenerClimaActual({}, res);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [urlLlamada] = global.fetch.mock.calls[0];
      expect(urlLlamada).toContain("/current/999");
    });

    test("auto-descubre el station_id llamando primero a /stations", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            stations: [{ station_id: 555, station_name: "Sedir Moro" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => rawCurrentIss,
        });

      const controlador = requireControladorFresco();
      const res = mockRes();

      await controlador.obtenerClimaActual({}, res);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch.mock.calls[0][0]).toContain("/stations");
      expect(global.fetch.mock.calls[1][0]).toContain("/current/555");
    });

    test("responde 500 con mensaje claro si la cuenta no tiene estaciones asociadas", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stations: [] }),
      });

      const controlador = requireControladorFresco();
      const res = mockRes();

      await controlador.obtenerClimaActual({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/no tiene estaciones/) })
      );
    });

    test("mapea los campos priorizando el bloque principal (ISS) sobre otros sensores", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";
      process.env.WEATHERLINK_STATION_ID = "222";

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => rawCurrentIss,
      });

      const controlador = requireControladorFresco();
      const res = mockRes();

      await controlador.obtenerClimaActual({}, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          estacion_id: 222,
          temperatura_f: 68.4, // debe venir del bloque ISS (type 1), no del type 3 (999)
          humedad: 71,
          viento_velocidad_mph: 3.2,
          viento_direccion: 180,
          lluvia_dia_in: 0.02,
          uv: 5.1,
          radiacion_solar_wm2: 420,
          presion_barometrica_in: 29.92, // bar_sea_level tiene prioridad sobre bar_absolute
        })
      );
    });

    test("usa la caché en memoria en la segunda llamada dentro de la ventana de 30s", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";
      process.env.WEATHERLINK_STATION_ID = "222";

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => rawCurrentIss,
      });

      const controlador = requireControladorFresco();
      const res1 = mockRes();
      const res2 = mockRes();

      await controlador.obtenerClimaActual({}, res1);
      await controlador.obtenerClimaActual({}, res2);

      // Solo debió llamar a WeatherLink una vez; la segunda vino de la caché.
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(res1.json.mock.calls[0][0]).toEqual(res2.json.mock.calls[0][0]);
    });

    test("propaga un 502 si WeatherLink responde con error al pedir /current", async () => {
      process.env.WEATHERLINK_API_KEY = "key-123";
      process.env.WEATHERLINK_API_SECRET = "secret-123";
      process.env.WEATHERLINK_STATION_ID = "222";

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "",
      });

      const controlador = requireControladorFresco();
      const res = mockRes();

      await controlador.obtenerClimaActual({}, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/503/) })
      );
    });
  });
});
