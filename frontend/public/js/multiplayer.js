export class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.playerNickname = '';
        this.playerCharacter = '';
        this.otherPlayers = {};
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this._GetPlayerInfo();
        this._Connect();
    }

    _GetPlayerInfo() {
        // Obtener nickname y personaje
        this.playerNickname = localStorage.getItem('PlayerNickname');
        this.playerCharacter = localStorage.getItem('PlayerName');
        
        if (!this.playerNickname || !this.playerCharacter) {
            console.error('❌ Missing player information');
            alert('⚠️ Información de jugador no encontrada. Redirigiendo...');
            window.location.href = '/index.html';
            return;
        }
        
        console.log(`👤 Player nickname: ${this.playerNickname}`);
        console.log(`🎮 Player character: ${this.playerCharacter}`);
    }

    _Connect() {
        // Verificar que Socket.IO esté disponible
        if (typeof io === 'undefined') {
            console.error('❌ Socket.IO not loaded! Make sure to include the CDN script.');
            alert('Error: Socket.IO no está cargado. Verifica tu conexión.');
            return;
        }

        // Obtener URL del servidor desde variable global
        const serverUrl = window.SERVER_URL || 'http://localhost:3000';
        console.log(`🔌 Connecting to: ${serverUrl}`);

        // Configuración de conexión con opciones mejoradas
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'], // Intentar WebSocket primero, luego polling
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
            timeout: 10000
        });

        // Evento: Conexión exitosa
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            console.log('🆔 Socket ID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Enviar información del jugador al servidor
            this.socket.emit('Iniciar', {
                nickname: this.playerNickname,
                character: this.playerCharacter
            });
        });

        // Evento: Error de conexión
        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('💔 Max reconnection attempts reached');
                alert('No se pudo conectar al servidor. Verifica tu conexión.');
            }
        });

        // Evento: Desconexión
        this.socket.on('disconnect', (reason) => {
            console.log('⚠️ Disconnected from server. Reason:', reason);
            this.isConnected = false;
            
            if (reason === 'io server disconnect') {
                // El servidor cerró la conexión, intentar reconectar manualmente
                console.log('🔄 Attempting manual reconnection...');
                this.socket.connect();
            }
        });

        // Evento: Reconexión
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        });

        // Evento: Nuevo jugador se une
        this.socket.on('Iniciar', (data) => {
            console.log(`🎮 Player data received:`, data);
            
            // No procesar nuestros propios datos
            if (data.nickname === this.playerNickname) {
                console.log('ℹ️ Ignoring own player data');
                return;
            }

            // Crear jugador si no existe
            if (!this.otherPlayers[data.nickname]) {
                console.log(`➕ Creating new player: ${data.nickname}`);
                if (this.onCreatePlayer) {
                    this.onCreatePlayer(data.nickname, data.character);
                }
            }
        });

        // Evento: Actualización de posición de otros jugadores
        this.socket.on('Posicion', (posicionData, nickname) => {
            // No procesar nuestra propia posición
            if (nickname === this.playerNickname) {
                return;
            }

            if (this.onUpdatePlayer) {
                this.onUpdatePlayer(nickname, posicionData);
            }
        });

        // Evento: Jugador se desconectó
        this.socket.on('PlayerDisconnected', (nickname) => {
            console.log(`👋 Player disconnected: ${nickname}`);
            
            if (this.onRemovePlayer) {
                this.onRemovePlayer(nickname);
            }
        });
    }

    /**
     * Enviar posición del jugador al servidor
     * @param {Object} position - Objeto con x, y, z
     */
    SendPosition(position) {
        if (this.isConnected && this.socket) {
            this.socket.emit('Posicion', {
                x: position.x,
                y: position.y,
                z: position.z
            }, this.playerNickname);
        }
    }

    /**
     * Verificar si está conectado al servidor
     * @returns {boolean}
     */
    IsConnected() {
        return this.isConnected;
    }

    /**
     * Desconectar manualmente del servidor
     */
    Disconnect() {
        if (this.socket) {
            console.log('🔌 Disconnecting from server...');
            this.socket.disconnect();
            this.isConnected = false;
        }
    }

    /**
     * Obtener lista de jugadores conectados
     * @returns {Object}
     */
    GetOtherPlayers() {
        return this.otherPlayers;
    }
}