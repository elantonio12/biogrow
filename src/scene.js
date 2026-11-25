import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SKY_COLOR = 0xa9c9e2;
const SUN_DISTANCE = 10;

// Crea los elementos base de la escena: renderizador, cámara, controles,
// luces, sombras y piso. Devuelve todo en un objeto para que main.js lo use.
export function createScene(container = document.body) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  // Niebla lineal del mismo color que el cielo: el borde del piso se
  // desvanece y no se nota dónde termina
  scene.fog = new THREE.Fog(SKY_COLOR, 12, 30);

  // Cámara con proyección en perspectiva
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(3.5, 2.6, 4.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // colores menos "quemados"
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // filtrado PCF: bordes de sombra suavizados
  container.appendChild(renderer.domElement);

  // Cámara orbital: rotar, acercar y desplazar con el mouse
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.5, 0);
  controls.maxPolarAngle = Math.PI * 0.49; // no dejar que la cámara baje del piso
  controls.maxDistance = 15;

  // Luz hemisférica: color del cielo desde arriba y del pasto desde abajo.
  // Es una luz ambiental más realista que AmbientLight.
  const hemi = new THREE.HemisphereLight(SKY_COLOR, 0x3b5a2e, 1.2);
  scene.add(hemi);

  // Sol: luz direccional que proyecta sombras (shadow mapping)
  const sun = new THREE.DirectionalLight(0xfff2d6, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // Volumen ortográfico de la "cámara de sombras": solo lo que hay alrededor de la planta
  const shadowCam = sun.shadow.camera;
  shadowCam.left = -4;
  shadowCam.right = 4;
  shadowCam.top = 6;
  shadowCam.bottom = -2;
  shadowCam.near = 1;
  shadowCam.far = 25;
  sun.shadow.bias = -0.0005; // evita el "shadow acne" (rayas sobre las superficies)
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // Coloca el sol según su azimut y elevación (en grados)
  function setSunAngle(azimuth, elevation) {
    const az = THREE.MathUtils.degToRad(azimuth);
    const el = THREE.MathUtils.degToRad(elevation);
    sun.position.set(
      SUN_DISTANCE * Math.cos(el) * Math.cos(az),
      SUN_DISTANCE * Math.sin(el),
      SUN_DISTANCE * Math.cos(el) * Math.sin(az)
    );
  }

  function setShadows(enabled) {
    sun.castShadow = enabled;
  }

  // Piso
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, sun, ground, setSunAngle, setShadows };
}
