// =============================================================
//  Texturas procedurales (texturizado, Unidad II).
//  Se dibujan con Canvas 2D al iniciar: no se descarga ninguna
//  imagen, así que no hay recursos de terceros que atribuir.
//  Son texturas en escala de grises: el color final sale de
//  multiplicarlas por el color de cada rama o del piso.
// =============================================================
import * as THREE from 'three';
import { makeRng } from './lsystem.js';

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, repeat = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Corteza: vetas verticales irregulares, más oscuras y más claras que la base
export function createBarkTexture() {
  const rng = makeRng(7);
  const W = 64;
  const H = 256;
  const { canvas, ctx } = createCanvas(W, H);
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 70; i++) {
    let x = rng() * W;
    const g = rng() < 0.65 ? 55 + rng() * 60 : 245 + rng() * 10;
    ctx.strokeStyle = `rgba(${g}, ${g}, ${g}, ${0.35 + rng() * 0.4})`;
    ctx.lineWidth = 1 + rng() * 2.5;
    // Una veta es una línea vertical que se desvía un poco en cada tramo
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= H; y += 16) {
      x += (rng() - 0.5) * 3;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(canvas);
}

// Pasto: miles de trazos cortos de distinto brillo
export function createGrassTexture(repeat = 24) {
  const rng = makeRng(3);
  const S = 256;
  const { canvas, ctx } = createCanvas(S, S);
  ctx.fillStyle = '#d9d9d9';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) {
    const g = 150 + rng() * 105;
    ctx.fillStyle = `rgba(${g}, ${g}, ${g}, 0.6)`;
    ctx.fillRect(rng() * S, rng() * S, 1 + rng() * 1.5, 2 + rng() * 4);
  }
  return toTexture(canvas, repeat);
}
