import './style.css';
import { createScene } from './scene.js';
import { expand, makeRng } from './lsystem.js';
import { interpret } from './turtle.js';
import { buildPlant, fitToHeight } from './plant.js';
import { SPECIES } from './species.js';
import { createGui } from './gui.js';

const { scene, camera, renderer, controls } = createScene();

// Parámetros actuales de la simulación (el panel los modifica)
const params = {
  species: 'arbol',
  iterations: 0,
  angle: 0,
  seed: 1,
  growthDuration: 15, // segundos que tarda en crecer completa
};

let plant = null;
let startTime = performance.now();

// Copia los valores por defecto de la especie elegida a los parámetros
function loadSpeciesDefaults() {
  const sp = SPECIES[params.species];
  params.iterations = sp.iterations;
  params.angle = sp.angle;
}

// Genera la planta desde cero: Sistema-L → tortuga → mallas
function generatePlant() {
  const sp = SPECIES[params.species];

  const str = expand(sp.axiom, sp.rules, params.iterations, makeRng(params.seed));
  const segments = interpret(str, { angle: params.angle, length: 1, shrink: sp.shrink });

  // Ordenar por profundidad: tronco primero, ramas finas al final.
  // sort es estable, así que dentro de cada nivel se respeta el orden de la tortuga.
  segments.sort((a, b) => a.depth - b.depth);
  fitToHeight(segments, sp.height);

  if (plant) {
    scene.remove(plant.group);
    plant.dispose();
  }
  plant = buildPlant(segments, { radius: sp.radius, leafSize: sp.leafSize });
  scene.add(plant.group);
  startTime = performance.now();
}

// Acciones disponibles desde el panel y el teclado
const actions = {
  regenerate: generatePlant,
  loadSpeciesDefaults,
  newSeed() {
    params.seed = Math.floor(Math.random() * 99999) + 1;
    ui.refresh();
    generatePlant();
  },
  restartGrowth() {
    startTime = performance.now();
  },
  growInstantly() {
    startTime = performance.now() - params.growthDuration * 1000;
  },
};

loadSpeciesDefaults();
const ui = createGui(params, actions);

// Teclado:  R reinicia el crecimiento,  N nueva semilla,  1-4 cambia de especie
const speciesKeys = Object.keys(SPECIES);
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'r') actions.restartGrowth();
  if (key === 'n') actions.newSeed();
  const index = Number(e.key) - 1;
  if (index >= 0 && index < speciesKeys.length) {
    params.species = speciesKeys[index];
    loadSpeciesDefaults();
    ui.setMaxIterations(SPECIES[params.species].maxIterations);
    ui.refresh();
    generatePlant();
  }
});

// --- Ciclo de render ---
function animate() {
  requestAnimationFrame(animate);

  const t = (performance.now() - startTime) / 1000 / params.growthDuration;
  plant.setGrowth(t);

  controls.update();
  renderer.render(scene, camera);
}

generatePlant();
animate();
