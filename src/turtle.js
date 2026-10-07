import * as THREE from 'three';

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// Lee la cadena del sistema-L y devuelve una lista de segmentos:
// [{ start: Vector3, end: Vector3, depth: número }, ...]
export function interpret(str, { angle = 25, length = 1, shrink = 0.8 } = {}) {
  const rad = THREE.MathUtils.degToRad(angle);

  // Estado actual de la tortuga
  let pos = new THREE.Vector3(0, 0, 0);
  let quat = new THREE.Quaternion(); // orientación (sin rotar = apunta hacia +Y)
  let len = length;
  let depth = 0;

  const stack = [];
  const segments = [];

  // Gira la tortuga alrededor de uno de SUS propios ejes
  const turn = (axis, a) => {
    const q = new THREE.Quaternion().setFromAxisAngle(axis, a);
    quat.multiply(q);
  };

  for (const c of str) {
    switch (c) {
      case 'F': {
        const dir = AXIS_Y.clone().applyQuaternion(quat); // hacia dónde mira
        const end = pos.clone().addScaledVector(dir, len);
        segments.push({ start: pos.clone(), end: end.clone(), depth });
        pos = end;
        break;
      }
      case '+': turn(AXIS_Z,  rad); break; // girar izquierda
      case '-': turn(AXIS_Z, -rad); break; // girar derecha
      case '&': turn(AXIS_X,  rad); break; // inclinar hacia adelante
      case '^': turn(AXIS_X, -rad); break; // inclinar hacia atrás
      case '\\': turn(AXIS_Y,  rad); break; // rodar
      case '/':  turn(AXIS_Y, -rad); break;
      case '[':
        stack.push({ pos: pos.clone(), quat: quat.clone(), len, depth });
        depth += 1;
        len *= shrink; // las ramas laterales son más cortas
        break;
      case ']': {
        const s = stack.pop();
        pos = s.pos; quat = s.quat; len = s.len; depth = s.depth;
        break;
      }
    }
  }
  return segments;
}