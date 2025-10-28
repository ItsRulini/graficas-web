export class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.playerNickname = '';
        this.playerCharacter = '';
        this.otherPlayers = {};
        this.isConnected = false;
        
        this._GetPlayerInfo();
        this._Connect();
    }

    _GetPlayerInfo() {
        // Obtener nickname y personaje
        this.playerNickname = localStorage.getItem('PlayerNickname');
        this.playerCharacter = localStorage.getItem('PlayerName');
        
        if (!this.playerNickname || !this.playerCharacter) {
            alert('❌ Missing player information. Redirecting...');
            window.location.href = '/index.html';
            return;
        }
        
        console.log(`👤 Player nickname: ${this.playerNickname}`);
        console.log(`🎮 Player character: ${this.playerCharacter}`);
    }

    _Connect() {
        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.isConnected = true;
            
            // Enviar nickname Y personaje al servidor
            this.socket.emit('Iniciar', {
                nickname: this.playerNickname,
                character: this.playerCharacter
            });
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.isConnected = false;
        });

        // Escuchar nuevos jugadores
        this.socket.on('Iniciar', (data) => {
            console.log(`🎮 Player data received:`, data);
            if (data.nickname !== this.playerNickname && !this.otherPlayers[data.nickname]) {
                if (this.onCreatePlayer) {
                    this.onCreatePlayer(data.nickname, data.character);
                }
            }
        });

        // Escuchar actualizaciones de posición
        this.socket.on('Posicion', (posicionData, nickname) => {
            if (nickname !== this.playerNickname) {
                if (this.onUpdatePlayer) {
                    this.onUpdatePlayer(nickname, posicionData);
                }
            }
        });
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
}