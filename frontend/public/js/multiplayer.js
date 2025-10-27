// Cliente Multiplayer para CHAOS GAME
class MultiplayerClient {
	constructor() {
		this.ws = null;
		this.roomCode = null;
		this.playerId = null;
		this.isHost = false;
		this.players = new Map();
		this.isConnected = false;

		this.serverUrl = 'ws://localhost:3000';
	}

	async connect() {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.serverUrl);

				this.ws.onopen = () => {
					this.isConnected = true;
					console.log('✅ Conectado al servidor multiplayer');
					resolve();
				};

				this.ws.onmessage = (event) => {
					console.log('📨 Mensaje recibido del servidor:', event.data);
					this.handleMessage(JSON.parse(event.data));
				};

				this.ws.onclose = () => {
					this.isConnected = false;
					console.log('❌ Conexión multiplayer cerrada');
				};

				this.ws.onerror = (error) => {
					reject(error);
				};

			} catch (error) {
				reject(error);
			}
		});
	}

	async createRoom(playerName, character) {
		if (!this.isConnected) {
			await this.connect();
		}

		console.log('📨 Creando sala via HTTP API...');

		try {
			// Crear sala via HTTP API
			const response = await fetch('/api/multiplayer/create-room', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerName, character })
			});

			const data = await response.json();
			console.log('📊 Respuesta crear sala:', data);

			if (data.success) {
				this.roomCode = data.roomCode; // ← AQUÍ está el roomCode

				// Unirse via WebSocket
				this.ws.send(JSON.stringify({
					type: 'joinRoom',
					roomCode: this.roomCode, // ← Usar this.roomCode
					playerName: playerName,
					character: character
				}));

				return data;
			} else {
				throw new Error(data.error || 'Error desconocido al crear sala');
			}
		} catch (error) {
			console.error('❌ Error en createRoom:', error);
			throw error;
		}
	}
	async joinRoom(roomCode, playerName, character) {
		if (!this.isConnected) {
			await this.connect();
		}

		console.log('📨 Uniéndose a sala via HTTP API...', roomCode);

		try {
			// Verificar sala via HTTP API
			const response = await fetch('/api/multiplayer/join-room', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roomCode, playerName, character })
			});

			const data = await response.json();
			console.log('📊 Respuesta unirse a sala:', data);

			if (data.success) {
				this.roomCode = roomCode; // ← Asegurar que se guarda el roomCode

				// Unirse via WebSocket
				this.ws.send(JSON.stringify({
					type: 'joinRoom',
					roomCode: roomCode,
					playerName: playerName,
					character: character
				}));

				return data;
			} else {
				throw new Error(data.error || 'Error desconocido al unirse a sala');
			}
		} catch (error) {
			console.error('❌ Error en joinRoom:', error);
			throw error;
		}
	}
	sendPlayerUpdate(position, rotation, animation) {
		if (this.isConnected && this.ws) {
			this.ws.send(JSON.stringify({
				type: 'playerUpdate',
				position: position,
				rotation: rotation,
				animation: animation
			}));
		}
	}

	startGame() {
		if (this.isConnected && this.isHost) {
			this.ws.send(JSON.stringify({
				type: 'startGame',
				roomCode: this.roomCode
			}));
		}
	}

	sendChatMessage(message) {
		if (this.isConnected) {
			this.ws.send(JSON.stringify({
				type: 'chatMessage',
				roomCode: this.roomCode,
				message: message
			}));
		}
	}

	handleMessage(data) {
		switch (data.type) {
			case 'joinedRoom':
				this.playerId = data.playerId;
				this.isHost = data.isHost;
				this.onJoinedRoom?.(data);
				break;

			case 'playersUpdate':
				this.onPlayersUpdate?.(data.players);
				break;

			case 'playerUpdate':
				this.onPlayerUpdate?.(data.playerId, data.position, data.rotation, data.animation);
				break;

			case 'gameStarted':
				this.onGameStarted?.(data);
				break;

			case 'chatMessage':
				this.onChatMessage?.(data);
				break;

			case 'newHost':
				if (data.hostId === this.playerId) {
					this.isHost = true;
				}
				this.onNewHost?.(data);
				break;

			case 'error':
				console.error('Error multiplayer:', data.message);
				this.onError?.(data.message);
				break;
		}
	}

	// Event handlers (sobrescribir estos)
	onJoinedRoom(data) { }
	onPlayersUpdate(players) { }
	onPlayerUpdate(playerId, position, rotation, animation) { }
	onGameStarted(data) { }
	onChatMessage(data) { }
	onNewHost(data) { }
	onError(message) { }

	disconnect() {
		if (this.ws) {
			this.ws.close();
		}
		this.isConnected = false;
	}
}

// Crear instancia global
const multiplayer = new MultiplayerClient();
export default multiplayer;
