// server_juego.js - Versión ES Modules con Socket.IO + API + Supabase
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
dotenv.config();

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear servidor Express
const app = express();
const server = createServer(app);

// Crear instancia de Socket.IO vinculada al servidor
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta "frontend"
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(join(__dirname, '../../frontend')));
}

// ==================== ENDPOINTS API ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    services: {
      express: '✅',
      socketio: '✅',
      supabase: supabase ? '✅' : '❌'
    }
  });
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    mensaje: 'API funcionando correctamente',
    fecha: new Date().toLocaleString(),
    env: {
      PORT: process.env.PORT || 3000,
      NODE_ENV: process.env.NODE_ENV || 'development',
      SUPABASE_CONFIGURED: !!process.env.SUPABASE_URL,
      FRONTEND_URL: process.env.FRONTEND_URL
    },
    jugadoresConectados: listaJugadores.length
  });
});

// Endpoint para verificar conexión a la base de datos
app.get('/api/db-status', async (req, res) => {
  try {
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

// Endpoint para obtener jugadores conectados
app.get('/api/players', (req, res) => {
  res.json({
    success: true,
    count: listaJugadores.length,
    players: listaJugadores.map(p => ({
      nickname: p.nickname,
      character: p.character,
      position: { x: p.x, y: p.y, z: p.z }
    }))
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.json({
      message: 'CHAOS Game API + Socket.IO Server',
      version: '1.0.0',
      endpoints: [
        'GET /api/health',
        'GET /api/test',
        'GET /api/db-status',
        'GET /api/players'
      ],
      socketio: {
        events: ['Iniciar', 'Posicion', 'disconnect']
      }
    });
  } else {
    res.sendFile(join(__dirname, '../../frontend/index.html'));
  }
});

// ==================== SOCKET.IO - MULTIPLAYER ====================

// Lista de jugadores
const listaJugadores = [];

// Escuchar conexiones
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Evento: Jugador se une
  socket.on('Iniciar', (data) => {
    console.log('🎮 Player joined:', data);
    
    const existe = listaJugadores.find(p => p.nickname === data.nickname);
    if (!existe) {
      listaJugadores.push({
        nickname: data.nickname,
        character: data.character,
        socketId: socket.id,
        x: 0,
        y: 0,
        z: 0
      });
      
      console.log(`📊 Total players: ${listaJugadores.length}`);
    }

    // Notificar a todos los clientes
    io.emit('Iniciar', data);

    // Enviar lista de jugadores existentes al nuevo jugador
    listaJugadores.forEach(player => {
      socket.emit('Iniciar', {
        nickname: player.nickname,
        character: player.character
      });
    });
  });

  // Evento: Actualización de posición
  socket.on('Posicion', (posicion, nickname) => {
    const player = listaJugadores.find(p => p.nickname === nickname);
    if (player) {
      player.x = posicion.x;
      player.y = posicion.y;
      player.z = posicion.z;

      // Broadcast a todos excepto al emisor
      socket.broadcast.emit('Posicion', posicion, nickname);
    }
  });

  // Evento: Desconexión
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
    const index = listaJugadores.findIndex(p => p.socketId === socket.id);
    
    if (index !== -1) {
      const disconnectedPlayer = listaJugadores[index];
      console.log('🗑️ Removing player:', disconnectedPlayer.nickname);
      
      // Notificar a otros jugadores sobre la desconexión
      io.emit('PlayerDisconnected', disconnectedPlayer.nickname);
      
      listaJugadores.splice(index, 1);
      console.log(`📊 Total players: ${listaJugadores.length}`);
    }
  });
});

// ==================== ERROR HANDLERS ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// ==================== INICIAR SERVIDOR ====================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 SERVIDOR CHAOS GAME INICIADO                      ║
╠════════════════════════════════════════════════════════╣
║  📡 Puerto: ${PORT}                                    
║  🔧 Ambiente: ${process.env.NODE_ENV || 'development'}
║  ${process.env.NODE_ENV !== 'production' ? '🎮 Frontend: http://localhost:' + PORT : ''}
║  🧪 API Test: http://localhost:${PORT}/api/test        
║  💾 DB Status: http://localhost:${PORT}/api/db-status  
║  👥 Players: http://localhost:${PORT}/api/players      
║  🔌 Socket.IO: Activo                                  
╚════════════════════════════════════════════════════════╝
  `);
});