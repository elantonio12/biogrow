import * as THREE from 'three';
import { makeRng } from './lsystem.js';

// Texturas procedurales: se dibujan con Canvas 2D al iniciar la aplicación.
// No se descarga ninguna imagen, así que no hay recursos de terceros que atribuir.

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, repeatX = 1, repeatY = 1, isColor = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Corteza: base café con vetas verticales irregulares.
// Se generan dos versiones: color (map) y relieve en escala de grises (bumpMap).
export function createBarkTextures() {
  const rng = makeRng(7);
  const W = 128;
  const H = 256;
  const color = createCanvas(W, H);
  const bump = createCanvas(W, H);

  color.ctx.fillStyle = '#6b4a30';
  color.ctx.fillRect(0, 0, W, H);
  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 90; i++) {
    let x = rng() * W;
    const width = 1 + rng() * 3;
    const dark = rng() < 0.6;
    const shade = dark ? 30 + rng() * 30 : 120 + rng() * 40;
    color.ctx.strokeStyle = dark
      ? `rgba(40, 25, 15, ${0.4 + rng() * 0.4})`
      : `rgba(150, 115, 80, ${0.3 + rng() * 0.3})`;
    bump.ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade})`;
    color.ctx.lineWidth = bump.ctx.lineWidth = width;

    // Una veta es una línea vertical que se desvía un poco en cada tramo
    color.ctx.beginPath();
    bump.ctx.beginPath();
    color.ctx.moveTo(x, 0);
    bump.ctx.moveTo(x, 0);
    for (let y = 0; y <= H; y += 16) {
      x += (rng() - 0.5) * 4;
      color.ctx.lineTo(x, y);
      bump.ctx.lineTo(x, y);
    }
    color.ctx.stroke();
    bump.ctx.stroke();
  }

  return {
    map: toTexture(color.canvas, 1, 1),
    bumpMap: toTexture(bump.canvas, 1, 1, false),
  };
}

// Pasto: base verde con miles de puntos de distintos tonos
export function createGrassTexture(repeat = 30) {
  const rng = makeRng(3);
  const S = 256;
  const { canvas, ctx } = createCanvas(S, S);

  ctx.fillStyle = '#4a7a3a';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 6000; i++) {
    const g = 90 + rng() * 80;
    ctx.fillStyle = `rgba(${g * 0.45}, ${g}, ${g * 0.3}, 0.5)`;
    ctx.fillRect(rng() * S, rng() * S, 1 + rng() * 2, 2 + rng() * 4);
  }
  return toTexture(canvas, repeat, repeat);
}
