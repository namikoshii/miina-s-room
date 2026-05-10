import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// --- POST-PROCESSING ---
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- 0. SISTEMA DE AUDIO (SMART AUTOPLAY) ---
const musicUI = document.createElement('div');
musicUI.innerHTML = `
    <div id="music-btn" style="position:fixed; bottom:20px; right:20px; z-index:2000; cursor:pointer; background:rgba(255,255,255,0.1); padding:12px 24px; border-radius:30px; color:white; font-family:'Comfortaa'; border:1px solid white; backdrop-filter:blur(10px);">
        ♫ MUSIC OFF
    </div>
    <div id="player"></div>
`;
document.body.appendChild(musicUI);

let player;
let audioStarted = false;

window.onYouTubeIframeAPIReady = function() {
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
    e.stopPropagation(); // Evita que el clic dispare el Raycaster
    if (player.getPlayerState() === 1) {
        player.pauseVideo();
        document.getElementById('music-btn').innerText = "♫ MUSIC OFF";
    } else {
        player.playVideo();
        document.getElementById('music-btn').innerText = "❙❙ MUSIC ON";
    }
});

// Cargar API YouTube
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

// --- 1. ESCENA Y CÁMARA ---
const scene = new THREE.Scene();
const sceneCSS = new THREE.Scene();
scene.background = new THREE.Color(0xffc4c4);

const aspect = window.innerWidth / window.innerHeight;
const d = 3; 
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
let currentRoomCenter = new THREE.Vector3(0, 0, 0);

// --- 2. RENDERIZADORES ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const rendererCSS = new CSS3DRenderer();
rendererCSS.setSize(window.innerWidth, window.innerHeight);
rendererCSS.domElement.style.position = 'absolute';
rendererCSS.domElement.style.top = '0';
rendererCSS.domElement.style.zIndex = '10';
rendererCSS.domElement.style.pointerEvents = 'none'; // CRUCIAL para que no bloquee el Raycaster
document.body.appendChild(rendererCSS.domElement);

// --- 3. POST-PROCESADO ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 10.0;
outlinePass.edgeThickness = 1.5;
outlinePass.visibleEdgeColor.set('#ffffff');
composer.addPass(outlinePass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.15, 0.15, 0.15);
composer.addPass(bloomPass);

const effectRGB = new ShaderPass(RGBShiftShader);
effectRGB.uniforms['amount'].value = 0.0005; 
composer.addPass(effectRGB);
composer.addPass(new OutputPass());

// --- 4. LUCES Y MODELO ---
scene.add(new THREE.AmbientLight(0xfff7f7, 2));
const lampLight = new THREE.PointLight(0xffbfb8, 0, 15);
scene.add(lampLight);

let isFocused = false;
let objectsToIntersect = [];
let monitorRotation = new THREE.Quaternion();
const webUrl = 'https://namikoshii.github.io/miinas-portfolio/';

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
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), material);
    mesh.visible = false;
    return mesh;
}

const loader = new GLTFLoader();
loader.load('./models/Room.glb', (gltf) => {
    const room = gltf.scene;
    scene.add(room);
    const box = new THREE.Box3().setFromObject(room);
    box.getCenter(currentRoomCenter);
    resetCamera();

    room.traverse((node) => {
        if (node.isMesh) {
            if (node.name.includes('Dell_Monitor_mesh')) {
                node.visible = false; 
                createIframe(node);
                node.getWorldQuaternion(monitorRotation);
            } else {
                objectsToIntersect.push(node);
                if (node.name.includes('Dell_Monitor')) {
                    const label = createTextLabel("VER PORTFOLIO");
                    label.quaternion.copy(monitorRotation);
                    const worldPos = new THREE.Vector3();
                    node.getWorldPosition(worldPos);
                    label.position.set(worldPos.x, worldPos.y + 0.8, worldPos.z + 0.1);
                    scene.add(label);
                    node.userData.label = label;
                }
                if (node.name.includes('Cylinder011_1')) {
                    const label = createTextLabel("LÁMPARA");
                    label.quaternion.copy(monitorRotation);
                    const worldPos = new THREE.Vector3();
                    node.getWorldPosition(worldPos);
                    label.position.set(worldPos.x, worldPos.y + 0.7, worldPos.z);
                    scene.add(label);
                    node.userData.label = label;
                    lampLight.position.copy(worldPos).add(new THREE.Vector3(0, 0.5, 0));
                }
            }
        }
    });
});

function createIframe(mesh) {
    const div = document.createElement('div');
    div.style.width = '1280px'; div.style.height = '720px';
    const iframe = document.createElement('iframe');
    iframe.src = webUrl;
    iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = '0';
    div.appendChild(iframe);
    const cssObj = new CSS3DObject(div);
    mesh.getWorldPosition(cssObj.position);
    mesh.getWorldQuaternion(cssObj.quaternion);
    cssObj.scale.set(0.00085, 0.001, 1); 
    cssObj.translateY(0.05); cssObj.translateZ(0.05); 
    sceneCSS.add(cssObj);
}

// --- 5. INTERACCIÓN (MEJORADA) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Escuchamos en el RENDERER de WebGL para máxima precisión
renderer.domElement.addEventListener('mousemove', (event) => {
    objectsToIntersect.forEach(obj => { if (obj.userData.label) obj.userData.label.visible = false; });
    if (isFocused) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);
    
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.name.includes('Dell_Monitor') || obj.name.includes('Cylinder011_1')) {
            outlinePass.selectedObjects = [obj];
            document.body.style.cursor = 'pointer';
            if (obj.userData.label) obj.userData.label.visible = true;
        }
    } else {
        outlinePass.selectedObjects = [];
        document.body.style.cursor = 'default';
    }
});

// Clic unificado para Audio + Interacción
window.addEventListener('mousedown', (event) => {
    startAudioContext(); // Activa música al primer clic en cualquier sitio

    if (isFocused && event.target.tagName !== 'IFRAME') {
        resetCamera();
        return;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);

    if (intersects.length > 0) {
        const clicked = intersects[0].object;
        if (clicked.name.includes('Cylinder011_1')) {
            lampLight.intensity = lampLight.intensity === 0 ? 10 : 0;
        } else if (clicked.name.includes('Dell_Monitor')) {
            if (!isFocused) focusMonitor(clicked);
        }
    }
});

function focusMonitor(mesh) {
    isFocused = true;
    outlinePass.selectedObjects = [];
    rendererCSS.domElement.style.pointerEvents = 'auto'; // Permitir tocar el portfolio
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
    rendererCSS.domElement.style.pointerEvents = 'none'; // Bloquear portfolio para poder rotar
    camera.position.set(currentRoomCenter.x - 20, currentRoomCenter.y + 20, currentRoomCenter.z + 20);
    camera.lookAt(currentRoomCenter);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    composer.render(); 
    rendererCSS.render(sceneCSS, camera);
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