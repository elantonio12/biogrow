import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

// Convierte la lista de segmentos en mallas 3D (ramas + hojas)
export function buildPlant(segments, { radius = 0.06, taper = 0.7 } = {}) {
  const group = new THREE.Group();
  if (segments.length === 0) return group;

  // --- RAMAS: un cilindro por segmento, con InstancedMesh ---
  // Por qué InstancedMesh: dibuja miles de cilindros en una sola llamada a la GPU.
  const branchGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
  branchGeo.translate(0, 0.5, 0); // la base del cilindro queda en el origen
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2f });
  const branches = new THREE.InstancedMesh(branchGeo, branchMat, segments.length);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const scale = new THREE.Vector3();

  segments.forEach((s, i) => {
    dir.subVectors(s.end, s.start);
    const length = dir.length();
    q.setFromUnitVectors(UP, dir.normalize()); // orienta el cilindro
    const r = radius * Math.pow(taper, s.depth); // más delgado en ramas profundas
    scale.set(r, length, r);
    m.compose(s.start, q, scale);                // traslación + rotación + escala
    branches.setMatrixAt(i, m);
  });
  group.add(branches);

  // --- HOJAS: en el final de las ramas más profundas ---
  const maxDepth = Math.max(...segments.map(s => s.depth));
  const tips = segments.filter(s => s.depth >= maxDepth - 1);

  const leafGeo = new THREE.SphereGeometry(1, 8, 6);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, tips.length);

  tips.forEach((s, i) => {
    dir.subVectors(s.end, s.start).normalize();
    q.setFromUnitVectors(UP, dir);
    scale.set(0.12, 0.04, 0.2);  // esfera achatada, como tu protocolo propone
    m.compose(s.end, q, scale);
    leaves.setMatrixAt(i, m);
  });
  group.add(leaves);

  return group;
}