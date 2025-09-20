
const wrappers = document.querySelectorAll('.gm-opt > div:not(.gm-img), .gm-opt > a');
wrappers.forEach(wrapper => {
    wrapper.addEventListener('mouseenter', () => {
        wrappers.forEach(w => {
            const inner = w.querySelector('div');
            const as = w.querySelectorAll('a');
            const spans = w.querySelectorAll('span'); // todos los spans

            if (w !== wrapper) {
                inner.style.opacity = '0.5';
                as.forEach(span => span.style.filter = '.5');
                //spans.forEach(span => span.style.filter = 'blur(2px)'); // aplica a todos los q NO tienen hover
            } else {
                inner.style.opacity = '1';
                spans.forEach(span => span.style.filter = 'none'); //
                spans.forEach(span => span.style.color = 'white'); //
                inner.style.background = '#ffd900';
            }
        });
    });

    wrapper.addEventListener('mouseleave', () => {
        wrappers.forEach(w => {
            const inner = w.querySelector('div');
            const spans = w.querySelectorAll('span');
            inner.style.opacity = '';
            inner.style.background = '';
            //spans.forEach(span => span.style.filter = ''); // restaurar todos
            spans.forEach(span => span.style.color = ''); //
        });
    });
});

const wrapperss = document.querySelectorAll('.gmo-start-wrapper, .gmo-config-wrapper, .gmo-credits-wrapper, .gmo-exit-wrapper');
wrapperss.forEach(wrapper => {
    wrapper.addEventListener('mouseenter', () => { //HOVER
        gsap.to(wrapper, { scale: 1.3, duration: 0.3});
    });
    wrapper.addEventListener('mouseleave', () => { //NO HOVER
        gsap.to(wrapper, { scale: 1, duration: 0.3 });
    });
});

//GSAP
gsap.from('.gmo-start-wrapper',{
    opacity: 0,
    duration:1,
    y:400,
})
gsap.from('.gmo-config-wrapper',{
    opacity: 0,
    duration:1,
    y:300,
})
gsap.from('.gmo-credits-wrapper',{
    opacity: 0,
    duration:1,
    y:200,
})
gsap.from('.gmo-exit-wrapper',{
    opacity: 0,
    duration:1,
    y:100
})

//          ABRIR OPCIONES
//SETTINGS
//Abrir
document.getElementById('open-gmc').addEventListener('click', function() {
    document.querySelector('.gm-config').style.display = 'flex';
});
// Cerrar menu de configuracion
document.getElementById('close-gmc').addEventListener('click', function() {
    document.querySelector('.gm-config').style.display = 'none';
});

//CREDITS
document.getElementById('open-gmct').addEventListener('click', function() {
    document.querySelector('.gm-credits').style.display = 'flex';
});

//Cerrar creditos
document.getElementById('close-gmct').addEventListener('click', function() {
    document.querySelector('.gm-credits').style.display = 'none';
});

//seleccionar dificultad
const displays = document.querySelectorAll(".gmc-display");
  let currentIndex = 0;

  // función para actualizar la vista
  function showDisplay(index) {
    displays.forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });
  }

  // inicializamos
  showDisplay(currentIndex);

  // botón siguiente
  document.getElementById("next").addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % displays.length;
    showDisplay(currentIndex);
  });

  // botón anterior
  document.getElementById("prev").addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + displays.length) % displays.length;
    showDisplay(currentIndex);
  });

  //cambiar texto de creditos
const raul = document.getElementById("raul");
  let toggled = false;

  raul.addEventListener("click", () => {
    if (toggled) {
      raul.innerHTML = "Raul Alejandro <br> Garcia Gamez";
    } else {
      raul.textContent = "2049564";
    }
    toggled = !toggled;
});
const danna = document.getElementById("danna");
  let toggledd = false;

  danna.addEventListener("click", () => {
    if (toggledd) {
      danna.innerHTML = "Danna Paola <br> Hernandez Rodriguez";
    } else {
      danna.textContent = "2076454";
    }
    toggledd = !toggledd;
});
const alberto = document.getElementById("alberto");
  let toggleda = false;

  alberto.addEventListener("click", () => {
    if (toggleda) {
      alberto.innerHTML = "Alberto Jesus <br> Alvarado Garza";
    } else {
      alberto.textContent = "1847862";
    }
    toggleda = !toggleda;
});

//cambiar color y icono del volumen y musica
const musicBtn = document.getElementById("music-btn");
const volumeBtn = document.getElementById("volume-btn");

musicBtn.addEventListener("click", () => {
  const icon = musicBtn.querySelector("i");
  musicBtn.classList.toggle("active");

  if (musicBtn.classList.contains("active")) {
    icon.textContent = "music_off"; // icono muteado
    musicBtn.style.background = "rgb(255, 66, 66)";
  } else {
    icon.textContent = "music_note"; // icono normal
    musicBtn.style.background = "";
  }
});

volumeBtn.addEventListener("click", () => {
  const icon = volumeBtn.querySelector("i");
  volumeBtn.classList.toggle("active");

  if (volumeBtn.classList.contains("active")) {
    icon.classList.remove("fa-volume-high");
    icon.classList.add("fa-volume-xmark"); // icono muteado
    volumeBtn.style.background = "rgb(255, 66, 66)";
  } else {
    icon.classList.remove("fa-volume-xmark");
    icon.classList.add("fa-volume-high"); // icono normal
    volumeBtn.style.background = "";
  }
});

//ABRIR/CERRAR EL MANEU DE PAUSA CON LA TECLA P o MANUALMENTE
const pauseMenu = document.getElementById("config-pause"); 
const settingsImg = document.querySelector(".gmc-set-h img");
const resumeBtn = document.getElementById("resume-gmc");
const closeBtn = document.getElementById("close-gmc");
const gameMode = document.getElementById("gamemode-gmc");
const quitBtn = document.getElementById("quit-gmc");
const reloadBtn = document.getElementById("reload-gmc");

function togglePauseMenu(open) {
  if (open) {
    pauseMenu.style.display = "inline-flex"; 
    settingsImg.src = "img/pause.png";
    resumeBtn.style.display = "inline-flex";
    closeBtn.style.display = "none";
    gameMode.style.display = "none";
    reloadBtn.style.display = "inline-flex";
    quitBtn.style.display = "inline-flex";
  } else {
    pauseMenu.style.display = "none"; 
    settingsImg.src = "img/settings.png";
    resumeBtn.style.display = "none";
    closeBtn.style.display = "inline-flex";
    gameMode.style.display = "inline-flex";
    reloadBtn.style.display = "none";
    quitBtn.style.display = "none";
  }
}

// Abrir / Cerrar con tecla P
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "p") {
    const isHidden = pauseMenu.style.display === "none" || pauseMenu.style.display === "";
    togglePauseMenu(isHidden); 
  }
});
// Cerrar manualmente (resume o close)
[resumeBtn, closeBtn].forEach(btn => {
  btn.addEventListener("click", () => {
    togglePauseMenu(false);
  });
});

//cambiar el nombre de colores
const username = document.getElementById("username");
  // Definir colores
  const colors = {
    white: "white",
    black: "black",
    yellow: "var(--cyellow)",
    green: "var(--cgreen)",
    blue: "var(--fcolor)",
    red: "var(--cred)"
  };

  // Asignar eventos a cada botón
  Object.keys(colors).forEach(id => {
    document.getElementById(id).addEventListener("click", () => {
      username.style.animation = ""; // reset si había animación
      username.style.color = colors[id];
    });
  });

  // Botón rainbow con animación
  document.getElementById("rainbow").addEventListener("click", () => {
    username.style.animation = "rainbow 2s infinite linear";
  });

//foto de perfil
function selectImage() {
  document.getElementById("fileInput").click();
}
document.getElementById("fileInput").addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
    document.getElementById("profileImage").src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});
