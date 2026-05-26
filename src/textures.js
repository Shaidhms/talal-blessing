// Procedural wood + metal textures — generated to canvas, used as three.js textures.
import * as THREE from 'three';

function noise(x, y, seed = 0) {
  // Cheap deterministic pseudo-noise (good enough for wood grain)
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.71) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = noise(ix, iy, seed);
  const b = noise(ix + 1, iy, seed);
  const c = noise(ix, iy + 1, seed);
  const d = noise(ix + 1, iy + 1, seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

export function makeWoodTexture(width = 512, height = 1024) {
  const cvs = document.createElement('canvas');
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext('2d');

  // Base warm wood color
  const img = ctx.createImageData(width, height);
  const data = img.data;

  const plankCount = 4;
  const plankWidth = width / plankCount;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const plankIndex = Math.floor(x / plankWidth);
      const plankSeed = plankIndex * 31.7;

      // Wood grain: long vertical streaks with horizontal variation
      const grain = smoothNoise(x * 0.04, y * 0.005, plankSeed) * 0.6
                  + smoothNoise(x * 0.2, y * 0.02, plankSeed + 7) * 0.3
                  + smoothNoise(x * 0.5, y * 0.05, plankSeed + 13) * 0.1;

      // Knots: occasional dark circular spots
      let knot = 0;
      const knotY = (plankIndex * 197) % height;
      const knotX = plankIndex * plankWidth + plankWidth / 2;
      const dKnot = Math.hypot(x - knotX, y - knotY);
      if (dKnot < 25) knot = (1 - dKnot / 25) * 0.5;

      // Per-plank tint variation
      const plankTint = 0.85 + ((plankSeed * 0.31) % 1) * 0.2;

      // Final brightness
      const v = Math.max(0, Math.min(1, (0.45 + grain * 0.5 - knot) * plankTint));

      // Warm brown palette
      const r = Math.floor(120 * v + 20);
      const g = Math.floor(72 * v + 12);
      const b = Math.floor(34 * v + 6);

      // Plank separator gap (dark line between planks)
      const distFromEdge = Math.min(x % plankWidth, plankWidth - (x % plankWidth));
      const gap = distFromEdge < 2 ? 0.25 : 1;

      const i = (y * width + x) * 4;
      data[i] = Math.floor(r * gap);
      data[i + 1] = Math.floor(g * gap);
      data[i + 2] = Math.floor(b * gap);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeWoodRoughnessTexture(width = 256, height = 512) {
  const cvs = document.createElement('canvas');
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext('2d');
  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = smoothNoise(x * 0.08, y * 0.01, 11) * 0.4 + 0.55;
      const g = Math.floor(v * 255);
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// A texture canvas we can repaint as frames change — used by the frame plane behind the door.
export function makeUpdatableCanvasTexture(width = 1024, height = 1024) {
  const cvs = document.createElement('canvas');
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext('2d');
  // Initial state: warm gradient placeholder
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5);
  grad.addColorStop(0, '#ffeac4');
  grad.addColorStop(1, '#3a1f0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { texture: tex, canvas: cvs, ctx };
}
