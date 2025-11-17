export class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.playerNickname = '';
        this.playerCharacter = '';
        this.otherPlayers = {}; // { nickname: { character, position } }
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this._GetPlayerInfo();
        this._Connect();
    }

    _GetPlayerInfo() {
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
        if (typeof io === 'undefined') {
            console.error('❌ Socket.IO not loaded!');
            alert('Error: Socket.IO no está cargado. Verifica tu conexión.');
            return;
        }

        let serverUrl = window.SERVER_URL || 'http://localhost:3000';
        serverUrl = 'https://ssmz3744-3000.usw3.devtunnels.ms/';
        console.log(`🔌 Connecting to: ${serverUrl}`);

        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
            timeout: 10000
        });

        // ==================== EVENTOS DE CONEXIÓN ====================
        
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

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('💔 Max reconnection attempts reached');
                alert('No se pudo conectar al servidor. Verifica tu conexión.');
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('⚠️ Disconnected from server. Reason:', reason);
            this.isConnected = false;
            
            if (reason === 'io server disconnect') {
                console.log('🔄 Attempting manual reconnection...');
                this.socket.connect();
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        });

        // ==================== ⭐ EVENTO PRINCIPAL: PLAYERLIST ====================
        
        this.socket.on('PlayerList', (playerList) => {
            console.log('📋 Received player list:', playerList);
            console.log(`   - Total players in server: ${playerList.length}`);
            
            // 1. Crear Set con nicknames actuales del servidor
            const serverNicknames = new Set(
                playerList
                    .filter(p => p.nickname !== this.playerNickname)
                    .map(p => p.nickname)
            );
            
            console.log('   - Other players:', Array.from(serverNicknames));
            
            // 2. Remover jugadores que ya NO están en el servidor
            Object.keys(this.otherPlayers).forEach(nickname => {
                if (!serverNicknames.has(nickname)) {
                    console.log(`🗑️ Removing disconnected player: ${nickname}`);
                    if (this.onRemovePlayer) {
                        this.onRemovePlayer(nickname);
                    }
                    delete this.otherPlayers[nickname];
                }
            });
            
            // 3. Crear/actualizar jugadores del servidor
            playerList.forEach(player => {
                // Ignorar nuestro propio jugador
                if (player.nickname === this.playerNickname) {
                    return;
                }
                
                // Si el jugador NO existe, créalo
                if (!this.otherPlayers[player.nickname]) {
                    console.log(`➕ Creating new player: ${player.nickname} (${player.character})`);
                    
                    // Guardar datos del jugador
                    this.otherPlayers[player.nickname] = {
                        character: player.character,
                        position: player.position || { x: 0, y: 0, z: 0 }
                    };
                    
                    // ⭐ Llamar callback para crear mesh
                    if (this.onCreatePlayer) {
                        console.log(`   - Calling onCreatePlayer callback for ${player.nickname}`);
                        this.onCreatePlayer(player.nickname, player.character);
                    } else {
                        console.warn(`   - ⚠️ onCreatePlayer callback not set!`);
                    }
                }
                // Si ya existe, actualizar posición
                else if (player.position) {
                    this.otherPlayers[player.nickname].position = player.position;
                    
                    if (this.onUpdatePlayer) {
                        this.onUpdatePlayer(player.nickname, player.position);
                    }
                }
            });
            
            console.log(`👥 Total other players tracked: ${Object.keys(this.otherPlayers).length}`);
        });

        // ==================== EVENTO POSICION (ACTUALIZACIÓN EN TIEMPO REAL) ====================
        
        this.socket.on('Posicion', (posicionData, nickname) => {
            // No procesar nuestra propia posición
            if (nickname === this.playerNickname) {
                return;
            }

            // Actualizar posición del jugador si existe
            if (this.otherPlayers[nickname]) {
                this.otherPlayers[nickname].position = posicionData;
                
                if (this.onUpdatePlayer) {
                    this.onUpdatePlayer(nickname, posicionData);
                }
            } else {
                // Si recibimos una posición de un jugador que no conocemos,
                // es probable que se haya perdido el evento PlayerList
                console.warn(`⚠️ Received position for unknown player: ${nickname}`);
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