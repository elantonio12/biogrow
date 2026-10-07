import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { expand } from './lsystem.js';
import { interpret } from './turtle.js';

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

const iterations = 3;
const str = expand('F', { F: 'F[+F][&F]F[-F][^F]F' }, iterations);
const segments = interpret(str, { angle: 25, length: 4 / 3 ** iterations });

const points = [];
for (const s of segments) points.push(s.start, s.end);

const plant = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(points),
  new THREE.LineBasicMaterial({ color: 0x8bc34a })
);
scene.add(plant);

// Ajuste al cambiar el tamaño de la ventana
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Ciclo de render
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
