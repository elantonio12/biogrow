import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Crea los elementos base de la escena: renderizador, cámara, controles,
// luces y piso. Devuelve todo en un objeto para que main.js lo use.
export function createScene(container = document.body) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);

  // Cámara con proyección en perspectiva
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(4, 3, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Cámara orbital: rotar, acercar y desplazar con el mouse
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.5, 0);
  controls.maxPolarAngle = Math.PI * 0.49; // no dejar que la cámara baje del piso

  // Luces: una direccional (sol) y una ambiental de relleno
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

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, sun, ground };
}
