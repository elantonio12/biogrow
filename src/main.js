import './style.css';
import { createScene } from './scene.js';
import { expand, makeRng } from './lsystem.js';
import { interpret } from './turtle.js';
import { buildPlant, fitToHeight } from './plant.js';
import { SPECIES } from './species.js';

const { scene, camera, renderer, controls } = createScene();

// Parámetros actuales de la simulación
const params = {
  species: 'arbol',
  seed: 1,
  growthDuration: 15, // segundos que tarda en crecer completa
};

let plant = null;
let startTime = performance.now();

// Genera la planta desde cero: Sistema-L → tortuga → mallas
function generatePlant() {
  const sp = SPECIES[params.species];

  const str = expand(sp.axiom, sp.rules, sp.iterations, makeRng(params.seed));
  const segments = interpret(str, { angle: sp.angle, length: 1, shrink: sp.shrink });

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

// Teclado:  R reinicia el crecimiento,  N nueva semilla,  1-4 cambia de especie
const speciesKeys = Object.keys(SPECIES);
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'r') startTime = performance.now();
  if (key === 'n') {
    params.seed = Math.floor(Math.random() * 100000);
    generatePlant();
  }
  const index = Number(e.key) - 1;
  if (index >= 0 && index < speciesKeys.length) {
    params.species = speciesKeys[index];
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
