import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Ruta API de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    mensaje: 'API funcionando correctamente',
    fecha: new Date().toLocaleString()
  });
});

// Ruta por defecto - redirige al index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
    ✅ Servidor corriendo en: http://localhost:${PORT}
    🎮 Frontend disponible en: http://localhost:${PORT}
    🧪 Prueba la API en: http://localhost:${PORT}/api/test
  `);
});