//================================================================================
//                                DOCUMENTACION DE CODIGO
//================================================================================
// NOMBRE DEL ARCHIVO / MODULO : practica2.1.js
// PROYECTO                    : Practica 1 - Space Invaders terminado
// AUTOR                       : Omar Alejandro Aguayo Sanchez, Rene Servin Cansino
// FECHA DE ELABORACION        : 02/10/2026
// VERSION                     : 2.1.0 
//================================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ============================================================
// PANEL DE INFORMACIÓN DE LA PRÁCTICA
// ============================================================
const panelInfo = document.createElement('div');
panelInfo.style.position = 'fixed';
panelInfo.style.bottom = '15px';
panelInfo.style.left = '15px';
panelInfo.style.padding = '10px 15px';
panelInfo.style.background = 'rgba(0, 0, 0, 0.75)';
panelInfo.style.color = '#ffffff';
panelInfo.style.fontFamily = 'monospace, sans-serif';
panelInfo.style.fontSize = '14px';
panelInfo.style.lineHeight = '1.4';
panelInfo.style.border = '1px solid #00ffff';
panelInfo.style.borderRadius = '6px';
panelInfo.style.zIndex = '1000';
panelInfo.style.userSelect = 'none';

panelInfo.innerHTML = `
    <strong>Práctica 1 - Space Invaders</strong><br>
    <small>Controles: Flechas (Mover) | Espacio (Disparar) | C (Cámara) | ESC / M (Menú)</small>
`;
document.body.appendChild(panelInfo);

// ============================================================
// 1. ESCENA, RENDERER Y CÁMARAS (2D Y 3D)
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010206);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const ALTURA_VISTA = 24;

function obtenerAnchoVista() {
    return ALTURA_VISTA * (window.innerWidth / window.innerHeight);
}

let anchoVista = obtenerAnchoVista();

// --- Cámara 2D Clásica (Ortográfica) ---
const cameraOrtografica = new THREE.OrthographicCamera(
    -anchoVista / 2,
    anchoVista / 2,
    ALTURA_VISTA / 2,
    -ALTURA_VISTA / 2,
    0.1,
    100
);
cameraOrtografica.position.set(0, 0, 10);
cameraOrtografica.lookAt(0, 0, 0);

// --- Cámara 3D Detrás de la Nave (Perspectiva) ---
const cameraPerspectiva = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
cameraPerspectiva.position.set(0, -14.5, 4.5);
cameraPerspectiva.lookAt(0, 2, 0);

let modo3D = false;
let camera = cameraOrtografica;

// ============================================================
// SISTEMA DE AUDIO (MÚSICA Y EFECTOS)
// ============================================================
const listener = new THREE.AudioListener();
cameraOrtografica.add(listener);

const audioLoader = new THREE.AudioLoader();

// 1. Música de fondo
const musicaFondo = new THREE.Audio(listener);
const RUTA_MUSICA = new URL('./spaceinvaders/clu.mp3', import.meta.url).href;
let musicaCargada = false;

audioLoader.load(
    RUTA_MUSICA,
    (buffer) => {
        musicaFondo.setBuffer(buffer);
        musicaFondo.setLoop(true);
        musicaFondo.setVolume(0.5);
        musicaCargada = true;
    },
    undefined,
    (error) => console.error('Error al cargar la música:', error)
);

// 2. Efecto de sonido: Eliminación de naves
const sonidoEliminacion = new THREE.Audio(listener);
const RUTA_ELIMINACION = new URL('./spaceinvaders/eliminacion.mp3', import.meta.url).href;
let sonidoEliminacionCargado = false;

audioLoader.load(
    RUTA_ELIMINACION,
    (buffer) => {
        sonidoEliminacion.setBuffer(buffer);
        sonidoEliminacion.setVolume(0.7);
        sonidoEliminacionCargado = true;
    },
    undefined,
    (error) => console.error('Error al cargar sonido eliminación:', error)
);

function iniciarMusica() {
    if (listener.context.state === 'suspended') {
        listener.context.resume();
    }
    if (musicaCargada && !musicaFondo.isPlaying && !juegoTerminado) {
        musicaFondo.play();
    }
}

function reproducirSonidoEliminacion() {
    if (!sonidoEliminacionCargado) return;
    if (listener.context.state === 'suspended') {
        listener.context.resume();
    }
    if (sonidoEliminacion.isPlaying) {
        sonidoEliminacion.stop();
    }
    sonidoEliminacion.play();
}

// ============================================================
// 2. ILUMINACIÓN
// ============================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(0, 5, 10);
scene.add(dirLight);

// ============================================================
// 3. PISO CIBERNÉTICO CON LÍNEAS LED
// ============================================================
const grupoPiso = new THREE.Group();
grupoPiso.position.set(0, 10, -14);
scene.add(grupoPiso);

const basePisoGeo = new THREE.PlaneGeometry(60, 110);
const basePisoMat = new THREE.MeshStandardMaterial({
    color: 0x02050b,
    metalness: 0.85,
    roughness: 0.35
});
const basePiso = new THREE.Mesh(basePisoGeo, basePisoMat);
grupoPiso.add(basePiso);

const materialLedTron = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
});

const materialLedSecundario = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
});

const carrilesX = [-18, -12, -6, -2, 2, 6, 12, 18];
carrilesX.forEach((posX) => {
    const esPrincipal = (Math.abs(posX) === 2 || Math.abs(posX) === 12);
    const anchoLinea = esPrincipal ? 0.16 : 0.08;
    const lineaGeo = new THREE.PlaneGeometry(anchoLinea, 110);
    const linea = new THREE.Mesh(lineaGeo, esPrincipal ? materialLedTron : materialLedSecundario);
    linea.position.set(posX, 0, 0.01);
    grupoPiso.add(linea);
});

for (let y = -45; y <= 50; y += 7) {
    const barraGeo = new THREE.PlaneGeometry(36, 0.06);
    const barra = new THREE.Mesh(barraGeo, materialLedSecundario);
    barra.position.set(0, y, 0.01);
    grupoPiso.add(barra);
}

// ============================================================
// 4. MARCADOR HTML
// ============================================================
const marcador = document.createElement('div');
marcador.style.position = 'fixed';
marcador.style.top = '15px';
marcador.style.left = '15px';
marcador.style.padding = '12px 18px';
marcador.style.background = 'rgba(0, 0, 0, 0.8)';
marcador.style.color = '#ffffff';
marcador.style.fontFamily = 'monospace, sans-serif';
marcador.style.fontSize = '16px';
marcador.style.lineHeight = '1.5';
marcador.style.border = '2px solid #00ffff';
marcador.style.borderRadius = '8px';
marcador.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.3)';
marcador.style.zIndex = '1000';
marcador.style.userSelect = 'none';
document.body.appendChild(marcador);

const botonAbrirMenu = document.createElement('button');
botonAbrirMenu.innerText = '⚙️ MENÚ [ESC]';
botonAbrirMenu.style.position = 'fixed';
botonAbrirMenu.style.top = '15px';
botonAbrirMenu.style.right = '15px';
botonAbrirMenu.style.padding = '10px 16px';
botonAbrirMenu.style.background = '#020d18';
botonAbrirMenu.style.color = '#00ffff';
botonAbrirMenu.style.border = '2px solid #00ffff';
botonAbrirMenu.style.borderRadius = '6px';
botonAbrirMenu.style.fontFamily = 'monospace';
botonAbrirMenu.style.fontSize = '14px';
botonAbrirMenu.style.cursor = 'pointer';
botonAbrirMenu.style.fontWeight = 'bold';
botonAbrirMenu.style.zIndex = '1000';
botonAbrirMenu.onclick = () => alternarMenu();
document.body.appendChild(botonAbrirMenu);

// ============================================================
// 5. CONFIGURACIÓN DE LOS 5 NIVELES
// ============================================================
const TOTAL_NIVELES = 5;

const CONFIG_NIVELES = {
    1: { velocidad: 2.2, minDisparo: 0.8, maxDisparo: 1.5, velBalaEnemiga: 12, label: 'Fácil' },
    2: { velocidad: 3.4, minDisparo: 0.6, maxDisparo: 1.2, velBalaEnemiga: 14, label: 'Normal' },
    3: { velocidad: 4.8, minDisparo: 0.4, maxDisparo: 0.9, velBalaEnemiga: 16, label: 'Difícil' },
    4: { velocidad: 6.2, minDisparo: 0.3, maxDisparo: 0.6, velBalaEnemiga: 18, label: 'Experto' },
    5: { velocidad: 7.8, minDisparo: 0.15, maxDisparo: 0.35, velBalaEnemiga: 21, label: 'SUPER DIFÍCIL' }
};

let nivelActual = 1;
let velocidadMarcianos = CONFIG_NIVELES[1].velocidad;
let puntuacion = 0;
let vidas = 3;
let juegoTerminado = false;
let juegoPausado = false;
let direccionMarcianos = 1;

const VELOCIDAD_NAVE = 36;
const VELOCIDAD_BALA = 28;
const POSICION_NAVE_Y = -10;
const DESCENSO_MARCIANOS = 0.8;

let tiempoParaDisparoEnemigo = 1.0;

const FILAS = 4;
const COLUMNAS = 10;
const ESPACIADO_X = 2.4;
const ESPACIADO_Y = 1.7;
const POSICION_INICIAL_Y = 8;

let marcianos = [];
let modeloBaseMarciano = null;

// ============================================================
// 6. CARGA DE MODELOS (ENEMIGOS Y NAVE)
// ============================================================
const loader = new GLTFLoader();
const RUTA_MODELO_ENEMIGO = new URL('./spaceinvaders/orange_lightjet_tron.glb', import.meta.url).href;

loader.load(
    RUTA_MODELO_ENEMIGO,
    (gltf) => {
        modeloBaseMarciano = gltf.scene;
        modeloBaseMarciano.scale.set(0.0012, 0.0012, 0.0012);
        modeloBaseMarciano.rotation.y = Math.PI / 2;
        modeloBaseMarciano.rotation.z = Math.PI / 4;

        modeloBaseMarciano.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((m) => { m.wireframe = true; });
                } else {
                    child.material.wireframe = true;
                }
            }
        });

        iniciarNivel(1);
    },
    undefined,
    (error) => console.error('Error al cargar modelo marcianos:', error)
);

// Nave del jugador
const nave = new THREE.Group();
nave.position.set(0, POSICION_NAVE_Y, 0);
scene.add(nave);

const RUTA_MODELO_NAVE = new URL('./spaceinvaders/lightjet.glb', import.meta.url).href;
loader.load(
    RUTA_MODELO_NAVE,
    (gltf) => {
        const modeloNave = gltf.scene;
        modeloNave.scale.set(1, 1, 1);
        modeloNave.rotation.y = Math.PI / 2;
        modeloNave.rotation.z = Math.PI / 4;
        nave.add(modeloNave);
    },
    undefined,
    (error) => console.error('Error al cargar nave:', error)
);

// ============================================================
// 7. BALAS (JUGADOR Y ENEMIGA)
// ============================================================
const balaGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
const balaMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const bala = new THREE.Mesh(balaGeometry, balaMaterial);
bala.position.set(0, -9, 0);
bala.visible = false;
scene.add(bala);

const balaEnemigaGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
const balaEnemigaMaterial = new THREE.MeshBasicMaterial({ color: 0xff0055 });
const balaEnemiga = new THREE.Mesh(balaEnemigaGeometry, balaEnemigaMaterial);
balaEnemiga.visible = false;
scene.add(balaEnemiga);

// ============================================================
// 8. MENÚ MODAL FLOTANTE (HTML / CSS ESTILO TRON)
// ============================================================
const menuModal = document.createElement('div');
menuModal.style.position = 'fixed';
menuModal.style.top = '0';
menuModal.style.left = '0';
menuModal.style.width = '100vw';
menuModal.style.height = '100vh';
menuModal.style.background = 'rgba(2, 6, 16, 0.88)';
menuModal.style.backdropFilter = 'blur(6px)';
menuModal.style.display = 'none';
menuModal.style.flexDirection = 'column';
menuModal.style.justifyContent = 'center';
menuModal.style.alignItems = 'center';
menuModal.style.zIndex = '2000';
menuModal.style.userSelect = 'none';
menuModal.style.fontFamily = 'monospace, sans-serif';

menuModal.innerHTML = `
    <div style="
        border: 2px solid #00ffff;
        box-shadow: 0 0 25px rgba(0, 255, 255, 0.5);
        background: #040914;
        border-radius: 12px;
        padding: 30px 45px;
        text-align: center;
        max-width: 440px;
        width: 90%;
    ">
        <h2 id="menuTitulo" style="color: #00ffff; margin-top: 0; font-size: 26px; text-shadow: 0 0 10px #00ffff;">PAUSA</h2>
        <p id="menuSubtitulo" style="color: #c7e9ff; font-size: 15px; margin-bottom: 25px;">El juego está pausado</p>
        
        <div id="contenedorBotones" style="display: flex; flex-direction: column; gap: 12px;">
            <button id="btnContinuar" class="menu-btn">Continuar</button>
            <button id="btnSiguienteNivel" class="menu-btn" style="display:none; border-color: #00ffaa; color: #00ffaa;">Siguiente Nivel</button>
            <button id="btnReiniciarNivel" class="menu-btn">Reiniciar Nivel</button>
            <button id="btnReiniciarJuego" class="menu-btn" style="border-color: #ffaa00; color: #ffaa00;">Reiniciar Todo (Nivel 1)</button>
        </div>
    </div>
`;
document.body.appendChild(menuModal);

const estiloBotones = document.createElement('style');
estiloBotones.textContent = `
    .menu-btn {
        background: #081426;
        color: #00ffff;
        border: 1px solid #00ffff;
        padding: 12px 20px;
        font-size: 15px;
        font-family: monospace;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .menu-btn:hover {
        background: #00ffff;
        color: #02050b;
        box-shadow: 0 0 15px #00ffff;
    }
`;
document.head.appendChild(estiloBotones);

const btnContinuar = document.getElementById('btnContinuar');
const btnSiguienteNivel = document.getElementById('btnSiguienteNivel');
const btnReiniciarNivel = document.getElementById('btnReiniciarNivel');
const btnReiniciarJuego = document.getElementById('btnReiniciarJuego');
const menuTitulo = document.getElementById('menuTitulo');
const menuSubtitulo = document.getElementById('menuSubtitulo');

btnContinuar.onclick = () => alternarMenu(false);
btnSiguienteNivel.onclick = () => {
    menuModal.style.display = 'none';
    juegoPausado = false;
    iniciarNivel(nivelActual + 1);
};
btnReiniciarNivel.onclick = () => {
    menuModal.style.display = 'none';
    juegoPausado = false;
    iniciarNivel(nivelActual);
};
btnReiniciarJuego.onclick = () => {
    menuModal.style.display = 'none';
    juegoPausado = false;
    puntuacion = 0;
    vidas = 3;
    iniciarNivel(1);
};

function alternarMenu(forzarEstado = null) {
    if (juegoTerminado && forzarEstado === false) return;

    juegoPausado = (forzarEstado !== null) ? forzarEstado : !juegoPausado;
    menuModal.style.display = juegoPausado ? 'flex' : 'none';

    if (juegoPausado) {
        menuTitulo.innerText = 'CONTROL DE MISIÓN';
        menuTitulo.style.color = '#00ffff';
        menuSubtitulo.innerText = `Nivel actual: ${nivelActual} / ${TOTAL_NIVELES}`;
        btnContinuar.style.display = 'block';
        btnSiguienteNivel.style.display = 'none';
    }
}

function mostrarMenuFin(tipo, mensaje, sub) {
    juegoPausado = true;
    menuModal.style.display = 'flex';
    menuTitulo.innerText = mensaje;
    menuSubtitulo.innerHTML = sub;

    if (tipo === 'victoria_nivel') {
        menuTitulo.style.color = '#00ffaa';
        btnContinuar.style.display = 'none';
        btnSiguienteNivel.style.display = 'block';
    } else if (tipo === 'victoria_total') {
        menuTitulo.style.color = '#00ffff';
        btnContinuar.style.display = 'none';
        btnSiguienteNivel.style.display = 'none';
    } else if (tipo === 'game_over') {
        menuTitulo.style.color = '#ff0055';
        btnContinuar.style.display = 'none';
        btnSiguienteNivel.style.display = 'none';
    }
}

// ============================================================
// 9. GENERACIÓN Y GESTIÓN DE NIVELES
// ============================================================
function limpiarMarcianos() {
    for (const m of marcianos) {
        scene.remove(m);
    }
    marcianos = [];
}

function iniciarNivel(numNivel) {
    nivelActual = Math.min(Math.max(numNivel, 1), TOTAL_NIVELES);
    velocidadMarcianos = CONFIG_NIVELES[nivelActual].velocidad;
    juegoTerminado = false;
    juegoPausado = false;
    direccionMarcianos = 1;

    bala.visible = false;
    balaEnemiga.visible = false;
    nave.position.set(0, POSICION_NAVE_Y, 0);

    limpiarMarcianos();

    if (!modeloBaseMarciano) return;

    for (let fila = 0; fila < FILAS; fila++) {
        for (let columna = 0; columna < COLUMNAS; columna++) {
            const marciano = modeloBaseMarciano.clone();
            const x = (columna - (COLUMNAS - 1) / 2) * ESPACIADO_X;
            const y = POSICION_INICIAL_Y - fila * ESPACIADO_Y;

            marciano.position.set(x, y, 0);
            scene.add(marciano);
            marcianos.push(marciano);
        }
    }

    tiempoParaDisparoEnemigo = obtenerNuevoTiempoDeDisparo();
    actualizarMarcador();
    iniciarMusica();
}

function obtenerNuevoTiempoDeDisparo() {
    const config = CONFIG_NIVELES[nivelActual];
    return config.minDisparo + Math.random() * (config.maxDisparo - config.minDisparo);
}

// ============================================================
// 10. MARCADOR Y CÁMARA
// ============================================================
function alternarCamara() {
    modo3D = !modo3D;
    camera = modo3D ? cameraPerspectiva : cameraOrtografica;
    actualizarMarcador();
}

function actualizarMarcador() {
    let estado = juegoTerminado ? 'Terminado' : (juegoPausado ? 'Pausado' : 'Combatiendo');
    let vistaTexto = modo3D ? '3D' : '2D';

    marcador.innerHTML = `
        <strong style="color: #00ffff;">SPACE INVADERS</strong><br>
        <strong>Nivel:</strong> ${nivelActual}/${TOTAL_NIVELES} (${CONFIG_NIVELES[nivelActual].label})<br>
        <strong>Puntuación:</strong> ${puntuacion}<br>
        <strong>Vidas:</strong> ${vidas}<br>
        <strong>Enemigos:</strong> ${marcianos.length}<br>
        <strong>Cámara:</strong> ${vistaTexto} <em>[C]</em> | <strong>Estado:</strong> ${estado}
    `;
}

// ============================================================
// 11. LÍMITES HORIZONTALES
// ============================================================
function obtenerLimiteIzquierdo() {
    return cameraOrtografica.left + 2.5;
}

function obtenerLimiteDerecho() {
    return cameraOrtografica.right - 2.5;
}

// ============================================================
// 12. MOVIMIENTO DE LA NAVE
// ============================================================
const teclas = {
    izquierda: false,
    derecha: false,
    disparo: false
};

function moverNave(delta) {
    if (teclas.izquierda) {
        nave.position.x -= VELOCIDAD_NAVE * delta;
    }
    if (teclas.derecha) {
        nave.position.x += VELOCIDAD_NAVE * delta;
    }

    nave.position.x = THREE.MathUtils.clamp(
        nave.position.x,
        obtenerLimiteIzquierdo(),
        obtenerLimiteDerecho()
    );
}

// ============================================================
// 13. MOVIMIENTO DE LOS MARCIANOS
// ============================================================
function moverMarcianos(delta) {
    if (marcianos.length === 0) return;

    let izquierda = Infinity;
    let derecha = -Infinity;

    for (const marciano of marcianos) {
        if (!marciano.visible) continue;
        if (marciano.position.x < izquierda) izquierda = marciano.position.x;
        if (marciano.position.x > derecha) derecha = marciano.position.x;
    }

    const factorBajas = 1 + ((FILAS * COLUMNAS - marcianos.length) / (FILAS * COLUMNAS)) * 0.45;
    const velocidadReal = velocidadMarcianos * factorBajas;

    const movimientoX = direccionMarcianos * velocidadReal * delta;
    const vaATocarBordeDerecho = derecha + movimientoX >= obtenerLimiteDerecho();
    const vaATocarBordeIzquierdo = izquierda + movimientoX <= obtenerLimiteIzquierdo();

    if (vaATocarBordeDerecho || vaATocarBordeIzquierdo) {
        direccionMarcianos *= -1;
        for (const marciano of marcianos) {
            marciano.position.y -= DESCENSO_MARCIANOS;
            marciano.position.x += direccionMarcianos * velocidadReal * delta;
        }
    } else {
        for (const marciano of marcianos) {
            marciano.position.x += movimientoX;
        }
    }

    for (const marciano of marcianos) {
        if (marciano.position.y <= POSICION_NAVE_Y + 1.2) {
            gameOver();
            return;
        }
    }
}

// ============================================================
// 14. DISPARO DEL JUGADOR
// ============================================================
function dispararJugador() {
    if (juegoTerminado || juegoPausado || bala.visible) return;
    bala.position.set(nave.position.x, nave.position.y + 0.8, 0);
    bala.visible = true;
}

function actualizarBalaJugador(delta) {
    if (!bala.visible) return;

    bala.position.y += VELOCIDAD_BALA * delta;

    if (bala.position.y > cameraOrtografica.top + 1) {
        bala.visible = false;
        return;
    }

    for (let i = marcianos.length - 1; i >= 0; i--) {
        const marciano = marcianos[i];
        const diferenciaX = Math.abs(bala.position.x - marciano.position.x);
        const diferenciaY = Math.abs(bala.position.y - marciano.position.y);

        if (diferenciaX < 1.3 && diferenciaY < 1.3) {
            scene.remove(marciano);
            marcianos.splice(i, 1);

            reproducirSonidoEliminacion();
            puntuacion += 10 * nivelActual;
            bala.visible = false;
            actualizarMarcador();

            if (marcianos.length === 0) {
                superarNivel();
            }
            break;
        }
    }
}

// ============================================================
// 15. DISPARO ENEMIGO
// ============================================================
function disparoEnemigo(delta) {
    if (juegoTerminado || juegoPausado || balaEnemiga.visible || marcianos.length === 0) return;

    tiempoParaDisparoEnemigo -= delta;
    if (tiempoParaDisparoEnemigo > 0) return;

    tiempoParaDisparoEnemigo = obtenerNuevoTiempoDeDisparo();

    const indice = Math.floor(Math.random() * marcianos.length);
    const marcianoDisparador = marcianos[indice];

    balaEnemiga.position.set(
        marcianoDisparador.position.x,
        marcianoDisparador.position.y - 0.8,
        0
    );
    balaEnemiga.visible = true;
}

function actualizarBalaEnemiga(delta) {
    if (!balaEnemiga.visible) return;

    const velBala = CONFIG_NIVELES[nivelActual].velBalaEnemiga;
    balaEnemiga.position.y -= velBala * delta;

    if (balaEnemiga.position.y < cameraOrtografica.bottom - 1) {
        balaEnemiga.visible = false;
        return;
    }

    const diferenciaX = Math.abs(balaEnemiga.position.x - nave.position.x);
    const diferenciaY = Math.abs(balaEnemiga.position.y - nave.position.y);

    if (diferenciaX < 0.9 && diferenciaY < 0.9) {
        balaEnemiga.visible = false;
        vidas--;
        actualizarMarcador();

        if (vidas <= 0) {
            gameOver();
        }
    }
}

// ============================================================
// 16. FIN DEL JUEGO Y CONTROL DE NIVELES
// ============================================================
function superarNivel() {
    if (juegoTerminado) return;

    if (nivelActual < TOTAL_NIVELES) {
        mostrarMenuFin(
            'victoria_nivel',
            `¡NIVEL ${nivelActual} COMPLETADO!`,
            `Enemigos eliminados.<br>Prepárate para el siguiente reto (Velocidad incrementada).`
        );
    } else {
        juegoTerminado = true;
        actualizarMarcador();
        mostrarMenuFin(
            'victoria_total',
            '¡VICTORIA TOTAL!',
            `¡Has superado los 5 niveles!<br><strong>Puntaje final:</strong> ${puntuacion}`
        );
    }
}

function gameOver() {
    if (juegoTerminado) return;
    juegoTerminado = true;
    vidas = 0;
    actualizarMarcador();

    mostrarMenuFin(
        'game_over',
        'SISTEMA DERROTADO',
        `Los enemigos penetraron tus defensas en el Nivel ${nivelActual}.<br>Puntuación: ${puntuacion}`
    );
}

// ============================================================
// 17. CONTROLES Y RESIZE
// ============================================================
window.addEventListener('keydown', (event) => {
    iniciarMusica();

    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
    if (event.code === 'ArrowLeft') teclas.izquierda = true;
    if (event.code === 'ArrowRight') teclas.derecha = true;
    if (event.code === 'Space') {
        if (!teclas.disparo) dispararJugador();
        teclas.disparo = true;
    }
    if (event.code === 'KeyC') {
        alternarCamara();
    }
    if (event.code === 'Escape' || event.code === 'KeyM') {
        alternarMenu();
    }
});

window.addEventListener('click', () => {
    iniciarMusica();
});

window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft') teclas.izquierda = false;
    if (event.code === 'ArrowRight') teclas.derecha = false;
    if (event.code === 'Space') teclas.disparo = false;
});

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);

    anchoVista = obtenerAnchoVista();
    cameraOrtografica.left = -anchoVista / 2;
    cameraOrtografica.right = anchoVista / 2;
    cameraOrtografica.top = ALTURA_VISTA / 2;
    cameraOrtografica.bottom = -ALTURA_VISTA / 2;
    cameraOrtografica.updateProjectionMatrix();

    cameraPerspectiva.aspect = window.innerWidth / window.innerHeight;
    cameraPerspectiva.updateProjectionMatrix();

    nave.position.x = THREE.MathUtils.clamp(
        nave.position.x,
        obtenerLimiteIzquierdo(),
        obtenerLimiteDerecho()
    );
});

// ============================================================
// HAZ DE LUZ / PORTAL TRON DE FONDO
// ============================================================
function crearTexturaAuraPortal() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 15, 256, 256, 256);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(0, 235, 255, 0.85)');
    grad.addColorStop(0.55, 'rgba(0, 140, 255, 0.35)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(canvas);
}

function crearTexturaDestelloBase() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(190, 255, 255, 1.0)');
    grad.addColorStop(0.5, 'rgba(0, 230, 255, 0.7)');
    grad.addColorStop(0.85, 'rgba(0, 120, 255, 0.2)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

const grupoPortal = new THREE.Group();
grupoPortal.position.set(0, 39, -12);
scene.add(grupoPortal);

const luzBasePortal = new THREE.PointLight(0x00ffff, 15, 40);
luzBasePortal.position.set(0, 0, 0.8);
grupoPortal.add(luzBasePortal);

const matDestelloBase = new THREE.SpriteMaterial({
    map: crearTexturaDestelloBase(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 1.0,
    depthWrite: false
});

const destelloBaseCore = new THREE.Sprite(matDestelloBase);
destelloBaseCore.scale.set(12, 12, 1);
destelloBaseCore.position.set(0, 0, 0.3);
grupoPortal.add(destelloBaseCore);

const destelloBaseAura = new THREE.Sprite(matDestelloBase);
destelloBaseAura.scale.set(22, 22, 1);
destelloBaseAura.position.set(0, 0, 0.5);
grupoPortal.add(destelloBaseAura);

const discoGeo = new THREE.CircleGeometry(1.2, 32);
const discoMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
});
const discoPortal = new THREE.Mesh(discoGeo, discoMat);
discoPortal.position.set(0, 0, 0.05);
grupoPortal.add(discoPortal);

const ringGeo = new THREE.RingGeometry(1.4, 2.6, 32);
const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
});
const ringPortal = new THREE.Mesh(ringGeo, ringMat);
ringPortal.position.set(0, 0, 0.02);
grupoPortal.add(ringPortal);

const spriteMaterial = new THREE.SpriteMaterial({
    map: crearTexturaAuraPortal(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
});
const haloPortal = new THREE.Sprite(spriteMaterial);
haloPortal.scale.set(18, 28, 1);
haloPortal.position.set(0, 0, 1);
grupoPortal.add(haloPortal);

const ALTURA_HAZ = 35;
const hazCoreGeometria = new THREE.CylinderGeometry(0.25, 0.45, ALTURA_HAZ, 16);
hazCoreGeometria.translate(0, ALTURA_HAZ / 2, 0);

const hazCoreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.98
});
const hazCore = new THREE.Mesh(hazCoreGeometria, hazCoreMaterial);
hazCore.rotation.x = Math.PI / 2.2;
grupoPortal.add(hazCore);

const hazAuraGeometria = new THREE.CylinderGeometry(1.4, 2.5, ALTURA_HAZ, 16);
hazAuraGeometria.translate(0, ALTURA_HAZ / 2, 0);

const hazAuraMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const hazAura = new THREE.Mesh(hazAuraGeometria, hazAuraMaterial);
hazAura.rotation.x = Math.PI / 2.2;
grupoPortal.add(hazAura);

// ============================================================
// CARGA DE EDIFICIOS
// ============================================================
const materialNegroTron = new THREE.MeshStandardMaterial({
    color: 0x050810,
    metalness: 0.85,
    roughness: 0.25
});

const materialSecundarioTron = new THREE.MeshStandardMaterial({
    color: 0x121824,
    metalness: 0.7,
    roughness: 0.4
});

const materialNeonAzul = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00e5ff,
    emissiveIntensity: 2.8
});

const contenedorCiudad = new THREE.Group();
scene.add(contenedorCiudad);

const RUTA_EDIFICIOS = new URL('./spaceinvaders/edificios.glb', import.meta.url).href;

loader.load(
    RUTA_EDIFICIOS,
    (gltf) => {
        const ciudad = gltf.scene;

        function clasificarMaterial(mat) {
            if (!mat || !mat.name) return materialNegroTron;
            const nombre = mat.name.toLowerCase();

            const esNeonReal =
                nombre.includes('accent') ||
                nombre.includes('glow') ||
                nombre.includes('neon') ||
                nombre.includes('window') ||
                nombre.includes('vent') ||
                nombre.includes('emission') ||
                nombre.includes('emissive');

            const esAzulClaro =
                nombre.includes('lightblue') ||
                nombre.includes('light blue') ||
                nombre.includes('blue');

            if (esNeonReal) {
                return materialNeonAzul;
            } else if (esAzulClaro) {
                return materialSecundarioTron;
            } else {
                return materialNegroTron;
            }
        }

        ciudad.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(clasificarMaterial);
                } else {
                    child.material = clasificarMaterial(child.material);
                }
            }
        });

        const box = new THREE.Box3().setFromObject(ciudad);
        const center = box.getCenter(new THREE.Vector3());
        ciudad.position.x -= center.x;
        ciudad.position.y -= center.y;
        ciudad.position.z -= center.z;

        contenedorCiudad.add(ciudad);
        contenedorCiudad.scale.set(0.25, 0.25, 0.25);
        contenedorCiudad.position.set(0, 10.5, -1);
        contenedorCiudad.rotation.x = 55;
        contenedorCiudad.rotation.y = -1.55;
        contenedorCiudad.rotation.z = -3.1;
    },
    undefined,
    (error) => console.error('Error al cargar edificios:', error)
);

// ============================================================
// 18. BUCLE PRINCIPAL
// ============================================================
const reloj = new THREE.Clock();

function animate() {
    const delta = Math.min(reloj.getDelta(), 0.05);

    if (!juegoTerminado && !juegoPausado) {
        moverNave(delta);
        moverMarcianos(delta);

        if (!juegoTerminado) {
            actualizarBalaJugador(delta);
            disparoEnemigo(delta);
            actualizarBalaEnemiga(delta);
        }
    }

    const tiempo = reloj.getElapsedTime();
    hazAura.material.opacity = 0.32 + Math.sin(tiempo * 5) * 0.08;
    haloPortal.material.opacity = 0.82 + Math.cos(tiempo * 3) * 0.12;
    ringPortal.rotation.z += 0.01;

    if (modo3D) {
        cameraPerspectiva.position.x = nave.position.x * 0.7;
        cameraPerspectiva.lookAt(nave.position.x * 0.4, 2, 0);
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);