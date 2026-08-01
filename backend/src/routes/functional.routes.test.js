/**
 * ============================================================================
 * PRUEBAS FUNCIONALES — "Pruebas funcionales de todas las páginas" (Sprint 6)
 * ============================================================================
 * Cubre, extremo a extremo (vía supertest sobre la app Express real), todos
 * los endpoints que alimentan las páginas públicas del sitio:
 *   - /health
 *   - /api/auth (login, me)
 *   - /api/contacto
 *   - /api/publicaciones
 *   - /api/webinars
 *   - /api/noticias
 *   - /api/productos
 *   - /api/proyectos
 *
 * La capa de base de datos (`src/config/database.js`, el pool de `pg`) se
 * mockea por completo: estas pruebas verifican el comportamiento HTTP real
 * (status codes, validaciones, guards de auth) sin depender de Postgres.
 * La API externa de WeatherLink ya tiene su propia suite en
 * clima.controller.test.js / clima.routes.test.js.
 * ============================================================================
 */

jest.mock("../config/database", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");

const ENV_ORIGINAL = { ...process.env };

describe("Pruebas funcionales — rutas backend", () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = "clave-de-pruebas-no-usar-en-produccion";
    app = require("../app");
  });

  afterAll(() => {
    process.env = ENV_ORIGINAL;
  });

  beforeEach(() => {
    pool.query.mockReset();
  });

  // --------------------------------------------------------------------
  // Health check
  // --------------------------------------------------------------------
  describe("GET /health", () => {
    test("responde 200 con estado ok", async () => {
      const respuesta = await request(app).get("/health");
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.status).toBe("ok");
    });
  });

  describe("GET /health/ready", () => {
    test("responde 200 con estado ok cuando la base de datos responde", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

      const respuesta = await request(app).get("/health/ready");

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.status).toBe("ok");
      expect(respuesta.body.checks.database).toBe("ok");
    });

    test("responde 503 con estado degraded cuando la base de datos falla", async () => {
      pool.query.mockRejectedValueOnce(new Error("conexión rechazada"));

      const respuesta = await request(app).get("/health/ready");

      expect(respuesta.status).toBe(503);
      expect(respuesta.body.status).toBe("degraded");
      expect(respuesta.body.checks.database).toBe("error");
    });
  });

  // --------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------
  describe("Auth: /api/auth", () => {
    test("POST /login sin credenciales -> 400", async () => {
      const respuesta = await request(app).post("/api/auth/login").send({});
      expect(respuesta.status).toBe(400);
    });

    test("POST /login con usuario inexistente -> 401", async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "nadie@sedir.pe", password: "loquesea" });

      expect(respuesta.status).toBe(401);
    });

    test("POST /login con contraseña incorrecta -> 401", async () => {
      const hash = await bcrypt.hash("claveCorrecta123", 10);
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_usuario: 1, nombre: "Carlos", email: "carlos@sedir.pe", password_hash: hash, rol: "admin" }],
      });

      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "carlos@sedir.pe", password: "claveIncorrecta" });

      expect(respuesta.status).toBe(401);
    });

    test("POST /login con credenciales correctas -> 200 y devuelve un token", async () => {
      const hash = await bcrypt.hash("claveCorrecta123", 10);
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_usuario: 1, nombre: "Carlos", email: "carlos@sedir.pe", password_hash: hash, rol: "admin" }],
      });

      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "carlos@sedir.pe", password: "claveCorrecta123" });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.token).toEqual(expect.any(String));
      expect(respuesta.body.user).toMatchObject({ email: "carlos@sedir.pe", rol: "admin" });
    });

    test("GET /me sin token -> 401", async () => {
      const respuesta = await request(app).get("/api/auth/me");
      expect(respuesta.status).toBe(401);
    });

    test("GET /me con token válido -> 200", async () => {
      const token = jwt.sign({ sub: 1, rol: "admin" }, process.env.JWT_SECRET);
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_usuario: 1, nombre: "Carlos", email: "carlos@sedir.pe", rol: "admin" }],
      });

      const respuesta = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.user.email).toBe("carlos@sedir.pe");
    });
  });

  // --------------------------------------------------------------------
  // Contacto
  // --------------------------------------------------------------------
  describe("Contacto: /api/contacto", () => {
    test("POST / sin campos obligatorios -> 400", async () => {
      const respuesta = await request(app).post("/api/contacto").send({});
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.missingFields).toEqual(
        expect.arrayContaining(["nombre", "correo", "mensaje"])
      );
    });

    test("POST / con correo inválido -> 400", async () => {
      const respuesta = await request(app).post("/api/contacto").send({
        nombre: "Carlos",
        correo: "no-es-un-correo",
        mensaje: "Este es un mensaje de prueba con más de 10 caracteres",
      });
      expect(respuesta.status).toBe(400);
    });

    test("POST / con mensaje muy corto -> 400", async () => {
      const respuesta = await request(app).post("/api/contacto").send({
        nombre: "Carlos",
        correo: "carlos@sedir.pe",
        mensaje: "corto",
      });
      expect(respuesta.status).toBe(400);
    });

    test("POST / válido -> 201", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, nombre: "Carlos", correo: "carlos@sedir.pe", mensaje: "Mensaje de prueba largo" }],
      });

      const respuesta = await request(app).post("/api/contacto").send({
        nombre: "Carlos",
        correo: "carlos@sedir.pe",
        mensaje: "Este es un mensaje de prueba con más de 10 caracteres",
      });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.contacto).toBeDefined();
    });
  });

  // --------------------------------------------------------------------
  // Publicaciones
  // --------------------------------------------------------------------
  describe("Publicaciones: /api/publicaciones", () => {
    test("GET / devuelve 200 con un arreglo", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, tipo: "revista", titulo: "Edición 1" }] });
      const respuesta = await request(app).get("/api/publicaciones");
      expect(respuesta.status).toBe(200);
      expect(Array.isArray(respuesta.body)).toBe(true);
    });

    test("GET /?tipo=invalido -> 400", async () => {
      const respuesta = await request(app).get("/api/publicaciones?tipo=invalido");
      expect(respuesta.status).toBe(400);
    });

    test("GET /:id con id no numérico -> 400", async () => {
      const respuesta = await request(app).get("/api/publicaciones/abc");
      expect(respuesta.status).toBe(400);
    });

    test("GET /:id inexistente -> 404", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const respuesta = await request(app).get("/api/publicaciones/9999");
      expect(respuesta.status).toBe(404);
    });

    test("GET /:id existente -> 200", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, tipo: "revista", titulo: "Edición 1" }] });
      const respuesta = await request(app).get("/api/publicaciones/1");
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.id).toBe(1);
    });
  });

  // --------------------------------------------------------------------
  // Webinars
  // --------------------------------------------------------------------
  describe("Webinars: /api/webinars", () => {
    test("GET / devuelve 200 con un arreglo", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, tema: "Riego tecnificado" }] });
      const respuesta = await request(app).get("/api/webinars");
      expect(respuesta.status).toBe(200);
      expect(Array.isArray(respuesta.body)).toBe(true);
    });

    test("GET /?anio=abc -> 400 (formato inválido)", async () => {
      const respuesta = await request(app).get("/api/webinars?anio=abc");
      expect(respuesta.status).toBe(400);
    });

    test("GET /filtros no se confunde con /:id -> 200", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ anio: 2024 }] })
        .mockResolvedValueOnce({ rows: [{ categoria: "Riego", total: "3" }] });
      const respuesta = await request(app).get("/api/webinars/filtros");
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.anios).toEqual([2024]);
    });
  });

  // --------------------------------------------------------------------
  // Noticias (públicas + protegidas)
  // --------------------------------------------------------------------
  describe("Noticias: /api/noticias", () => {
    test("GET / (pública) -> 200", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, titulo: "SEDIR inaugura vivero" }] });
      const respuesta = await request(app).get("/api/noticias");
      expect(respuesta.status).toBe(200);
    });

    test("GET /:id con id inválido -> 400", async () => {
      const respuesta = await request(app).get("/api/noticias/abc");
      expect(respuesta.status).toBe(400);
    });

    test("POST / sin token -> 401 (ruta protegida)", async () => {
      const respuesta = await request(app).post("/api/noticias").send({ titulo: "x" });
      expect(respuesta.status).toBe(401);
    });

    test("POST / con token de rol no-admin -> 403", async () => {
      const token = jwt.sign({ sub: 2, rol: "editor" }, process.env.JWT_SECRET);
      const respuesta = await request(app)
        .post("/api/noticias")
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "x" });
      expect(respuesta.status).toBe(403);
    });

    test("POST / con token admin y datos válidos -> 201", async () => {
      const token = jwt.sign({ sub: 1, rol: "admin" }, process.env.JWT_SECRET);
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 10, titulo: "Nueva noticia" }],
      });

      const respuesta = await request(app)
        .post("/api/noticias")
        .set("Authorization", `Bearer ${token}`)
        .send({
          titulo: "Nueva noticia",
          subtitulo: "Subtítulo",
          fecha: "2026-07-24",
          contenido: "Contenido de prueba",
          imagen_portada: "https://ejemplo.com/imagen.jpg",
          id_categoria_noticia: 1,
        });

      expect(respuesta.status).toBe(201);
    });
  });

  // --------------------------------------------------------------------
  // Productos (públicas + protegidas)
  // --------------------------------------------------------------------
  describe("Productos: /api/productos", () => {
    test("GET / (pública) -> 200", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: "Palta Hass" }] });
      const respuesta = await request(app).get("/api/productos");
      expect(respuesta.status).toBe(200);
    });

    test("POST / sin token -> 401", async () => {
      const respuesta = await request(app).post("/api/productos").send({});
      expect(respuesta.status).toBe(401);
    });

    test("DELETE /:id sin token -> 401", async () => {
      const respuesta = await request(app).delete("/api/productos/1");
      expect(respuesta.status).toBe(401);
    });
  });

  // --------------------------------------------------------------------
  // Proyectos (públicas + protegidas)
  // --------------------------------------------------------------------
  describe("Proyectos: /api/proyectos", () => {
    test("GET / (pública) -> 200", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: "PDC Moro" }] });
      const respuesta = await request(app).get("/api/proyectos");
      expect(respuesta.status).toBe(200);
    });

    test("PUT /:id sin token -> 401", async () => {
      const respuesta = await request(app).put("/api/proyectos/1").send({});
      expect(respuesta.status).toBe(401);
    });
  });

  // --------------------------------------------------------------------
  // 404 global
  // --------------------------------------------------------------------
  test("una ruta de API inexistente responde 404", async () => {
    const respuesta = await request(app).get("/api/esto-no-existe");
    expect(respuesta.status).toBe(404);
  });
});