import GUI from 'lil-gui';
import { SPECIES } from './species.js';

// Panel de control para modificar la planta en vivo.
// `params` es el objeto de parámetros de main.js; lil-gui lo modifica directamente.
// `actions` contiene las funciones que el panel puede ejecutar.
export function createGui(params, actions) {
  const gui = new GUI({ title: 'BioGrow' });

  // Opciones del menú: { 'Nombre visible': 'clave' }
  const speciesOptions = Object.fromEntries(
    Object.entries(SPECIES).map(([key, sp]) => [sp.name, key])
  );

  const plantFolder = gui.addFolder('Sistema-L');
  plantFolder
    .add(params, 'species', speciesOptions)
    .name('Especie')
    .onChange(() => {
      actions.loadSpeciesDefaults();
      setMaxIterations(SPECIES[params.species].maxIterations);
      refresh();
      actions.regenerate();
    });

  const iterationsCtrl = plantFolder
    .add(params, 'iterations', 1, SPECIES[params.species].maxIterations, 1)
    .name('Iteraciones')
    .onFinishChange(actions.regenerate);

  plantFolder.add(params, 'angle', 5, 60, 0.5).name('Ángulo (°)').onFinishChange(actions.regenerate);
  plantFolder.add(params, 'seed', 1, 99999, 1).name('Semilla').onFinishChange(actions.regenerate);
  plantFolder.add(actions, 'newSeed').name('Nueva semilla (N)');

  const growthFolder = gui.addFolder('Crecimiento');
  growthFolder.add(params, 'growthDuration', 2, 40, 1).name('Duración (s)');
  growthFolder.add(actions, 'restartGrowth').name('Reiniciar (R)');
  growthFolder.add(actions, 'growInstantly').name('Crecer al instante');

  const sceneFolder = gui.addFolder('Iluminación');
  sceneFolder.add(params, 'shadows').name('Sombras').onChange(actions.updateLighting);
  sceneFolder.add(params, 'sunAzimuth', 0, 360, 1).name('Sol: azimut (°)').onChange(actions.updateLighting);
  sceneFolder.add(params, 'sunElevation', 5, 90, 1).name('Sol: elevación (°)').onChange(actions.updateLighting);

  // Vuelve a dibujar los valores cuando cambian desde el teclado
  function refresh() {
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  // Cada especie tiene su propio límite de iteraciones (para no saturar la GPU)
  function setMaxIterations(max) {
    iterationsCtrl.max(max);
  }

  return { gui, refresh, setMaxIterations };
}
