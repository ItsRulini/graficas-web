// server.js - Versión ES Modules con Socket.IO + API + Supabase + Google Auth
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { OAuth2Client } from 'google-auth-library';


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


const googleClient = new OAuth2Client(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_CALLBACK_URL
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


// Google Auth Routes
app.get('/auth/google', (req, res) => {
	const authUrl = googleClient.generateAuthUrl({
		access_type: 'offline',
		scope: ['email', 'profile'],
		prompt: 'consent'
	});
	res.redirect(authUrl);
});

// Reemplazar la ruta /auth/google/callback en server.js

app.get('/auth/google/callback', async (req, res) => {
	try {
		const { code } = req.query;

		if (!code) {
			return res.redirect(`${process.env.FRONTEND_URL}/LOG.HTML?error=No authorization code`);
		}

		// 1. Obtener tokens de Google
		const { tokens } = await googleClient.getToken(code);

		// 2. Verificar token y obtener información del usuario
		const ticket = await googleClient.verifyIdToken({
			idToken: tokens.id_token,
			audience: process.env.GOOGLE_CLIENT_ID
		});

		const payload = ticket.getPayload();
		const { email, sub: googleId, name, picture } = payload;

		console.log('🔐 Google User:', { email, googleId, name });

		// 3. Verificar si el usuario ya existe (por email o google_id)
		const { data: existingUser, error: checkError } = await supabase
			.from('users')
			.select('*')
			.or(`email.eq.${email},google_id.eq.${googleId}`)
			.single();

		let user;

		if (existingUser) {
			// Usuario existe - actualizar información
			console.log('✅ Usuario existente encontrado, actualizando...');

			const { data: updatedUser, error: updateError } = await supabase
				.from('users')
				.update({
					google_id: googleId,
					avatar_url: picture,
					auth_provider: 'google',
					last_login: new Date().toISOString(),
					// Actualizar nickname solo si está vacío
					...(existingUser.nickname ? {} : { nickname: name || email.split('@')[0] })
				})
				.eq('id', existingUser.id)
				.select()
				.single();

			if (updateError) {
				console.error('❌ Error actualizando usuario:', updateError);
				throw updateError;
			}

			user = updatedUser;
		} else {
			// Usuario nuevo - crear
			console.log('➕ Creando nuevo usuario...');

			const { data: newUser, error: insertError } = await supabase
				.from('users')
				.insert({
					email: email,
					nickname: name || email.split('@')[0],
					google_id: googleId,
					avatar_url: picture,
					auth_provider: 'google',
					password: null, // No necesita password con Google Auth
					joined_date: new Date().toISOString(),
					last_login: new Date().toISOString(),
					best_score: 0,
					play_time: 0,
					total_wins: 0,
					total_deaths: 0
				})
				.select()
				.single();

			if (insertError) {
				console.error('❌ Error creando usuario:', insertError);
				throw insertError;
			}

			user = newUser;
		}

		console.log('✅ Usuario procesado exitosamente:', user);

		// 4. Redirigir al frontend con información del usuario
		const redirectUrl = `${process.env.FRONTEND_URL}/LOG.HTML?success=true&email=${encodeURIComponent(email)}&name=${encodeURIComponent(user.nickname)}&userId=${user.id}&avatar=${encodeURIComponent(picture || '')}`;

		res.redirect(redirectUrl);

	} catch (error) {
		console.error('❌ Google auth error:', error);
		const redirectUrl = `${process.env.FRONTEND_URL}/LOG.HTML?error=${encodeURIComponent(error.message)}`;
		res.redirect(redirectUrl);
	}
});


// Agregar estos endpoints en server.js después de los endpoints de Google

// ==================== EMAIL/PASSWORD AUTHENTICATION ====================

// Endpoint para REGISTRAR usuario con email/password
app.post('/api/auth/register', async (req, res) => {
	try {
		const { email, nickname, password } = req.body;

		// Validaciones
		if (!email || !nickname || !password) {
			return res.status(400).json({
				success: false,
				message: 'Email, nickname y password son requeridos'
			});
		}

		// Validar formato de email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({
				success: false,
				message: 'Email inválido'
			});
		}

		// Validar longitud de password
		if (password.length < 6) {
			return res.status(400).json({
				success: false,
				message: 'La contraseña debe tener al menos 6 caracteres'
			});
		}

		// Verificar si el usuario ya existe
		const { data: existingUser } = await supabase
			.from('users')
			.select('email, nickname')
			.or(`email.eq.${email},nickname.eq.${nickname}`)
			.single();

		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: 'El email o nickname ya está registrado'
			});
		}

		// Crear usuario (sin encriptar password)
		const { data: newUser, error: insertError } = await supabase
			.from('users')
			.insert({
				email: email,
				nickname: nickname,
				password: password,
				auth_provider: 'email',
				joined_date: new Date().toISOString(),
				last_login: new Date().toISOString(),
				best_score: 0,
				play_time: 0,
				total_wins: 0,
				total_deaths: 0
			})
			.select()
			.single();

		if (insertError) {
			console.error('❌ Error creando usuario:', insertError);
			throw insertError;
		}

		console.log('✅ Usuario registrado exitosamente:', newUser.email);

		res.json({
			success: true,
			message: 'Usuario registrado exitosamente',
			user: {
				id: newUser.id,
				email: newUser.email,
				nickname: newUser.nickname
			}
		});

	} catch (error) {
		console.error('❌ Error en registro:', error);
		res.status(500).json({
			success: false,
			message: 'Error al registrar usuario',
			error: error.message
		});
	}
});

// Endpoint para LOGIN con email/password (CORREGIDO)
app.post('/api/auth/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		console.log('🔐 Intento de login:', email);

		// Validaciones
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: 'Email y password son requeridos'
			});
		}

		// Buscar usuario por email
		const { data: user, error: findError } = await supabase
			.from('users')
			.select('*')
			.eq('email', email)
			.maybeSingle(); // maybeSingle() no lanza error si no encuentra nada

		console.log('📊 Resultado de búsqueda:', {
			userFound: !!user,
			error: findError
		});

		// Verificar si el usuario existe
		if (!user) {
			console.log('❌ Usuario no encontrado:', email);
			return res.status(401).json({
				success: false,
				message: 'Email o contraseña incorrectos'
			});
		}

		// Verificar si hubo un error en la consulta
		if (findError) {
			console.error('❌ Error en consulta:', findError);
			return res.status(500).json({
				success: false,
				message: 'Error al buscar usuario'
			});
		}

		console.log('✅ Usuario encontrado:', user.email);

		// Verificar si el usuario se registró con Google
		if (user.auth_provider === 'google') {
			console.log('⚠️ Usuario de Google intentando login con password');
			return res.status(400).json({
				success: false,
				message: 'Esta cuenta fue creada con Google. Por favor usa "Continuar con Google"'
			});
		}

		// Verificar password (comparación directa)
		if (password !== user.password) {
			console.log('❌ Contraseña incorrecta para:', email);
			return res.status(401).json({
				success: false,
				message: 'Email o contraseña incorrectos'
			});
		}

		// Actualizar last_login
		await supabase
			.from('users')
			.update({ last_login: new Date().toISOString() })
			.eq('id', user.id);

		console.log('✅ Login exitoso:', user.email);

		res.json({
			success: true,
			message: 'Login exitoso',
			user: {
				id: user.id,
				email: user.email,
				nickname: user.nickname,
				avatar_url: user.avatar_url,
				best_score: user.best_score,
				play_time: user.play_time,
				total_wins: user.total_wins,
				total_deaths: user.total_deaths,
				joined_date: user.joined_date
			}
		});

	} catch (error) {
		console.error('❌ Error en login:', error);
		res.status(500).json({
			success: false,
			message: 'Error al iniciar sesión',
			error: error.message
		});
	}
});

// Endpoint de prueba (EXISTENTE)
app.get('/api/test', (req, res) => {
	res.json({
		mensaje: 'API funcionando correctamente',
		fecha: new Date().toLocaleString(),
		env: {
			PORT: process.env.PORT || 3000,
			NODE_ENV: process.env.NODE_ENV || 'development',
			SUPABASE_CONFIGURED: !!process.env.SUPABASE_URL,
			GOOGLE_AUTH_CONFIGURED: !!process.env.GOOGLE_CLIENT_ID,
			FRONTEND_URL: process.env.FRONTEND_URL
		},
		jugadoresConectados: listaJugadores.length
	});
});


// Agregar después de los otros endpoints en server.js

// Endpoint para obtener información del usuario
app.get('/api/user/:userId', async (req, res) => {
	try {
		const { userId } = req.params;

		const { data: user, error } = await supabase
			.from('users')
			.select('id, nickname, email, avatar_url, best_score, play_time, total_wins, total_deaths, joined_date')
			.eq('id', userId)
			.single();

		if (error) {
			return res.status(404).json({
				success: false,
				message: 'Usuario no encontrado',
				error: error.message
			});
		}

		res.json({
			success: true,
			user: user
		});
	} catch (error) {
		console.error('❌ Error obteniendo usuario:', error);
		res.status(500).json({
			success: false,
			message: 'Error al obtener información del usuario',
			error: error.message
		});
	}
});

// Endpoint para actualizar estadísticas del usuario
app.post('/api/user/:userId/stats', async (req, res) => {
	try {
		const { userId } = req.params;
		const { best_score, play_time, total_wins, total_deaths } = req.body;

		const updateData = {};
		if (best_score !== undefined) updateData.best_score = best_score;
		if (play_time !== undefined) updateData.play_time = play_time;
		if (total_wins !== undefined) updateData.total_wins = total_wins;
		if (total_deaths !== undefined) updateData.total_deaths = total_deaths;

		const { data: user, error } = await supabase
			.from('users')
			.update(updateData)
			.eq('id', userId)
			.select()
			.single();

		if (error) {
			return res.status(400).json({
				success: false,
				message: 'Error actualizando estadísticas',
				error: error.message
			});
		}

		res.json({
			success: true,
			user: user
		});
	} catch (error) {
		console.error('❌ Error actualizando estadísticas:', error);
		res.status(500).json({
			success: false,
			message: 'Error al actualizar estadísticas',
			error: error.message
		});
	}
});


// Endpoint para verificar conexión a la base de datos (EXISTENTE)
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
					supabase_key: process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada',
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

// Endpoint para obtener jugadores conectados (EXISTENTE)
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

// Ruta raíz (EXISTENTE)
app.get('/', (req, res) => {
	if (process.env.NODE_ENV === 'production') {
		res.json({
			message: 'CHAOS Game API + Socket.IO Server',
			version: '1.0.0',
			endpoints: [
				'GET /api/health',
				'GET /api/test',
				'GET /api/db-status',
				'GET /api/players',
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

// Lista de jugadores (EXISTENTE)
const listaJugadores = [];

// Escuchar conexiones (EXISTENTE)
io.on('connection', (socket) => {
	console.log('👤 User connected:', socket.id);

	// Evento: Jugador se une (EXISTENTE)
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

	// Evento: Actualización de posición (EXISTENTE)
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

	// Evento: Desconexión (EXISTENTE)
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

// 404 handler (EXISTENTE)
app.use((req, res) => {
	res.status(404).json({
		error: 'Ruta no encontrada',
		path: req.path
	});
});

// Error handler (EXISTENTE)
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
