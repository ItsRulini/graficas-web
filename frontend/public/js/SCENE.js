import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import { MultiplayerManager } from './multiplayer.js'; //AGREGADO PARA MULTI

console.log("hola");

////    MODELOS de PERSONAJES    ////
const characters = {
    yoshi: {
        model: 'yoshi.fbx',
        path: './resources/3D/yoshi/',
        animPath: './resources/3D/yoshi/animations/',
        scale: 0.05,
        textures: [
            './resources/3D/yoshi/t0473_0.png',
            './resources/3D/yoshi/t0481_0.png'
        ],
        animations: [
            { name: 'walk', file: 'Dwarf_Walk.fbx' },
            { name: 'run', file: 'Run_Forward.fbx' },
            { name: 'idle', file: 'Breathing_Idle.fbx' },
            { name: 'jump', file: 'Jump.fbx' }
        ]
    },
    ness: {
        model: 'ness.fbx',
        path: './resources/3D/ness/',
        animPath: './resources/3D/ness/animations/',
        scale: 0.05,
        textures: [
            './resources/3D/ness/ness_body_low.png'
        ],
        animations: [
            { name: 'walk', file: 'Happy_Walk.fbx' },
            { name: 'run', file: 'Running.fbx' },
            { name: 'idle', file: 'Happy_Idle.fbx' },
            { name: 'jump', file: 'Jump.fbx' }
        ]
    },
    isabelle: {
        model: 'isabelle.fbx',
        path: './resources/3D/isabelle/',
        animPath: './resources/3D/isabelle/animations/',
        scale: 0.05,
        textures: [
            './resources/3D/isabelle/b0.png',
            './resources/3D/isabelle/cloth.png',
            './resources/3D/isabelle/e0.png',
            './resources/3D/isabelle/m0.png'
        ],
        animations: [
            { name: 'walk', file: 'Catwalk_Walk_Forward_Crossed.fbx' },
            { name: 'run', file: 'Run.fbx' },
            { name: 'idle', file: 'Unarmed_Idle_Looking_Ver2.fbx' },
            { name: 'jump', file: 'Jump.fbx' }
        ]
    },
    bomberman: {
        model: 'bomberman.fbx',
        path: './resources/3D/bomberman/',
        animPath: './resources/3D/bomberman/animations/',
        scale: 0.05,
        textures: [
            './resources/3D/bomberman/bom_face01.png',
            './resources/3D/bomberman/bomberman00.png'
        ],
        animations: [
            { name: 'walk', file: 'Strut_Walking.fbx' },
            { name: 'run', file: 'Running.fbx' },
            { name: 'idle', file: 'Standing_W_Briefcase_Idle.fbx' },
            { name: 'jump', file: 'Jump.fbx' }
        ]
    }
};

class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
}

class BasicCharacterController {
  constructor(params) {
    this._Init(params);
     // ✅ Si existen cajas en los params, guárdalas directamente
  this._collisionBoxes = params.collisionBoxes || [];

  // 🔧 Crea los Box3 de cada colisión
  this._collisionBoxes.forEach(box => {
    box.updateMatrixWorld(true);
    box.userData.box = new THREE.Box3().setFromObject(box);
  });

  console.log("✅ Cajas de colisión asignadas al jugador:", this._collisionBoxes.length);
  }

  _Init(params) {
    this._params = params;
    this._deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);

    this._isJumping = false;
    this._jumpVelocity = 0;
    this._gravity = -50;

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
        new BasicCharacterControllerProxy(this._animations), this);

    this._previousPosition = new THREE.Vector3(0, 0, 0);

    this._LoadModels();

    

  }

  //Cargar modelo
  _LoadFBX(path, modelFile, scale) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.setPath(path);
        loader.load(modelFile, (fbx) => {
            fbx.scale.setScalar(scale);
            resolve(fbx);
        }, undefined, reject);
    });
  }

  //Cargar animaciones
  _LoadAnimations(animPath, animations) {
    const loader = new FBXLoader();
    loader.setPath(animPath);

    const promises = animations.map(anim => {
        return new Promise((resolve) => {
            loader.load(anim.file, (a) => {
                if (a.animations && a.animations.length > 0) {
                    resolve(a.animations[0]);
                } else {
                    resolve(null);
                }
            }, undefined, () => resolve(null));
        });
    });

    return Promise.all(promises);
  }

  _UpdateSkydome() {
    if (this._skyDome && this._camera) {
        this._skyDome.position.copy(this._camera.position);
    }
  }

  //    Cargar modelo seleccionado    //
  async _LoadModels() {
    const PlayerName = localStorage.getItem('PlayerName');
    if (!PlayerName || !characters[PlayerName]) return;

    const character = characters[PlayerName];

    // 1. Cargar modelo
    this._target = await this._LoadFBX(character.path, character.model, character.scale);
    const textureLoader = new THREE.TextureLoader();
    this._target.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;

            if (Array.isArray(c.material)) {
                c.material.forEach((mat, idx) => {
                    if (character.textures[idx]) {
                        mat.map = textureLoader.load(character.textures[idx]);
                        mat.needsUpdate = true;
                    }
                });
            }
        }
    });

    this._params.scene.add(this._target);

    // ⭐ MODIFICACIÓN: Esperar a que el terreno esté listo antes de posicionar
    console.log("⏳ Esperando que el terreno esté completamente listo...");
    await this._WaitForTerrainReady();
    
    const startHeight = this._GetTerrainHeightAt(0, 0);
    this._target.position.set(0, startHeight + 0.5, 0);
    console.log(`✅ Personaje colocado en Y = ${this._target.position.y.toFixed(2)}`);

    // 2. Crear mixer y cargar animaciones
    this._mixer = new THREE.AnimationMixer(this._target);
    this._animations = {};

    const clips = await this._LoadAnimations(character.animPath, character.animations);
    character.animations.forEach((anim, i) => {
        if (clips[i]) {
            const action = this._mixer.clipAction(clips[i]);
            this._animations[anim.name] = { clip: clips[i], action };
        }
    });
    
    this._proxy = new BasicCharacterControllerProxy(this._animations);
    this._stateMachine = new CharacterFSM(this._proxy, this);
    this._stateMachine.SetState('idle');
    
    console.log("✅ Animaciones cargadas:", Object.keys(this._animations));

    // Crear bounding box del jugador
    this._playerBox = new THREE.Box3().setFromObject(this._target);
    this._playerBoxHelper = new THREE.Box3Helper(this._playerBox, 0xff0000); // rojo
    // scene.add(this._playerBoxHelper);
    this._params.scene.add(this._playerBoxHelper);
    this._isModelReady = true;
  }

  // ⭐ NUEVA FUNCIÓN: Esperar a que el terreno esté completamente listo
  async _WaitForTerrainReady() {
    return new Promise((resolve) => {
      const checkTerrain = () => {
        // Verificar que el terrainManager existe y está listo
        if (this._params.terrainManager && this._params.terrainManager.isReady) {
          console.log("✅ Terreno confirmado como listo");
          resolve();
        } else {
          setTimeout(checkTerrain, 100);
        }
      };
      checkTerrain();
    });
  }

  // Método para obtener la posición actual del personaje
  GetCharacterPosition() {
    if (!this._target) {
      return new THREE.Vector3(0, 0, 0);
    }
    return this._target.position.clone();
  }

  // Método para obtener la rotación actual del personaje
  GetCharacterRotation() {
    if (!this._target) {
      return new THREE.Quaternion();
    }
    return this._target.quaternion.clone();
  }

  // Método para obtener información completa del personaje
  GetCharacterInfo() {
    if (!this._target) {
      return {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Quaternion(),
        scale: new THREE.Vector3(1, 1, 1),
        exists: false
      };
    }
    
    return {
      position: this._target.position.clone(),
      rotation: this._target.quaternion.clone(),
      scale: this._target.scale.clone(),
      exists: true
    };
  }

  // Método para verificar si el personaje se ha movido
  HasCharacterMoved() {
    if (!this._target) {
      return false;
    }
    
    const threshold = 0.001;
    const currentPosition = this._target.position;
    const distance = this._previousPosition.distanceTo(currentPosition);
    
    return distance > threshold;
  }

  // Método para actualizar la posición anterior
  UpdatePreviousPosition() {
    if (this._target) {
      this._previousPosition.copy(this._target.position);
    }
  }

  Update(timeInSeconds) {
    if (!this._target) return;

    console.log("Boxes en update:", this._collisionBoxes?.length);


    this._stateMachine.Update(timeInSeconds, this._input);

    // --- Velocidad y desaceleración ---
    const velocity = this._velocity;
    const framedeceleration = new THREE.Vector3(
        velocity.x * this._deceleration.x,
        velocity.y * this._deceleration.y,
        velocity.z * this._deceleration.z
    ).multiplyScalar(timeInSeconds);

    framedeceleration.z = Math.sign(framedeceleration.z) * Math.min(Math.abs(framedeceleration.z), Math.abs(velocity.z));
    velocity.add(framedeceleration);

    // --- Rotación y movimiento horizontal ---
    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) acc.multiplyScalar(3.0);

    if (this._input._keys.forward) velocity.z += acc.z * timeInSeconds;
    if (this._input._keys.backward) velocity.z -= acc.z * timeInSeconds;
    if (this._input._keys.left) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
        _R.multiply(_Q);
    }
    if (this._input._keys.right) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
        _R.multiply(_Q);
    }

    controlObject.quaternion.copy(_R);

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(controlObject.quaternion).normalize().multiplyScalar(velocity.z * timeInSeconds);
    const sideways = new THREE.Vector3(1, 0, 0).applyQuaternion(controlObject.quaternion).normalize().multiplyScalar(velocity.x * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    // --- Salto y altura sobre el terreno ---
    this._HandleJump(timeInSeconds);
    if (!this._isJumping) {
        this._UpdateHeightOnTerrain();
        // console.log("¡Jump!");
    }

    // Update
    if (this._target && this._playerBox) {
      // Actualizamos la caja del jugador
      this._playerBox.setFromObject(this._target);
      this._playerBoxHelper.updateMatrixWorld(true);

      let isColliding = false;

      for (let box of this._collisionBoxes) {
          if (this._playerBox.intersectsBox(box.userData.box)) {
              console.log("Colisionando con los limites del terreno, retrocede");
              isColliding = true;
              break;
          }
      }

      //si colisiona regresar a la última posición válida
      if (isColliding) {
          this._target.position.copy(this._previousPosition);
          this._velocity.set(0, 0, 0); // Detiene movimiento
      } else {
          //si NO COLISIONA actualiza la posición previa
          this.UpdatePreviousPosition();
      }
    } //si no carga
    else{
      console.log("xd");
    }

    if (this._mixer) this._mixer.update(timeInSeconds);
    this._UpdateSkydome();
  }

  _UpdateHeightOnTerrain() {
    this._target.position.y = this._GetTerrainHeightAt(this._target.position.x, this._target.position.z);
  }

  _HandleJump(timeInSeconds) {
    const controlObject = this._target;
    const terrainY = this._GetTerrainHeightAt(controlObject.position.x, controlObject.position.z);

    if (this._input._keys.space && !this._isJumping) {
        this._isJumping = true;
        this._jumpVelocity = 25;
        this._stateMachine.SetState('jump');
    }

    if (this._isJumping) {
        this._jumpVelocity += this._gravity * timeInSeconds;
        controlObject.position.y += this._jumpVelocity * timeInSeconds;

        if (controlObject.position.y <= terrainY) {
            controlObject.position.y = terrainY;
            this._isJumping = false;
            this._jumpVelocity = 0;

            if (this._input._keys.forward || this._input._keys.backward)
                this._stateMachine.SetState(this._input._keys.shift ? 'run' : 'walk');
            else
                this._stateMachine.SetState('idle');
        }
    }
  }

  _GetTerrainHeightAt(x, z) {
    // ⭐ MODIFICACIÓN: Acceso mejorado al terrainManager
    if (this._params.terrainManager && this._params.terrainManager.isReady) {
        return this._params.terrainManager.getHeightAt(x, z);
    }
    
    // Fallback si el terreno no está listo
    return this._params.terrainManager ? this._params.terrainManager.baseY : -2;
  }
}

class BasicCharacterControllerInput {
  constructor() {
    this._Init();    
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = true;
        break;
      case 65: // a
        this._keys.left = true;
        break;
      case 83: // s
        this._keys.backward = true;
        break;
      case 68: // d
        this._keys.right = true;
        break;
      case 32: // SPACE
        this._keys.space = true;
        break;
      case 16: // SHIFT
        this._keys.shift = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch(event.keyCode) {
      case 87: // w
        this._keys.forward = false;
        break;
      case 65: // a
        this._keys.left = false;
        break;
      case 83: // s
        this._keys.backward = false;
        break;
      case 68: // d
        this._keys.right = false;
        break;
      case 32: // SPACE
        this._keys.space = false;
        break;
      case 16: // SHIFT
        this._keys.shift = false;
        break;
    }
  }
}

class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;
    
    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
}

class CharacterFSM extends FiniteStateMachine {
  constructor(proxy, controller) {
    super();
    this._proxy = proxy;
    this._controller = controller;
    this._Init();
  }

  _Init() {
    this._AddState('idle', IdleState);
    this._AddState('walk', WalkState);
    this._AddState('run', RunState);
    this._AddState('jump', JumpState);
  }
}

class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() {}
  Exit() {}
  Update() {}
}

class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'walk';
  }

  Enter(prevState) {
    if (!this._parent._proxy._animations['walk']) {
        console.warn("Animación 'walk' aún no cargada");
        return;
    }
    const curAction = this._parent._proxy._animations['walk'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'run') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState('run');
      }
      return;
    }

    this._parent.SetState('idle');
  }
}

class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'run';
  }

  Enter(prevState) {
    if (!this._parent._proxy._animations['run']) {
        console.warn("Animación 'run' aún no cargada");
        return;
    }
    const curAction = this._parent._proxy._animations['run'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'walk') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (!input._keys.shift) {
        this._parent.SetState('walk');
      }
      return;
    }

    this._parent.SetState('idle');
  }
}

class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'idle';
  }

  Enter(prevState) {
    if (!this._parent._proxy._animations['idle']) {
        console.warn("Animación 'idle' aún no cargada");
        return;
    }
    const idleAction = this._parent._proxy._animations['idle'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {}

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState('walk');
    } 
  }
}

class JumpState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'jump';
  }

  Enter(prevState) {
    const jumpAnim = this._parent._proxy._animations['jump'];
    if (!jumpAnim) {
      console.warn("Animación 'jump' aún no cargada");
      return;
    }

    const curAction = jumpAnim.action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      curAction.enabled = true;
      curAction.time = 0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.2, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(_, input) {
    const characterController = this._parent._controller;

    if (!characterController._isJumping) {
        if (input._keys.forward || input._keys.backward) {
            characterController._stateMachine.SetState(input._keys.shift ? 'run' : 'walk');
        } else {
            characterController._stateMachine.SetState('idle');
        }
    }
  }
}

class CharacterControllerDemo {
  constructor() {
    //                      AGREGADO PARA MULTI
    // this._Initialize();
    // Inicializar multiplayer PRIMERO
    this._multiplayerManager = new MultiplayerManager();
    this._otherPlayersMeshes = {};
    
    // Esperar conexión
    this._WaitForConnection();
  }
  //                      AGREGADO PARA MULTI
  async _WaitForConnection() {
    console.log("⏳ Waiting for multiplayer connection...");
    
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this._multiplayerManager.IsConnected()) {
          console.log("✅ Connected! Starting game...");
          this._Initialize();
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  async _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();

    //skydome
    const textureLoader = new THREE.TextureLoader();
    const skyTexture = textureLoader.load('./resources/textures/skydome.jpg');

    const skyGeo = new THREE.SphereGeometry(500, 60, 40);
    const skyMat = new THREE.MeshBasicMaterial({
        map: skyTexture,
        side: THREE.BackSide,
    });

    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(skyDome);
    this._skyDome = skyDome;

    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 50;
    light.shadow.camera.right = -50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    this._scene.add(light);

    light = new THREE.AmbientLight(0xFFFFFF, 0.25);
    this._scene.add(light);

    this._mixers = [];
    this._previousRAF = null;

    // Nuevas variables para el seguimiento de la cámara
    this._cameraTarget = new THREE.Vector3();
    this._cameraOffset = new THREE.Vector3(0, 8, -15);

    // ⭐ MODIFICACIÓN CRÍTICA: Orden correcto de inicialización
    console.log("🌍 Paso 1: Creando terreno...");
    await this._CreateTerrain();
    console.log("✅ Terreno completamente creado");

    //COLISIONES
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0 //no mostrar la coli
    });

    
    // COLISION PARA LAS "PAREDES" DEL TERRENO 1.
    const boxGeometry = new THREE.BoxGeometry(250, 15, 5); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox = new THREE.Mesh(boxGeometry, boxMaterial);
    collisionBox.position.set(0, 3, 128); 
    this._scene.add(collisionBox);

    //2.
    const boxGeometry2 = new THREE.BoxGeometry(250, 15, 5); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox2 = new THREE.Mesh(boxGeometry2, boxMaterial);
    collisionBox2.position.set(0, 3, -128); 
    this._scene.add(collisionBox2);

    //3.
    const boxGeometry3 = new THREE.BoxGeometry(5, 15, 250); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox3 = new THREE.Mesh(boxGeometry3, boxMaterial);
    collisionBox3.position.set(128, 3, 0); 
    this._scene.add(collisionBox3);

    //4.
    const boxGeometry4 = new THREE.BoxGeometry(5, 15, 250); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox4 = new THREE.Mesh(boxGeometry4, boxMaterial);
    collisionBox4.position.set(-128, 3, 0); 
    this._scene.add(collisionBox4);

    this._collisionBoxes = [collisionBox, collisionBox2, collisionBox3, collisionBox4];

    this._collisionBoxes.forEach(box => {
      box.updateMatrixWorld(true); // 👈 muy importante
      // Guardar un Box3 para cada colisión
      box.userData.box = new THREE.Box3().setFromObject(box);
      console.log("CollisionBox creada:", box.userData.box.min, box.userData.box.max);
    });

    //declarando los modelos del escenario
    this._decorativeModels = [];
    this._interactiveHitboxes = [];

    //carga de modelos FBX con sus hitboxes!

    //entorno
    this.LoadSceneModels('./resources/3D/scene/moai/moai.fbx', new THREE.Vector3(100,-1.5,100), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/moai/moai.fbx', new THREE.Vector3(-100,-1.5,-100), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/moai/moai.fbx', new THREE.Vector3(80,17,-30), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/moai/moai.fbx', new THREE.Vector3(-80,-1.5,100), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));

    this.LoadSceneModels('./resources/3D/scene/torii/torii.fbx', new THREE.Vector3(0,-1.5,100), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));

    this.LoadSceneModels('./resources/3D/scene/checkpoint/checkpoint.fbx', new THREE.Vector3(80,18,-105), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));

    this.LoadSceneModels('./resources/3D/scene/flowerplatform/flowerplatform.fbx', new THREE.Vector3(85,15,-57), new THREE.Vector3(0.07,0.07,0.07), new THREE.Vector3(2,5,2));

    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(5,50,5), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(50,55,-10), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(105,40,105), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(-100,55,-115), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(70,50,-85), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(-110,45,115), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(5,50,115), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/cloudplatform.fbx', new THREE.Vector3(-70,55,0), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));

    this.LoadSceneModels('./resources/3D/scene/platform/platform.fbx', new THREE.Vector3(-70,20,20), new THREE.Vector3(0.03,0.03,0.03), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/platform/platform.fbx', new THREE.Vector3(-40,25,30), new THREE.Vector3(0.03,0.03,0.03), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/platform/platform.fbx', new THREE.Vector3(-40,30,60), new THREE.Vector3(0.03,0.03,0.03), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/platform/platform.fbx', new THREE.Vector3(-30,35,90), new THREE.Vector3(0.03,0.03,0.03), new THREE.Vector3(2,5,2));

    this.LoadSceneModelsWithAlpha('./resources/3D/scene/fountain/fountainfish.fbx', new THREE.Vector3(0,-1.5,0), new THREE.Vector3(0.08,0.08,0.08), new THREE.Vector3(2,5,2));

    //items
    this.LoadSceneModels('./resources/3D/scene/items/cherry/Cherry.fbx', new THREE.Vector3(1,1,1), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/cherry/Cherry.fbx', new THREE.Vector3(-115,20,100), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/cherry/Cherry.fbx', new THREE.Vector3(65,8,-75), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/cherry/Cherry.fbx', new THREE.Vector3(90,8,50), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/cherry/Cherry.fbx', new THREE.Vector3(105,1,15), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));

    this.LoadSceneModels('./resources/3D/scene/items/fossil/Fossil.fbx', new THREE.Vector3(0,4,90), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/fossil/Fossil.fbx', new THREE.Vector3(-40,30,30), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/fossil/Fossil.fbx', new THREE.Vector3(40,12,-120), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/fossil/Fossil.fbx', new THREE.Vector3(110,12,-15), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/items/fossil/Fossil.fbx', new THREE.Vector3(-75,4,-80), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));

    //arboles
    //1.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(15,-1.5,15), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(15,-1.5,15), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    //2.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(115,-1.5,10), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(115,-1.5,10), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    //3.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(65,4,-75), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(65,4,-75), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    //4.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(-85,-1.5,-55), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(-85,-1.5,-55), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    //5.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(-20,-1.5,-15), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(-20,-1.5,-15), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    //6.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(35,-1.5,80), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(35,-1.5,80), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    //7.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(90,-1.5,50), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(90,-1.5,50), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    //8.
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/tree/leafs.fbx', new THREE.Vector3(-70,-1.5,55), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModels('./resources/3D/scene/tree/branch.fbx', new THREE.Vector3(-70,-1.5,55), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    
    //bush
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/bush/bush.fbx', new THREE.Vector3(1,-1.5,1), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/bush/bush.fbx', new THREE.Vector3(95,-1.5,55), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/bush/bush.fbx', new THREE.Vector3(105,-1.5,15), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/bush/bush.fbx', new THREE.Vector3(70,-1.5,-85), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/bush/bush.fbx', new THREE.Vector3(-70,-1.5,-95), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));
    this.LoadSceneModelsWithAlpha('./resources/3D/scene/bush/bush.fbx', new THREE.Vector3(20,-1.5,85), new THREE.Vector3(0.05,0.05,0.05), new THREE.Vector3(2,5,2));

    console.log("🎮 Paso 2: Cargando personaje...");
    this._LoadAnimatedModel();

    this._SetupMultiplayer(); //AGREGADO PARA MULTI
    this._RAF();
  }
  //              AGREGADO PARA MULTI
  _SetupMultiplayer() {
    // Callback para crear otros jugadores con modelo FBX
    this._multiplayerManager.onCreatePlayer = (nickname, characterKey) => {
      this._CreateOtherPlayerMesh(nickname, characterKey);
    };

    // Callback para actualizar posición
    this._multiplayerManager.onUpdatePlayer = (nickname, posicion) => {
      if (this._otherPlayersMeshes[nickname]) {
        this._otherPlayersMeshes[nickname].position.set(
          posicion.x,
          posicion.y,
          posicion.z
        );
      }
    };

    console.log("🎮 Multiplayer setup complete");
  }
  //              AGREGADO PARA MULTI
  async _CreateOtherPlayerMesh(nickname, characterKey) {
    console.log(`🎨 Creating FBX model for player: ${nickname} (${characterKey})`);
    
    if (!characters[characterKey]) {
        console.warn(`⚠️ Character ${characterKey} not found`);
        return;
    }

    const character = characters[characterKey];

    try {
        const loader = new FBXLoader();
        const fbx = await new Promise((resolve, reject) => {
            loader.setPath(character.path);
            loader.load(character.model, resolve, undefined, reject);
        });

        fbx.scale.setScalar(character.scale);

        // Aplicar texturas
        const textureLoader = new THREE.TextureLoader();
        fbx.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;

                if (Array.isArray(c.material)) {
                    c.material.forEach((mat, idx) => {
                        if (character.textures[idx]) {
                            mat.map = textureLoader.load(character.textures[idx]);
                            mat.needsUpdate = true;
                        }
                    });
                }
            }
        });

        fbx.position.set(0, 0, 0);
        this._scene.add(fbx);
        this._otherPlayersMeshes[nickname] = fbx;

        console.log(`✅ Player ${nickname} (${characterKey}) loaded successfully`);
    } catch (error) {
        console.error(`❌ Error loading character for ${nickname}:`, error);
    }
  }

  // ⭐ MODIFICACIÓN: Ahora _CreateTerrain es async y espera REALMENTE?
  async _CreateTerrain() {
    const textureLoader = new THREE.TextureLoader();

    // Crear geometría y mesh del terreno
    this._terrainGeometry = new THREE.PlaneGeometry(250, 250, 512, 512);

    const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a5d23,
        roughness: 0.8,
        metalness: 0.1
    });

    this._terrain = new THREE.Mesh(this._terrainGeometry, fallbackMaterial);
    this._terrain.rotation.x = -Math.PI / 2;
    this._terrain.position.y = -2;
    this._terrain.receiveShadow = true;
    this._terrain.castShadow = false;
    this._scene.add(this._terrain);

    // ⭐ NUEVO: Crear objeto terrainManager
    this._terrainManager = {
      terrain: this._terrain,
      heightData: null,
      baseY: -2,
      isReady: false,
      getHeightAt: (x, z) => this._GetTerrainHeightAt(x, z)
    };
    
    console.log("🏔️ Mesh del terreno creado");

    // Cargar texturas en paralelo
    const [grassTexture, rockTexture] = await Promise.all([
      this._LoadTextureAsync(textureLoader, './resources/textures/grass.jpg'),
      this._LoadTextureAsync(textureLoader, './resources/textures/dirt.png')
    ]);

    if (grassTexture) {
      grassTexture.wrapS = THREE.RepeatWrapping;
      grassTexture.wrapT = THREE.RepeatWrapping;
      grassTexture.repeat.set(40, 40);
    }

    if (rockTexture) {
      rockTexture.wrapS = THREE.RepeatWrapping;
      rockTexture.wrapT = THREE.RepeatWrapping;
      rockTexture.repeat.set(40, 40);
    }

    // ⭐ CRÍTICO: Cargar heightmap y ESPERAR a que termine
    console.log("⏳ Cargando heightmap...");
    const heightMap = await this._LoadTextureAsync(textureLoader, './resources/textures/heightmap.jpg');
    
    if (heightMap) {
      this._ApplyHeightMap(heightMap);
      
      // Aplicar shader material
      if (grassTexture && rockTexture) {
        const terrainMaterial = new THREE.ShaderMaterial({
          uniforms: {
            grassTexture: { value: grassTexture },
            rockTexture: { value: rockTexture },
            heightMap: { value: heightMap },
            lightColor: { value: new THREE.Color(0xffffff) },
            lightDirection: { value: new THREE.Vector3(-1, 1, 1).normalize() }
          },
          vertexShader: `
            uniform sampler2D heightMap;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
              vUv = uv;
              float height = texture2D(heightMap, uv).r;
              vec3 newPosition = position;
              newPosition.z += height * 20.0;
              vPosition = newPosition;
              vNormal = normal;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D grassTexture;
            uniform sampler2D rockTexture;
            uniform sampler2D heightMap;
            uniform vec3 lightColor;
            uniform vec3 lightDirection;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
              vec4 grassColor = texture2D(grassTexture, vUv * 35.0);
              vec4 rockColor = texture2D(rockTexture, vUv * 35.0);
              float height = texture2D(heightMap, vUv).r;
              vec4 finalColor = mix(grassColor, rockColor, height);

              float lightIntensity = max(dot(normalize(vNormal), normalize(lightDirection)), 0.3);
              finalColor.rgb *= lightIntensity * lightColor;

              gl_FragColor = finalColor;
            }
          `
        });

        this._terrain.material = terrainMaterial;
        console.log("✅ Shader material aplicado");
      }
    } else {
      console.warn("⚠️ Heightmap no cargó, usando terreno plano");
      this._CreateFlatHeightMap();
    }

    // ⭐ IMPORTANTE: Marcar terreno como listo
    this._terrainManager.isReady = true;
    console.log("✅ Terreno completamente listo para usar");
  }

  _InstantiateModel(path, position, scale, hitboxSize) {
    const instance = this._modelTemplates[path].clone();
    instance.position.copy(position);
    instance.scale.set(scale.x, scale.y, scale.z);
    
    this._scene.add(instance);
    this._decorativeModels.push(instance);
    
    // Crear hitbox
    const boxGeo = new THREE.BoxGeometry(hitboxSize.x, hitboxSize.y, hitboxSize.z);
    const boxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(boxGeo, boxMat);
    hitbox.position.copy(position);
    this._scene.add(hitbox);
    this._interactiveHitboxes.push(hitbox);
    
    console.log(`⚡ Instancia creada de: ${path}`);
}

// Para modelos OPACOS (sin alpha)
LoadSceneModels(path, position, scale, hitboxSize) {
    // Inicializar caché si no existe
    if (!this._modelTemplates) this._modelTemplates = {};
    if (!this._loadingModels) this._loadingModels = {};

    // Si ya está cargado, instanciar
    if (this._modelTemplates[path]) {
        this._InstantiateModel(path, position, scale, hitboxSize);
        return;
    }

    // Si ya se está cargando, agregar a cola de espera
    if (this._loadingModels[path]) {
        this._loadingModels[path].push({ position, scale, hitboxSize });
        console.log(`⏳ Esperando carga de: ${path}`);
        return;
    }

    // Marcar como "cargando" y crear cola
    this._loadingModels[path] = [];

    const loader = new FBXLoader();
    loader.load(
        path,
        (fbx) => {
            fbx.position.copy(position);
            fbx.scale.set(scale.x, scale.y, scale.z);

            fbx.traverse((child) => {
                if (child.isMesh) {
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                    child.material.alphaTest = 0;
                    child.material.side = THREE.FrontSide;
                    child.material.needsUpdate = true;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this._scene.add(fbx);
            this._decorativeModels.push(fbx);

            // Guardar en caché PRIMERO
            this._modelTemplates[path] = fbx;

            // Crear hitbox para el original
            const boxGeo = new THREE.BoxGeometry(hitboxSize.x, hitboxSize.y, hitboxSize.z);
            const boxMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new THREE.Mesh(boxGeo, boxMat);
            hitbox.position.copy(position);
            this._scene.add(hitbox);
            this._interactiveHitboxes.push(hitbox);

            console.log(`✅ Modelo opaco cargado: ${path}`);

            // Instanciar todos los que estaban esperando
            if (this._loadingModels[path]) {
                this._loadingModels[path].forEach(params => {
                    this._InstantiateModel(path, params.position, params.scale, params.hitboxSize);
                });
                delete this._loadingModels[path];
            }
        },
        (xhr) => {
            console.log(`📦 Cargando ${path}: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`);
        },
        (error) => {
            console.error(`❌ Error al cargar modelo: ${path}`, error);
            delete this._loadingModels[path];
        }
    );
}

// Para modelos CON TRANSPARENCIA (alpha)
LoadSceneModelsWithAlpha(path, position, scale, hitboxSize) {
    // Inicializar caché si no existe
    if (!this._modelTemplates) this._modelTemplates = {};
    if (!this._loadingModels) this._loadingModels = {};

    // Si ya está cargado, instanciar
    if (this._modelTemplates[path]) {
        this._InstantiateModel(path, position, scale, hitboxSize);
        return;
    }

    // Si ya se está cargando, agregar a cola de espera
    if (this._loadingModels[path]) {
        this._loadingModels[path].push({ position, scale, hitboxSize });
        console.log(`⏳ Esperando carga de: ${path}`);
        return;
    }

    // Marcar como "cargando" y crear cola
    this._loadingModels[path] = [];

    const loader = new FBXLoader();
    loader.load(
        path,
        (fbx) => {
            fbx.position.copy(position);
            fbx.scale.set(scale.x, scale.y, scale.z);

            fbx.traverse((child) => {
                if (child.isMesh) {
                    child.material.transparent = true;
                    child.material.alphaTest = 0.5;
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this._scene.add(fbx);
            this._decorativeModels.push(fbx);

            // Guardar en caché PRIMERO
            this._modelTemplates[path] = fbx;

            // Crear hitbox para el original
            const boxGeo = new THREE.BoxGeometry(hitboxSize.x, hitboxSize.y, hitboxSize.z);
            const boxMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new THREE.Mesh(boxGeo, boxMat);
            hitbox.position.copy(position);
            this._scene.add(hitbox);
            this._interactiveHitboxes.push(hitbox);

            console.log(`✅ Modelo con alpha cargado: ${path}`);

            // Instanciar todos los que estaban esperando
            if (this._loadingModels[path]) {
                this._loadingModels[path].forEach(params => {
                    this._InstantiateModel(path, params.position, params.scale, params.hitboxSize);
                });
                delete this._loadingModels[path];
            }
        },
        (xhr) => {
            console.log(`📦 Cargando ${path}: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`);
        },
        (error) => {
            console.error(`❌ Error al cargar modelo: ${path}`, error);
            delete this._loadingModels[path];
        }
    );
}

  // ⭐ NUEVA FUNCIÓN: Cargar textura como promesa
  _LoadTextureAsync(loader, url) {
    return new Promise((resolve) => {
      loader.load(
        url,
        (texture) => {
          console.log(`✅ Textura cargada: ${url}`);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`⚠️ Error cargando textura: ${url}`);
          resolve(null);
        }
      );
    });
  }

  // Nuevo método de emergencia para crear heightmap plano
  _CreateFlatHeightMap() {
    console.log("🆘 Creando heightmap plano de emergencia");
    const width = 257;
    const height = 257;
    this._terrainHeightData = [];
    
    for (let i = 0; i < height; i++) {
        this._terrainHeightData[i] = [];
        for (let j = 0; j < width; j++) {
            this._terrainHeightData[i][j] = 0;
        }
    }
    
    console.log("✅ Heightmap plano creado (terreno será plano)");
  }

  _ApplyHeightMap(heightTexture) {
    if (!heightTexture || !heightTexture.image) {
        console.warn("⚠️ Heightmap texture o image no disponible");
        this._CreateFlatHeightMap();
        return;
    }

    if (!this._terrainGeometry || !this._terrainGeometry.attributes?.position) {
        console.warn("⚠️ Geometría del terreno no disponible");
        this._CreateFlatHeightMap();
        return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = heightTexture.image.width;
    canvas.height = heightTexture.image.height;
    
    context.drawImage(heightTexture.image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    const positions = this._terrainGeometry.attributes.position.array;
    const width = this._terrainGeometry.parameters.widthSegments + 1;
    const height = this._terrainGeometry.parameters.heightSegments + 1;

    if (!positions) {
        console.warn("⚠️ Array de posiciones no disponible");
        this._CreateFlatHeightMap();
        return;
    }
    
    // Crear array 2D para almacenar alturas
    this._terrainHeightData = [];
    const heightScale = 20;

    for (let i = 0; i < height; i++) {
        this._terrainHeightData[i] = [];
        for (let j = 0; j < width; j++) {
            const index = (i * width + j) * 3;
            const pixelX = Math.floor((j / (width - 1)) * (canvas.width - 1));
            const pixelY = Math.floor((i / (height - 1)) * (canvas.height - 1));
            const pixelIndex = (pixelY * canvas.width + pixelX) * 4;
            const heightValue = imageData.data[pixelIndex] / 255.0;
            
            const calculatedHeight = heightValue * heightScale;
            positions[index + 1] = calculatedHeight;
            
            this._terrainHeightData[i][j] = calculatedHeight;
        }
    }
    
    this._terrainGeometry.attributes.position.needsUpdate = true;
    this._terrainGeometry.computeVertexNormals();
    
    const minHeight = Math.min(...this._terrainHeightData.flat());
    const maxHeight = Math.max(...this._terrainHeightData.flat());
    console.log("✅ Heightmap aplicado:");
    console.log(`   - Dimensiones grid: ${width}x${height}`);
    console.log(`   - Rango alturas: ${minHeight.toFixed(2)} a ${maxHeight.toFixed(2)}`);
    console.log(`   - Base terreno Y: ${this._terrain.position.y}`);
    
    // TEST: Verificar altura en centro (0,0)
    const centerI = Math.floor(height / 2);
    const centerJ = Math.floor(width / 2);
    console.log(`   - Altura en centro del terreno: ${this._terrainHeightData[centerI][centerJ].toFixed(2)}`);
  }

  _GetTerrainHeightAt(x, z) {
    if (!this._terrainHeightData) {
        return this._terrain ? this._terrain.position.y : -2;
    }

    const size = 500;
    const gridX = this._terrainHeightData[0].length;
    const gridZ = this._terrainHeightData.length;

    let nx = ((x + size/2) / size) * (gridX - 1);
    let nz = ((z + size/2) / size) * (gridZ - 1);

    nx = Math.max(0, Math.min(gridX - 1, nx));
    nz = Math.max(0, Math.min(gridZ - 1, nz));

    const ix = Math.floor(nx);
    const iz = Math.floor(nz);
    const fx = nx - ix;
    const fz = nz - iz;

    const h00 = this._terrainHeightData[iz][ix];
    const h10 = this._terrainHeightData[iz][Math.min(ix + 1, gridX - 1)];
    const h01 = this._terrainHeightData[Math.min(iz + 1, gridZ - 1)][ix];
    const h11 = this._terrainHeightData[Math.min(iz + 1, gridZ - 1)][Math.min(ix + 1, gridX - 1)];

    const height = h00 * (1 - fx) * (1 - fz) +
                   h10 * fx * (1 - fz) +
                   h01 * (1 - fx) * fz +
                   h11 * fx * fz;

    return this._terrain.position.y + height;
  }

  _UpdateCamera() {
    if (!this._controls || !this._controls._target) {
        return;
    }

    this._cameraTarget.copy(this._controls._target.position);
    this._cameraTarget.y += 5;

    const tempOffset = this._cameraOffset.clone();
    tempOffset.applyQuaternion(this._controls._target.quaternion);
    tempOffset.add(this._controls._target.position);

    this._camera.position.lerp(tempOffset, 0.1);
    this._camera.lookAt(this._cameraTarget);
  }

  _LoadAnimatedModel() {
    // ⭐ MODIFICACIÓN: Pasar terrainManager al controlador
    const params = {
      camera: this._camera,
      scene: this._scene,
      terrain: this._terrain,
      terrainManager: this._terrainManager,  // ⭐ AÑADIDO
      skyDome: this._skyDome,
      collisionBoxes: this._collisionBoxes //añadido para colis
    }
    this._controls = new BasicCharacterController(params);
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    this._RAF_ID = requestAnimationFrame((t) => {
        if (this._previousRAF === null) {
            this._previousRAF = t;
        }

        if (this._isPaused) {
            return;
        }

        this._threejs.render(this._scene, this._camera);
        this._Step(t - this._previousRAF);
        this._previousRAF = t;

        this._RAF();
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    
    if (this._mixers) {
      this._mixers.map(m => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);

      // Enviar posición al servidor
      if (this._controls._target && this._multiplayerManager.IsConnected()) {
        this._multiplayerManager.SendPosition(
          this._controls._target.position
        );
      }
    }

    if (this._skyDome && this._camera) {
      this._skyDome.position.copy(this._camera.position);
    }

    this._UpdateCamera();
  }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
  _APP = new CharacterControllerDemo();
});