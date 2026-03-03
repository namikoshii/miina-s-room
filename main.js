import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- A. ESCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// --- B. CÁMARA ---
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 8, 5);
camera.lookAt(0, 0, 0);

// --- C. RENDERER ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- D. LUCES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- E. OBJETO 3D ---
let objects = [];
const loader = new GLTFLoader();

loader.load(
    './models/Room.glb',
    (gltf) => {
        const obj1 = gltf.scene;
        obj1.position.set(0, 0, 0);
        obj1.scale.set(1, 1, 1);
        obj1.name = "Dell Monitor mesh";
        scene.add(obj1);
        objects.push(obj1);
    },
    undefined,
    (error) => console.error('Error cargando GLB', error)
);

// --- F. CONTROLES ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = false; // 🔒 desactiva la rotación
controls.minDistance = 3;
controls.maxDistance = 15;

// --- G. RAYCASTER ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetPosition = null;
let targetLookAt = null;
const camSpeed = 0.05;
let cameraLocked = false;

window.addEventListener('click', (event) => {
    if (cameraLocked) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(objects, true);
    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;
        while (clickedObject && !clickedObject.name && clickedObject.parent) {
            clickedObject = clickedObject.parent;
        }
        if (!clickedObject) return;

        console.log(`¡Has pulsado ${clickedObject.name}!`);

        if (clickedObject.name === "Dell Monitor mesh") {
            targetPosition = new THREE.Vector3(
                clickedObject.position.x,
                clickedObject.position.y + 2,
                clickedObject.position.z + 2
            );
            targetLookAt = clickedObject.position.clone();
        }
    }
});

// --- H. ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);

    if (targetPosition && targetLookAt) {
        camera.position.lerp(targetPosition, camSpeed);
        camera.lookAt(targetLookAt);

        if (camera.position.distanceTo(targetPosition) < 0.01) {
            camera.position.copy(targetPosition);
            camera.lookAt(targetLookAt);
            controls.enabled = false;
            cameraLocked = true;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- I. RESIZE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
