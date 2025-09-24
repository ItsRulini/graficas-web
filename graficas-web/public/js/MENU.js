export class Menu {
    constructor() {
        this.isPlaying = localStorage.getItem("isPlaying") ?? true;

        this.init();
        this.bindEvents();
        this.GSAP();
        this.togglePauseMenu(false);
        this.musicToogle(this.isPlaying); // Iniciar sin música
        this.showLevel(this.currentLevelIndex); //seleccionar nivel
    }


    init() {
        console.log("Menu initialized");

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

        const icon = this.musicBtn.querySelector("i");

        // abrir/cerrar el menu de pausa con la tecla P o manualmente
        this.pauseMenu = document.getElementById("config-pause"); 
        this.settingsImg = document.querySelector(".gmc-set-h img");
        this.resumeBtn = document.getElementById("resume-gmc");
        this.closeBtn = document.getElementById("close-gmc");
        this.gameMode = document.getElementById("gamemode-gmc");
        this.quitBtn = document.getElementById("quit-gmc");
        this.reloadBtn = document.getElementById("reload-gmc");

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
                    const inner = w.querySelector('div');
                    const as = w.querySelectorAll('a');
                    const spans = w.querySelectorAll('span');

                    if (w !== wrapper) {
                        inner.style.opacity = '0.5';
                        as.forEach(span => span.style.filter = '.5');
                    } else {
                        inner.style.opacity = '1';
                        spans.forEach(span => span.style.filter = 'none');
                        spans.forEach(span => span.style.color = 'white');
                        inner.style.background = '#ffd900';
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
                });
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
            this.PlayerBar.classList.toggle('active');
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

        this.volumeBtn.addEventListener("click", () => {
            const icon = this.volumeBtn.querySelector("i");
            this.volumeBtn.classList.toggle("active");
            if (this.volumeBtn.classList.contains("active")) {
                icon.classList.remove("fa-volume-high");
                icon.classList.add("fa-volume-xmark");
                this.volumeBtn.style.background = "rgb(255, 66, 66)";
            } else {
                icon.classList.remove("fa-volume-xmark");
                icon.classList.add("fa-volume-high");
                this.volumeBtn.style.background = "";
            }
        });

        // ABRIR/CERRAR EL MANEU DE PAUSA CON LA TECLA P o MANUALMENTE
        document.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "p") {
                const isHidden = this.pauseMenu.style.display === "none" || this.pauseMenu.style.display === "";
                this.togglePauseMenu(isHidden);
            }
        });

        // Cerrar manualmente (resume o close)
        [this.resumeBtn, this.closeBtn].forEach(btn => {
            btn.addEventListener("click", () => {
                this.togglePauseMenu(false);
            });
        });

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
    togglePauseMenu(open) {
        if (open) {
            this.pauseMenu.style.display = "inline-flex";
            this.settingsImg.src = "resources/img/pause.png";
            this.resumeBtn.style.display = "inline-flex";
            this.closeBtn.style.display = "none";
            this.gameMode.style.display = "none";
            this.reloadBtn.style.display = "inline-flex";
            this.quitBtn.style.display = "inline-flex";
        } else {
            this.pauseMenu.style.display = "none";
            this.settingsImg.src = "resources/img/settings.png";
            this.resumeBtn.style.display = "none";
            this.closeBtn.style.display = "inline-flex";
            this.gameMode.style.display = "inline-flex";
            this.reloadBtn.style.display = "none";
            this.quitBtn.style.display = "none";
        }
    }

    async manageMusic(play) {

        if (!this.backgroundMusic) return;

        if (!play) {
            this.backgroundMusic.pause();
        }
        else{
            this.backgroundMusic.play().catch((error) => {
                console.error("Error al reproducir la música:", error);
            });
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

    
}

document.addEventListener('DOMContentLoaded', () => {
    window.menu = new Menu();
});