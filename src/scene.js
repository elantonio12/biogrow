// =============================================================
//  Escena base: cámara, renderizador, luces, piso y utilidades
//  para encuadrar la cámara y ajustar la cámara de sombras.
// =============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createGrassTexture } from './textures.js';

const SKY_COLOR = 0xe8f0f5;

export function createScene(container = document.body) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, 18, 45);

  // Cámara con proyección en perspectiva
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(5, 3.5, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  // Cámara orbital (rotar, zoom, desplazar)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 2, 0);

  // Luz direccional (el "sol"). La misma dirección alimenta al shader
  // Phong propio de la planta y a la luz de Three.js del piso.
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x8a7a5a, 0.9));

  // Marcador visual del sol
  const sunMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffc94d })
  );
  scene.add(sunMarker);

  // Piso
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ color: 0xb9c99a, map: createGrassTexture(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const soil = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 32),
    new THREE.MeshStandardMaterial({ color: 0x6b5139, roughness: 1 })
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.002;
  soil.receiveShadow = true;
  scene.add(soil);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, sun, sunMarker, ground, soil };
}

// Coloca la cámara para que la caja `box` quepa completa en pantalla
export function frameCamera({ camera, controls, scene }, box) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5 + 0.5;
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
  controls.target.copy(center);
  const dir = new THREE.Vector3(0.55, 0.3, 0.78).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = dist / 100;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  scene.fog.near = dist * 1.5;
  scene.fog.far = dist * 5;
}

// Ajusta el volumen ortográfico de la cámara de sombras a la planta
// y coloca el sol (y su marcador) en la dirección `lightDir`.
export function fitShadowCamera({ sun, sunMarker }, box, lightDir) {
  const center = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).length() * 0.5 + 1;
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(lightDir, r * 2);
  const cam = sun.shadow.camera;
  cam.left = -r * 1.6; cam.right = r * 1.6; cam.top = r * 1.6; cam.bottom = -r * 1.6;
  cam.near = 0.1; cam.far = r * 5;
  cam.updateProjectionMatrix();
  sunMarker.position.copy(center).addScaledVector(lightDir, r * 1.3);
  sunMarker.scale.setScalar(r * 0.06);
}
