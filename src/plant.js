// =============================================================
//  Modelado 3D de la planta (Unidad II) + animación de crecimiento
//  (Unidad III, tema 3.3).
//
//  Ramas: un cilindro por segmento (InstancedMesh → una sola llamada
//  de dibujo para miles de cilindros).  Hojas: plano con forma de hoja.
//
//  Matriz de cada rama:  M_segmento · S(r·g, l·g, r·g)
//  donde g ∈ [0,1] es el factor de crecimiento interpolado en el tiempo.
// =============================================================
import * as THREE from 'three';
import { makeRng } from './lsystem.js';
import { createPhongMaterial, createWindDepthMaterial } from './lighting.js';
import { createBarkTexture } from './textures.js';

// La textura de corteza se crea una sola vez y la comparten todas las plantas
let barkTexture = null;

// Interpolación suave (ease-in-out)
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.45, 0.35, 0, 1);
  s.quadraticCurveTo(-0.45, 0.35, 0, 0);
  return new THREE.ShapeGeometry(s, 8); // plano XY, apunta a +Y, normal +Z
}

export class Plant {
  constructor({ segments, leaves: explicitLeaves }, opts, uniforms) {
    const {
      radius = 0.06, taper = 0.4, minRadius = 0.004,
      leafSize = 0.2, leavesPerTip = 1, showLeaves = true,
      bark = 0x6d4c2f, twig = 0x8a6a3f, leaf = 0x4caf50, seed = 1,
    } = opts;
    const rng = makeRng(seed * 31 + 7);

    this.group = new THREE.Group();
    this.segmentCount = segments.length;

    const maxDepth = segments.reduce((m, s) => Math.max(m, s.depth), 0);
    const rootTips = segments.reduce((m, s) => Math.max(m, s.tips), 1);
    let maxBirth = 0;

    // ---------- RAMAS ----------
    const n = Math.max(segments.length, 1);
    const branchGeo = new THREE.CylinderGeometry(0.85, 1, 1, 7);
    branchGeo.translate(0, 0.5, 0); // la base del cilindro queda en el origen
    barkTexture ??= createBarkTexture();
    // repetición (3, 1): la corteza da 3 vueltas alrededor del cilindro
    this.branchMat = createPhongMaterial(uniforms, { map: barkTexture, mapRepeat: [3, 1] });
    this.branches = new THREE.InstancedMesh(branchGeo, this.branchMat, n);
    this.branches.frustumCulled = false;
    this.branches.castShadow = true;
    this.branches.customDepthMaterial = createWindDepthMaterial(uniforms, 0);

    this.bBase = new Float32Array(n * 16); // matrices M de cada segmento
    this.bScale = new Float32Array(n * 2); // (radio, longitud)
    this.bBirth = new Float32Array(n);
    const cBark = new THREE.Color(bark), cTwig = new THREE.Color(twig), col = new THREE.Color();

    segments.forEach((s, i) => {
      s.matrix.toArray(this.bBase, i * 16);
      // Modelo de tubería (Leonardo / pipe model): r ∝ (puntas que sostiene)^taper
      this.bScale[i * 2] = Math.max(radius * Math.pow(s.tips / rootTips, taper), minRadius);
      this.bScale[i * 2 + 1] = s.len;
      this.bBirth[i] = s.birth;
      maxBirth = Math.max(maxBirth, s.birth + 1);
      col.copy(cBark).lerp(cTwig, 1 - Math.pow(s.tips / rootTips, 0.3));
      this.branches.setColorAt(i, col);
    });
    if (segments.length === 0) this.branches.count = 0;
    this.group.add(this.branches);

    // ---------- HOJAS ----------
    // Puntas de rama (tip) o símbolo L explícito de la gramática.
    const leafList = [];
    const T = new THREE.Matrix4(), Ry = new THREE.Matrix4(), Rx = new THREE.Matrix4();
    const addLeaf = (base, birth) => {
      const m = base.clone()
        .multiply(Ry.makeRotationY(rng() * Math.PI * 2))        // giro alrededor de la rama
        .multiply(Rx.makeRotationX(0.6 + rng() * 0.5));          // separación de la rama
      leafList.push({ m, birth, size: leafSize * (0.75 + rng() * 0.5) });
    };
    if (showLeaves) {
      for (const l of explicitLeaves) addLeaf(l.matrix, l.birth);
      if (leavesPerTip > 0) {
        for (const s of segments) {
          if (!s.tip) continue;
          const end = s.matrix.clone().multiply(T.makeTranslation(0, s.len, 0));
          for (let k = 0; k < leavesPerTip; k++) addLeaf(end, s.birth + 1);
        }
      }
    }

    const ln = Math.max(leafList.length, 1);
    this.leafMat = createPhongMaterial(uniforms, { side: THREE.DoubleSide, flutter: 1 });
    this.leaves = new THREE.InstancedMesh(leafGeometry(), this.leafMat, ln);
    this.leaves.frustumCulled = false;
    this.leaves.castShadow = true;
    this.leaves.customDepthMaterial = createWindDepthMaterial(uniforms, 1);
    this.lBase = new Float32Array(ln * 16);
    this.lSize = new Float32Array(ln);
    this.lBirth = new Float32Array(ln);
    const cLeaf = new THREE.Color(leaf), hsl = {};
    cLeaf.getHSL(hsl);
    leafList.forEach((l, i) => {
      l.m.toArray(this.lBase, i * 16);
      this.lSize[i] = l.size;
      this.lBirth[i] = l.birth + rng() * 0.8;
      maxBirth = Math.max(maxBirth, this.lBirth[i] + 1);
      col.setHSL(hsl.h + (rng() - 0.5) * 0.05, hsl.s, hsl.l * (0.8 + rng() * 0.4));
      this.leaves.setColorAt(i, col);
    });
    this.leafCount = leafList.length;
    this.leaves.count = leafList.length;
    this.group.add(this.leaves);

    this.totalTime = Math.max(maxBirth, 1); // en "pasos" de crecimiento

    // Caja envolvente de la planta completa (para cámara y sombras)
    this.box = new THREE.Box3();
    const p = new THREE.Vector3(), M = new THREE.Matrix4();
    segments.forEach((s) => {
      this.box.expandByPoint(p.setFromMatrixPosition(s.matrix));
      M.copy(s.matrix).multiply(T.makeTranslation(0, s.len, 0));
      this.box.expandByPoint(p.setFromMatrixPosition(M));
    });
    if (this.box.isEmpty()) this.box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
    this.box.expandByScalar(leafSize);

    this.setTime(this.totalTime);
  }

  // t ∈ [0, totalTime]. Cada segmento crece entre birth y birth+1.
  // Se escribe directamente M·S en el buffer: multiplicar por una matriz
  // de escala diagonal equivale a escalar las columnas 0, 1 y 2 de M.
  setTime(t) {
    const b = this.branches.instanceMatrix.array;
    for (let i = 0; i < this.segmentCount; i++) {
      const g = smooth(t - this.bBirth[i]);
      const r = this.bScale[i * 2] * (0.25 + 0.75 * g) * (g > 0 ? 1 : 0);
      const l = this.bScale[i * 2 + 1] * g;
      writeScaled(b, this.bBase, i * 16, r, l, r);
    }
    this.branches.instanceMatrix.needsUpdate = true;

    const a = this.leaves.instanceMatrix.array;
    for (let i = 0; i < this.leafCount; i++) {
      const s = this.lSize[i] * smooth(t - this.lBirth[i]);
      writeScaled(a, this.lBase, i * 16, s, s, s);
    }
    this.leaves.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.branches.geometry.dispose();
    this.leaves.geometry.dispose();
    this.branchMat.dispose();
    this.leafMat.dispose();
    this.branches.customDepthMaterial.dispose();
    this.leaves.customDepthMaterial.dispose();
    this.branches.dispose();
    this.leaves.dispose();
  }
}

function writeScaled(dst, src, o, sx, sy, sz) {
  dst[o] = src[o] * sx;           dst[o + 1] = src[o + 1] * sx;   dst[o + 2] = src[o + 2] * sx;   dst[o + 3] = src[o + 3];
  dst[o + 4] = src[o + 4] * sy;   dst[o + 5] = src[o + 5] * sy;   dst[o + 6] = src[o + 6] * sy;   dst[o + 7] = src[o + 7];
  dst[o + 8] = src[o + 8] * sz;   dst[o + 9] = src[o + 9] * sz;   dst[o + 10] = src[o + 10] * sz; dst[o + 11] = src[o + 11];
  dst[o + 12] = src[o + 12];      dst[o + 13] = src[o + 13];      dst[o + 14] = src[o + 14];      dst[o + 15] = src[o + 15];
}
