import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';



// --- POST-PROCESSING ---

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';



// --- 0. SISTEMA DE AUDIO ---

const musicUI = document.createElement('div');

musicUI.innerHTML = `

    <div id="music-btn" style="position:fixed; bottom:20px; right:20px; z-index:2000; cursor:pointer; background:rgba(255,255,255,0.2); padding:12px 24px; border-radius:30px; color:white; font-family:'Comfortaa', sans-serif; border:1px solid white; backdrop-filter:blur(10px); text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">

        ♫ MUSIC OFF

    </div>

    <div id="player"></div>

`;

document.body.appendChild(musicUI);



let player;

let audioStarted = false;



window.onYouTubeIframeAPIReady = function () {

    player = new YT.Player('player', {

        height: '0', width: '0', videoId: 'R3ttwVHBMeY',

        playerVars: { 'autoplay': 0, 'loop': 1, 'playlist': 'R3ttwVHBMeY' },

        events: { 'onReady': (e) => e.target.setVolume(40) }

    });

};



function startAudioContext() {

    if (!audioStarted && player && player.playVideo) {

        player.playVideo();

        audioStarted = true;

        document.getElementById('music-btn').innerText = "❙❙ MUSIC ON";

    }

}



document.getElementById('music-btn').addEventListener('click', (e) => {

    e.stopPropagation();

    if (player.getPlayerState() === 1) {

        player.pauseVideo();

        document.getElementById('music-btn').innerText = "♫ MUSIC OFF";

    } else {

        player.playVideo();

        document.getElementById('music-btn').innerText = "❙❙ MUSIC ON";

    }

});



const tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";

document.head.appendChild(tag);



// --- 1. ESCENA Y CÁMARA ---

const scene = new THREE.Scene();

const sceneCSS = new THREE.Scene();

scene.background = new THREE.Color(0xffc4c4); // Color de fondo rosado



const aspect = window.innerWidth / window.innerHeight;

const d = 3;

const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

let currentRoomCenter = new THREE.Vector3(0, 0, 0);



// --- 2. RENDERIZADORES ---

// WEBGL RENDERER (Para el modelo 3D)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);



// CSS3D RENDERER (Para la web/iframe)

const rendererCSS = new CSS3DRenderer();

rendererCSS.setSize(window.innerWidth, window.innerHeight);

rendererCSS.domElement.style.position = 'absolute';

rendererCSS.domElement.style.top = '0';

rendererCSS.domElement.style.zIndex = '10'; // Por encima del WebGL

rendererCSS.domElement.style.pointerEvents = 'none'; // No bloquea clics por defecto

// CORRECCIÓN CRÍTICA: Fondo transparente para el renderizador CSS

rendererCSS.domElement.style.backgroundColor = 'transparent';

document.body.appendChild(rendererCSS.domElement);



// --- 3. POST-PROCESADO ---

const composer = new EffectComposer(renderer);

composer.addPass(new RenderPass(scene, camera));



const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);

outlinePass.edgeStrength = 5.0;

outlinePass.edgeThickness = 1.0;

outlinePass.visibleEdgeColor.set('#ffffff');

composer.addPass(outlinePass);



const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.25, 0.1, 0.1);

composer.addPass(bloomPass);



const effectRGB = new ShaderPass(RGBShiftShader);

effectRGB.uniforms['amount'].value = 0.0005;

composer.addPass(effectRGB);

composer.addPass(new OutputPass());



// --- 4. LUCES ---

scene.add(new THREE.AmbientLight(0xffffff, 2.0)); // Ajustada para fondo claro

const lampLight = new THREE.PointLight(0xffe0bd, 0, 15);

scene.add(lampLight);



let isFocused = false;

let objectsToIntersect = [];

let monitorRotation = new THREE.Quaternion();

const webUrl = 'https://namikoshii.github.io/miinas-portfolio/';



// --- 5. CARGA DEL MODELO ---

const dracoLoader = new DRACOLoader();

dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');



const loader = new GLTFLoader();

loader.setDRACOLoader(dracoLoader);



loader.load('./models/Room.glb', (gltf) => {

    const room = gltf.scene;

    scene.add(room);

    const box = new THREE.Box3().setFromObject(room);

    box.getCenter(currentRoomCenter);

    resetCamera();



    room.traverse((node) => {

        if (node.isMesh) {

            const name = node.name.toLowerCase();

            const parentName = node.parent ? node.parent.name.toLowerCase() : "";



            const isMonitorFrame = name.includes('dell_monitor') && !name.includes('mesh');

            const isMonitorScreen = name.includes('dell_monitor_mesh');

            const isLamp = name.includes('lamp') || parentName.includes('lamp');



            if (isMonitorScreen) {

                node.visible = false; // La malla original es invisible para ver la web

                createIframe(node);

                node.getWorldQuaternion(monitorRotation);

            } else if (isMonitorFrame || isLamp) {

                objectsToIntersect.push(node);



                if (isMonitorFrame && !node.userData.hasLabel) {

                    const label = createTextLabel("VER PORTFOLIO");

                    label.quaternion.copy(monitorRotation);

                    const worldPos = new THREE.Vector3();

                    node.getWorldPosition(worldPos);

                    label.position.set(worldPos.x, worldPos.y + 0.8, worldPos.z + 0.2);

                    scene.add(label);

                    node.userData.label = label;

                    node.userData.hasLabel = true;

                }



                if (isLamp && !node.userData.hasLabel) {

                    const label = createTextLabel("LÁMPARA");

                    label.quaternion.copy(monitorRotation);

                    const worldPos = new THREE.Vector3();

                    node.getWorldPosition(worldPos);

                    label.position.set(worldPos.x, worldPos.y + 0.7, worldPos.z);

                    scene.add(label);

                    node.userData.label = label;

                    node.userData.hasLabel = true;

                    // Situar luz basada en la posición mundial de la pieza de la lámpara

                    lampLight.position.copy(worldPos).add(new THREE.Vector3(0, 0.2, 0));

                }

            }

        }

    });

}, undefined, (e) => console.error("Error cargando modelo:", e));



function createTextLabel(text) {

    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d');

    canvas.width = 1024; canvas.height = 256;

    context.font = 'Bold 100px Comfortaa';

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillStyle = 'white';

    context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);



    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshBasicMaterial({

        map: texture,

        transparent: true,

        side: THREE.DoubleSide,

        depthWrite: false // Evita halos transparentes extraños

    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), material);

    mesh.visible = false;

    return mesh;

}



function createIframe(mesh) {

    // Contenedor DIV con fondo transparente

    const div = document.createElement('div');

    div.style.width = '1280px'; div.style.height = '720px';

    div.style.backgroundColor = 'transparent'; // CORRECCIÓN: Fondo transparente del DIV



    // IFRAME con fondo transparente y sin bordes

    const iframe = document.createElement('iframe');

    iframe.src = webUrl;

    iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = '0';

    iframe.style.backgroundColor = 'transparent'; // CORRECCIÓN: Fondo transparente del IFRAME

    // Permitir transparencia en el iframe (antiguo pero útil)

    iframe.setAttribute('allowtransparency', 'true');



    div.appendChild(iframe);



    const cssObj = new CSS3DObject(div);

    mesh.getWorldPosition(cssObj.position);

    mesh.getWorldQuaternion(cssObj.quaternion);

    cssObj.scale.set(0.00085, 0.001, 1);

    cssObj.translateY(0.05); cssObj.translateZ(0.08);

    sceneCSS.add(cssObj);

}



// --- 6. INTERACCIÓN ---

const raycaster = new THREE.Raycaster();

const mouse = new THREE.Vector2();



renderer.domElement.addEventListener('mousemove', (event) => {

    objectsToIntersect.forEach(obj => { if (obj.userData.label) obj.userData.label.visible = false; });

    if (isFocused) return;



    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;

    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;



    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(objectsToIntersect, true);



    if (intersects.length > 0) {

        const obj = intersects[0].object;

        const name = obj.name.toLowerCase();

        const parentName = obj.parent ? obj.parent.name.toLowerCase() : "";



        if (name.includes('monitor') || name.includes('lamp') || parentName.includes('lamp')) {

            outlinePass.selectedObjects = [obj];

            document.body.style.cursor = 'pointer';

            if (obj.userData.label) obj.userData.label.visible = true;

        }

    } else {

        outlinePass.selectedObjects = [];

        document.body.style.cursor = 'default';

    }

});



window.addEventListener('mousedown', (event) => {

    startAudioContext();



    // Si estamos en zoom y clicamos fuera del iframe (en el fondo rosado)

    if (isFocused && event.target.tagName !== 'IFRAME') {

        resetCamera();

        return;

    }



    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(objectsToIntersect, true);



    if (intersects.length > 0) {

        const clicked = intersects[0].object;

        const name = clicked.name.toLowerCase();

        const parentName = clicked.parent ? clicked.parent.name.toLowerCase() : "";



        if (name.includes('lamp') || parentName.includes('lamp')) {

            lampLight.intensity = lampLight.intensity === 0 ? 12 : 0;

        } else if (name.includes('monitor')) {

            if (!isFocused) focusMonitor(clicked);

        }

    }

});



// --- 7. CONTROL CÁMARA ---

function focusMonitor(mesh) {

    isFocused = true;

    outlinePass.selectedObjects = [];

    rendererCSS.domElement.style.pointerEvents = 'auto'; // Permitir tocar la web

    const targetPos = new THREE.Vector3();

    mesh.getWorldPosition(targetPos);



    camera.zoom = 6;

    const camY = targetPos.y + 0.1;

    camera.position.set(targetPos.x, camY, targetPos.z + 15);

    camera.lookAt(targetPos.x, camY, targetPos.z);

    camera.updateProjectionMatrix();

}



function resetCamera() {

    isFocused = false;

    rendererCSS.domElement.style.pointerEvents = 'none'; // Bloquear web para poder rotar

    camera.position.set(currentRoomCenter.x - 20, currentRoomCenter.y + 20, currentRoomCenter.z + 20);

    camera.lookAt(currentRoomCenter);

    camera.zoom = 1;

    camera.updateProjectionMatrix();

}



// --- 8. LOOP ---

function animate() {

    requestAnimationFrame(animate);

    // IMPORTANTE: El orden de renderizado afecta a cómo se ven las capas

    rendererCSS.render(sceneCSS, camera); // Renderizar web primero

    composer.render(); // Renderizar 3D con post-procesado después

}

animate();



window.addEventListener('resize', () => {

    const aspect = window.innerWidth / window.innerHeight;

    camera.left = -d * aspect; camera.right = d * aspect;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    rendererCSS.setSize(window.innerWidth, window.innerHeight);

    composer.setSize(window.innerWidth, window.innerHeight);

});
