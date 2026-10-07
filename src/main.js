import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

// Cámara (proyección en perspectiva)
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(4, 3, 6);

// Renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Cámara orbital
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

// Luces
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(5, 8, 3);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// Piso
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6, 48),
  new THREE.MeshStandardMaterial({ color: 0x2d4a2b })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Cubo de prueba (lo quitaremos después)
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x66bb6a })
);
cube.position.y = 0.5;
scene.add(cube);

// Ajuste al cambiar el tamaño de la ventana
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Ciclo de render
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
}
animate();
