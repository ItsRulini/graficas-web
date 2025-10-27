import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import { WebSocketServer } from 'ws';

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

// Middleware CORS
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:3000',
	credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// En producción NO servimos archivos estáticos
if (process.env.NODE_ENV !== 'production') {
	app.use(express.static(path.join(__dirname, '../../frontend')));
}

// ==================== SISTEMA MULTIJUGADOR ====================

const rooms = new Map();
const players = new Map();

function generateRoomCode() {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 6; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

function generatePlayerId() {
	return Math.random().toString(36).substr(2, 9);
}

// ==================== ENDPOINTS API ====================

app.post('/api/multiplayer/create-room', async (req, res) => {
	try {
		const { playerName, character } = req.body;
		console.log('📨 Creando sala para:', playerName, character);

		const roomCode = generateRoomCode();

		const room = {
			code: roomCode,
			players: new Map(),
			createdAt: Date.now(),
			gameStarted: false,
			host: null
		};

		rooms.set(roomCode, room);

		console.log('✅ Sala creada:', roomCode);

		res.json({
			success: true,
			roomCode: roomCode, // ← Asegurar que se envía roomCode
			message: 'Sala creada exitosamente'
		});

	} catch (error) {
		console.error('❌ Error creando sala:', error);
		res.status(500).json({
			success: false,
			error: 'Error al crear sala'
		});
	}
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
				error: error.message
			});
		}

		res.json({
			success: true,
			message: '✅ Conexión exitosa a la base de datos',
			database: 'Supabase PostgreSQL',
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			message: '❌ Error al conectar con la base de datos',
			error: error.message
		});
	}
});

// ==================== ENDPOINTS MULTIPLAYER ====================

// Crear sala multijugador
app.post('/api/multiplayer/create-room', async (req, res) => {
	try {
		const { playerName, character } = req.body;
		const roomCode = generateRoomCode();

		const room = {
			code: roomCode,
			players: new Map(),
			createdAt: Date.now(),
			gameStarted: false,
			host: null
		};

		rooms.set(roomCode, room);

		res.json({
			success: true,
			roomCode,
			message: 'Sala creada exitosamente'
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			error: 'Error al crear sala'
		});
	}
});

// Unirse a sala
app.post('/api/multiplayer/join-room', async (req, res) => {
	try {
		const { roomCode, playerName, character } = req.body;
		const room = rooms.get(roomCode);

		if (!room) {
			return res.status(404).json({
				success: false,
				error: 'Sala no encontrada'
			});
		}

		if (room.players.size >= 4) {
			return res.status(400).json({
				success: false,
				error: 'Sala llena'
			});
		}

		res.json({
			success: true,
			message: 'Puedes unirte a la sala',
			playerCount: room.players.size + 1
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			error: 'Error al unirse a la sala'
		});
	}
});

// Obtener información de sala
app.get('/api/multiplayer/room/:roomCode', (req, res) => {
	const room = rooms.get(req.params.roomCode);

	if (!room) {
		return res.status(404).json({
			success: false,
			error: 'Sala no encontrada'
		});
	}

	const playersData = Array.from(room.players.values()).map(player => ({
		id: player.id,
		name: player.name,
		character: player.character,
		isHost: player.isHost
	}));

	res.json({
		success: true,
		room: {
			code: room.code,
			players: playersData,
			gameStarted: room.gameStarted,
			playerCount: room.players.size
		}
	});
});
// Ruta API de prueba
app.get('/api/test', (req, res) => {
	res.json({
		mensaje: 'API funcionando correctamente',
		fecha: new Date().toLocaleString(),
		multiplayer: {
			activeRooms: rooms.size,
			activePlayers: players.size
		}
	});
});

// Health check
app.get('/api/health', (req, res) => {
	res.json({
		status: 'OK',
		message: 'Servidor funcionando',
		timestamp: new Date().toISOString(),
		multiplayer: {
			rooms: rooms.size,
			players: players.size
		}
	});
});

// Ruta por defecto
app.get('/', (req, res) => {
	if (process.env.NODE_ENV === 'production') {
		res.json({
			message: 'CHAOS Game API',
			version: '1.0.0',
			features: ['Multiplayer', 'Supabase Database', 'WebSocket']
		});
	} else {
		res.sendFile(path.join(__dirname, '../../frontend/index.html'));
	}
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

// ==================== WEB SOCKET SERVER ====================

const server = app.listen(PORT, () => {
	console.log(`
    ✅ Servidor HTTP corriendo en puerto ${PORT}
    🔧 Ambiente: ${process.env.NODE_ENV || 'development'}
    🎮 Multiplayer: WebSocket listo
    ${process.env.NODE_ENV !== 'production' ? '🎯 Frontend: http://localhost:' + PORT : ''}
  `);
});

// Crear servidor WebSocket
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
	console.log('🔌 Nueva conexión WebSocket');

	ws.on('message', (message) => {
		try {
			const data = JSON.parse(message);
			handleWebSocketMessage(ws, data);
		} catch (error) {
			console.error('❌ Error procesando mensaje WebSocket:', error);
		}
	});

	ws.on('close', () => {
		handlePlayerDisconnect(ws);
	});
});

function handleWebSocketMessage(ws, data) {
	switch (data.type) {
		case 'joinRoom':
			handleJoinRoom(ws, data.roomCode, data.playerName, data.character);
			break;
		case 'playerUpdate':
			handlePlayerUpdate(ws, data.position, data.rotation, data.animation);
			break;
		case 'startGame':
			handleStartGame(ws, data.roomCode);
			break;
		case 'chatMessage':
			handleChatMessage(ws, data.roomCode, data.message);
			break;
	}
}

function handleJoinRoom(ws, roomCode, playerName, character) {
	const room = rooms.get(roomCode);
	if (!room) {
		ws.send(JSON.stringify({ type: 'error', message: 'Sala no encontrada' }));
		return;
	}

	if (room.gameStarted) {
		ws.send(JSON.stringify({ type: 'error', message: 'La partida ya comenzó' }));
		return;
	}

	const playerId = generatePlayerId();
	const isHost = room.players.size === 0;

	const player = {
		id: playerId,
		ws: ws,
		name: playerName,
		character: character,
		roomCode: roomCode,
		isHost: isHost,
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0 },
		animation: 'idle'
	};

	room.players.set(playerId, player);
	players.set(ws, player);

	// Notificar al jugador que se unió
	ws.send(JSON.stringify({
		type: 'joinedRoom',
		playerId: playerId,
		isHost: isHost,
		room: {
			code: roomCode,
			players: getRoomPlayersData(roomCode)
		}
	}));

	// Notificar a todos los jugadores de la sala
	broadcastToRoom(roomCode, {
		type: 'playersUpdate',
		players: getRoomPlayersData(roomCode)
	});

	console.log(`🎮 ${playerName} se unió a la sala ${roomCode} como ${character}`);
}

function handlePlayerUpdate(ws, position, rotation, animation) {
	const player = players.get(ws);
	if (!player) return;

	// Actualizar datos del jugador
	player.position = position;
	player.rotation = rotation;
	player.animation = animation;

	// Enviar actualización a otros jugadores
	broadcastToRoom(player.roomCode, {
		type: 'playerUpdate',
		playerId: player.id,
		position: position,
		rotation: rotation,
		animation: animation
	}, ws); // Excluir al jugador que envió la actualización
}

function handleStartGame(ws, roomCode) {
	const player = players.get(ws);
	if (!player || !player.isHost) {
		ws.send(JSON.stringify({ type: 'error', message: 'Solo el host puede iniciar el juego' }));
		return;
	}

	const room = rooms.get(roomCode);
	if (!room || room.players.size < 1) {
		ws.send(JSON.stringify({ type: 'error', message: 'No hay suficientes jugadores' }));
		return;
	}

	room.gameStarted = true;

	broadcastToRoom(roomCode, {
		type: 'gameStarted',
		message: '¡La partida ha comenzado!'
	});

	console.log(`🚀 Partida iniciada en sala ${roomCode}`);
}

function handleChatMessage(ws, roomCode, message) {
	const player = players.get(ws);
	if (!player) return;

	broadcastToRoom(roomCode, {
		type: 'chatMessage',
		playerId: player.id,
		playerName: player.name,
		message: message,
		timestamp: new Date().toISOString()
	});
}

function handlePlayerDisconnect(ws) {
	const player = players.get(ws);
	if (!player) return;

	const room = rooms.get(player.roomCode);
	if (room) {
		room.players.delete(player.id);

		// Si el host se desconecta, asignar nuevo host
		if (player.isHost && room.players.size > 0) {
			const newHost = Array.from(room.players.values())[0];
			newHost.isHost = true;

			broadcastToRoom(player.roomCode, {
				type: 'newHost',
				hostId: newHost.id
			});
		}

		broadcastToRoom(player.roomCode, {
			type: 'playersUpdate',
			players: getRoomPlayersData(player.roomCode)
		});

		// Eliminar sala si está vacía
		if (room.players.size === 0) {
			setTimeout(() => {
				if (room.players.size === 0) {
					rooms.delete(player.roomCode);
					console.log(`🗑️ Sala ${player.roomCode} eliminada`);
				}
			}, 30000);
		}
	}

	players.delete(ws);
	console.log(`👋 ${player.name} desconectado`);
}

function broadcastToRoom(roomCode, message, excludeWs = null) {
	const room = rooms.get(roomCode);
	if (!room) return;

	const messageStr = JSON.stringify(message);

	for (const player of room.players.values()) {
		if (player.ws !== excludeWs && player.ws.readyState === 1) {
			player.ws.send(messageStr);
		}
	}
}

function getRoomPlayersData(roomCode) {
	const room = rooms.get(roomCode);
	if (!room) return [];

	return Array.from(room.players.values()).map(player => ({
		id: player.id,
		name: player.name,
		character: player.character,
		isHost: player.isHost,
		position: player.position,
		rotation: player.rotation
	}));
}

// Limpieza periódica de salas vacías
setInterval(() => {
	for (const [roomCode, room] of rooms.entries()) {
		if (room.players.size === 0 && (Date.now() - room.createdAt > 300000)) {
			rooms.delete(roomCode);
			console.log(`🧹 Sala ${roomCode} limpiada por inactividad`);
		}
	}
}, 60000);
