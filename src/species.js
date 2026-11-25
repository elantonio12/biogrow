// =============================================================
//  "Especies": cada una es un sistema-L distinto (axioma + reglas)
//  y sus parámetros por defecto. Basadas en Prusinkiewicz &
//  Lindenmayer, "The Algorithmic Beauty of Plants" (1990).
//
//  Alfabeto de la tortuga:
//    F  avanzar dibujando un segmento      f  avanzar sin dibujar
//    +  -  girar (yaw, eje Z local)        &  ^  inclinar (pitch, eje X local)
//    \  /  rodar (roll, eje Y local)       |  dar media vuelta
//    [  ]  guardar / recuperar estado      L  hoja explícita
//  tropism: qué tanto se doblan las ramas hacia arriba en cada segmento
//    Cualquier otra letra (A, S, X...) solo sirve para la reescritura.
// =============================================================

export const SPECIES = {
  'Árbol 3D': {
    // Tronco FFF y, en cada iteración, un verticilo de 3 ramas
    // separadas por rodamientos de 4·30° = 120° (/) e inclinadas (&).
    axiom: 'FFFA',
    rules: { A: '[&FFA]////[&FFA]////[&FFA]' },
    tropism: 0.22,
    angle: 30,
    iterations: 6,
    maxIterations: 8,
    decay: 0.88,
    shrink: 0.82,
    radius: 0.14,
    taper: 0.42,
    leafSize: 0.3,
    leavesPerTip: 3,
    bark: 0x5d4030, twig: 0x8a6a3f, leaf: 0x43a047,
  },

  'Planta 3D (regla inicial)': {
    axiom: 'F',
    rules: { F: 'F[+F][&F]F[-F][^F]F' },
    tropism: 0,
    angle: 32,
    iterations: 4,
    maxIterations: 5,
    decay: 1 / 3,      // la altura se triplica por iteración → longitud / 3
    shrink: 0.9,
    radius: 0.09,
    taper: 0.42,
    leafSize: 0.16,
    leavesPerTip: 1,
    bark: 0x6d4c2f, twig: 0x8a6a3f, leaf: 0x4caf50,
  },

  'Helecho': {
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    tropism: 0,
    angle: 22.5,
    iterations: 5,
    maxIterations: 6,
    decay: 0.5,        // F → FF duplica la longitud
    shrink: 1,
    radius: 0.06,
    taper: 0.42,
    leafSize: 0.2,
    leavesPerTip: 2,
    bark: 0x55703a, twig: 0x6b8e3d, leaf: 0x2e8b3a,
  },

  'Arbusto 3D': {
    axiom: 'A',
    rules: {
      A: '[&FLA]/////[&FLA]///////[&FLA]',
      F: 'S/////F',
      S: 'FL',
    },
    tropism: 0.08,
    angle: 22.5,
    iterations: 6,
    maxIterations: 7,
    decay: 0.78,
    shrink: 1,
    radius: 0.07,
    taper: 0.42,
    leafSize: 0.2,
    leavesPerTip: 0,   // usa hojas explícitas (símbolo L)
    bark: 0x7a5233, twig: 0x8d6e3f, leaf: 0x66bb4a,
  },

  'Hierba estocástica': {
    axiom: 'F',
    rules: {
      F: [
        { p: 0.33, to: 'F[+F]//F[-F]F' },
        { p: 0.33, to: 'F[+F]//F' },
        { p: 0.34, to: 'F[-F]//F' },
      ],
    },
    tropism: 0,
    angle: 25.7,
    iterations: 5,
    maxIterations: 6,
    decay: 0.4,
    shrink: 1,
    radius: 0.04,
    taper: 0.42,
    leafSize: 0.12,
    leavesPerTip: 1,
    bark: 0x6f8f3a, twig: 0x8bc34a, leaf: 0x9ccc65,
  },
};
