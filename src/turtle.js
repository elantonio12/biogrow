// =============================================================
//  Interpretación gráfica tipo "tortuga" en 3D con
//  TRANSFORMACIONES JERÁRQUICAS (Unidad I).
//
//  El estado de la tortuga es una matriz 4x4 M (posición + orientación).
//  Cada símbolo multiplica M por la DERECHA, es decir, la transformación
//  se aplica en el sistema de coordenadas LOCAL de la tortuga:
//
//     F :  M ← M · T(0, l, 0)        (traslación a lo largo de su eje Y)
//     + :  M ← M · Rz(+δ)            (rotación)
//     [ :  push(M)   ]  :  M ← pop()  (jerarquía padre → hijos)
//
//  Así, cada segmento se construye a partir de la matriz del anterior:
//  M_hijo = M_padre · T · R. La malla de cada rama es después
//  M_segmento · S(r, l, r)  (escalamiento) → traslación+rotación+escala.
//  Alfabeto: ver species.js
// =============================================================
import * as THREE from 'three';
import { makeRng } from './lsystem.js';

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// Devuelve:
//  segments: [{ matrix, len, depth, birth, parent, tip, tips }]
//    parent = índice del segmento padre (-1 para la raíz)
//    tip    = true si no tiene hijos (punta de rama)
//    tips   = número de puntas que "sostiene" (para el grosor)
//  leaves:   [{ matrix, depth, birth }]        (símbolo L)
// birth = número de segmentos desde la raíz → se usa para la animación.
export function interpret(str, {
  angle = 25, length = 1, shrink = 0.8, jitter = 0, tropism = 0, seed = 1, maxSegments = 250_000,
} = {}) {
  const rad = THREE.MathUtils.degToRad(angle);
  const jit = THREE.MathUtils.degToRad(jitter);
  const rng = makeRng(seed * 7919 + 13);

  let M = new THREE.Matrix4(); // identidad: tortuga en el origen apuntando a +Y
  let len = length;
  let depth = 0;
  let path = 0;   // segmentos recorridos desde la raíz
  let cur = -1;   // último segmento dibujado (padre del siguiente)

  const R = new THREE.Matrix4();
  const T = new THREE.Matrix4();
  const head = new THREE.Vector3(), axis = new THREE.Vector3(), pos = new THREE.Vector3();

  // Tropismo: después de cada segmento la dirección se dobla hacia +Y
  // (luz) un ángulo α = e·|H × U|. Es una rotación en coordenadas del
  // MUNDO, por eso se multiplica por la izquierda alrededor de la posición.
  const applyTropism = () => {
    head.setFromMatrixColumn(M, 1).normalize();
    axis.crossVectors(head, AXIS_Y);
    const sin = axis.length();
    if (sin < 1e-5) return;
    pos.setFromMatrixPosition(M);
    M.setPosition(0, 0, 0);
    M.premultiply(R.makeRotationAxis(axis.divideScalar(sin), tropism * sin));
    M.setPosition(pos);
  };
  const stack = [];
  const segments = [];
  const leaves = [];

  // Rotación alrededor de un eje LOCAL (multiplicación por la derecha)
  const turn = (axis, a) => {
    if (jit > 0) a += (rng() * 2 - 1) * jit; // variación natural opcional
    M.multiply(R.makeRotationAxis(axis, a));
  };

  for (const c of str) {
    switch (c) {
      case 'F':
        segments.push({ matrix: M.clone(), len, depth, birth: path, parent: cur, tip: true, tips: 0 });
        if (cur >= 0) segments[cur].tip = false;
        cur = segments.length - 1;
        M.multiply(T.makeTranslation(0, len, 0));
        if (tropism !== 0) applyTropism();
        path++;
        if (segments.length > maxSegments) {
          throw new Error('Demasiados segmentos, reduce las iteraciones');
        }
        break;
      case 'f':
        M.multiply(T.makeTranslation(0, len, 0));
        path++;
        break;
      case 'L':
        leaves.push({ matrix: M.clone(), depth, birth: path });
        break;
      case '+': turn(AXIS_Z,  rad); break; // girar izquierda
      case '-': turn(AXIS_Z, -rad); break; // girar derecha
      case '&': turn(AXIS_X,  rad); break; // inclinar hacia adelante
      case '^': turn(AXIS_X, -rad); break; // inclinar hacia atrás
      case '\\': turn(AXIS_Y,  rad); break; // rodar
      case '/':  turn(AXIS_Y, -rad); break;
      case '|': M.multiply(R.makeRotationAxis(AXIS_Z, Math.PI)); break;
      case '[':
        stack.push({ M: M.clone(), len, depth, path, cur });
        depth += 1;
        len *= shrink; // las ramas laterales son más cortas
        break;
      case ']': {
        const s = stack.pop();
        M = s.M; len = s.len; depth = s.depth; path = s.path; cur = s.cur;
        break;
      }
    }
  }

  // Cada padre aparece antes que sus hijos en la lista, así que al
  // recorrerla al revés acumulamos cuántas puntas sostiene cada segmento.
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    if (s.tip) s.tips += 1;
    if (s.parent >= 0) segments[s.parent].tips += s.tips;
  }

  return { segments, leaves };
}
