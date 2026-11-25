// =============================================================
//  BioGrow 3D: punto de entrada.
//  Une los módulos: Sistema-L → tortuga → malla, y controla la
//  animación de crecimiento, la luz y el panel de parámetros.
// =============================================================
import './style.css';
import * as THREE from 'three';
import { expand, makeRng } from './lsystem.js';
import { interpret } from './turtle.js';
import { Plant } from './plant.js';
import { SPECIES } from './species.js';
import { createLightUniforms } from './lighting.js';
import { createScene, frameCamera, fitShadowCamera } from './scene.js';
import { createGui } from './gui.js';
import { showError, updateInfo } from './info.js';

const world = createScene();
const { scene, camera, renderer, controls, sun } = world;
const uniforms = createLightUniforms();

// ---------------------------------------------------------------
// Parámetros (los modifica el panel)
// ---------------------------------------------------------------
const params = {
  species: Object.keys(SPECIES)[0],
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
let growthTime = 0; // tiempo de crecimiento en "pasos"

function generate({ keepProgress = true, frame = false } = {}) {
  const sp = SPECIES[params.species];
  const progress = plant ? growthTime / plant.totalTime : 0;

  let str, result, segLen;
  const t0 = performance.now();
  try {
    str = expand(sp.axiom, sp.rules, params.iterations, {
      rng: makeRng(params.seed),
      branchProb: params.branchProb,
    });
    segLen = params.normalize
      ? params.length * Math.pow(sp.decay, params.iterations)
      : params.length * 0.25;
    result = interpret(str, {
      angle: params.angle, length: segLen, shrink: params.shrink,
      jitter: params.jitter, tropism: params.tropism, seed: params.seed,
    });
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

  fitShadowCamera(world, plant.box, uniforms.uLightDir.value);
  if (frame) frameCamera(world, plant.box);

  updateInfo(sp, {
    str, segLen, ms: performance.now() - t0, iterations: params.iterations,
    segments: plant.segmentCount, leaves: plant.leafCount,
  });
}

// Regenerar como máximo una vez por cuadro aunque el slider dispare muchos eventos
let pending = null;
function scheduleGenerate(opts = {}) {
  pending = { ...(pending || {}), ...opts };
}

// ---------------------------------------------------------------
// Luz: azimut/elevación → vector de dirección
// ---------------------------------------------------------------
function updateLight() {
  const az = THREE.MathUtils.degToRad(params.azimuth);
  const el = THREE.MathUtils.degToRad(params.elevation);
  uniforms.uLightDir.value.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  uniforms.uModel.value = params.model;
  uniforms.uKa.value = params.ka;
  uniforms.uKd.value = params.kd;
  uniforms.uKs.value = params.ks;
  uniforms.uShininess.value = params.shininess;
  sun.castShadow = params.shadows;
  const box = plant ? plant.box : new THREE.Box3(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 4, 2));
  fitShadowCamera(world, box, uniforms.uLightDir.value);
}

// ---------------------------------------------------------------
// Acciones (panel y teclado)
// ---------------------------------------------------------------
function togglePlay() {
  if (!params.playing && growthTime >= plant.totalTime) growthTime = 0;
  params.playing = !params.playing;
}

function restart() {
  growthTime = 0;
  params.playing = true;
  plant.setTime(0);
}

const ui = createGui(params, {
  changeSpecies() {
    applySpeciesDefaults();
    ui.setMaxIterations(SPECIES[params.species].maxIterations);
    ui.refresh();
    scheduleGenerate({ keepProgress: false, frame: true });
    params.playing = true;
  },
  regenerate: scheduleGenerate,
  newSeed() {
    params.seed = 1 + Math.floor(Math.random() * 9999);
    ui.refresh();
    scheduleGenerate();
  },
  frame: () => frameCamera(world, plant.box),
  togglePlay,
  restart,
  setProgress(v) {
    params.playing = false;
    growthTime = v * plant.totalTime;
    plant.setTime(growthTime);
  },
  updateLight,
});

// Teclado: R = reiniciar, Espacio = pausar
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'r' || e.key === 'R') restart();
  if (e.key === ' ') { e.preventDefault(); togglePlay(); }
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
window.biogrow = { params, get plant() { return plant; }, generate };
