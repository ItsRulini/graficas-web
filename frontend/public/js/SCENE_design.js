//Scene
export class _Scene{
    constructor(){
        this.init();
        this.bindEvents();
        //Menú de pausa
        this.togglePauseMenu(false);
    }
    init(){
        //Variables
        this.pauseMenu = document.getElementById("pauseMenu"); 
        this.settingsImg = document.querySelector(".gmc-set-h img");
        this.resumeBtn = document.getElementById("resume-gmc");
        this.gameMode = document.getElementById("gamemode-gmc");
        this.quitBtn = document.getElementById("quit-gmc");
        this.reloadBtn = document.getElementById("reload-gmc");

        this.messagelosewin = document.querySelector(".wl-display");
        this.messagelw_close = document.querySelector(".gmwl-close");

        this.lsPLAYER = localStorage.getItem("selectedPLY");
        this.userName = localStorage.getItem('userName');

        //Colocar imagen y usuario acorde
        const avatarImg = document.querySelector(".gmdps-useravatar");
        if (this.lsPLAYER) {
            avatarImg.src = this.lsPLAYER;
            avatarImg.alt = "player";
        }

        //usuario
        const userNameEl = document.querySelector(".gmdps-username");
        if (this.userName) {
            userNameEl.textContent = this.userName;
        }
    }
    bindEvents(){
        //Abrir menu de pausa con tecla "p"
        document.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "p") {
                const isHidden = this.pauseMenu.style.display === "none" || this.pauseMenu.style.display === "";
                this.togglePauseMenu(isHidden);
            }
        });
        //Cerrar manualmente (resume)
        [this.resumeBtn].forEach(btn => {
            btn.addEventListener("click", () => {
                this.togglePauseMenu(false);
            });
        });
        //Abrir mensaje de perdiste con l
        // document.addEventListener("keydown", (e) => {
        //     if (e.key.toLowerCase() === "l") {
        //         this.messagelosewin.style.display = "flex";
        //     }
        // });
        this.messagelw_close.addEventListener('click', () => {
            this.messagelosewin.style.display = 'none';
        });
        
    }
    togglePauseMenu(open){
        if (open) {
            this.pauseMenu.style.display = "inline-flex";
            this.settingsImg.src = "resources/img/pause.png";
            this.resumeBtn.style.display = "inline-flex";
            // this.closeBtn.style.display = "none";
            this.gameMode.style.display = "none";
            this.reloadBtn.style.display = "inline-flex";
            this.quitBtn.style.display = "inline-flex";
        } else {
            this.pauseMenu.style.display = "none";
            this.settingsImg.src = "resources/img/settings.png";
            this.resumeBtn.style.display = "none";
            // this.closeBtn.style.display = "inline-flex";
            this.gameMode.style.display = "inline-flex";
            this.reloadBtn.style.display = "none";
            this.quitBtn.style.display = "none";
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    window.Scene = new _Scene();
});