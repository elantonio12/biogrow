// Especies predefinidas: cada una es un Sistema-L (axioma + reglas)
// con los parámetros de interpretación que mejor le quedan.
//
// Símbolos que entiende la tortuga (turtle.js):
//   F       avanzar dibujando una rama
//   + -     girar izquierda / derecha   (eje Z de la tortuga)
//   & ^     inclinar adelante / atrás   (eje X)
//   \ /     rodar sobre su propio eje   (eje Y)
//   [ ]     guardar / restaurar estado (inicio y fin de una rama)
// `shrink` es el factor de longitud de cada rama lateral respecto a su padre.
// Cualquier otro símbolo (A, S, X...) solo sirve para las reglas y no se dibuja.
//
// Las reglas pueden ser deterministas (un string) o estocásticas
// (lista de producciones con probabilidad p). Ver lsystem.js.

export const SPECIES = {
  arbusto: {
    name: 'Arbusto 3D',
    // Tres ramas por nudo, giradas 3 × 22.5° = 67.5° entre sí (filotaxis)
    axiom: 'X',
    rules: {
      X: 'F[&&X]///[&&X]///[&&X]FX',
      F: 'FF',
    },
    angle: 22.5,
    shrink: 1,
    iterations: 5,
    maxIterations: 6,
    height: 3,
    radius: 0.05,
    leafSize: 0.1,
  },

  arbol: {
    // Basado en la figura 1.25 de "The Algorithmic Beauty of Plants"
    // (Prusinkiewicz y Lindenmayer, 1990), simplificado.
    name: 'Árbol (ABOP 1.25)',
    axiom: 'FA',
    rules: {
      A: '[&FA]/////[&FA]///////[&FA]',
      F: 'S/////F',
      S: 'F',
    },
    angle: 30,
    shrink: 0.9,
    iterations: 6,
    maxIterations: 7,
    height: 3.5,
    radius: 0.09,
    leafSize: 0.12,
  },

  estocastica: {
    // Misma especie, pero cada semilla produce un individuo distinto.
    // X es un ápice (yema) que se reescribe; F → FF hace que los
    // entrenudos viejos se alarguen mientras la planta crece.
    name: 'Planta estocástica',
    axiom: 'X',
    rules: {
      X: [
        { p: 0.34, to: 'F[+X]/F[-X]X' },
        { p: 0.33, to: 'F[&X]\\F[^X]X' },
        { p: 0.33, to: 'F[+X][^X]/FX' },
      ],
      F: 'FF',
    },
    angle: 30,
    shrink: 1,
    iterations: 6,
    maxIterations: 7,
    height: 3,
    radius: 0.05,
    leafSize: 0.12,
  },

  hierba: {
    // Basado en la figura 1.24f de ABOP, con giros extra para hacerla 3D
    name: 'Planta herbácea',
    axiom: 'X',
    rules: {
      X: 'F-[[X]+X]+/F[+FX]-X',
      F: 'FF',
    },
    angle: 22.5,
    shrink: 1,
    iterations: 5,
    maxIterations: 6,
    height: 3,
    radius: 0.035,
    leafSize: 0.08,
  },
};
