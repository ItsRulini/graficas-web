import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import { MultiplayerManager } from './multiplayer.js'; //AGREGADO PARA MULTI

import { Water } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/objects/Water2.js'; //agua
// import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'; //colisiones segun el modelo

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
    this._world = params.world;
    
    //        ! ! ! Guardar referencias a colisiones
    this._collisionBoxes = params.collisionBoxes || [];
    this._leveloneHitboxes = params.leveloneHitboxes || [];
    this._platformsHitboxes = params._platformsHitboxes || [];
    this._qboxHitboxes = params._qboxHitboxes || [];
    this._interactHitboxes = [];
    this._checkpointHitboxes = params._checkpointHitboxes || [];

    //Cachear raycaster para mejor performance
    this._raycaster = new THREE.Raycaster();
    this._raycaster.far = 5; // Radio máximo de detección

    // Crear Box3 para collisionBoxes
    this._collisionBoxes.forEach(box => {
        box.updateMatrixWorld(true);
        if (!box.userData.box) {
            box.userData.box = new THREE.Box3().setFromObject(box);
        }
    });

    // Crear Box3 para leveloneHitboxes
    this._leveloneHitboxes.forEach(collider => {
        if (collider) {
            collider.updateMatrixWorld(true);
            if (!collider.userData.box3) {
                collider.userData.box3 = new THREE.Box3().setFromObject(collider);
            }
        }
    });

    // Crear Box3 para _platformsHitboxes
    this._platformsHitboxes.forEach(collider => {
        if (collider) {
            collider.updateMatrixWorld(true);
            if (!collider.userData.box3) {
                collider.userData.box3 = new THREE.Box3().setFromObject(collider);
            }
        }
    });

    // Crear Box3 para _qboxHitboxes
    this._qboxHitboxes.forEach(collider => {
        if (collider) {
            collider.updateMatrixWorld(true);
            if (!collider.userData.box3) {
                collider.userData.box3 = new THREE.Box3().setFromObject(collider);
            }
        }
    });

    // Crear Box3 para _checkpointHitboxes
    this._checkpointHitboxes.forEach(collider => {
        if (collider) {
            collider.updateMatrixWorld(true);
            if (!collider.userData.box3) {
                collider.userData.box3 = new THREE.Box3().setFromObject(collider);
            }
        }
    });

    console.log("Sistema de colisiones inicializado:");
    console.log(`   - Paredes del terreno: ${this._collisionBoxes.length}`);
    console.log(`   - Objetos del escenario: ${this._leveloneHitboxes.length}`);
    console.log(`   - Plataformas del escenario: ${this._platformsHitboxes.length}`);
    console.log(`   - Drop Box del escenario: ${this._qboxHitboxes.length}`);
    console.log(`   - Checkpoints del escenario: ${this._checkpointHitboxes.length}`);

    //bool para hacer visible/invisible un item
    this._itemsVisible = true;
}

  _Init(params) {
    this._params = params;
    this._deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);

    this._isJumping = false;
    this._jumpVelocity = 0;
    this._gravity = -15;

    // ---        Variables del jugador       ---
    this._elapsedTime = 0; //conteo, tiempo q lleva jugando
    this._totaldeaths = 0;
    this._totalScore = 0;

    this._isSlowed = false; //relentizado
    this._slowEndTime = 0; //tiempo de relentizado
    this._baseAcceleration = this._acceleration.clone();


    //Animaciones
    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
        new BasicCharacterControllerProxy(this._animations), this);

    this._previousPosition = new THREE.Vector3(0, 0, 0);

    this._LoadModels();
  }
  
  //Método para verificar si un objeto está en el agua (el jugador)
  _IsObjectInWater(objectBoundingBox) {
    if (!this._world || !this._world._waterBoundingBox) {
      return false;
    }
    return this._world._waterBoundingBox.intersectsBox(objectBoundingBox);
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

    //Esperar a que el terreno esté listo antes de posicionar
    console.log("⏳ Esperando que el terreno esté completamente listo...");
    await this._WaitForTerrainReady();
    
    const startHeight = this._GetTerrainHeightAt(0, 0);
    //-95,y,105
    this._target.position.set(-0, startHeight + 0.5, 0); //      ! POSICIÓN DEL JUGADOR
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
    this._playerBox = new THREE.Box3(
        new THREE.Vector3(-1, 0, -1),   // Min (x, y, z)
        new THREE.Vector3(1, 10, 1)      // Max (x, y, z)
    );
    // Después actualizar posición en Update()
    this._playerBoxHelper = new THREE.Box3Helper(this._playerBox, 0x800080);
    // scene.add(this._playerBoxHelper);

    this._params.scene.add(this._playerBoxHelper);
    this._isModelReady = true;
  }

  //Esperar a que el terreno esté completamente listo
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

//      UPDATE:
//      1. Movimiento en tiempo real, tmb actualizando la caja de colision del jugador
//      2. Deteccion de colisiones, terreno, modelos, plataformas, items especiales, etc
//      3. Funcion de salto entre plataformas (ligado a la funcion _HandleJump)
Update(timeInSeconds) {
    if (!this._target) return;

    //Acumula el tiempo total jugado
    this._elapsedTime += timeInSeconds;

    //verificar si debe terminar la ralentización (MAS ABAJO)
    if (this._isSlowed && this._elapsedTime >= this._slowEndTime) {
      this._isSlowed = false;
      // Restaura la aceleración base
      this._acceleration.copy(this._baseAcceleration);
      console.log('Ralentización terminada');
    }


    //actualizar la posicion al inicio si cae o toca el agua
    const startHeight = this._GetTerrainHeightAt(0, 0);

    //Muestra en el span el tiempo transcurrido
    const timeDisplay = document.getElementById('secs');
    if (timeDisplay) {
        const totalSeconds = Math.floor(this._elapsedTime);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        //basicamente es para mostrar el tiempo como: minutos:segundos
    }

    //conteo de muertes
    const totalDeaths = document.getElementById('deaths');
    totalDeaths.textContent = this._totaldeaths; //conteo de muertes

    //puntaje acumulado
    const totalscore = document.getElementById('uscore');
    totalscore.textContent = this._totalScore;

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

    const forward = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(controlObject.quaternion)
        .normalize()
        .multiplyScalar(velocity.z * timeInSeconds);
    
    const sideways = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(controlObject.quaternion)
        .normalize()
        .multiplyScalar(velocity.x * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    // --- Salto y altura sobre el terreno ---
    this._HandleJump(timeInSeconds);

    // --- Salto entre plataformas Y QBOX (si salta sobre ellas) ---
    if (!this._isJumping && !this._isOnPlatform && !this._isOnQBox && !this._currentPlatform) {
      this._UpdateHeightOnTerrain();
    }

    //NUEVA VERIFICACIÓN DE COLISIONES PRECISAS
    if (this._target && this._playerBox) {
        const currentSize = new THREE.Vector3();
        this._playerBox.getSize(currentSize);
        
        const newCenter = new THREE.Vector3();
        newCenter.copy(this._target.position);
        newCenter.y += currentSize.y / 2; // Centrar en altura
        
        this._playerBox.setFromCenterAndSize(newCenter, currentSize);
        this._playerBoxHelper.updateMatrixWorld(true);

        // console.log(`Estado: jumping=${this._isJumping}, onPlatform=${this._isOnPlatform}, Y=${this._target.position.y.toFixed(2)}`);

        let isColliding = false; //esta colisionando con el terreno
        let collidingObject = null;

        //1. Verificar colisiones con paredes del terreno (Box3 simple)
        for (let box of this._collisionBoxes) {
            if (this._playerBox.intersectsBox(box.userData.box)) {
                isColliding = true;
                collidingObject = "[! - COLISION DETECTADA]: Pared del terreno";
                break;
            }
        }

        //2. Verificar colisiones PRECISAS con geometría real
        if (!isColliding && (
    (this._leveloneHitboxes && this._leveloneHitboxes.length > 0) ||
    (this._platformsHitboxes && this._platformsHitboxes.length > 0) ||
    (this._qboxHitboxes && this._qboxHitboxes.length > 0)
  )) {
    const playerCenter = new THREE.Vector3();
    this._playerBox.getCenter(playerCenter);

    const playerSize = new THREE.Vector3();
    this._playerBox.getSize(playerSize);

    // console.log(`Tamaño: ${playerSize.x.toFixed(2)} x ${playerSize.y.toFixed(2)} x ${playerSize.z.toFixed(2)}`);
    // console.log(`Radio: ${(Math.max(playerSize.x, playerSize.z) * 0.6).toFixed(2)}`);

    const detectionRadius = Math.max(playerSize.x, playerSize.z) * 0.6;

    const allColliders = [
      ...(this._leveloneHitboxes || []),
      ...(this._platformsHitboxes || []),
      ...(this._qboxHitboxes || []),
      ...(this._checkpointHitboxes || [])
    ];

    for (let collider of allColliders) {
      if (!collider) continue;

      //CRÍTICO: Ignorar SOLO plataformas en colisiones horizontales
      //Las QBox SÍ deben bloquear lateralmente
      const isPlatformCollider = this._platformsHitboxes.includes(collider);
      
      if (isPlatformCollider) {
        continue; // Plataformas: solo permitir colisión vertical (salto)
      }
      // QBox: permite colisión horizontal (bloqueará el movimiento)

      collider.updateMatrixWorld(true);
      collider.userData.box = new THREE.Box3().setFromObject(collider);

      if (!this._playerBox.intersectsBox(collider.userData.box)) continue;

      const raycaster = new THREE.Raycaster();
      raycaster.far = detectionRadius * 2;

      const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0.707, 0, 0.707),
        new THREE.Vector3(-0.707, 0, 0.707),
        new THREE.Vector3(0.707, 0, -0.707),
        new THREE.Vector3(-0.707, 0, -0.707)
      ];

      for (let dir of directions) {
        raycaster.set(playerCenter, dir);
        const intersects = raycaster.intersectObject(collider, false);

        if (intersects.length > 0 && intersects[0].distance < detectionRadius) {
          console.log(`[! - COLISION DETECTADA]: ${collider.name || 'objeto'}`);
          isColliding = true;
          // isCheckP = true;
          collidingObject = "Objeto del escenario (modelos estático)";
          break;
        }
      }

      if (isColliding) break;
    }
  }

        //      1. COLISION CON EL TERRENO:
        if (isColliding) {
            // console.log(`Movimiento bloqueado por: ${collidingObject}`);
            this._target.position.copy(this._previousPosition);
            this._velocity.set(0, 0, 0);
        } else {
            this.UpdatePreviousPosition();
        }

        //      2. COLISION CON LAS QUESTION BOXS - SPAWN DE ITEMS
        if (this._qboxHitboxes && this._qboxHitboxes.length > 0) {
          for (let qbox of this._qboxHitboxes) {
            if (!qbox || !qbox.userData) continue;
            
            //Actualizar el bounding box del qbox
            qbox.updateMatrixWorld(true);
            if (!qbox.userData.box) {
              qbox.userData.box = new THREE.Box3().setFromObject(qbox);
            } else {
              qbox.userData.box.setFromObject(qbox);
            }
            
            //SOLO spawnear si HAY colisión Y no ha spawneado antes
            if (this._playerBox.intersectsBox(qbox.userData.box) && !qbox.userData.spawned) {
              // console.log('[ ! PLAYER GOLPEÓ QUESTION BOX !]');
              qbox.userData.spawned = true;

              // Forzar actualización del bounding box global
              qbox.updateMatrixWorld(true);
              qbox.userData.box = new THREE.Box3().setFromObject(qbox);

              // Obtener el centro del Box3 (posición real en el mundo)
              const qboxCenter = new THREE.Vector3();
              qbox.userData.box.getCenter(qboxCenter);

              // Generar posición del ítem justo debajo
              const spawnPos = new THREE.Vector3(
                qboxCenter.x + 0,
                qboxCenter.y - 6.0,  
                qboxCenter.z + 0
              );

              this.SpawnItem(spawnPos);

              // console.log(`[ ! Cherry/Fossil creado sobre Question Box en ${spawnPos.x.toFixed(2)}, ${spawnPos.y.toFixed(2)}, ${spawnPos.z.toFixed(2)}]`);
            }
          }
        }

        //    3. COLISIÓN CON ITEMS CONSUMIBLES
        if (this._interactHitboxes && this._interactHitboxes.length > 0) {
          for (let i = this._interactHitboxes.length - 1; i >= 0; i--) {
            const item = this._interactHitboxes[i];
            if (!item) continue;

            if (!item.userData || !item.userData.type) {
              console.warn(' ! Item sin userData válido, eliminando del array');
              this._interactHitboxes.splice(i, 1);
              continue;
            }

            if (!item.userData.consumed) {
              if (item.userData.isLaunching) {
                
                // Actualizar velocidad vertical con gravedad
                item.userData.velocityY += item.userData.gravity * timeInSeconds;
                
                // Actualizar posición en los 3 ejes
                item.position.y += item.userData.velocityY * timeInSeconds;
                item.position.x += item.userData.velocityX * timeInSeconds;
                item.position.z += item.userData.velocityZ * timeInSeconds;
                
                // Rotar mientras vuelaXD
                item.rotation.y += item.userData.rotationSpeed * timeInSeconds;
                
                // Verificar si tocó el suelo
                if (item.position.y <= item.userData.groundY) {
                  item.position.y = item.userData.groundY; // Fijar al suelo
                  item.userData.isLaunching = false;       // Terminar lanzamiento
                  item.userData.velocityY = 0;             // Detener movimiento
                }
                
              } 
              // flotacion y rotacion (animacion)
              else {
                item.userData.animationTime += timeInSeconds;
                item.rotation.y += item.userData.rotationSpeed * timeInSeconds;
                
                // Flotación suave
                const floatOffset = Math.sin(item.userData.animationTime * item.userData.floatSpeed) * item.userData.floatHeight;
                item.position.y = item.userData.groundY + floatOffset;
              }
            }


            if (item.userData.consumed) {
              console.log(` ! REMOVIENDO ITEM: ${item.userData.type}`);
  
              item.visible = false;
              
              if (item.parent) {
                item.parent.remove(item);
              }
              
              if (this._world && this._world._scene) {
                this._world._scene.remove(item);
              }
              
              // REMOVER WIREFRAME
              if (item.userData.boxHelper) {
                this._world._scene.remove(item.userData.boxHelper);
                item.userData.boxHelper.geometry.dispose();
                item.userData.boxHelper.material.dispose();
              }
              
              this._interactHitboxes.splice(i, 1);
              
              // 5. Liberar memoria
              item.traverse((child) => {
                if (child.geometry) {
                  child.geometry.dispose();
                }
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                      if (mat.map) mat.map.dispose();
                      mat.dispose();
                    });
                  } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                  }
                }
              });
              
              console.log(' ! Item completamente eliminado ! ');
              continue;
            }

            item.updateMatrixWorld(true);

            if (!item.userData.box) {
              item.userData.box = new THREE.Box3().setFromObject(item);
            } else {
              item.userData.box.setFromObject(item);
            }

            //    ACTUALIZAR WIREFRAME
            if (item.userData.boxHelper) {
              item.userData.boxHelper.box.copy(item.userData.box);
              item.userData.boxHelper.updateMatrixWorld(true);
            }

            // Detectar colisión con el jugador
            if (this._playerBox.intersectsBox(item.userData.box)) {
              console.log(`[ ! ITEM CONSUMIDO]: ${item.userData.type}`);
              item.userData.consumed = true;

              const difficulty = localStorage.getItem("selectedDifficulty");
              const playerImg = document.querySelector('.gm-colect img');

              //Si es CHAOS se ignora la cherry
              if (difficulty === "CHAOS" && item.userData.type === "cherry") {
                  return; // ignorar cherry
              }

              // ---------------- LÓGICA DE ÍTEMS ----------------

              if (item.userData.type === 'cherry') {
                  this._totalScore += 100;
                  this._target.position.set(-50,75,-50);
                  this._isOnPlatform = true;

                  playerImg.src = 'resources/img/cherry.png';
                  playerImg.alt = 'cherry';
              }

              if (item.userData.type === 'fossil') {
                // Restar puntos
                if (this._totalScore >= 70) {
                    this._totalScore -= 70;
                }

                // Ralentizar
                this._acceleration.multiplyScalar(0.2);
                this._isSlowed = true;

                // relentizado diferente según dificultad
                const difficulty = localStorage.getItem("selectedDifficulty");
                const slowDuration = (difficulty === "CHAOS") ? 40 : 10;

                this._slowEndTime = this._elapsedTime + slowDuration;

                playerImg.src = 'resources/img/fossil.png';
                playerImg.alt = 'fossil';
              }
              if (item.userData.type === 'bomb') {
                  this._target.position.set(-95, startHeight + 0.5, 90);
                  this._totaldeaths += 1;

                  if (this._totalScore >= 100) {
                      this._totalScore -= 100;
                  }

                  playerImg.src = 'resources/img/bomb.png';
                  playerImg.alt = 'bomb';

                  const messagelosewin = document.querySelector('.wl-display');
                  messagelosewin.style.display = 'flex';
              }
            }
          }
        }

        //    4. COLISIÓN CON EL AGUA
        if (this._IsObjectInWater(this._playerBox)) {
            // console.log("Aguas XD");
            this._target.position.set(-0, startHeight + 0.5, 0);

            this._totaldeaths +=1;
            if(this._totalScore >= 10){
              this._totalScore -= 100; // y te resta puntos
            }
        }

        //    5. COLISIÓN CON LOS CHECKPOINTS (es la meta)
        if (this._checkpointHitboxes && this._checkpointHitboxes.length > 0) {
          for (let checkpoint of this._checkpointHitboxes) {
            if (!checkpoint) continue;

            checkpoint.updateMatrixWorld(true);
            if (!checkpoint.userData.box) {
              checkpoint.userData.box = new THREE.Box3().setFromObject(checkpoint);
            } else {
              checkpoint.userData.box.setFromObject(checkpoint);
            }

            if (this._playerBox.intersectsBox(checkpoint.userData.box)) {
              if (!checkpoint.userData.activated) {
                checkpoint.userData.activated = true;
                // console.log("Meta!");
                this._totalScore += 100;

                const messagelosewin = document.querySelector('.wl-display');
                messagelosewin.style.display = 'flex'; 
                
                const imgWin = document.getElementById('img-win');
                const imgLose = document.getElementById('img-lose');
                imgLose.style.display = 'none';
                imgWin.style.display = 'inline'; 
              }
            }
          }
        }

    }
    //    ACTUALIZANDO LAS PARTICULAS
    this._UpdateParticles(timeInSeconds);

    if (this._mixer) this._mixer.update(timeInSeconds);
    this._UpdateSkydome();
}

//      SPAWNEAR:
//      Al colisionar spawnea el item, en este caso si colisiona con qbox se spawnea cherry o fossil
SpawnItem(position) {

  const difficulty = localStorage.getItem("selectedDifficulty");

  let items = [
    { path: './resources/3D/scene/items/cherry/Cherry.fbx', name: 'cherry' },
    { path: './resources/3D/scene/items/fossil/Fossil.fbx', name: 'fossil' },
    { path: './resources/3D/scene/items/bomb/bomb.fbx', name: 'bomb' }
  ];

  // CHAOS → sin cherry
  if (difficulty === "CHAOS") {
    items = items.filter(i => i.name !== "cherry");
  }

  const randomItem = items[Math.floor(Math.random() * items.length)];

  // CHAOS = 5 drops
  const spawnCount = (difficulty === "CHAOS") ? 5 : 1;

  const radius = 15; //para q spawneen en un radio y no todos juntos
  for (let i = 0; i < spawnCount; i++) {

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;

    const spawnPos = position.clone();
    spawnPos.y += 8;
    spawnPos.x += Math.cos(angle) * dist;
    spawnPos.z += Math.sin(angle) * dist;

    const loader = new FBXLoader();
    loader.load(
      randomItem.path,
      (fbx) => {
        const itemContainer = new THREE.Group();
        itemContainer.name = `item_${randomItem.name}_${Date.now()}_${i}`;

        fbx.scale.set(0.05, 0.05, 0.05);
        fbx.position.set(0, 0, 0);

        fbx.traverse((child) => {
          if (child.isMesh) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.depthWrite = true;
                mat.alphaTest = 0;
                mat.needsUpdate = true;
              });
            } else if (child.material) {
              child.material.transparent = false;
              child.material.opacity = 1.0;
              child.material.depthWrite = true;
              child.material.alphaTest = 0;
              child.material.needsUpdate = true;
            }
          }
        });

        itemContainer.add(fbx);
        itemContainer.position.copy(spawnPos);

        this._world._scene.add(itemContainer);

        itemContainer.userData = {
          type: randomItem.name,
          consumed: false,
          spawned: true,

          floatSpeed: 1.5,
          floatHeight: 0.5,
          rotationSpeed: 2,
          animationTime: 0,

          isLaunching: true,
          velocityY: 10,
          velocityX: 0,
          velocityZ: 0,
          gravity: -15,
          groundY: spawnPos.y - 15,

          startY: spawnPos.y,
          startX: spawnPos.x,
          startZ: spawnPos.z
        };

        if (!this._interactHitboxes) this._interactHitboxes = [];
        this._interactHitboxes.push(itemContainer);
      },
      undefined,
      (error) => console.error(`[ ! ERROR SPAWNING ITEM ]`, error)
    );
  }
}

//    CREACION DE PARTICULAS (aca bien aca)
_CreateParticles(position, count = 20, color = null) {
  //Cargar textura de estrella
  if (!this._starTexture) {
    const textureLoader = new THREE.TextureLoader();
    
    this._starTexture = textureLoader.load(
      '/resources/textures/dust_particle.png',
      
      (texture) => {
        console.log('✅ Textura cargada exitosamente:', texture);
        console.log('Dimensiones:', texture.image.width, 'x', texture.image.height);
      },
      
      (progress) => {
        console.log('⏳ Cargando textura...');
      },
      
      (error) => {
        console.error('❌ Error al cargar textura:', error);
        console.error('Ruta intentada: /resources/textures/dust_particle.png');
      }
    );
  }
  
  //Crear sprites individuales
  const particleGroup = new THREE.Group();
  const velocities = [];
  
  for (let i = 0; i < count; i++) {
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this._starTexture,
      // ✅ NO usar color para preservar los colores originales
      transparent: true,
      opacity: 1.0,
      blending: THREE.NormalBlending, // ✅ Cambiado de AdditiveBlending
      depthWrite: false // ✅ Mejora la transparencia
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(3.5, 3.5, 3.5);
    
    sprite.position.set(
      position.x + (Math.random() - 0.5) * 2,
      position.y + (Math.random() - 0.5) * 2,
      position.z + (Math.random() - 0.5) * 2
    );
    
    particleGroup.add(sprite);
    
    velocities.push(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.5 + 0.2,
      (Math.random() - 0.5) * 0.5
    );
  }
  
  this._world._scene.add(particleGroup);
  
  particleGroup.userData = {
    velocities: velocities,
    lifetime: 1.0, //segundos
    age: 0
  };
  
  if (!this._particleSystems) this._particleSystems = [];
  this._particleSystems.push(particleGroup);
  
  return particleGroup;
}

//    ACTUALIZAR LAS PARTICULAS
_UpdateParticles(deltaTime) {
  if (!this._particleSystems || this._particleSystems.length === 0) return;

  for (let i = this._particleSystems.length - 1; i >= 0; i--) {
    const system = this._particleSystems[i];
    const userData = system.userData;
    
    userData.age += deltaTime;

    //si llegó a su tiempo de vida, eliminarlas
    if (userData.age >= userData.lifetime) {
      this._world._scene.remove(system);
      // Limpiar cada sprite del grupo
      system.children.forEach(sprite => {
        sprite.material.dispose();
      });
      this._particleSystems.splice(i, 1);
      continue;
    }

    //actualizar cada sprite en el grupo
    system.children.forEach((sprite, index) => {
      const vx = userData.velocities[index * 3];
      const vy = userData.velocities[index * 3 + 1];
      const vz = userData.velocities[index * 3 + 2];
      
      // Aplicar velocidad
      sprite.position.x += vx * deltaTime;
      sprite.position.y += vy * deltaTime;
      sprite.position.z += vz * deltaTime;
      
      // Aplicar gravedad (opcional)
      if (userData.gravity) {
        userData.velocities[index * 3 + 1] += userData.gravity * deltaTime;
      }
      
      // Fade out al final de la vida
      const lifeProgress = userData.age / userData.lifetime;
      sprite.material.opacity = 1 - lifeProgress;
      
      // Rotación opcional para efecto dinámico
      // sprite.material.rotation += deltaTime * 2;
    });
  }
}

_UpdateHeightOnTerrain() {
  this._target.position.y = this._GetTerrainHeightAt(this._target.position.x, this._target.position.z);
}

_HandleJump(timeInSeconds) {
  const controlObject = this._target;
  if (!controlObject) return;

  const terrainY = this._GetTerrainHeightAt(controlObject.position.x, controlObject.position.z);

  // --- 1. INICIO DEL SALTO ---
  if (this._input._keys.space && !this._isJumping) {
    this._isJumping = true;
    this._isOnPlatform = false;
    this._isOnQBox = false;
    this._currentPlatform = null;
    this._jumpVelocity = 25;
    this._stateMachine.SetState('jump');
    console.log("🚀 Salto iniciado");
  }

  // --- 2. ACTUALIZAR MOVIMIENTO VERTICAL ---
  if (this._isJumping) {
    this._jumpVelocity += this._gravity * timeInSeconds;
    controlObject.position.y += this._jumpVelocity * timeInSeconds;

    const isMoving = this._input._keys.forward || this._input._keys.backward;
    const isRunning = this._input._keys.shift;
    
    if (isMoving && isRunning && Math.random() < 0.1) {
      this._CreateParticles(this._target.position.clone(), 1);
    }

    // ⭐ VERIFICAR ATERRIZAJE
    if (this._jumpVelocity <= 0) {
      // ✅ Mantener dimensiones personalizadas
      const currentSize = new THREE.Vector3();
      this._playerBox.getSize(currentSize);
      
      const newCenter = new THREE.Vector3();
      newCenter.copy(controlObject.position);
      newCenter.y += currentSize.y / 2;
      
      this._playerBox.setFromCenterAndSize(newCenter, currentSize);
      
      const playerFeet = new THREE.Vector3(
        controlObject.position.x,
        this._playerBox.min.y,
        controlObject.position.z
      );

      const rayOrigin = playerFeet.clone();
      rayOrigin.y += 0.3;

      const downRay = new THREE.Raycaster(
        rayOrigin,
        new THREE.Vector3(0, -1, 0),
        0,
        1.5
      );

      const landableObjects = [
        ...(this._platformsHitboxes || []),
        ...(this._qboxHitboxes || [])
      ];

      const intersects = downRay.intersectObjects(landableObjects, false);
      
      if (intersects.length > 0) {
        const nearest = intersects[0];
        const surfaceY = nearest.point.y;
        const distance = playerFeet.y - surfaceY;

        if (distance >= -0.2 && distance <= 1.0) {
          const isQBox = this._qboxHitboxes?.includes(nearest.object) || false;
          const objectType = isQBox ? "QBox" : "Plataforma";
          
          console.log(`✅ Aterrizando en ${objectType}`);
          
          const adjustment = surfaceY - playerFeet.y;
          controlObject.position.y += adjustment;
          
          this._isJumping = false;
          this._jumpVelocity = 0;
          this._isOnQBox = isQBox;
          this._isOnPlatform = !isQBox;
          this._currentPlatform = nearest.object;

          this.UpdatePreviousPosition();

          if (this._input._keys.forward || this._input._keys.backward)
            this._stateMachine.SetState(this._input._keys.shift ? 'run' : 'walk');
          else
            this._stateMachine.SetState('idle');
          
          return;
        }
      }
    }

    if (controlObject.position.y <= terrainY) {
      console.log("🌍 Aterrizando en terreno");
      controlObject.position.y = terrainY;
      this._isJumping = false;
      this._isOnPlatform = false;
      this._isOnQBox = false;
      this._jumpVelocity = 0;
      this._currentPlatform = null;

      if (this._input._keys.forward || this._input._keys.backward)
        this._stateMachine.SetState(this._input._keys.shift ? 'run' : 'walk');
      else
        this._stateMachine.SetState('idle');
    }
  }

  // --- 3. VERIFICAR SI SIGUE SOBRE LA PLATAFORMA ---
  if (!this._isJumping && (this._isOnPlatform || this._isOnQBox) && this._currentPlatform) {
    // ✅ Mantener dimensiones personalizadas
    const currentSize = new THREE.Vector3();
    this._playerBox.getSize(currentSize);
    
    const newCenter = new THREE.Vector3();
    newCenter.copy(controlObject.position);
    newCenter.y += currentSize.y / 2;
    
    this._playerBox.setFromCenterAndSize(newCenter, currentSize);
    
    const playerSize = new THREE.Vector3();
    this._playerBox.getSize(playerSize);
    
    const footRadius = Math.max(playerSize.x, playerSize.z) * 1;
    const feetY = this._playerBox.min.y;
    
    const testPoints = [
      new THREE.Vector3(controlObject.position.x, feetY, controlObject.position.z),
      new THREE.Vector3(controlObject.position.x, feetY, controlObject.position.z + footRadius),
      new THREE.Vector3(controlObject.position.x, feetY, controlObject.position.z - footRadius),
      new THREE.Vector3(controlObject.position.x - footRadius, feetY, controlObject.position.z),
      new THREE.Vector3(controlObject.position.x + footRadius, feetY, controlObject.position.z)
    ];

    let stillOnSurface = false;
    
    for (let point of testPoints) {
      const checkRay = new THREE.Raycaster(
        point,
        new THREE.Vector3(0, -1, 0),
        0,
        1.0
      );

      const hits = checkRay.intersectObject(this._currentPlatform, false);

      if (hits.length > 0) {
        stillOnSurface = true;
        break;
      }
    }

    if (!stillOnSurface) {
      const surfaceType = this._isOnQBox ? "QBox" : "plataforma";
      console.log(`⚠️ Jugador salió de la ${surfaceType}`);
      this._isJumping = true;
      this._isOnPlatform = false;
      this._isOnQBox = false;
      this._jumpVelocity = 0;
      this._currentPlatform = null;
      this._stateMachine.SetState('jump');
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
      const characterController = this._parent._controller;
      
      if (Math.random() < 0.1) { // 10% de probabilidad por frame
        if (characterController && characterController._target) {
          characterController._CreateParticles(
            characterController._target.position.clone(),
            1
          );
        }
      }
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
    // AGREGAR estas líneas
    this._pendingPlayers = [];
    this._isSceneReady = false;
    this._otherPlayersMeshes = {};

    // Creamos el manager de multiplayer
    this._multiplayerManager = new MultiplayerManager();
    
    // CRÍTICO: Configurar callbacks INMEDIATAMENTE
    this._SetupMultiplayerCallbacks();

    // Esperar conexión
    this._WaitForConnection();
  }

  _SetupMultiplayerCallbacks() {
    console.log("🔧 Configuring multiplayer callbacks EARLY...");
    
    this._multiplayerManager.onCreatePlayer = (nickname, characterKey) => {
      console.log(`📞 onCreatePlayer callback: ${nickname} (${characterKey})`);
      
      if (!this._isSceneReady || !this._scene) {
        console.log(`⏸️ Scene not ready, queuing: ${nickname}`);
        this._pendingPlayers.push({ nickname, character: characterKey });
        return;
      }
      
      this._CreateOtherPlayerMesh(nickname, characterKey);
    };

    this._multiplayerManager.onUpdatePlayer = (nickname, posicion) => {
      if (this._otherPlayersMeshes[nickname]) {
        this._otherPlayersMeshes[nickname].position.set(
          posicion.x,
          posicion.y,
          posicion.z
        );
      }
    };

    this._multiplayerManager.onRemovePlayer = (nickname) => {
      console.log(`🗑️ Removing player: ${nickname}`);
      
      const mesh = this._otherPlayersMeshes[nickname];
      if (mesh) {
        this._scene.remove(mesh);
        mesh.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        delete this._otherPlayersMeshes[nickname];
        console.log(`✅ Player ${nickname} removed`);
      }
    };
    
    console.log("✅ Multiplayer callbacks configured EARLY");
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
    console.log("🔧 Cargando three-mesh-bvh...");
    try {
        // ✅ CORRECCIÓN: Usar la versión correcta y asignar globalmente
        const { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } = 
            await import('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.0/build/index.module.js');
        
        THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        THREE.Mesh.prototype.raycast = acceleratedRaycast;
        
        console.log("✅ BVH habilitado globalmente");
    } catch (error) {
        console.warn("⚠️ No se pudo cargar three-mesh-bvh:", error);
    }

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
    const skyTexture = textureLoader.load('./resources/textures/skydomenoche.jpg');

    const skyGeo = new THREE.SphereGeometry(500, 60, 40);
    const skyMat = new THREE.MeshBasicMaterial({
        map: skyTexture,
        side: THREE.BackSide,
    });

    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(skyDome);
    this._skyDome = skyDome;

    // luz fria para el espacio
    // Luz direccional azul fría, más clara
    const spaceLight = new THREE.DirectionalLight(0x6f8eff, 0.32);
    // Antes: color 0x4a70ff, intensidad 0.18

    spaceLight.position.set(30, 80, -40);
    spaceLight.target.position.set(0, 0, 0);

    spaceLight.castShadow = true;
    spaceLight.shadow.bias = -0.0008;
    spaceLight.shadow.mapSize.width = 2048;
    spaceLight.shadow.mapSize.height = 2048;

    spaceLight.shadow.camera.near = 1;
    spaceLight.shadow.camera.far = 400;
    spaceLight.shadow.camera.left = 80;
    spaceLight.shadow.camera.right = -80;
    spaceLight.shadow.camera.top = 80;
    spaceLight.shadow.camera.bottom = -80;

    this._scene.add(spaceLight);

    // Luz ambiental azul más clara
    const ambientSpace = new THREE.AmbientLight(0x6b85ff, 0.15);
    // Antes: color 0x3355aa, intensidad 0.08

    this._scene.add(ambientSpace);




    this._mixers = [];
    this._previousRAF = null;

    // Nuevas variables para el seguimiento de la cámara
    this._cameraTarget = new THREE.Vector3();
    this._cameraOffset = new THREE.Vector3(0, 8, -15);

    await this._CreateWater(); //agua

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
    const boxGeometry = new THREE.BoxGeometry(305, 35, 5); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox = new THREE.Mesh(boxGeometry, boxMaterial);
    collisionBox.position.set(0, 8, 150); 
    this._scene.add(collisionBox);

    //2.
    const boxGeometry2 = new THREE.BoxGeometry(305, 35, 5); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox2 = new THREE.Mesh(boxGeometry2, boxMaterial);
    collisionBox2.position.set(0, 8, -150); 
    this._scene.add(collisionBox2);

    //3.
    const boxGeometry3 = new THREE.BoxGeometry(5, 35, 305); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox3 = new THREE.Mesh(boxGeometry3, boxMaterial);
    collisionBox3.position.set(150, 8, 0); 
    this._scene.add(collisionBox3);

    //4.
    const boxGeometry4 = new THREE.BoxGeometry(5, 35, 305); // ancho, alto, profundo
    // boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const collisionBox4 = new THREE.Mesh(boxGeometry4, boxMaterial);
    collisionBox4.position.set(-150, 8, 0); 
    this._scene.add(collisionBox4);

    this._collisionBoxes = [collisionBox, collisionBox2, collisionBox3, collisionBox4];

    this._collisionBoxes.forEach(box => {
      box.updateMatrixWorld(true); // 👈 muy importante
      // Guardar un Box3 para cada colisión
      box.userData.box = new THREE.Box3().setFromObject(box);
      console.log("CollisionBox creada:", box.userData.box.min, box.userData.box.max);
    });

    //declarando los modelos del escenario y sus colis
    this._decorativeModels = []; // de la funcion LoadSceneModelsy
    this._interactiveHitboxes = [];

    this._leveloneHitboxes = []; //colisiones generales del escenario
    this._interactHitboxes = []; //colisiones para items y interactivos (cherry, fossil, son los CONSUMIBLES)
    this._platformsHitboxes = []; //colisiones para las plataformas
    this._qboxHitboxes = []; //colisiones para las cajas para dropear el item
    this._checkpointHitboxes = []; //colisiones para las metas (ganar el juego)

    //carga de modelos FBX con sus hitboxes!
    //POSITIVO IZQUIERDA, NEGATIVO DERECHA (basado en como aparece el personaje en escena)
    //planetas
    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/planets/earth/earth.fbx', 
        new THREE.Vector3(120,9,-120), 
        new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/planets/lavaplanet/lavaplanet.fbx', 
        new THREE.Vector3(30,6,-150), 
        new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/planets/mars/mars.fbx', 
        new THREE.Vector3(-150,0,150), 
        new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/planets/pinkplanet/pinkplanet.fbx', 
        new THREE.Vector3(60,-10,140), 
        new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/planets/pinkplanet/pinkplanet.fbx', 
        new THREE.Vector3(0, 50, 0), 
        new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/planets/lavaplanet/lavaplanet.fbx', 
        new THREE.Vector3(55,12, 50), 
        new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    //ovnis
    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/ovni/ovni.fbx', 
        new THREE.Vector3(-100,15,-100), 
        new THREE.Vector3(0.05,0.05,0.05),
        new THREE.Vector3(0, 0, -Math.PI/4)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/ovni/ovni.fbx', 
        new THREE.Vector3(100,35,100), 
        new THREE.Vector3(0.05,0.05,0.05),
        new THREE.Vector3(-Math.PI/4, 0, 0)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/ovni/ovni.fbx', 
        new THREE.Vector3(140,25,-140), 
        new THREE.Vector3(0.05,0.05,0.05),
        new THREE.Vector3(Math.PI/4, 0, 0)
      )
    );

    this._leveloneHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/ovni/ovni.fbx', 
        new THREE.Vector3(-100,70,80), 
        new THREE.Vector3(0.05,0.05,0.05),
        new THREE.Vector3(Math.PI/4, 0, 0)
      )
    );

    // //plataformas
    this._platformsHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/splatform/splatform.fbx', 
      new THREE.Vector3(0,35,70), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._platformsHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/splatform/splatform.fbx', 
      new THREE.Vector3(80,52,70), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._platformsHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/splatform/splatform.fbx', 
      new THREE.Vector3(80,69,-10), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._platformsHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/splatform/splatform.fbx', 
      new THREE.Vector3(80,86,-80), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._platformsHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/splatform/splatform.fbx', 
      new THREE.Vector3(30,103,-30), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    this._platformsHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelthree/splatform/splatform.fbx', 
      new THREE.Vector3(30,120,-100), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    
    // bandera de meta
    // en la punta del mapa
    this._checkpointHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/checkpoint/checkpoint.fbx', 
      new THREE.Vector3(30,120,-100), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );
    
    //question box
    // //inicio
    this._qboxHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelone/questionbox/questionbox.fbx', 
      new THREE.Vector3(-0, 35, 0), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );
    // //plataformas
    this._qboxHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelone/questionbox/questionbox.fbx', 
      new THREE.Vector3(80,89,-10), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );
    this._qboxHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelone/questionbox/questionbox.fbx', 
      new THREE.Vector3(80,72,70), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );
    //cerca del agua
    this._qboxHitboxes.push(this.LoadSceneModelsWithPrecision('./resources/3D/scene/levelone/questionbox/questionbox.fbx', 
      new THREE.Vector3(-100,20,-100), 
      new THREE.Vector3(0.05,0.05,0.05)
      )
    );

    //IMPORTANTE: Esperar a que todos los hitboxes se carguen
    console.log("⏳ Esperando carga de hitboxes del escenario...");
    
    //        1. Filtrar y esperar todas las promesas
    const hitboxPromises = this._leveloneHitboxes.filter(h => h && h.then);
    this._leveloneHitboxes = await Promise.all(hitboxPromises);
    
    // Aplanar arrays (algunos hitboxes son arrays de colliders)
    this._leveloneHitboxes = this._leveloneHitboxes.flat().filter(h => h);

    //        2. Filtrar y esperar todas las promesas
    const hitboxPromisesPLATFORMS = this._platformsHitboxes.filter(h => h && h.then);
    this._platformsHitboxes = await Promise.all(hitboxPromisesPLATFORMS);
    
    this._platformsHitboxes = this._platformsHitboxes.flat().filter(h => h);

    //        3. Filtrar y esperar todas las promesas
    const hitboxPromisesQBOX = this._qboxHitboxes.filter(h => h && h.then);
    this._qboxHitboxes = await Promise.all(hitboxPromisesQBOX);
    
    this._qboxHitboxes = this._qboxHitboxes.flat().filter(h => h);
    

    //        3. Filtrar y esperar todas las promesas
    const hitboxPromisesCheckP = this._checkpointHitboxes.filter(h => h && h.then);
    this._checkpointHitboxes = await Promise.all(hitboxPromisesCheckP);
    
    this._checkpointHitboxes = this._checkpointHitboxes.flat().filter(h => h);

    // console.log(`✅ ${this._leveloneHitboxes.length} hitboxes cargados y listos`);
    console.log("🎮 Paso 2: Cargando personaje...");
    await this._LoadAnimatedModel();

    //this._SetupMultiplayer(); //AGREGADO PARA MULTI
    // ⭐ AGREGAR estas líneas ANTES de this._RAF()
    this._isSceneReady = true;
    this._ProcessPendingPlayers();
    this._previousRAF = null;
    this._RAF();
  }

  _ProcessPendingPlayers() {
    if (this._pendingPlayers.length === 0) {
      console.log("📭 No hay jugadores pendientes");
      return;
    }
    
    console.log(`📥 Procesando ${this._pendingPlayers.length} jugadores pendientes`);
    
    this._pendingPlayers.forEach(({ nickname, character }) => {
      console.log(`🔄 Creando jugador pendiente: ${nickname} (${character})`);
      this._CreateOtherPlayerMesh(nickname, character);
    });
    
    this._pendingPlayers = [];
  }

  // //              AGREGADO PARA MULTI
  // _SetupMultiplayer() {
  //   this._multiplayerManager.onCreatePlayer = (nickname, characterKey) => {
  //     // ⭐ VERIFICAR si la escena está lista
  //     if (!this._isSceneReady || !this._scene) {
  //       console.log(`⏸️ Escena no lista, guardando en cola: ${nickname}`);
  //       this._pendingPlayers.push({ nickname, character: characterKey });
  //       return;
  //     }
      
  //     this._CreateOtherPlayerMesh(nickname, characterKey);
  //   };

  //   this._multiplayerManager.onUpdatePlayer = (nickname, posicion) => {
  //     if (this._otherPlayersMeshes[nickname]) {
  //       this._otherPlayersMeshes[nickname].position.set(
  //         posicion.x,
  //         posicion.y,
  //         posicion.z
  //       );
  //     }
  //   };

  //   // ⭐ AGREGAR callback para remover
  //   this._multiplayerManager.onRemovePlayer = (nickname) => {
  //     console.log(`🗑️ Removing player mesh: ${nickname}`);
      
  //     const mesh = this._otherPlayersMeshes[nickname];
  //     if (mesh) {
  //       this._scene.remove(mesh);
  //       mesh.traverse((child) => {
  //         if (child.geometry) child.geometry.dispose();
  //         if (child.material) {
  //           if (Array.isArray(child.material)) {
  //             child.material.forEach(mat => mat.dispose());
  //           } else {
  //             child.material.dispose();
  //           }
  //         }
  //       });
  //       delete this._otherPlayersMeshes[nickname];
  //       console.log(`✅ Player ${nickname} removed`);
  //     }
  //   };

  //   console.log("🎮 Multiplayer setup complete");
  // }

  //              AGREGADO PARA MULTI
  async _CreateOtherPlayerMesh(nickname, characterKey) {
    console.log(`🎨 Creating FBX model for player: ${nickname} (${characterKey})`);

    // ⭐ VERIFICACIÓN CRÍTICA
    if (!this._scene) {
        console.error(`❌ Scene not ready! Cannot create player ${nickname}`);
        return;
    }
    
    if (this._otherPlayersMeshes[nickname]) {
        console.log(`⚠️ Player ${nickname} already exists, skipping`);
        return;
    }
    
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

        // ⭐ CORRECCIÓN: Establecer posición inicial antes de añadir a la escena
        fbx.position.set(-0, 0, 0); // Posición de spawn inicial
        // -95, startHeight + 0.5, 90
        
        // ⭐ CORRECCIÓN: Añadir a la escena y guardar referencia
        this._scene.add(fbx);
        this._otherPlayersMeshes[nickname] = fbx;

        console.log(`✅ Player ${nickname} (${characterKey}) loaded successfully`);
        console.log(`📊 Total other players: ${Object.keys(this._otherPlayersMeshes).length}`);
        
    } catch (error) {
        console.error(`❌ Error loading character for ${nickname}:`, error);
    }
  }

  // ⭐ MODIFICACIÓN: Ahora _CreateTerrain es async y espera REALMENTE?
  async _CreateTerrain() {
  const textureLoader = new THREE.TextureLoader();

  // ⭐ SOLUCIÓN: Crear geometría manualmente para garantizar atributos
  console.log("🔧 Creando geometría del terreno manualmente...");
  this._terrainGeometry = this._CreateManualPlaneGeometry(300, 300, 512, 512);
  
  console.log(`✅ Geometría creada: ${this._terrainGeometry.attributes.position.count} vértices`);

  // Material temporal
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

  // Crear terrainManager
  this._terrainManager = {
    terrain: this._terrain,
    heightData: null,
    baseY: -2,
    isReady: false,
    getHeightAt: (x, z) => this._GetTerrainHeightAt(x, z)
  };

  console.log("🏔️ Mesh del terreno creado");

  // Cargar heightmap
  console.log("⏳ Cargando heightmap...");
  const heightMap = await this._LoadTextureAsync(textureLoader, './resources/textures/levelthree.jpg');

  if (!heightMap || !heightMap.image) {
    console.warn("⚠️ Heightmap no cargó, usando terreno plano");
    this._CreateFlatHeightMap();
    this._terrainManager.isReady = true;
    return;
  }

  // Esperar a que la imagen esté completamente cargada
  if (!heightMap.image.complete) {
    console.log("⏳ Esperando carga completa de imagen...");
    await new Promise((resolve) => {
      heightMap.image.onload = () => {
        console.log("✅ Imagen del heightmap cargada");
        resolve();
      };
      heightMap.image.onerror = () => {
        console.error("❌ Error al cargar imagen del heightmap");
        resolve();
      };
      // Timeout de seguridad
      setTimeout(resolve, 5000);
    });
  }

  console.log("✅ Imagen del heightmap lista");

  // Aplicar heightmap
  console.log("🔨 Aplicando deformación del terreno...");
  this._ApplyHeightMap(heightMap);

  // Cargar texturas
  console.log("⏳ Cargando texturas de material...");
  const [grassTexture, rockTexture] = await Promise.all([
    this._LoadTextureAsync(textureLoader, './resources/textures/mars.png'),
    this._LoadTextureAsync(textureLoader, './resources/textures/mars.png')
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

  // Aplicar material con shader
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
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

  this._terrainManager.isReady = true;
  console.log("✅ Terreno completamente listo");
}

  _CreateManualPlaneGeometry(width, height, widthSegments, heightSegments) {
  console.log(`🔧 Creando PlaneGeometry manual: ${width}x${height}, segmentos: ${widthSegments}x${heightSegments}`);
  
  const geometry = new THREE.BufferGeometry();
  
  const widthHalf = width / 2;
  const heightHalf = height / 2;
  
  const gridX = widthSegments + 1;
  const gridY = heightSegments + 1;
  
  const segmentWidth = width / widthSegments;
  const segmentHeight = height / heightSegments;
  
  // Arrays para vértices, normales y UVs
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  
  // Generar vértices
  for (let iy = 0; iy < gridY; iy++) {
    const y = iy * segmentHeight - heightHalf;
    
    for (let ix = 0; ix < gridX; ix++) {
      const x = ix * segmentWidth - widthHalf;
      
      // Posición del vértice (x, y, z=0)
      vertices.push(x, -y, 0);
      
      // Normal apuntando hacia arriba (en Z)
      normals.push(0, 0, 1);
      
      // Coordenadas UV
      uvs.push(ix / widthSegments, 1 - (iy / heightSegments));
    }
  }
  
  // Generar índices para triángulos
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ix = 0; ix < widthSegments; ix++) {
      const a = ix + gridX * iy;
      const b = ix + gridX * (iy + 1);
      const c = (ix + 1) + gridX * (iy + 1);
      const d = (ix + 1) + gridX * iy;
      
      // Dos triángulos por cuadrado
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  
  // Asignar atributos al BufferGeometry
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  
  // Guardar parámetros para compatibilidad con _ApplyHeightMap
  geometry.parameters = {
    width: width,
    height: height,
    widthSegments: widthSegments,
    heightSegments: heightSegments
  };
  
  console.log(`✅ Geometría manual creada exitosamente`);
  console.log(`   - Vértices: ${vertices.length / 3}`);
  console.log(`   - Triángulos: ${indices.length / 3}`);
  
  return geometry;
}

  //agua
  async _CreateWater() {
    console.log("🌊 Creando agua...");
    
    // Cargar textura de normales para las olas
    const waterNormals = await this._LoadTextureAsync(
        new THREE.TextureLoader(),
        'https://threejs.org/examples/textures/waternormals.jpg'
    );
    
    if (waterNormals) {
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
    }

    // Geometría del agua 
    const waterGeometry = new THREE.PlaneGeometry(300, 300);

    // Crear objeto de agua
    this._water = new Water(waterGeometry, {
        color: 'rgba(12, 13, 24, 1)',
        scale: 10,
        flowDirection: new THREE.Vector2(1, 0.5),
        textureWidth: 2048,
        textureHeight: 2048,
        normalMap0: waterNormals,
        normalMap1: waterNormals,
    });

    // Posicionar el agua
    this._water.rotation.x = -Math.PI / 2;
    this._water.position.y = 1;

    // Configurar transparencia
    // this._water.material.transparent = true;
    // this._water.material.uniforms.config.value.w = 0.6;
    // this._water.material.uniforms.color.value.setRGB(0.12, 0.56, 1.0);
    // this._water.material.blending = THREE.NormalBlending;
    // this._water.material.side = THREE.DoubleSide;
    // Agua completamente negra
    this._water.material.transparent = false;
    this._water.material.uniforms.config.value.w = 1.0; // Sin transparencia
    this._water.material.uniforms.color.value.setRGB(0, 0, 0); // Negro total
    this._water.material.blending = THREE.NoBlending;
    this._water.material.side = THREE.DoubleSide;


    this._scene.add(this._water);
    
   // 🎯 COLISIÓN: Crear BoundingBox para detección
    const waterThickness = 0.5; // Grosor de la zona de colisión
    this._waterBoundingBox = new THREE.Box3(
        new THREE.Vector3(-150, 1 - waterThickness, -150), // min (cambio: 5 → 1)
        new THREE.Vector3(150, 1 + waterThickness, 150)    // max (cambio: 5 → 1)
    );

    // Guardar altura del agua para efectos adicionales
    this._waterLevel = 1; // ⭐ Cambio: 5 → 1

    // 👁️ VISUALIZACIÓN: Helper para ver la colisión (DEBUG)
    const waterBoxHelper = new THREE.Box3Helper(this._waterBoundingBox, 0x00ffff);
    waterBoxHelper.name = 'WaterCollisionHelper';
    // this._scene.add(waterBoxHelper);

    
    console.log("✅ Agua creada con colisión");
    }

_InstantiateModel(path, position, scale, rotation = new THREE.Vector3(0, 0, 0), usePreciseCollision = false) {
    const instance = this._modelTemplates[path].clone();
    instance.position.copy(position);
    instance.scale.set(scale.x, scale.y, scale.z);
    instance.rotation.set(rotation.x, rotation.y, rotation.z);
    
    this._scene.add(instance);
    this._decorativeModels.push(instance);
    
    let hitbox;
    
    if (usePreciseCollision) {
        // ✅ Colisión precisa OPTIMIZADA con BVH
        hitbox = this._CreatePreciseCollider(instance);
        console.log('✅ Collider preciso con BVH creado');
    } else {
        // Colisión simple de caja
        const box = new THREE.Box3().setFromObject(instance);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const boxMat = new THREE.MeshBasicMaterial({ 
            visible: false, 
            wireframe: true, 
            color: 0x00ff00 
        });
        hitbox = new THREE.Mesh(boxGeo, boxMat);
        
        const center = new THREE.Vector3();
        box.getCenter(center);
        hitbox.position.copy(center);
        
        this._scene.add(hitbox);
    }
    
    this._interactiveHitboxes.push(hitbox);
    return hitbox;
}

// Para modelos OPACOS (sin alpha)
LoadSceneModels(path, position, scale, rotation = new THREE.Vector3(0, 0, 0)) {
    if (!this._modelTemplates) this._modelTemplates = {};
    if (!this._loadingModels) this._loadingModels = {};

    if (this._modelTemplates[path]) {
        this._InstantiateModel(path, position, scale, rotation); // ✅ Sin hitboxSize
        return;
    }

    if (this._loadingModels[path]) {
        this._loadingModels[path].push({ position, scale, rotation }); // ✅ Sin hitboxSize
        console.log(`⏳ Esperando carga de: ${path}`);
        return;
    }

    this._loadingModels[path] = [];

    const loader = new FBXLoader();
    loader.load(
        path,
        (fbx) => {
            fbx.position.copy(position);
            fbx.scale.set(scale.x, scale.y, scale.z);
            fbx.rotation.set(rotation.x, rotation.y, rotation.z);

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
            this._modelTemplates[path] = fbx;

            // ✅ Crear hitbox automático para el original
            const box = new THREE.Box3().setFromObject(fbx);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
            const boxMat = new THREE.MeshBasicMaterial({ 
              visible: false,      // ✅ Hacer visible
              wireframe: false,    // ✅ Modo wireframe
              color: 0x00ff00     // 🎨 Color verde (opcional)
            });
            const hitbox = new THREE.Mesh(boxGeo, boxMat);
            
            const center = new THREE.Vector3();
            box.getCenter(center);
            hitbox.position.copy(center);
            
            this._scene.add(hitbox);
            this._interactiveHitboxes.push(hitbox);

            console.log(`✅ Modelo opaco cargado: ${path}`);

            if (this._loadingModels[path]) {
                this._loadingModels[path].forEach(params => {
                    this._InstantiateModel(path, params.position, params.scale, params.rotation); // ✅ Sin hitboxSize
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
LoadSceneModelsWithAlpha(path, position, scale, rotation = new THREE.Vector3(0, 0, 0)) {
    if (!this._modelTemplates) this._modelTemplates = {};
    if (!this._loadingModels) this._loadingModels = {};

    if (this._modelTemplates[path]) {
        this._InstantiateModel(path, position, scale, rotation); // ✅ Sin hitboxSize
        return;
    }

    if (this._loadingModels[path]) {
        this._loadingModels[path].push({ position, scale, rotation }); // ✅ Sin hitboxSize
        console.log(`⏳ Esperando carga de: ${path}`);
        return;
    }

    this._loadingModels[path] = [];

    const loader = new FBXLoader();
    loader.load(
        path,
        (fbx) => {
            fbx.position.copy(position);
            fbx.scale.set(scale.x, scale.y, scale.z);
            fbx.rotation.set(rotation.x, rotation.y, rotation.z);

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
            this._modelTemplates[path] = fbx;

            // ✅ Crear hitbox automático para el original
            const box = new THREE.Box3().setFromObject(fbx);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
            const boxMat = new THREE.MeshBasicMaterial({ 
              visible: false,      // ✅ Hacer visible
              wireframe: false,    // ✅ Modo wireframe
              color: 0x00ff00     // 🎨 Color verde (opcional)
            });
            const hitbox = new THREE.Mesh(boxGeo, boxMat);
            
            const center = new THREE.Vector3();
            box.getCenter(center);
            hitbox.position.copy(center);
            
            this._scene.add(hitbox);
            this._interactiveHitboxes.push(hitbox);

            console.log(`✅ Modelo con alpha cargado: ${path}`);

            if (this._loadingModels[path]) {
                this._loadingModels[path].forEach(params => {
                    this._InstantiateModel(path, params.position, params.scale, params.rotation); // ✅ Sin hitboxSize
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

// ⭐ NUEVO: Para modelos con COLISIÓN PRECISA
LoadSceneModelsWithPrecision(path, position, scale, rotation = new THREE.Vector3(0, 0, 0)) {
    if (!this._modelTemplates) this._modelTemplates = {};
    if (!this._loadingModels) this._loadingModels = {};

    // Si ya está cargado, instanciar y retornar
    if (this._modelTemplates[path]) {
        return Promise.resolve(this._InstantiateModel(path, position, scale, rotation, true));
    }

    // Si ya se está cargando, agregar a la cola y retornar promesa
    if (this._loadingModels[path]) {
        return new Promise((resolve) => {
            this._loadingModels[path].push({ 
                position, 
                scale, 
                rotation, 
                usePrecise: true,
                resolve // ⭐ Guardar resolve para llamarlo después
            });
        });
    }

    // ⭐ Crear nueva promesa para la carga
    return new Promise((resolve, reject) => {
        this._loadingModels[path] = [];

        const loader = new FBXLoader();
        loader.load(
            path,
            (fbx) => {
                fbx.position.copy(position);
                fbx.scale.set(scale.x, scale.y, scale.z);
                fbx.rotation.set(rotation.x, rotation.y, rotation.z);

                fbx.traverse((child) => {
                    if (child.isMesh) {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this._scene.add(fbx);
                this._decorativeModels.push(fbx);
                this._modelTemplates[path] = fbx;

                // ✅ Crear collider preciso
                const preciseCollider = this._CreatePreciseCollider(fbx);

                console.log(`✅ Modelo con colisión precisa cargado: ${path}`);

                // Resolver promesa principal
                resolve(preciseCollider);

                // Resolver promesas en cola
                if (this._loadingModels[path]) {
                    this._loadingModels[path].forEach(params => {
                        const colliders = this._InstantiateModel(
                            path, 
                            params.position, 
                            params.scale, 
                            params.rotation, 
                            params.usePrecise || false
                        );
                        if (params.resolve) {
                            params.resolve(colliders);
                        }
                    });
                    delete this._loadingModels[path];
                }
            },
            (xhr) => {
                console.log(`📦 Cargando ${path}: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`);
            },
            (error) => {
                console.error(`❌ Error al cargar modelo: ${path}`, error);
                reject(error);
                delete this._loadingModels[path];
            }
        );
    });
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
    console.warn("⚠️ Heightmap texture no disponible");
    this._CreateFlatHeightMap();
    return;
  }

  // Verificar atributos
  if (!this._terrainGeometry.attributes || !this._terrainGeometry.attributes.position) {
    console.error("❌ Geometría no tiene atributos position");
    this._CreateFlatHeightMap();
    return;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = heightTexture.image.width;
  canvas.height = heightTexture.image.height;
  
  console.log(`📊 Dimensiones heightmap: ${canvas.width}x${canvas.height}`);
  
  try {
    context.drawImage(heightTexture.image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    const positions = this._terrainGeometry.attributes.position.array;
    const width = this._terrainGeometry.parameters.widthSegments + 1;
    const height = this._terrainGeometry.parameters.heightSegments + 1;
    
    console.log(`📊 Grid del terreno: ${width}x${height} (${positions.length / 3} vértices)`);
    
    this._terrainHeightData = [];
    const heightScale = 20;
    
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let i = 0; i < height; i++) {
      this._terrainHeightData[i] = [];
      for (let j = 0; j < width; j++) {
        const index = (i * width + j) * 3;
        
        // Mapear coordenadas del grid a píxeles de la imagen
        const pixelX = Math.floor((j / (width - 1)) * (canvas.width - 1));
        const pixelY = Math.floor(((height - 1 - i) / (height - 1)) * (canvas.height - 1));
        const pixelIndex = (pixelY * canvas.width + pixelX) * 4;
        
        // Leer valor de altura (escala de grises, canal rojo)
        const heightValue = imageData.data[pixelIndex] / 255.0;
        const calculatedHeight = heightValue * heightScale;
        
        // ⭐ CRÍTICO: Modificar eje Z porque el plano está rotado -90° en X
        positions[index + 2] = calculatedHeight;
        
        this._terrainHeightData[i][j] = calculatedHeight;
        
        minHeight = Math.min(minHeight, calculatedHeight);
        maxHeight = Math.max(maxHeight, calculatedHeight);
      }
    }
    
    // Marcar geometría como modificada
    this._terrainGeometry.attributes.position.needsUpdate = true;
    this._terrainGeometry.computeVertexNormals();
    
    console.log("✅ Heightmap aplicado correctamente");
    console.log(`   - Rango alturas: ${minHeight.toFixed(2)} a ${maxHeight.toFixed(2)}`);
    console.log(`   - Escala: ${heightScale}x`);
    
  } catch (error) {
    console.error("❌ Error al procesar heightmap:", error);
    this._CreateFlatHeightMap();
  }
}

  _GetTerrainHeightAt(x, z) {
  if (!this._terrainHeightData) {
    return this._terrain ? this._terrain.position.y : -2;
  }

  const size = 300; // ⭐ CORRECCIÓN: Tamaño real del terreno
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
      world: this, //para usar loadmodelswithprecition fuera de game no se q xd

      //colisiones
      collisionBoxes: this._collisionBoxes, //añadido para colis
      leveloneHitboxes: this._leveloneHitboxes,
      _platformsHitboxes: this._platformsHitboxes,
      _qboxHitboxes: this._qboxHitboxes,
      _checkpointHitboxes: this._checkpointHitboxes,
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

  //optimizacion de colis
_CreatePreciseCollider(modelInstance) {
    const colliders = [];
    modelInstance.updateMatrixWorld(true);
    
    modelInstance.traverse((child) => {
        if (child.isMesh) {
            // ✅ Generar BVH si está disponible
            if (typeof child.geometry.computeBoundsTree === 'function') {
                if (!child.geometry.boundsTree) {
                    child.geometry.computeBoundsTree();
                    console.log('🚀 BVH generado para mesh');
                }
            }
            
            // ⭐ Clonar la geometría exacta del modelo
            const colliderGeo = child.geometry.clone();
            
            // ⭐ CRÍTICO: Aplicar las transformaciones del mundo a la geometría
            colliderGeo.applyMatrix4(child.matrixWorld);
            
            // Regenerar BVH después de transformar
            if (typeof colliderGeo.computeBoundsTree === 'function') {
                colliderGeo.computeBoundsTree();
                // console.log('🚀 BVH regenerado después de transformación');
            }
            
            // Material para visualizar (cambiar visible a true para debug)
            const colliderMat = new THREE.MeshBasicMaterial({ 
                visible: false,  //VER LAS COLISIONES (true)
                wireframe: true, 
                color: 0xff0000,
                transparent: true,
                opacity: 0.3
            });
            
            const collider = new THREE.Mesh(colliderGeo, colliderMat);
            
            // ⭐ El collider está en posición (0,0,0) porque ya aplicamos las transformaciones
            collider.position.set(0, 0, 0);
            collider.rotation.set(0, 0, 0);
            collider.scale.set(1, 1, 1);
            
            // ⭐ Importante: Deshabilitar frustum culling para que raycast siempre funcione
            collider.frustumCulled = false;
            
            this._scene.add(collider);
            colliders.push(collider);
            
            // console.log(`🔴 Collider preciso creado con ${colliderGeo.attributes.position.count} vértices`);
        }
    });
    
    return colliders.length > 0 ? colliders : null;
}

// Con BVH, estas operaciones son 100x más rápidas
checkCollisionWithTentacle(playerPosition) {
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, -1, 0); // Hacia abajo
    
    raycaster.set(playerPosition, direction);
    
    // Esto usa el BVH automáticamente - SUPER RÁPIDO ⚡
    const intersects = raycaster.intersectObjects(this.tentacleColliders, true);
    
    return intersects.length > 0;
}
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
  _APP = new CharacterControllerDemo();
});