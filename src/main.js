import './style.css';
import { createScene } from './scene.js';
import { expand } from './lsystem.js';
import { interpret } from './turtle.js';
import { buildPlant, fitToHeight } from './plant.js';

const { scene, camera, renderer, controls } = createScene();

// --- Generación de la planta ---
const iterations = 4;
const str = expand('F', { F: 'F[+F][&F]F[-F][^F]F' }, iterations);
const segments = interpret(str, { angle: 25, length: 1 });

// Ordenar por profundidad: tronco primero, ramas finas al final
segments.sort((a, b) => a.depth - b.depth);
fitToHeight(segments, 3);

const plant = buildPlant(segments);
scene.add(plant.group);

// --- Control del crecimiento ---
const growthDuration = 15; // segundos que tarda en crecer completa
let startTime = performance.now();

// Presiona R para reiniciar la animación
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') startTime = performance.now();
});

// --- Ciclo de render ---
function animate() {
  requestAnimationFrame(animate);

  const t = (performance.now() - startTime) / 1000 / growthDuration;
  plant.setGrowth(t);

  controls.update();
  renderer.render(scene, camera);
}
animate();
