export class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.playerNickname = '';
        this.playerCharacter = '';
        this.otherPlayers = {};
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.connectionTimeout = null;
        
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

        // 🔥 SOLUCIÓN 1: Verificar que la URL del túnel esté activa
        let serverUrl = 'https://8lx53dw2-3000.usw3.devtunnels.ms/'; //https://ssmz3744-3000.usw3.devtunnels.ms
        
        
        // Remover barra final si existe
        serverUrl = serverUrl.replace(/\/$/, '');
        
        console.log(`🔌 Connecting to: ${serverUrl}`);

        // 🔥 SOLUCIÓN 2: Configuración mejorada de Socket.IO
        this.socket = io(serverUrl, {
            transports: ['polling', 'websocket'], // ⭐ Cambiar orden: polling primero
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: this.maxReconnectAttempts,
            timeout: 20000, // ⭐ Aumentar timeout a 20 segundos
            autoConnect: true,
            forceNew: true,
            // 🔥 SOLUCIÓN 3: Headers adicionales para dev tunnels
            extraHeaders: {
                'Access-Control-Allow-Origin': '*'
            }
        });

        // ==================== EVENTOS DE CONEXIÓN ====================
        
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            console.log('🆔 Socket ID:', this.socket.id);
            console.log('🔌 Transport:', this.socket.io.engine.transport.name);
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Limpiar timeout de conexión
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            
            // Enviar información del jugador al servidor
            this.socket.emit('Iniciar', {
                nickname: this.playerNickname,
                character: this.playerCharacter
            });
            
            console.log('📤 Sent player info to server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
            console.error('   Type:', error.type);
            console.error('   Description:', error.description);
            
            this.reconnectAttempts++;
            
            // 🔥 SOLUCIÓN 4: Mensaje específico según el error
            if (error.message.includes('timeout')) {
                console.warn('⏱️ Connection timeout - El servidor puede estar inactivo');
            } else if (error.message.includes('websocket')) {
                console.warn('🔌 WebSocket failed - Intentando con polling...');
            }
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('💔 Max reconnection attempts reached');
                this._ShowConnectionError();
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('⚠️ Disconnected from server. Reason:', reason);
            this.isConnected = false;
            
            if (reason === 'io server disconnect') {
                console.log('🔄 Server disconnected client - Attempting manual reconnection...');
                this.socket.connect();
            } else if (reason === 'transport close') {
                console.log('🔄 Transport closed - Will auto-reconnect...');
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`✅ Reconnected after ${attemptNumber} attempts`);
            this.reconnectAttempts = 0;
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('💔 All reconnection attempts failed');
            this._ShowConnectionError();
        });

        // 🔥 SOLUCIÓN 5: Timeout manual de conexión inicial
        this.connectionTimeout = setTimeout(() => {
            if (!this.isConnected) {
                console.error('⏱️ Initial connection timeout');
                this._ShowConnectionError();
            }
        }, 30000); // 30 segundos para la conexión inicial

        // ==================== EVENTO PRINCIPAL: PLAYERLIST ====================
        
        this.socket.on('PlayerList', (playerList) => {
            console.log('📋 Received player list:', playerList);
            console.log(`   - Total players in server: ${playerList.length}`);
            
            const serverNicknames = new Set(
                playerList
                    .filter(p => p.nickname !== this.playerNickname)
                    .map(p => p.nickname)
            );
            
            console.log('   - Other players:', Array.from(serverNicknames));
            
            // Remover jugadores desconectados
            Object.keys(this.otherPlayers).forEach(nickname => {
                if (!serverNicknames.has(nickname)) {
                    console.log(`🗑️ Removing disconnected player: ${nickname}`);
                    if (this.onRemovePlayer) {
                        this.onRemovePlayer(nickname);
                    }
                    delete this.otherPlayers[nickname];
                }
            });
            
            // Crear/actualizar jugadores
            playerList.forEach(player => {
                if (player.nickname === this.playerNickname) {
                    return;
                }
                
                if (!this.otherPlayers[player.nickname]) {
                    console.log(`➕ Creating new player: ${player.nickname} (${player.character})`);
                    
                    this.otherPlayers[player.nickname] = {
                        character: player.character,
                        position: player.position || { x: 0, y: 0, z: 0 }
                    };
                    
                    if (this.onCreatePlayer) {
                        console.log(`   - Calling onCreatePlayer callback for ${player.nickname}`);
                        this.onCreatePlayer(player.nickname, player.character);
                    } else {
                        console.warn(`   - ⚠️ onCreatePlayer callback not set!`);
                    }
                } else if (player.position) {
                    this.otherPlayers[player.nickname].position = player.position;
                    
                    if (this.onUpdatePlayer) {
                        this.onUpdatePlayer(player.nickname, player.position);
                    }
                }
            });
            
            console.log(`👥 Total other players tracked: ${Object.keys(this.otherPlayers).length}`);
        });

        // ==================== EVENTO POSICION ====================
        
        this.socket.on('Posicion', (posicionData, nickname) => {
            if (nickname === this.playerNickname) {
                return;
            }

            if (this.otherPlayers[nickname]) {
                this.otherPlayers[nickname].position = posicionData;
                
                if (this.onUpdatePlayer) {
                    this.onUpdatePlayer(nickname, posicionData);
                }
            } else {
                console.warn(`⚠️ Received position for unknown player: ${nickname}`);
            }
        });
    }

    // 🔥 SOLUCIÓN 6: Método para mostrar error de conexión
    _ShowConnectionError() {
        const errorMsg = `
🚫 No se pudo conectar al servidor multijugador

Posibles causas:
1. El servidor está inactivo o caído
2. El túnel de desarrollo expiró
3. Problemas de red/firewall

Opciones:
- Continuar jugando en modo local (sin multijugador)
- Reintentar la conexión
- Verificar el servidor
        `.trim();
        
        console.error(errorMsg);
        
        const continueLocal = confirm(
            'No se pudo conectar al servidor multijugador.\n\n' +
            '¿Deseas continuar jugando en modo local?\n\n' +
            'OK = Jugar sin multijugador\n' +
            'Cancelar = Volver al menú'
        );
        
        if (!continueLocal) {
            window.location.href = '/index.html';
        } else {
            console.log('🎮 Continuando en modo local (sin multijugador)');
        }
    }

    SendPosition(position) {
        if (this.isConnected && this.socket) {
            this.socket.emit('Posicion', {
                x: position.x,
                y: position.y,
                z: position.z
            }, this.playerNickname);
        }
    }

    IsConnected() {
        return this.isConnected;
    }

    Disconnect() {
        if (this.socket) {
            console.log('🔌 Disconnecting from server...');
            
            // Limpiar timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
            }
            
            this.socket.disconnect();
            this.isConnected = false;
        }
    }

    GetOtherPlayers() {
        return this.otherPlayers;
    }

    // 🔥 SOLUCIÓN 7: Método para reintentar conexión manualmente
    Reconnect() {
        if (!this.isConnected && this.socket) {
            console.log('🔄 Manual reconnection attempt...');
            this.reconnectAttempts = 0;
            this.socket.connect();
        }
    }

    // 🔥 SOLUCIÓN 8: Método para verificar el estado de la conexión
    GetConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socket?.id || null,
            transport: this.socket?.io?.engine?.transport?.name || null,
            reconnectAttempts: this.reconnectAttempts,
            otherPlayersCount: Object.keys(this.otherPlayers).length
        };
    }
}