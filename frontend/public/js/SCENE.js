import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

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
			{ name: 'idle', file: 'Breathing_Idle.fbx' }
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
			{ name: 'idle', file: 'Happy_Idle.fbx' }
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
			{ name: 'idle', file: 'Unarmed_Idle_Looking_Ver2.fbx' }
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
			{ name: 'idle', file: 'Standing_W_Briefcase_Idle.fbx' }
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
};

class BasicCharacterController {
	constructor(params) {
		this._Init(params);
	}

	_Init(params) {
		this._params = params;
		this._deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
		this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
		this._velocity = new THREE.Vector3(0, 0, 0);

		this._animations = {};
		this._input = new BasicCharacterControllerInput();
		this._stateMachine = new CharacterFSM(
			new BasicCharacterControllerProxy(this._animations));

		// Variable para almacenar la posición anterior
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

	//    Cargar modelo seleccionado    //
	async _LoadModels() {
		const PlayerName = localStorage.getItem('PlayerName'); //obtener el id del LS
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

		// 2. Crear mixer
		this._mixer = new THREE.AnimationMixer(this._target);
		this._animations = {};

		// 3. Cargar animaciones
		const clips = await this._LoadAnimations(character.animPath, character.animations);
		character.animations.forEach((anim, i) => {
			if (clips[i]) {
				const action = this._mixer.clipAction(clips[i]);
				this._animations[anim.name] = { clip: clips[i], action };
			}
		});
		//
		this._proxy = new BasicCharacterControllerProxy(this._animations);
		this._stateMachine = new CharacterFSM(this._proxy);
		this._stateMachine.SetState('idle');
		console.log("Animaciones cargadas:", Object.keys(this._animations));

		// 4. Iniciar FSM
		if (this._stateMachine) {
			this._stateMachine.SetState('idle');
		}
	}

	// Método para obtener la posición actual del personaje
	GetCharacterPosition() {
		if (!this._target) {
			return new THREE.Vector3(0, 0, 0); // Posición por defecto si no hay personaje
		}
		return this._target.position.clone(); // Retorna una copia de la posición
	}

	// Método para obtener la rotación actual del personaje
	GetCharacterRotation() {
		if (!this._target) {
			return new THREE.Quaternion(); // Rotación por defecto si no hay personaje
		}
		return this._target.quaternion.clone(); // Retorna una copia de la rotación
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

		const threshold = 0.001; // Umbral mínimo de movimiento
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
		if (!this._target) {
			return;
		}

		this._stateMachine.Update(timeInSeconds, this._input);

		const velocity = this._velocity;
		const framedeceleration = new THREE.Vector3(
			velocity.x * this._deceleration.x,
			velocity.y * this._deceleration.y,
			velocity.z * this._deceleration.z
		);
		framedeceleration.multiplyScalar(timeInSeconds);
		framedeceleration.z = Math.sign(framedeceleration.z) * Math.min(
			Math.abs(framedeceleration.z), Math.abs(velocity.z));

		velocity.add(framedeceleration);

		const controlObject = this._target;
		const _Q = new THREE.Quaternion();
		const _A = new THREE.Vector3();
		const _R = controlObject.quaternion.clone();

		const acc = this._acceleration.clone();
		if (this._input._keys.shift) {
			acc.multiplyScalar(3.0);
		}

		if (this._input._keys.forward) {
			velocity.z += acc.z * timeInSeconds;
			// Restaurar la escala en Z cuando no se presiona 'w'
			controlObject.scale.z = 0.05; // Si originalmente es 0.05
		}
		if (this._input._keys.backward) {
			velocity.z -= acc.z * timeInSeconds;

			// Rotar 360 grados cuando se presiona la tecla 's'
			// _A.set(0, 1, 0);
			// _Q.setFromAxisAngle(_A, Math.PI * 2); // Math.PI = 180 grados
			// _R.multiply(_Q);

			// Mirroring: invertir la escala en Z
			controlObject.scale.z = -0.05; // Si originalmente es 0.05
		}
		// else {
		//      // Restaurar la escala en Z cuando no se presiona 's'
		//      controlObject.scale.z = 0.05; // Si originalmente es 0.05
		// }
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

		const oldPosition = new THREE.Vector3();
		oldPosition.copy(controlObject.position);

		const forward = new THREE.Vector3(0, 0, 1);
		forward.applyQuaternion(controlObject.quaternion);
		forward.normalize();

		const sideways = new THREE.Vector3(1, 0, 0);
		sideways.applyQuaternion(controlObject.quaternion);
		sideways.normalize();

		sideways.multiplyScalar(velocity.x * timeInSeconds);
		forward.multiplyScalar(velocity.z * timeInSeconds);

		controlObject.position.add(forward);
		controlObject.position.add(sideways);

		oldPosition.copy(controlObject.position);

		if (this._mixer) {
			this._mixer.update(timeInSeconds);
		}
	}
};

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
		switch (event.keyCode) {
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
};


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
};


class CharacterFSM extends FiniteStateMachine {
	constructor(proxy) {
		super();
		this._proxy = proxy;
		this._Init();
	}

	_Init() {
		this._AddState('idle', IdleState);
		this._AddState('walk', WalkState);
		this._AddState('run', RunState);
	}
};


class State {
	constructor(parent) {
		this._parent = parent;
	}

	Enter() { }
	Exit() { }
	Update() { }
};

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

	Exit() {
	}

	Update(_, input) {
		if (input._keys.forward || input._keys.backward) {
			if (input._keys.shift) {
				this._parent.SetState('run');
			}
			return;
		}

		this._parent.SetState('idle');
	}
};


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

	Exit() {
	}

	Update(timeElapsed, input) {
		if (input._keys.forward || input._keys.backward) {
			if (!input._keys.shift) {
				this._parent.SetState('walk');
			}
			return;
		}

		this._parent.SetState('idle');
	}
};


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

	Exit() {
	}

	Update(_, input) {
		if (input._keys.forward || input._keys.backward) {
			this._parent.SetState('walk');
		}
	}
};


class CharacterControllerDemo {
	constructor() {
		this._Initialize();
	}

	_Initialize() {
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

		let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
		light.position.set(-100, 100, 100);
		light.target.position.set(0, 0, 0);
		light.castShadow = true;
		light.shadow.bias = -0.001;
		light.shadow.mapSize.width = 4096;
		light.shadow.mapSize.height = 4096;
		light.shadow.camera.near = 0.1;
		light.shadow.camera.far = 500.0;
		light.shadow.camera.near = 0.5;
		light.shadow.camera.far = 500.0;
		light.shadow.camera.left = 50;
		light.shadow.camera.right = -50;
		light.shadow.camera.top = 50;
		light.shadow.camera.bottom = -50;
		this._scene.add(light);

		light = new THREE.AmbientLight(0xFFFFFF, 0.25);
		this._scene.add(light);

		// Agregando un escenario
		this._CreateTerrain();


		this._mixers = [];
		this._previousRAF = null;

		// Nuevas variables para el seguimiento de la cÃ¡mara
		this._cameraTarget = new THREE.Vector3();
		this._cameraOffset = new THREE.Vector3(0, 6, -15); // Ajusta estos valores para cambiar la distancia y la altura de la cÃ¡mara.

		this._LoadAnimatedModel();

		this._RAF();
		this._initMultiplayer();
	}
	_initMultiplayer() {
		// Verificar si estamos en modo multiplayer
		const isMultiplayer = sessionStorage.getItem('multiplayerMode') === 'true';
		const roomCode = sessionStorage.getItem('roomCode');
		const playerName = localStorage.getItem('PlayerName') || 'Player';
		const character = localStorage.getItem('selectedPLY') || 'ness';

		if (isMultiplayer && roomCode) {
			console.log('🎮 Iniciando en modo multiplayer, sala:', roomCode);

			// Conectar al servidor multiplayer
			multiplayer.connect().then(() => {
				// Unirse a la sala
				multiplayer.joinRoom(roomCode, playerName, character);

				// Configurar event handlers
				multiplayer.onPlayerUpdate = (playerId, position, rotation, animation) => {
					this._handleRemotePlayerUpdate(playerId, position, rotation, animation);
				};

				multiplayer.onPlayersUpdate = (players) => {
					this._handlePlayersUpdate(players);
				};

				multiplayer.onGameStarted = () => {
					console.log('🚀 ¡Partida multiplayer iniciada!');
				};
			}).catch(error => {
				console.error('❌ Error conectando al multiplayer:', error);
			});
		}
	}
	_handleRemotePlayerUpdate(playerId, position, rotation, animation) {
		// Crear o actualizar jugador remoto
		if (!this._remotePlayers) {
			this._remotePlayers = new Map();
		}

		let remotePlayer = this._remotePlayers.get(playerId);

		if (!remotePlayer) {
			// Crear nuevo jugador remoto
			this._createRemotePlayer(playerId, position, rotation);
		} else {
			// Actualizar posición y rotación existente
			this._updateRemotePlayer(remotePlayer, position, rotation, animation);
		}
	}

	_createRemotePlayer(playerId, position, rotation) {
		// Aquí cargarías el modelo 3D del jugador remoto
		// Por ahora usamos un cubo de placeholder
		const geometry = new THREE.BoxGeometry(1, 2, 1);
		const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
		const cube = new THREE.Mesh(geometry, material);

		cube.position.set(position.x, position.y, position.z);
		this._scene.add(cube);

		this._remotePlayers.set(playerId, {
			mesh: cube,
			position: position,
			rotation: rotation
		});

		console.log(`👤 Jugador remoto ${playerId} creado`);
	}

	_updateRemotePlayer(remotePlayer, position, rotation, animation) {
		// Interpolación suave para movimiento
		remotePlayer.mesh.position.lerp(
			new THREE.Vector3(position.x, position.y, position.z),
			0.3
		);

		// Actualizar rotación
		remotePlayer.mesh.rotation.set(rotation.x, rotation.y, rotation.z);

		// Aquí podrías actualizar la animación también
	}

	_handlePlayersUpdate(players) {
		console.log('👥 Actualización de jugadores:', players);
		// Limpiar jugadores que ya no están
		if (this._remotePlayers) {
			for (const [playerId, remotePlayer] of this._remotePlayers.entries()) {
				if (!players.find(p => p.id === playerId)) {
					this._scene.remove(remotePlayer.mesh);
					this._remotePlayers.delete(playerId);
				}
			}
		}
	}

	// Modificar el método _Step para enviar actualizaciones
	_Step(timeElapsed) {
		const timeElapsedS = timeElapsed * 0.001;

		if (this._mixers) {
			this._mixers.map(m => m.update(timeElapsedS));
		}

		if (this._controls) {
			this._controls.Update(timeElapsedS);

			// Enviar actualización de posición al servidor multiplayer
			if (multiplayer.isConnected) {
				const characterInfo = this._controls.GetCharacterInfo();
				if (characterInfo.exists) {
					multiplayer.sendPlayerUpdate(
						characterInfo.position,
						{
							x: characterInfo.rotation.x,
							y: characterInfo.rotation.y,
							z: characterInfo.rotation.z
						},
						'walk' // Aquí deberías detectar la animación actual
					);
				}
			}
		}

		this._UpdateCamera();
	}



	_Scene() {
		const textureLoader = new THREE.TextureLoader();

		// Textura base
		const texture1 = textureLoader.load('./resources/textures/nieve.jpg');
		texture1.wrapS = THREE.RepeatWrapping;
		texture1.wrapT = THREE.RepeatWrapping;
		texture1.repeat.set(10, 10);

		// Mapa de alturas (grises)
		const heightMap = textureLoader.load('./resources/textures/heightmap.jpg');

		// Material con mapa de desplazamiento
		const groundMaterial = new THREE.MeshStandardMaterial({
			map: texture1, // textura base
			displacementMap: heightMap,
			displacementScale: 30, // Ajusta la altura del relieve
		});

		// Plano para el terreno
		const ground = new THREE.Mesh(
			new THREE.PlaneGeometry(500, 500, 256, 256), // MÃ¡s subdivisiones = mÃ¡s detalle
			groundMaterial
		);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -0.5;
		ground.receiveShadow = true;

		return ground;
	}

	_CreateTerrain() {
		const textureLoader = new THREE.TextureLoader();

		// Crear un material simple como respaldo
		const fallbackMaterial = new THREE.MeshStandardMaterial({
			color: 0x4a5d23, // Verde tierra
			roughness: 0.8,
			metalness: 0.1
		});

		// GeometrÃ­a del terreno con mÃ¡s subdivisiones para el heightmap
		// 200x200 unidades, 128x128 subdivisiones
		this._terrainGeometry = new THREE.PlaneGeometry(200 * 5, 200 * 5, 200 * 5, 200 * 5);

		// Crear el terreno con material simple por defecto
		this._terrain = new THREE.Mesh(this._terrainGeometry, fallbackMaterial);
		this._terrain.rotation.x = -Math.PI / 2;
		this._terrain.position.y = -2;
		this._terrain.receiveShadow = true;
		this._terrain.castShadow = false;

		this._scene.add(this._terrain);

		// Intentar cargar texturas avanzadas
		const onTextureLoad = () => {
			console.log('Texturas cargadas correctamente');
		};

		const onTextureError = (err) => {
			console.log('Error cargando texturas, usando material simple:', err);
		};

		// Textura base con repeticiÃ³n
		const grassTexture = textureLoader.load(
			'./resources/textures/nieve.jpg',
			onTextureLoad,
			undefined,
			onTextureError
		);
		grassTexture.wrapS = THREE.RepeatWrapping;
		grassTexture.wrapT = THREE.RepeatWrapping;
		grassTexture.repeat.set(8, 8);

		// Textura secundaria
		const rockTexture = textureLoader.load(
			'./resources/textures/water.jpg',
			undefined,
			undefined,
			onTextureError
		);
		rockTexture.wrapS = THREE.RepeatWrapping;
		rockTexture.wrapT = THREE.RepeatWrapping;
		rockTexture.repeat.set(4, 4);

		// Mapa de alturas
		const heightMap = textureLoader.load(
			'./resources/textures/heightmap.jpg',
			(texture) => {
				// Cuando se carga el heightmap, aplicar desplazamiento
				this._ApplyHeightMap(texture);
				onTextureLoad();
			},
			undefined,
			onTextureError
		);

		// Crear shader material para multitextura
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
          
          // Obtener altura del heightmap
          float height = texture2D(heightMap, uv).r;
          vec3 newPosition = position;
          newPosition.z += height * 20.0; // Escala de altura
          
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
          // Obtener colores de las texturas
          vec4 grassColor = texture2D(grassTexture, vUv);
          vec4 rockColor = texture2D(rockTexture, vUv);
          
          // Usar altura para mezclar texturas
          float height = texture2D(heightMap, vUv).r;
          vec4 finalColor = mix(grassColor, rockColor, height);
          
          // IluminaciÃ³n simple
          float lightIntensity = max(dot(normalize(vNormal), normalize(lightDirection)), 0.3);
          finalColor.rgb *= lightIntensity * lightColor;
          
          gl_FragColor = finalColor;
        }
      `
		});

		// Intentar aplicar el material avanzado, si falla mantener el simple
		try {
			this._terrain.material = terrainMaterial;
		} catch (error) {
			console.log('Error aplicando shader material, usando material simple');
		}
	}

	_ApplyHeightMap(heightTexture) {
		// if (!this._terrainGeometry) return;
		// if (!this._terrainGeometry.attributes.position) return;
		if (!heightTexture || !heightTexture.image) return;

		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = heightTexture.image.width;
		canvas.height = heightTexture.image.height;

		context.drawImage(heightTexture.image, 0, 0);
		const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

		const positions = this._terrainGeometry.attributes.position.array;
		const width = this._terrainGeometry.parameters.widthSegments + 1;
		const height = this._terrainGeometry.parameters.heightSegments + 1;

		if (!positions) return; ////

		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				const index = (i * width + j) * 3;

				// Obtener pixel correspondiente del heightmap
				const pixelX = Math.floor((j / (width - 1)) * (canvas.width - 1));
				const pixelY = Math.floor((i / (height - 1)) * (canvas.height - 1));
				const pixelIndex = (pixelY * canvas.width + pixelX) * 4;

				// Usar el canal rojo como altura
				const heightValue = imageData.data[pixelIndex] / 255.0;

				// Aplicar desplazamiento en Y (que es Z en el plano rotado)
				positions[index + 2] = heightValue * 15; // Escala de altura
			}
		}

		this._terrainGeometry.attributes.position.needsUpdate = true;
		this._terrainGeometry.computeVertexNormals();
	}


	_UpdateCamera() {
		if (!this._controls._target) {
			return;
		}

		// PosiciÃ³n del objetivo de la cÃ¡mara (el personaje)
		this._cameraTarget.copy(this._controls._target.position);
		this._cameraTarget.y += 5; // Ajuste de altura para que la cÃ¡mara apunte a la cabeza del personaje

		// PosiciÃ³n de la cÃ¡mara detrÃ¡s del personaje, con la misma rotaciÃ³n
		const tempOffset = this._cameraOffset.clone();
		tempOffset.applyQuaternion(this._controls._target.quaternion);
		tempOffset.add(this._controls._target.position);

		this._camera.position.lerp(tempOffset, 0.1); // Usa lerp para un movimiento mÃ¡s suave
		this._camera.lookAt(this._cameraTarget);
	}

	_LoadAnimatedModel() {
		const params = {
			camera: this._camera,
			scene: this._scene,
		}
		this._controls = new BasicCharacterController(params);
	}

	_LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
		const loader = new FBXLoader();
		loader.setPath(path);
		loader.load(modelFile, (fbx) => {
			fbx.scale.setScalar(0.1);
			fbx.traverse(c => {
				c.castShadow = true;
			});
			fbx.position.copy(offset);

			const anim = new FBXLoader();
			anim.setPath(path);
			anim.load(animFile, (anim) => {
				const m = new THREE.AnimationMixer(fbx);
				this._mixers.push(m);
				const idle = m.clipAction(anim.animations[0]);
				idle.play();
			});
			this._scene.add(fbx);
		});
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

			// Detener el bucle si estÃ¡ pausado
			if (this._isPaused) {
				return;
			}

			this._threejs.render(this._scene, this._camera);
			this._Step(t - this._previousRAF);
			this._previousRAF = t;

			this._RAF(); // Llamada recursiva para el siguiente frame
		});
	}

	_Step(timeElapsed) {
		const timeElapsedS = timeElapsed * 0.001;
		if (this._mixers) {
			this._mixers.map(m => m.update(timeElapsedS));
		}

		if (this._controls) {
			this._controls.Update(timeElapsedS);

			// Solo mostrar información si el personaje se ha movido
			if (this._controls.HasCharacterMoved()) {
				// Obtener solo la posición
				const position = this._controls.GetCharacterPosition();
				console.log(`Personaje en: x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}`);

				// Obtener información completa
				const info = this._controls.GetCharacterInfo();
				if (info.exists) {
					console.log('Posición:', info.position);
					console.log('Rotación:', info.rotation);
					console.log('Escala:', info.scale);
				}

				// Actualizar la posición anterior para la próxima comparación
				this._controls.UpdatePreviousPosition();
			}
		}

		this._UpdateCamera(); // Actualiza la posiciÃ³n de la cÃ¡mara
	}
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
	_APP = new CharacterControllerDemo();
});
