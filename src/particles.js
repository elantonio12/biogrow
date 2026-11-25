// =============================================================
//  Sistema de partículas: polen flotando alrededor de la planta.
//  Cada partícula tiene posición y velocidad propias; en cada cuadro
//  se integra p ← p + v·dt, se suma el viento y, si sale del volumen,
//  se recicla en la parte de abajo (las partículas nunca se crean ni
//  se destruyen, solo se reutilizan).
// =============================================================
import * as THREE from 'three';
import { makeRng } from './lsystem.js';

// Sprite redondo con borde difuminado, dibujado con Canvas 2D
function createDotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Pollen {
  constructor(count = 350, seed = 5) {
    this.count = count;
    this.rng = makeRng(seed);
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.phases = new Float32Array(count);
    this.bounds = new THREE.Box3(new THREE.Vector3(-3, 0, -3), new THREE.Vector3(3, 5, 3));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xf2b705,
      size: 0.07,
      map: createDotTexture(),
      transparent: true,
      depthWrite: false,   // no tapan a otras partículas transparentes
      sizeAttenuation: true, // más pequeñas cuanto más lejos (perspectiva)
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;

    for (let i = 0; i < count; i++) this.respawn(i, true);
  }

  // Volumen en el que viven las partículas (la caja de la planta, un poco más grande)
  setBounds(box) {
    this.bounds.copy(box).expandByScalar(0.8);
    this.bounds.min.y = Math.max(this.bounds.min.y, 0);
    // tamaño de cada punto proporcional al tamaño de la planta
    this.points.material.size = this.bounds.getSize(new THREE.Vector3()).y * 0.012;
    for (let i = 0; i < this.count; i++) this.respawn(i, true);
  }

  // anywhere = true: en cualquier altura; si no, desde la parte de abajo
  respawn(i, anywhere = false) {
    const { min, max } = this.bounds;
    const r = this.rng;
    const p = this.positions;
    p[i * 3] = min.x + r() * (max.x - min.x);
    p[i * 3 + 1] = anywhere ? min.y + r() * (max.y - min.y) : min.y;
    p[i * 3 + 2] = min.z + r() * (max.z - min.z);
    this.velocities[i * 3] = (r() - 0.5) * 0.1;
    this.velocities[i * 3 + 1] = 0.05 + r() * 0.15; // suben lentamente
    this.velocities[i * 3 + 2] = (r() - 0.5) * 0.1;
    this.phases[i] = r() * Math.PI * 2;
  }

  update(dt, time, wind) {
    const p = this.positions;
    const v = this.velocities;
    const { min, max } = this.bounds;
    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      // integración de Euler + oscilación propia + empuje del viento en X
      p[k] += (v[k] + wind * 0.3 + Math.sin(time * 0.8 + this.phases[i]) * 0.1) * dt;
      p[k + 1] += v[k + 1] * dt;
      p[k + 2] += (v[k + 2] + Math.cos(time * 0.6 + this.phases[i]) * 0.1) * dt;
      if (p[k + 1] > max.y || p[k] > max.x + 1 || p[k] < min.x - 1) this.respawn(i);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
