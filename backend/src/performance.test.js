/**
 * ============================================================================
 * PRUEBAS DE RENDIMIENTO — Sprint 6 ("< 3 segundos de carga")
 * ============================================================================
 * Dos frentes:
 *
 * 1) PRESUPUESTO DE PESO DE ASSETS ("performance budget"): el mayor riesgo
 *    para el objetivo de "<3s de carga" no es el backend sino el peso de
 *    imágenes/video que se descargan en el home y en Quiénes Somos. Estas
 *    pruebas fijan un límite máximo por archivo para que, si en el futuro
 *    alguien sube sin querer una imagen o video sin comprimir, el test
 *    falle en vez de descubrirlo en producción.
 *
 *    Se detectaron y corrigieron estos casos antes de escribir el test:
 *      - hero video (VIDEO.mp4): 66MB -> 7MB (se quitó el audio -no se oye,
 *        es video de fondo muteado-, se bajó a 960px/30fps, crf 32)
 *      - imagen de "Asesoría agrícola" en Proyectos/Servicios: 9.8MB -> 388KB
 *        (se mostraba a solo 420px de alto; estaba a resolución completa)
 *      - 9 imágenes de Quiénes Somos (valores, equipo, misión/visión):
 *        ~9MB -> ~0.5MB en total (eran PNG fotográficos sin comprimir,
 *        mostrados hasta 6 veces más grandes que su tamaño real en pantalla;
 *        se convirtieron a JPEG y se re-escalaron a su tamaño de despliegue)
 *
 * 2) LATENCIA DE ENDPOINTS: valida que las rutas críticas del backend
 *    respondan rápido incluso bajo carga concurrente moderada (usando el
 *    mismo mock de base de datos que en functional.routes.test.js).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

function tamanoKb(rutaRelativa) {
  const ruta = path.join(PUBLIC_DIR, rutaRelativa);
  if (!fs.existsSync(ruta)) return null;
  return fs.statSync(ruta).size / 1024;
}

describe("Presupuesto de peso — assets críticos para el tiempo de carga", () => {
  test("el video de fondo del hero pesa menos de 10 MB (antes: 66 MB)", () => {
    const kb = tamanoKb("activos/videos/VIDEO.mp4");
    expect(kb).not.toBeNull();
    expect(kb).toBeLessThan(10 * 1024);
  });

  test("la imagen de Asesoría Agrícola (Proyectos/Servicios) pesa menos de 600 KB (antes: 9.8 MB)", () => {
    const kb = tamanoKb("activos/img_proyectos/2025-Asesoria-agricola.jpg");
    expect(kb).not.toBeNull();
    expect(kb).toBeLessThan(600);
  });

  test.each([
    "activos/img_quienessomos/values_1.jpg",
    "activos/img_quienessomos/values_2.jpg",
    "activos/img_quienessomos/values_3.jpg",
    "activos/img_quienessomos/values_4.jpg",
    "activos/img_quienessomos/values_5.jpg",
    "activos/img_quienessomos/team.jpg",
    "activos/img_quienessomos/sedir-desc-photo.jpg",
    "activos/img_quienessomos/img_1.jpg",
    "activos/img_quienessomos/img_2.jpg",
  ])("%s pesa menos de 250 KB", (rutaRelativa) => {
    const kb = tamanoKb(rutaRelativa);
    expect(kb).not.toBeNull();
    expect(kb).toBeLessThan(250);
  });

  test("ninguna imagen o video dentro de /activos supera los 12 MB (excepto PDFs, que son descargas explícitas)", () => {
    const excedidos = [];

    function recorrer(dir) {
      for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        const rutaCompleta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) {
          recorrer(rutaCompleta);
        } else if (/\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i.test(entrada.name)) {
          const sizeMb = fs.statSync(rutaCompleta).size / (1024 * 1024);
          if (sizeMb > 12) {
            excedidos.push(`${path.relative(PUBLIC_DIR, rutaCompleta)} (${sizeMb.toFixed(1)}MB)`);
          }
        }
      }
    }

    recorrer(path.join(PUBLIC_DIR, "activos"));
    expect(excedidos).toEqual([]);
  });
});

describe("Latencia de endpoints críticos", () => {
  jest.mock("./config/database", () => ({ query: jest.fn() }));
  const request = require("supertest");
  const pool = require("./config/database");
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = "clave-de-pruebas-no-usar-en-produccion";
    app = require("./app");
  });

  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
  });

  test("GET /health responde en menos de 200 ms", async () => {
    const inicio = Date.now();
    const respuesta = await request(app).get("/health");
    const duracionMs = Date.now() - inicio;

    expect(respuesta.status).toBe(200);
    expect(duracionMs).toBeLessThan(200);
  });

  test("GET /api/publicaciones responde en menos de 300 ms", async () => {
    const inicio = Date.now();
    const respuesta = await request(app).get("/api/publicaciones");
    const duracionMs = Date.now() - inicio;

    expect(respuesta.status).toBe(200);
    expect(duracionMs).toBeLessThan(300);
  });

  test("soporta 20 solicitudes concurrentes a /api/noticias sin degradarse", async () => {
    const inicio = Date.now();

    const respuestas = await Promise.all(
      Array.from({ length: 20 }, () => request(app).get("/api/noticias"))
    );

    const duracionMs = Date.now() - inicio;

    respuestas.forEach((respuesta) => {
      expect(respuesta.status).toBe(200);
    });
    // Con la base de datos mockeada (sin latencia real de red/disco), 20
    // solicitudes en paralelo deberían resolverse rápido; esto detecta
    // si algún middleware bloquea el event loop de forma síncrona.
    expect(duracionMs).toBeLessThan(1000);
  });
});
