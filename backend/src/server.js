// server.js - Servidor Node.js con Socket.IO para multiplayer
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
dotenv.config();

// Crear servidor Express
const app = express();
const server = http.createServer(app);

// ==================== CONFIGURACIÓN DE CORS ====================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500',
  process.env.FRONTEND_URL,
  'https://graficas-web-blush.vercel.app'
].filter(Boolean); // Remover valores undefined

console.log('🌐 Allowed origins:', allowedOrigins);

// Crear instancia de Socket.IO con CORS configurado
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn('⚠️ Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  // Configuración adicional para producción
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Inicializar cliente de Supabase (opcional)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('✅ Supabase initialized');
} else {
  console.log('⚠️ Supabase not configured (optional)');
}

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (CSS, JS, imágenes, etc.)
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));
console.log('📁 Sirviendo archivos estáticos desde:', frontendPath);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('origin')}`);
  next();
});

// ==================== ENDPOINTS API ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      express: '✅',
      socketio: '✅',
      supabase: supabase ? '✅' : '⚠️ No configurado'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    mensaje: 'API funcionando correctamente',
    fecha: new Date().toLocaleString('es-MX'),
    servidor: {
      PORT: process.env.PORT || 3000,
      NODE_ENV: process.env.NODE_ENV || 'development',
      SUPABASE_CONFIGURED: !!supabase,
      FRONTEND_URL: process.env.FRONTEND_URL
    },
    jugadores: {
      conectados: listaJugadores.length,
      lista: listaJugadores.map(p => p.nickname)
    }
  });
});

// Endpoint para verificar conexión a Supabase (opcional)
app.get('/api/db-status', async (req, res) => {
  if (!supabase) {
    return res.json({
      success: false,
      message: 'Supabase no está configurado (opcional)',
      configured: false
    });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al conectar con Supabase',
        error: error.message
      });
    }
    
    res.json({
      success: true,
      message: '✅ Conexión exitosa a Supabase',
      database: 'Supabase PostgreSQL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ Error al conectar con Supabase',
      error: error.message
    });
  }
});

// Endpoint para obtener jugadores conectados
app.get('/api/players', (req, res) => {
  res.json({
    success: true,
    count: listaJugadores.length,
    players: listaJugadores.map(p => ({
      nickname: p.nickname,
      character: p.character,
      position: { x: p.x, y: p.y, z: p.z },
      connected: true
    }))
  });
});

// Ruta raíz - enviar frontend/index.html
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', '..', 'frontend', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.warn('⚠️ No se encontró frontend/index.html en:', indexPath);
      // Si no existe el index.html, mostrar información del servidor
      res.json({
        name: 'CHAOS Game - Backend API',
        version: '1.0.0',
        status: 'running',
        message: 'Frontend no encontrado. Verifica la estructura de carpetas.',
        structure: 'Esperada: backend/server.js y ../frontend/index.html',
        endpoints: {
          health: 'GET /api/health',
          test: 'GET /api/test',
          players: 'GET /api/players',
          dbStatus: 'GET /api/db-status (opcional)'
        },
        socketio: {
          status: 'active',
          events: {
            client: ['Iniciar', 'Posicion', 'disconnect'],
            server: ['Iniciar', 'Posicion', 'PlayerDisconnected']
          }
        }
      });
    }
  });
});

// ==================== SOCKET.IO - MULTIPLAYER ====================

// Lista de jugadores conectados
const listaJugadores = [];

// Escuchar conexiones de Socket.IO
io.on('connection', (socket) => {
  console.log('👤 Nueva conexión:', socket.id);

  // Evento: Jugador se une al juego
  socket.on('Iniciar', (data) => {
    console.log('🎮 Jugador conectado:', data);
    
    // Verificar que los datos sean válidos
    if (!data || !data.nickname || !data.character) {
      console.error('❌ Datos inválidos recibidos:', data);
      return;
    }

    // Verificar si el jugador ya existe
    const existente = listaJugadores.find(p => p.nickname === data.nickname);
    
    if (!existente) {
      // Agregar nuevo jugador a la lista
      const nuevoJugador = {
        nickname: data.nickname,
        character: data.character,
        socketId: socket.id,
        x: 0,
        y: 0,
        z: 0,
        timestamp: new Date().toISOString()
      };
      
      listaJugadores.push(nuevoJugador);
      console.log(`✅ Jugador agregado: ${data.nickname}`);
      console.log(`📊 Total jugadores: ${listaJugadores.length}`);
      
      // Notificar a todos los clientes sobre el nuevo jugador
      io.emit('Iniciar', {
        nickname: data.nickname,
        character: data.character
      });
      
      // Enviar lista de jugadores existentes al nuevo jugador
      listaJugadores.forEach(player => {
        if (player.nickname !== data.nickname) {
          socket.emit('Iniciar', {
            nickname: player.nickname,
            character: player.character
          });
        }
      });
    } else {
      console.log(`ℹ️ Jugador ya existe, actualizando socketId: ${data.nickname}`);
      existente.socketId = socket.id;
    }
  });

  // Evento: Actualización de posición
  socket.on('Posicion', (posicion, nickname) => {
    if (!posicion || !nickname) {
      return;
    }

    const jugador = listaJugadores.find(p => p.nickname === nickname);
    
    if (jugador) {
      // Actualizar posición del jugador
      jugador.x = posicion.x;
      jugador.y = posicion.y;
      jugador.z = posicion.z;

      // Broadcast a todos excepto al emisor
      socket.broadcast.emit('Posicion', posicion, nickname);
    }
  });

  // Evento: Desconexión
  socket.on('disconnect', (reason) => {
    console.log('👋 Usuario desconectado:', socket.id, '- Razón:', reason);
    
    const indice = listaJugadores.findIndex(p => p.socketId === socket.id);
    
    if (indice !== -1) {
      const jugadorDesconectado = listaJugadores[indice];
      console.log(`🗑️ Removiendo jugador: ${jugadorDesconectado.nickname}`);
      
      // Notificar a otros jugadores sobre la desconexión
      io.emit('PlayerDisconnected', jugadorDesconectado.nickname);
      
      // Remover jugador de la lista
      listaJugadores.splice(indice, 1);
      console.log(`📊 Total jugadores: ${listaJugadores.length}`);
    }
  });

  // Evento: Error
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

// Monitoreo de Socket.IO
io.engine.on('connection_error', (err) => {
  console.error('❌ Connection error:', err);
});

// ==================== ERROR HANDLERS ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// ==================== INICIAR SERVIDOR ====================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 SERVIDOR CHAOS GAME INICIADO                      ║
╠════════════════════════════════════════════════════════╣
║  📡 Puerto: ${PORT}                                    ║
║  🏠 Host: ${HOST}                                      ║
║  🔧 Ambiente: ${process.env.NODE_ENV || 'development'}    ║
║  🌐 Frontend: ${process.env.FRONTEND_URL || 'Not set'}    ║
║                                                        ║
║  📍 Endpoints disponibles:                             ║
║  • http://localhost:${PORT}/api/health                 ║
║  • http://localhost:${PORT}/api/test                   ║
║  • http://localhost:${PORT}/api/players                ║
║  • http://localhost:${PORT}/api/db-status              ║
║                                                        ║
║  🔌 Socket.IO: ✅ Activo                               ║
║  💾 Supabase: ${supabase ? '✅' : '⚠️'}  ${supabase ? 'Conectado' : 'No configurado'}               ║
╚════════════════════════════════════════════════════════╝
  `);
  
  console.log('📋 Allowed CORS origins:', allowedOrigins);
});

// Exportar para testing
module.exports = { app, server, io };