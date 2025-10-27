export class Menu {
	constructor() {
		this.isPlaying = localStorage.getItem("isPlaying") ?? true;
		this.sfxEnabled = (localStorage.getItem("sfxEnabled") ?? "true") === "true";

		this.init();
		this.bindEvents();
		this.GSAP();

		this.musicToogle(this.isPlaying); // Iniciar sin música
		this.updateSFXButton();

		this.showLevel(this.currentLevelIndex); //seleccionar nivel

		this.initImageSelector(); //seleccionar imagen de jugador
		this.loadFromLocalStorage(); //cargar el local storage para el jugador seleccionado

		this.multiplayer = null;
		this.roomCode = null;

		this.initMultiplayer();
	}

	initMultiplayer() {
		// Importar e inicializar cliente multiplayer
		import('./multiplayer.js').then(module => {
			this.multiplayer = module.default;
			console.log('🎮 Cliente multiplayer inicializado');
		});
	}



	init() {
		console.log("Menu initialized");

		// Crear sala multiplayer
		document.getElementById('create-lob').addEventListener('click', () => {
			this.createMultiplayerRoom();
		});

		// Unirse a sala multiplayer  
		document.getElementById('join-lob').addEventListener('click', () => {
			this.joinMultiplayerRoom();
		});

		// Iniciar juego desde el lobby del host
		document.getElementById('pGame').addEventListener('click', () => {
			this.startMultiplayerGame();
		});


		// Elementos del menú
		this.wrapperss = document.querySelectorAll('.gmo-start-wrapper, .gmo-config-wrapper, .gmo-credits-wrapper, .gmo-exit-wrapper');
		// Elementos del menú para efectos hover
		this.wrappersEffects = document.querySelectorAll('.gm-opt > div:not(.gm-img), .gm-opt > a');

		// Settings and Credits
		this.openSettings = document.getElementById('open-gmc');
		this.closeSettings = document.getElementById('close-gmc');
		this.settings = document.querySelector('.gm-config');

		this.openCredits = document.getElementById('open-gmct');
		this.closeCredits = document.getElementById('close-gmct');
		this.credits = document.querySelector('.gm-credits');

		//Entrar al juego
		this.PlayGame = document.getElementById('pGame');

		// Abrir opciones para crear sala o unirse
		this.startGame = document.getElementById('gmo-start');

		this.startCreate = document.getElementById('start-start'); //crear el juego
		this.closeCreate = document.getElementById('close-gms');
		this.playOPT = document.getElementById('play-options');
		this.selectedOPT = document.getElementById('host');

		//  Create lobby
		this.host = document.getElementById('hlobby'); //crear sala
		this.closeLobby = document.getElementById('close-gml');

		// Joing Lobby
		this.joinLobby = document.getElementById('join-lob');
		this.join = document.getElementById('jlobby'); //crear sala
		this.closeJoin = document.getElementById('close-gmcj');

		// Logout
		this.logout = document.getElementById('gmo-exit');

		// Texto de los créditos
		this.raul = document.getElementById("raul");
		this.toggledR = false;
		this.danna = document.getElementById("danna");
		this.toggledD = false;
		this.alberto = document.getElementById("alberto");
		this.toggledA = false;

		// Cambiar color e icono del volumen y musica
		this.musicBtn = document.getElementById("music-btn");
		this.volumeBtn = document.getElementById("volume-btn");

		//Cerrar settings
		this.closeBtn = document.getElementById("close-gmc");

		// Nombre de usuario
		this.username = document.getElementById("username");
		// Definir colores
		this.colors = {
			white: "white",
			black: "black",
			yellow: "var(--cyellow)",
			green: "var(--cgreen)",
			blue: "var(--fcolor)",
			red: "var(--cred)"
		};

		// Boton rainbow con animación
		this.rainbowBtn = document.getElementById("rainbow");

		// Foto de perfil
		this.profileImage = document.getElementById("profileImage");
		this.fileInput = document.getElementById("fileInput");

		// Música de fondo
		this.backgroundMusic = document.getElementById("background-music");
		this.backgroundMusic.volume = 0.5;

		//SFX botones
		this.hoverSound = new Audio("resources/audio/sfx/hover_sfx.m4a");
		this.hoverSound.volume = 1;

		//SFX Abrir
		this.hoverOpen = new Audio("resources/audio/sfx/open_sfx.m4a");
		this.hoverOpen.volume = 1;

		//SFX Cerrar
		this.hoverClose = new Audio("resources/audio/sfx/close_sfx.m4a");
		this.hoverClose.volume = 1;

		//BOTONES SFX
		this.sfxBTNS = document.querySelectorAll(".sfx-btn"); //para hover
		this.sfxBTNSNormal = document.querySelectorAll(".sfx-normal-btn"); //para hover

		this.sfxBTNSClick = document.querySelectorAll(".sfx-btn-click"); //para click
		this.sfxBTNSClickClose = document.querySelectorAll(".sfx-btn-close"); //para cerrar con un click

		//Seleccionar el nivel
		this.levels = document.querySelectorAll(".lc-level"); // todos los niveles
		this.levelPrevBtn = document.getElementById("lc-prev");
		this.levelNextBtn = document.getElementById("lc-next");
		this.currentIndex = 0;
		this.currentLevelIndex = 0;

		this.levelData = [
			{ name: "Level Name One", desc: "First scenary description." },
			{ name: "Level Name Two", desc: "Second scenary description." },
			{ name: "Level Name Three", desc: "Third scenary description." }
		];

		this.levelName = document.getElementById("level-name");
		this.levelDesc = document.getElementById("level-desc");

		//dificultad del nivel
		this.difficulties = ["EASY", "MEDIUM", "HARD"];
		this.difficultyIndex = 0;
		this.difficultyDisplay = document.getElementById("ld-display");

		this.ldPREV = document.getElementById("ld-prev");
		this.ldNEXT = document.getElementById("ld-next");

		// Dificultades
		this.dificulties = document.getElementById("gm-dif");
		this.currentIndexD = 0;

		// Botones de dificultad
		this.prevBtn = document.getElementById("prev");
		this.nextBtn = document.getElementById("next");

		//Abrir barra derecha
		this.PlayerBtn = document.querySelector(".gm-btn-display");
		this.PlayerBar = document.getElementById("gd-player");

		//IDs pfp de personajes
		this.ness = document.getElementById('ness');
		this.yoshi = document.getElementById('yoshi');
		this.isabelle = document.getElementById('isabelle');
		this.bomberman = document.getElementById('bomberman');
		this.displayIMG = document.getElementById('avatar');

		this.playerOPT = document.querySelectorAll('.gdu-select img');

		this.lsPLAYER = localStorage.getItem("selectedPLY"); //localstorage player

	}



	async createMultiplayerRoom() {
		try {
			const playerName = "Player";
			const character = localStorage.getItem('PlayerName') || 'ness';

			console.log('🎮 Creando sala...');

			// Conectar WebSocket primero
			await this.multiplayer.connect();

			// Configurar event handlers
			this.multiplayer.onJoinedRoom = (data) => {
				console.log('✅ Sala creada y unido:', data);
				this.roomCode = data.roomCode || this.multiplayer.roomCode;

				if (!this.roomCode) {
					console.error('❌ No se recibió roomCode');
					this.showMessage('Error: No se pudo crear la sala', 'error');
					return;
				}

				this.onPlayerJoinedRoom(data);

				// Actualizar el código en la UI del host
				const roomCodeInput = document.querySelector('.lc-code input');
				if (roomCodeInput) {
					roomCodeInput.value = `#${this.roomCode}`;
					console.log('🏷️ Código de sala actualizado en UI:', this.roomCode);
				}
			};

			this.multiplayer.onPlayersUpdate = (players) => {
				console.log('👥 Jugadores en sala:', players);
				this.updateLobbyPlayers(players);
			};

			this.multiplayer.onError = (message) => {
				console.error('❌ Error multiplayer:', message);
				this.showMessage('Error: ' + message, 'error');
			};

			// Crear sala
			const result = await this.multiplayer.createRoom(playerName, character);
			console.log('🎉 Resultado crear sala:', result);

		} catch (error) {
			console.error('❌ Error creando sala:', error);
			this.showMessage('Error al crear sala: ' + error.message, 'error');
		}
	}


	async joinMultiplayerRoom() {
		try {
			const roomCodeInput = document.querySelector('.lj-search input');
			const roomCode = roomCodeInput.value.replace('#', '').trim().toUpperCase();

			if (!roomCode || roomCode.length !== 6) {
				alert('❌ Código de sala inválido. Debe tener 6 caracteres.');
				return;
			}

			const playerName = "Player";
			const character = localStorage.getItem('PlayerName') || 'ness';

			console.log('🎯 Uniéndose a sala:', roomCode);

			// Conectar WebSocket primero
			await this.multiplayer.connect();

			// Configurar event handlers ANTES de unirse
			this.multiplayer.onJoinedRoom = (data) => {
				console.log('✅ Unido a sala exitosamente:', data);
				this.roomCode = data.roomCode;
				this.onPlayerJoinedRoom(data);
			};

			this.multiplayer.onPlayersUpdate = (players) => {
				console.log('👥 Jugadores en sala:', players);
				this.updateLobbyPlayers(players);
			};

			this.multiplayer.onError = (message) => {
				console.error('❌ Error multiplayer:', message);
				alert('Error: ' + message);
			};

			// Unirse a la sala
			await this.multiplayer.joinRoom(roomCode, playerName, character);

		} catch (error) {
			console.error('❌ Error uniéndose a sala:', error);
			alert('Error al unirse a la sala: ' + error.message);
		}
	}
	// Método para manejar cuando el jugador se une exitosamente
	onPlayerJoinedRoom(data) {
		console.log('🎮 Unido como jugador:', data.playerId, 'Host:', data.isHost);

		// Ocultar el input de búsqueda y mostrar info de la sala
		const joinSection = document.querySelector('.lobby-join');
		const playersSection = document.querySelector('.lobby-players');

		if (joinSection) joinSection.style.display = 'none';
		if (playersSection) playersSection.style.display = 'block';

		// Mostrar mensaje de éxito
		this.showMessage(`✅ Unido a sala ${this.roomCode}`, 'success');

		// Si no es host, ocultar el botón de iniciar
		if (!data.isHost) {
			const startBtn = document.getElementById('pGame');
			if (startBtn) startBtn.style.display = 'none';
		}
	}

	// Método para actualizar la lista de jugadores en el lobby
	updateLobbyPlayers(players) {
		const playersContainer = document.querySelector('.lp-aux-show');
		if (!playersContainer) return;

		playersContainer.innerHTML = '';

		players.forEach((player, index) => {
			const playerElement = this.createPlayerElement(player, index);
			playersContainer.appendChild(playerElement);
		});

		console.log('🔄 Lista de jugadores actualizada:', players.length);
	}

	// Método para crear elemento de jugador
	createPlayerElement(player, index) {
		const playerDiv = document.createElement('div');
		playerDiv.className = index === 0 ? 'lp-display' : 'lp-display-tj';

		// Usar la imagen del personaje seleccionado
		const characterImg = this.getCharacterImage(player.character);

		playerDiv.innerHTML = `
        <img src="${characterImg}" alt="avatar" class="lp-avatar">
        <div class="lp-aux${index === 0 ? '' : '-tj'}">
            <div class="lp-names${index === 0 ? '' : '-tj'}">
                <p class="lpn-user">${player.name}</p>
                <p class="lpn-rank">${player.isHost ? 'Host' : 'Player'}</p>
            </div>
            <div class="lp-rank-aux${index === 0 ? '' : '-tj'}">
                <p class="rank">CHARACTER</p>
                <div class="lp-rank${index === 0 ? '' : '-tj'}">
                    <div class="lpr${index === 0 ? '' : '-tj'}">
                        <i class="fa-solid fa-${this.getCharacterIcon(player.character)}"></i>
                    </div>
                </div>
            </div>
        </div>
    `;

		return playerDiv;
	}

	// Helper para obtener imagen del personaje
	getCharacterImage(character) {
		const characterImages = {
			'ness': 'resources/img/ness.png',
			'yoshi': 'resources/img/yoshi.png',
			'isabelle': 'resources/img/isabelle.png',
			'bomberman': 'resources/img/bomberman.png'
		};
		return characterImages[character] || 'resources/img/question-mark.png';
	}

	// Helper para obtener icono del personaje
	getCharacterIcon(character) {
		const characterIcons = {
			'ness': 'user',
			'yoshi': 'dragon',
			'isabelle': 'cat',
			'bomberman': 'bomb'
		};
		return characterIcons[character] || 'question';
	}

	// Método para mostrar mensajes
	showMessage(text, type = 'info') {
		// Puedes implementar tu sistema de mensajes aquí
		console.log(`💬 ${type.toUpperCase()}: ${text}`);

		// Ejemplo simple con alert
		if (type === 'error') {
			alert(`❌ ${text}`);
		} else if (type === 'success') {
			// Mostrar en algún elemento de tu UI
			const messageElement = document.getElementById('message') || document.createElement('div');
			messageElement.textContent = text;
			messageElement.className = `message ${type}`;
			messageElement.style.display = 'block';

			setTimeout(() => {
				messageElement.style.display = 'none';
			}, 3000);
		}
	}
	bindEvents() {

		// // Iniciar juego
		this.PlayGame.addEventListener("click", () => {
			window.location.href = "SCENE.html";
		});

		// Cerrar sesión
		this.logout.addEventListener("click", () => {
			window.location.href = "LOG.HTML";
		});

		// Efectos hover en los wrappers
		this.wrappersEffects.forEach(wrapper => {
			wrapper.addEventListener('mouseenter', () => {
				this.wrappersEffects.forEach(w => {

					this.playHoverSFX(); //sfx
					this.hoverSound.currentTime = 0; //reiniciar

					const inner = w.querySelector('div');
					const as = w.querySelectorAll('a');
					const spans = w.querySelectorAll('span');
					if (w !== wrapper) {
						as.forEach(span => span.style.filter = '.5');
						w.style.filter = 'brightness(0.4)';
					} else {
						inner.style.opacity = '1';
						spans.forEach(span => span.style.filter = 'none');
						spans.forEach(span => span.style.color = 'white');
						w.style.filter = 'brightness(1)';
						w.style.background = '#ffd900';
						inner.style.boxShadow = "none";
					}
				});
			});

			wrapper.addEventListener('mouseleave', () => {
				this.wrappersEffects.forEach(w => {
					const inner = w.querySelector('div');
					const spans = w.querySelectorAll('span');
					inner.style.opacity = '';
					inner.style.background = '';
					spans.forEach(span => span.style.color = '');
					w.style.filter = 'brightness(1)';
					w.style.background = '';
					inner.style.boxShadow = "";
				});
			});
		});

		//hover sobre otros botones
		this.sfxBTNS.forEach(boton => {
			boton.addEventListener("mouseenter", () => {
				this.playOpenSFX();
				this.hoverOpen.currentTime = 0;
			});
		});
		//hover sobre otros botones
		this.sfxBTNSNormal.forEach(botonnormal => {
			botonnormal.addEventListener("mouseenter", () => {
				this.playHoverSFX();
				this.hoverSound.currentTime = 0;
			});
		});
		//click sobre otros botones
		this.sfxBTNSClick.forEach(botonclick => {
			botonclick.addEventListener("click", () => {
				this.playOpenSFX();
				this.hoverOpen.currentTime = 0;
			});
		});
		//click para cerrar
		this.sfxBTNSClickClose.forEach(botonclickclose => {
			botonclickclose.addEventListener("click", () => {
				this.playCloseSFX();
			});
		});

		// Efecto de escala con GSAP
		this.wrapperss.forEach(wrapper => {
			wrapper.addEventListener('mouseenter', () => {
				gsap.to(wrapper, { scale: 1.3, duration: 0.3 });
			});
			wrapper.addEventListener('mouseleave', () => {
				gsap.to(wrapper, { scale: 1, duration: 0.3 });
			});
		});

		// Abrir/Cerrar Opciones
		this.openSettings.addEventListener('click', () => {
			this.settings.style.display = 'flex';
		});

		this.closeSettings.addEventListener('click', () => {
			this.settings.style.display = 'none';
		});

		this.openCredits.addEventListener('click', () => {
			this.credits.style.display = 'flex';
		});

		this.closeCredits.addEventListener('click', () => {
			this.credits.style.display = 'none';
		});

		this.startGame.addEventListener('click', () => {
			this.startCreate.style.display = 'flex';
		});

		this.closeCreate.addEventListener('click', () => {
			this.startCreate.style.display = 'none';
		});
		// Crear sala
		this.selectedOPT.addEventListener('click', () => {
			this.host.style.display = 'flex';
			this.playOPT.style.display = 'none';
		});

		this.closeLobby.addEventListener('click', () => {
			this.host.style.display = 'none';
			this.playOPT.style.display = 'block';
		});

		// Abrir barra derecha del jugador
		this.PlayerBtn.addEventListener('click', () => {
			const isActive = this.PlayerBar.classList.toggle('active');
			if (isActive) {
				this.playOpenSFX();
			} else {
				this.playCloseSFX();
			}
		});

		//abrir ventana para unirse
		this.joinLobby.addEventListener('click', () => {
			this.join.style.display = 'flex';
			this.playOPT.style.display = 'none';
		});
		this.closeJoin.addEventListener('click', () => {
			this.join.style.display = 'none';
			this.playOPT.style.display = 'block';
		});


		// Botones de dificultad
		this.prevBtn.addEventListener("click", () => {
			this.currentIndexD = (this.currentIndexD - 1 + this.difficulties.length) % this.difficulties.length;
			this.dificulties.textContent = this.difficulties[this.currentIndexD];
		});

		this.nextBtn.addEventListener("click", () => {
			this.currentIndexD = (this.currentIndexD + 1) % this.difficulties.length;
			this.dificulties.textContent = this.difficulties[this.currentIndexD];
		});

		//Botones de dificultad de NIVEL
		this.ldPREV.addEventListener("click", () => {
			this.difficultyIndex = (this.difficultyIndex - 1 + this.difficulties.length) % this.difficulties.length;
			this.difficultyDisplay.textContent = this.difficulties[this.difficultyIndex];
		});

		this.ldNEXT.addEventListener("click", () => {
			this.difficultyIndex = (this.difficultyIndex + 1) % this.difficulties.length;
			this.difficultyDisplay.textContent = this.difficulties[this.difficultyIndex];
		});

		// Texto de los créditos
		this.raul.addEventListener("click", () => {
			if (this.toggledR) {
				this.raul.innerHTML = "Raúl Alejandro <br> García Gámez";
			} else {
				this.raul.textContent = "2049564";
			}
			this.toggledR = !this.toggledR;
		});

		this.danna.addEventListener("click", () => {
			if (this.toggledD) {
				this.danna.innerHTML = "Danna Paola <br> Hernández Rodríguez";
			} else {
				this.danna.textContent = "2076454";
			}
			this.toggledD = !this.toggledD;
		});

		this.alberto.addEventListener("click", () => {
			if (this.toggleda) {
				this.alberto.innerHTML = "Alberto Jesús <br> Alvarado Garza";
			} else {
				this.alberto.textContent = "1847862";
			}
			this.toggleda = !this.toggleda;
		});

		// Cambiar color e icono del volumen y musica
		this.musicBtn.addEventListener("click", () => {
			this.musicToogle(this.isPlaying);
		});

		this.volumeBtn.addEventListener("click", () => this.sfxToggle());

		// ABRIR/CERRAR EL MANEU DE PAUSA CON LA TECLA P o MANUALMENTE
		// document.addEventListener("keydown", (e) => {
		//     if (e.key.toLowerCase() === "p") {
		//         const isHidden = this.pauseMenu.style.display === "none" || this.pauseMenu.style.display === "";
		//         this.togglePauseMenu(isHidden);
		//     }
		// });

		// // Cerrar manualmente (resume o close)
		// [this.resumeBtn, this.closeBtn].forEach(btn => {
		//     btn.addEventListener("click", () => {
		//         this.togglePauseMenu(false);
		//     });
		// });

		// // Cambiar el nombre de colores
		// Object.keys(this.colors).forEach(id => {
		//     document.getElementById(id).addEventListener("click", () => {
		//         this.username.style.animation = "";
		//         this.username.style.color = this.colors[id];
		//     });
		// });

		// // Botón rainbow con animación
		// this.rainbowBtn.addEventListener("click", () => {
		//     this.username.style.animation = "rainbow 2s infinite linear";
		// });

		// // Foto de perfil
		// this.profileImage.addEventListener("click", () => {
		//     this.fileInput.click();
		// });

		// this.fileInput.addEventListener("change", (event) => {
		//     const file = event.target.files[0];
		//     if (file) {
		//         const reader = new FileReader();
		//         reader.onload = (e) => {
		//             this.profileImage.src = e.target.result;
		//         };
		//         reader.readAsDataURL(file);
		//     }
		// });

		//Seleccionar Nivel
		this.levelPrevBtn.addEventListener("click", () => {
			this.currentLevelIndex = (this.currentLevelIndex - 1 + this.levels.length) % this.levels.length;
			this.showLevel(this.currentLevelIndex);
		});

		this.levelNextBtn.addEventListener("click", () => {
			this.currentLevelIndex = (this.currentLevelIndex + 1) % this.levels.length;
			this.showLevel(this.currentLevelIndex);
		});
	}

	showLevel(index) {
		this.levels.forEach((level, i) => {
			level.style.display = i === index ? "inline-flex" : "none";
		});
		// Cambiar título y descripción
		if (this.levelData[index]) {
			this.levelName.textContent = this.levelData[index].name;
			this.levelDesc.textContent = this.levelData[index].desc;
		}
	}

	GSAP() {
		gsap.from('.gmo-start-wrapper', {
			opacity: 0,
			duration: 1,
			y: 400,
		});
		gsap.from('.gmo-config-wrapper', {
			opacity: 0,
			duration: 1,
			y: 300,
		});
		gsap.from('.gmo-credits-wrapper', {
			opacity: 0,
			duration: 1,
			y: 200,
		});
		gsap.from('.gmo-exit-wrapper', {
			opacity: 0,
			duration: 1,
			y: 100
		});
	}
	//Funciones para la música y efectos de sonido
	async manageMusic(play) {

		if (!this.backgroundMusic) return;

		if (!play) {
			this.backgroundMusic.pause();
		}
		else {
			this.backgroundMusic.play().catch((error) => {
				console.error("Error al reproducir la música:", error);
			});
		}
	}
	async playHoverSFX() {
		if (!this.sfxEnabled) return; // no hacer nada si está muteado
		try {
			this.hoverSound.currentTime = 0;
			await this.hoverSound.play();
		} catch (err) {
			if (err.name !== "AbortError") {
				console.warn("Error al reproducir SFX:", err);
			}
		}
	}
	async playOpenSFX() {
		if (!this.sfxEnabled) return; // no hacer nada si está muteado
		try {
			this.hoverOpen.currentTime = 0;
			await this.hoverOpen.play();
		} catch (err) {
			if (err.name !== "AbortError") {
				console.warn("Error al reproducir SFX:", err);
			}
		}
	}
	async playCloseSFX() {
		if (!this.sfxEnabled) return; // no hacer nada si está muteado
		try {
			this.hoverClose.currentTime = 0;
			await this.hoverClose.play();
		} catch (err) {
			if (err.name !== "AbortError") {
				console.warn("Error al reproducir SFX:", err);
			}
		}
	}

	musicToogle(play) {
		const icon = this.musicBtn.querySelector("i");
		//this.musicBtn.classList.toggle("active");
		if (play) {
			icon.textContent = "music_off";
			this.musicBtn.style.background = "rgb(255, 66, 66)";

			// Pausar música
			this.isPlaying = false;
		} else {
			icon.textContent = "music_note";
			this.musicBtn.style.background = "";

			// Reanudar música
			this.isPlaying = true;
		}
		this.manageMusic(this.isPlaying);
	}

	updateSFXButton() {
		const icon = this.volumeBtn.querySelector("i");
		if (!icon) return;

		if (this.sfxEnabled) {
			icon.className = "fa-solid fa-volume-high"; // 
			this.volumeBtn.style.background = "";
		} else {
			icon.className = "fa-solid fa-volume-xmark"; // 
			this.volumeBtn.style.background = "rgb(255, 66, 66)";
		}
	}
	sfxToggle() {
		const icon = this.volumeBtn.querySelector("i");
		this.sfxEnabled = !this.sfxEnabled;

		console.log("switch");
		localStorage.setItem("sfxEnabled", this.sfxEnabled);

		this.updateSFXButton();
	}

	//Cambiar imagen de personaje seleccionado
	changePLAYER(lsPLAYER) {
		this.displayIMG.src = lsPLAYER;
	}
	initImageSelector() {
		this.playerOPT.forEach(option => {
			option.addEventListener('click', () => {
				this.changePLAYER(option.src);

				localStorage.setItem("selectedPLY", option.src); // !    LOCAL storage   !
				localStorage.setItem("PlayerName", option.id); //guardar id
			});
		});
	}
	//Cargar LS
	loadFromLocalStorage() {
		const saved = localStorage.getItem("selectedPLY");
		if (saved) {
			this.changePLAYER(saved);
		}
	}
}
document.addEventListener('DOMContentLoaded', () => {
	window.menu = new Menu();
});
