/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN — rutas /api/clima/*
 * ============================================================================
 * A diferencia de clima.controller.test.js (unitario, llama las funciones
 * del controlador directamente), aquí se levanta la app Express real
 * (src/app.js) y se le pega con supertest, pasando por: rate limiter,
 * parsers, la ruta /api/clima y el manejador de errores global.
 *
 * No requiere una base de datos real: app.js no abre conexión a Postgres al
 * importarse (el pool de `pg` es perezoso), y las rutas de clima no la usan.
 * ============================================================================
 */

const request = require("supertest");

const ENV_ORIGINAL = { ...process.env };

describe("Integración: /api/clima", () => {
  let app;

  beforeEach(() => {
    process.env = { ...ENV_ORIGINAL };
    process.env.WEATHERLINK_API_KEY = "key-123";
    process.env.WEATHERLINK_API_SECRET = "secret-123";
    process.env.WEATHERLINK_STATION_ID = "222";

    jest.resetModules();
    global.fetch = jest.fn();
    app = require("../app");
  });

  afterAll(() => {
    process.env = ENV_ORIGINAL;
  });

  test("GET /api/clima/actual devuelve 200 y los campos del clima cuando WeatherLink responde bien", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        station_id: 222,
        generated_at: 1_700_000_000,
        sensors: [
          {
            data: [
              {
                data_structure_type: 1,
                temp: 70.1,
                hum: 65,
                wind_speed_last: 2.4,
                uv_index: 4.2,
              },
            ],
          },
        ],
      }),
    });

    const respuesta = await request(app).get("/api/clima/actual");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      estacion_id: 222,
      temperatura_f: 70.1,
      humedad: 65,
    });
  });

  test("GET /api/clima/actual devuelve 500 si el servidor no tiene configuradas las credenciales", async () => {
    delete process.env.WEATHERLINK_API_KEY;
    delete process.env.WEATHERLINK_API_SECRET;
    jest.resetModules();
    app = require("../app");

    const respuesta = await request(app).get("/api/clima/actual");

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error).toMatch(/WEATHERLINK_API_KEY/);
  });

  test("GET /api/clima/actual devuelve 502 si WeatherLink falla", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "",
    });

    const respuesta = await request(app).get("/api/clima/actual");

    expect(respuesta.status).toBe(502);
  });

  test("GET /api/clima/estaciones devuelve 200 con la lista cruda de estaciones", async () => {
    const stations = { stations: [{ station_id: 222, station_name: "Sedir Moro" }] };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => stations });

    const respuesta = await request(app).get("/api/clima/estaciones");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(stations);
  });

  test("una ruta de clima inexistente responde 404 vía el notFoundHandler global", async () => {
    const respuesta = await request(app).get("/api/clima/ruta-que-no-existe");
    expect(respuesta.status).toBe(404);
  });
});
