import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { expand, makeRng, rulesToText } from './lsystem.js';
import { interpret } from './turtle.js';
import { Plant } from './plant.js';
import { SPECIES } from './species.js';
import { createLightUniforms, LIGHT_MODELS } from './lighting.js';

// ---------------------------------------------------------------
// Escena, cámara y renderizador
// ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8f0f5);
scene.fog = new THREE.Fog(0xe8f0f5, 18, 45);

// Cámara con proyección en perspectiva
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(5, 3.5, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// Cámara orbital (rotar, zoom, desplazar)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2, 0);

// ---------------------------------------------------------------
// Luz direccional (el "sol"). La misma dirección alimenta al shader
// Phong propio de la planta y a la luz de Three.js del piso.
// ---------------------------------------------------------------
const uniforms = createLightUniforms();
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
  new THREE.MeshStandardMaterial({ color: 0xb9c99a, roughness: 1 })
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

// ---------------------------------------------------------------
// Parámetros (panel interactivo)
// ---------------------------------------------------------------
const firstSpecies = Object.keys(SPECIES)[0];
const params = {
  species: firstSpecies,
  // Sistema-L
  iterations: 4,
  angle: 25,
  branchProb: 1,
  jitter: 4,
  tropism: 0,
  seed: 1,
  // Geometría
  length: 4,
  normalize: true,
  shrink: 0.85,
  radius: 0.09,
  taper: 0.42,
  showLeaves: true,
  leafSize: 0.22,
  // Animación
  playing: true,
  duration: 12,
  progress: 0,
  // Iluminación
  model: 2,
  azimuth: 35,
  elevation: 50,
  ka: 0.35, kd: 1.0, ks: 0.25, shininess: 24,
  shadows: true,
};

function applySpeciesDefaults() {
  const sp = SPECIES[params.species];
  Object.assign(params, {
    iterations: sp.iterations, angle: sp.angle, shrink: sp.shrink, tropism: sp.tropism,
    radius: sp.radius, taper: sp.taper, leafSize: sp.leafSize,
  });
}
applySpeciesDefaults();

// ---------------------------------------------------------------
// Generación de la planta
// ---------------------------------------------------------------
let plant = null;
let growthTime = 0;   // tiempo de crecimiento en "pasos"
let lastInfo = {};

function generate({ keepProgress = true, frame = false } = {}) {
  const sp = SPECIES[params.species];
  const progress = plant ? growthTime / plant.totalTime : 0;

  let str, result;
  const t0 = performance.now();
  try {
    str = expand(sp.axiom, sp.rules, params.iterations, {
      rng: makeRng(params.seed),
      branchProb: params.branchProb,
    });
    const segLen = params.normalize
      ? params.length * Math.pow(sp.decay, params.iterations)
      : params.length * 0.25;
    result = interpret(str, {
      angle: params.angle, length: segLen, shrink: params.shrink,
      jitter: params.jitter, tropism: params.tropism, seed: params.seed,
    });
    lastInfo.segLen = segLen;
  } catch (e) {
    showError(e.message);
    return;
  }
  showError('');

  if (plant) {
    scene.remove(plant.group);
    plant.dispose();
  }
  plant = new Plant(result, {
    radius: params.radius, taper: params.taper,
    leafSize: params.leafSize, leavesPerTip: sp.leavesPerTip,
    showLeaves: params.showLeaves,
    bark: sp.bark, twig: sp.twig, leaf: sp.leaf, seed: params.seed,
  }, uniforms);
  scene.add(plant.group);

  growthTime = keepProgress ? progress * plant.totalTime : 0;
  plant.setTime(growthTime);

  fitShadowCamera();
  if (frame) frameCamera();

  lastInfo = {
    ...lastInfo,
    str, ms: performance.now() - t0,
    segments: plant.segmentCount, leaves: plant.leafCount,
  };
  updateInfo();
}

function frameCamera() {
  const size = plant.box.getSize(new THREE.Vector3());
  const center = plant.box.getCenter(new THREE.Vector3());
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

// ---------------------------------------------------------------
// Luz: azimut/elevación → vector de dirección
// ---------------------------------------------------------------
function updateLight() {
  const az = THREE.MathUtils.degToRad(params.azimuth);
  const el = THREE.MathUtils.degToRad(params.elevation);
  const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  uniforms.uLightDir.value.copy(dir);
  uniforms.uModel.value = params.model;
  uniforms.uKa.value = params.ka;
  uniforms.uKd.value = params.kd;
  uniforms.uKs.value = params.ks;
  uniforms.uShininess.value = params.shininess;
  sun.castShadow = params.shadows;
  fitShadowCamera();
}

function fitShadowCamera() {
  const box = plant ? plant.box : new THREE.Box3(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 4, 2));
  const center = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).length() * 0.5 + 1;
  const dir = uniforms.uLightDir.value;
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(dir, r * 2);
  const cam = sun.shadow.camera;
  cam.left = -r * 1.6; cam.right = r * 1.6; cam.top = r * 1.6; cam.bottom = -r * 1.6;
  cam.near = 0.1; cam.far = r * 5;
  cam.updateProjectionMatrix();
  sunMarker.position.copy(center).addScaledVector(dir, r * 1.3);
  sunMarker.scale.setScalar(r * 0.06);
}

// ---------------------------------------------------------------
// Panel de información y errores
// ---------------------------------------------------------------
const infoEl = document.getElementById('info-body');
const errorEl = document.getElementById('error');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = msg ? 'block' : 'none';
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function updateInfo() {
  const sp = SPECIES[params.species];
  const preview = lastInfo.str.length > 180 ? lastInfo.str.slice(0, 180) + '…' : lastInfo.str;
  infoEl.innerHTML = `
    <div class="row"><span>Axioma</span><code>${escapeHtml(sp.axiom)}</code></div>
    <div class="rules">${rulesToText(sp.rules).map((r) => `<code>${escapeHtml(r)}</code>`).join('')}</div>
    <div class="stats">
      <div><b>${params.iterations}</b><span>iteraciones</span></div>
      <div><b>${lastInfo.str.length.toLocaleString('es-MX')}</b><span>símbolos</span></div>
      <div><b>${lastInfo.segments.toLocaleString('es-MX')}</b><span>segmentos</span></div>
      <div><b>${lastInfo.leaves.toLocaleString('es-MX')}</b><span>hojas</span></div>
    </div>
    <details><summary>Cadena generada</summary><code class="str">${escapeHtml(preview)}</code></details>
    <div class="muted">Segmento base: ${lastInfo.segLen.toFixed(3)} · generada en ${lastInfo.ms.toFixed(0)} ms</div>
  `;
}

// ---------------------------------------------------------------
// GUI (lil-gui)
// ---------------------------------------------------------------
const gui = new GUI({ title: 'BioGrow 3D' });

// Regenerar como máximo una vez por cuadro aunque el slider dispare muchos eventos
let pending = null;
function scheduleGenerate(opts = {}) {
  pending = { ...(pending || {}), ...opts };
}

let iterCtrl;
gui.add(params, 'species', Object.keys(SPECIES)).name('Especie').onChange(() => {
  applySpeciesDefaults();
  iterCtrl.max(SPECIES[params.species].maxIterations);
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
  scheduleGenerate({ keepProgress: false, frame: true });
  params.playing = true;
});

const fL = gui.addFolder('Sistema-L');
iterCtrl = fL.add(params, 'iterations', 0, SPECIES[params.species].maxIterations, 1).name('Iteraciones')
  .onChange(() => scheduleGenerate());
fL.add(params, 'angle', 0, 90, 0.5).name('Ángulo de ramificación (°)').onChange(() => scheduleGenerate());
fL.add(params, 'branchProb', 0, 1, 0.01).name('Prob. de ramificación').onChange(() => scheduleGenerate());
fL.add(params, 'jitter', 0, 20, 0.5).name('Variación angular (°)').onChange(() => scheduleGenerate());
fL.add(params, 'tropism', -0.4, 0.4, 0.01).name('Tropismo (↑ luz / ↓ peso)').onChange(() => scheduleGenerate());
fL.add(params, 'seed', 1, 9999, 1).name('Semilla').onChange(() => scheduleGenerate());
fL.add({ random: () => { params.seed = 1 + Math.floor(Math.random() * 9999); gui.controllersRecursive().forEach((c) => c.updateDisplay()); scheduleGenerate(); } }, 'random').name('🎲 Nueva semilla');

const fG = gui.addFolder('Geometría');
fG.add(params, 'length', 0.5, 10, 0.1).name('Longitud de segmento').onChange(() => scheduleGenerate());
fG.add(params, 'normalize').name('Normalizar con iteraciones').onChange(() => scheduleGenerate({ frame: true }));
fG.add(params, 'shrink', 0.4, 1, 0.01).name('Escala de ramas hijas').onChange(() => scheduleGenerate());
fG.add(params, 'radius', 0.01, 0.3, 0.005).name('Grosor del tronco').onChange(() => scheduleGenerate());
fG.add(params, 'taper', 0, 0.8, 0.01).name('Adelgazamiento').onChange(() => scheduleGenerate());
fG.add(params, 'showLeaves').name('Mostrar hojas').onChange(() => scheduleGenerate());
fG.add(params, 'leafSize', 0.02, 0.6, 0.01).name('Tamaño de hoja').onChange(() => scheduleGenerate());
fG.add({ frame: () => frameCamera() }, 'frame').name('🎥 Encuadrar cámara');

const fA = gui.addFolder('Animación');
fA.add({ toggle: () => togglePlay() }, 'toggle').name('⏯ Reproducir / Pausar');
fA.add({ restart: () => restart() }, 'restart').name('↺ Reiniciar crecimiento');
fA.add(params, 'duration', 2, 60, 1).name('Duración (s)');
fA.add(params, 'progress', 0, 1, 0.001).name('Progreso').listen().onChange((v) => {
  params.playing = false;
  growthTime = v * plant.totalTime;
  plant.setTime(growthTime);
});

const fI = gui.addFolder('Iluminación');
fI.add(params, 'model', LIGHT_MODELS).name('Modelo').onChange(updateLight);
fI.add(params, 'azimuth', 0, 360, 1).name('Azimut del sol (°)').onChange(updateLight);
fI.add(params, 'elevation', 5, 90, 1).name('Elevación del sol (°)').onChange(updateLight);
fI.add(params, 'ka', 0, 1, 0.01).name('ka (ambiente)').onChange(updateLight);
fI.add(params, 'kd', 0, 2, 0.01).name('kd (difusa)').onChange(updateLight);
fI.add(params, 'ks', 0, 1, 0.01).name('ks (especular)').onChange(updateLight);
fI.add(params, 'shininess', 1, 128, 1).name('n (brillo)').onChange(updateLight);
fI.add(params, 'shadows').name('Sombras en el piso').onChange(updateLight);
fI.close();

function togglePlay() {
  if (!params.playing && growthTime >= plant.totalTime) growthTime = 0;
  params.playing = !params.playing;
}
function restart() {
  growthTime = 0;
  params.playing = true;
  plant.setTime(0);
}

// Teclado: R = reiniciar, Espacio = pausar
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'r' || e.key === 'R') restart();
  if (e.key === ' ') { e.preventDefault(); togglePlay(); }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------
// Ciclo de render
// ---------------------------------------------------------------
updateLight();
generate({ keepProgress: false, frame: true });
growthTime = 0;
plant.setTime(0);

const timer = new THREE.Timer();
function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.1);

  if (pending) {
    const opts = pending;
    pending = null;
    generate(opts);
  }

  if (plant && params.playing && growthTime < plant.totalTime) {
    // la planta completa crece en `duration` segundos
    growthTime = Math.min(growthTime + (dt / params.duration) * plant.totalTime, plant.totalTime);
    plant.setTime(growthTime);
    if (growthTime >= plant.totalTime) params.playing = false;
  }
  if (plant) params.progress = growthTime / plant.totalTime;

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Exponer para depuración en consola
window.biogrow = { params, gui, get plant() { return plant; }, generate };
