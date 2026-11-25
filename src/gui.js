// =============================================================
//  Panel de parámetros (lil-gui). Modifica directamente `params`
//  y llama a las acciones de main.js cuando algo cambia.
// =============================================================
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { SPECIES } from './species.js';
import { LIGHT_MODELS } from './lighting.js';

// actions: { changeSpecies, regenerate(opts), newSeed, frame,
//            togglePlay, restart, setProgress(v), updateLight }
export function createGui(params, actions) {
  const gui = new GUI({ title: 'BioGrow 3D' });
  const regen = () => actions.regenerate();

  gui.add(params, 'species', Object.keys(SPECIES)).name('Especie').onChange(actions.changeSpecies);

  const fL = gui.addFolder('Sistema-L');
  const iterCtrl = fL.add(params, 'iterations', 0, SPECIES[params.species].maxIterations, 1)
    .name('Iteraciones').onChange(regen);
  fL.add(params, 'angle', 0, 90, 0.5).name('Ángulo de ramificación (°)').onChange(regen);
  fL.add(params, 'branchProb', 0, 1, 0.01).name('Prob. de ramificación').onChange(regen);
  fL.add(params, 'jitter', 0, 20, 0.5).name('Variación angular (°)').onChange(regen);
  fL.add(params, 'tropism', -0.4, 0.4, 0.01).name('Tropismo (↑ luz / ↓ peso)').onChange(regen);
  fL.add(params, 'seed', 1, 9999, 1).name('Semilla').onChange(regen);
  fL.add(actions, 'newSeed').name('🎲 Nueva semilla');

  const fG = gui.addFolder('Geometría');
  fG.add(params, 'length', 0.5, 10, 0.1).name('Longitud de segmento').onChange(regen);
  fG.add(params, 'normalize').name('Normalizar con iteraciones')
    .onChange(() => actions.regenerate({ frame: true }));
  fG.add(params, 'shrink', 0.4, 1, 0.01).name('Escala de ramas hijas').onChange(regen);
  fG.add(params, 'radius', 0.01, 0.3, 0.005).name('Grosor del tronco').onChange(regen);
  fG.add(params, 'taper', 0, 0.8, 0.01).name('Adelgazamiento').onChange(regen);
  fG.add(params, 'showLeaves').name('Mostrar hojas').onChange(regen);
  fG.add(params, 'leafSize', 0.02, 0.6, 0.01).name('Tamaño de hoja').onChange(regen);
  fG.add(actions, 'frame').name('🎥 Encuadrar cámara');

  const fA = gui.addFolder('Animación');
  fA.add(actions, 'togglePlay').name('⏯ Reproducir / Pausar');
  fA.add(actions, 'restart').name('↺ Reiniciar crecimiento');
  fA.add(params, 'duration', 2, 60, 1).name('Duración (s)');
  fA.add(params, 'progress', 0, 1, 0.001).name('Progreso').listen().onChange(actions.setProgress);
  fA.add(params, 'wind', 0, 2, 0.01).name('Viento');
  fA.add(params, 'pollen').name('Partículas de polen');

  const fI = gui.addFolder('Iluminación');
  fI.add(params, 'model', LIGHT_MODELS).name('Modelo').onChange(actions.updateLight);
  fI.add(params, 'azimuth', 0, 360, 1).name('Azimut del sol (°)').onChange(actions.updateLight);
  fI.add(params, 'elevation', 5, 90, 1).name('Elevación del sol (°)').onChange(actions.updateLight);
  fI.add(params, 'ka', 0, 1, 0.01).name('ka (ambiente)').onChange(actions.updateLight);
  fI.add(params, 'kd', 0, 2, 0.01).name('kd (difusa)').onChange(actions.updateLight);
  fI.add(params, 'ks', 0, 1, 0.01).name('ks (especular)').onChange(actions.updateLight);
  fI.add(params, 'shininess', 1, 128, 1).name('n (brillo)').onChange(actions.updateLight);
  fI.add(params, 'shadows').name('Sombras en el piso').onChange(actions.updateLight);
  fI.close();

  // Vuelve a dibujar los valores cuando cambian por código
  function refresh() {
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  // Cada especie tiene su propio límite de iteraciones
  function setMaxIterations(max) {
    iterCtrl.max(max);
  }

  return { gui, refresh, setMaxIterations };
}
