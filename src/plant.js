import * as THREE from 'three';
import { createBarkTextures } from './textures.js';
import { makeRng } from './lsystem.js';

const UP = new THREE.Vector3(0, 1, 0);

// Las texturas se crean una sola vez y se reutilizan entre plantas
let barkTextures = null;
function getBarkTextures() {
  if (!barkTextures) barkTextures = createBarkTextures();
  return barkTextures;
}

// Escala los segmentos para que la planta mida exactamente `targetHeight`.
// Así cualquier especie o número de iteraciones cabe en la escena.
export function fitToHeight(segments, targetHeight) {
  let maxY = 0;
  for (const s of segments) maxY = Math.max(maxY, s.start.y, s.end.y);
  if (maxY === 0) return segments;
  const k = targetHeight / maxY;
  for (const s of segments) {
    s.start.multiplyScalar(k);
    s.end.multiplyScalar(k);
  }
  return segments;
}

// Convierte la lista de segmentos en mallas 3D (ramas + hojas).
// Los segmentos deben venir ordenados en el orden en que deben crecer.
// Devuelve el grupo y una función setGrowth(t) con t en [0, 1].
export function buildPlant(segments, { radius = 0.06, taper = 0.7, leafSize = 0.15 } = {}) {
  const group = new THREE.Group();

  // --- RAMAS: un cilindro por segmento, con InstancedMesh ---
  // InstancedMesh dibuja miles de cilindros en una sola llamada a la GPU.
  const branchGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
  branchGeo.translate(0, 0.5, 0); // la base del cilindro queda en el origen
  const bark = getBarkTextures();
  const branchMat = new THREE.MeshStandardMaterial({
    map: bark.map,
    bumpMap: bark.bumpMap,
    bumpScale: 2,
    roughness: 0.95,
  });
  const branches = new THREE.InstancedMesh(branchGeo, branchMat, Math.max(segments.length, 1));

  // Datos de cada rama para poder recalcular su matriz durante el crecimiento
  const branchData = segments.map((s) => {
    const dir = new THREE.Vector3().subVectors(s.end, s.start);
    const length = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    const r = radius * Math.pow(taper, s.depth); // más delgado en ramas profundas
    return { start: s.start, quat, length, r };
  });

  const m = new THREE.Matrix4();
  const scale = new THREE.Vector3();

  // Matriz de la rama i: traslación + rotación + escala.
  // `fraction` permite dibujar una rama a medio crecer.
  const setBranchMatrix = (i, fraction = 1) => {
    const b = branchData[i];
    scale.set(b.r, b.length * fraction, b.r);
    m.compose(b.start, b.quat, scale);
    branches.setMatrixAt(i, m);
  };
  branchData.forEach((_, i) => setBranchMatrix(i));
  branches.castShadow = true;
  branches.receiveShadow = true;
  group.add(branches);

  // --- HOJAS: en la punta de cada rama (segmentos marcados como tip) ---
  const leafSegments = [];
  segments.forEach((s, i) => {
    if (s.tip) leafSegments.push(i);
  });

  const leafGeo = new THREE.SphereGeometry(1, 8, 6);
  // El color real de cada hoja viene de instanceColor (se multiplica por el blanco)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, Math.max(leafSegments.length, 1));

  const leafQuat = new THREE.Quaternion();
  const leafDir = new THREE.Vector3();
  const leafColor = new THREE.Color();
  const colorRng = makeRng(42);
  leafSegments.forEach((segIndex, i) => {
    const s = segments[segIndex];
    leafDir.subVectors(s.end, s.start).normalize();
    leafQuat.setFromUnitVectors(UP, leafDir);
    // esfera achatada: aproximación simple de una hoja
    scale.set(leafSize * 0.6, leafSize * 0.2, leafSize);
    m.compose(s.end, leafQuat, scale);
    leaves.setMatrixAt(i, m);
    // Pequeña variación de tono y brillo para que no todas las hojas sean iguales
    leafColor.setHSL(0.27 + (colorRng() - 0.5) * 0.06, 0.55, 0.32 + colorRng() * 0.12);
    leaves.setColorAt(i, leafColor);
  });
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  group.add(leaves);

  // Crecimiento: solo se dibujan las primeras `visible` instancias.
  // La rama que está creciendo se dibuja parcialmente para que el
  // crecimiento se vea continuo y no "a saltos".
  let lastGrowing = -1;
  function setGrowth(t) {
    const exact = THREE.MathUtils.clamp(t, 0, 1) * segments.length;
    const complete = Math.floor(exact);

    if (lastGrowing >= 0 && lastGrowing < segments.length) setBranchMatrix(lastGrowing, 1);
    if (complete < segments.length) {
      setBranchMatrix(complete, exact - complete);
      branches.count = complete + 1;
      lastGrowing = complete;
    } else {
      branches.count = segments.length;
      lastGrowing = -1;
    }
    branches.instanceMatrix.needsUpdate = true;

    // Una hoja aparece cuando su rama terminó de crecer
    let visibleLeaves = 0;
    while (visibleLeaves < leafSegments.length && leafSegments[visibleLeaves] < complete) {
      visibleLeaves++;
    }
    leaves.count = visibleLeaves;
  }

  function dispose() {
    branchGeo.dispose();
    branchMat.dispose();
    leafGeo.dispose();
    leafMat.dispose();
    branches.dispose();
    leaves.dispose();
  }

  return { group, branches, leaves, setGrowth, dispose };
}
