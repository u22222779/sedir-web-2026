require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No fue posible iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();