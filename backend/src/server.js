import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// ==================== ENDPOINTS ====================

// Endpoint para verificar conexión a la base de datos
app.get('/api/db-status', async (req, res) => {
  try {
    // Intentar hacer una consulta simple
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al conectar con la base de datos',
        error: error.message,
        details: {
          supabase_url: process.env.SUPABASE_URL ? '✅ Configurada' : '❌ No configurada',
          supabase_key: process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada'
        }
      });
    }

    res.json({
      success: true,
      message: '✅ Conexión exitosa a la base de datos',
      database: 'Supabase PostgreSQL',
      timestamp: new Date().toISOString(),
      details: {
        supabase_url: process.env.SUPABASE_URL,
        tables_accessible: true
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ Error al conectar con la base de datos',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Ruta API de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    mensaje: 'API funcionando correctamente',
    fecha: new Date().toLocaleString(),
    env: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_CONFIGURED: !!process.env.SUPABASE_URL
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString()
  });
});

// Ruta por defecto - redirige al index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
    ✅ Servidor corriendo en: http://localhost:${PORT}
    🎮 Frontend: http://localhost:${PORT}
    🧪 API Test: http://localhost:${PORT}/api/test
    💾 DB Status: http://localhost:${PORT}/api/db-status
  `);
});