// Procedural ornate Islamic / geometric textures, generated to canvas, used as three.js textures.
import * as THREE from 'three';

// ---------- Ornate arabesque pattern (used for veil + side motifs) ----------
export function makeOrnateArchTexture(size = 256) {
  const cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext('2d');

  // Dark base
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(0, 0, size, size);

  // 8-fold star + arabesque pattern
  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = '#e8c060';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Outer ring of dots
  ctx.fillStyle = '#f3d27a';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = cx + Math.cos(a) * size * 0.42;
    const y = cy + Math.sin(a) * size * 0.42;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8-pointed star
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 === 0) ? size * 0.28 : size * 0.14;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = '#f3d27a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner small star
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 === 0) ? size * 0.10 : size * 0.05;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#d4a857';
  ctx.fill();

  // Arabesque flourishes — curves from center
  ctx.strokeStyle = '#c89040';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r1 = size * 0.18;
    const r2 = size * 0.36;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.15) * r2 * 0.8,
      cy + Math.sin(a + 0.15) * r2 * 0.8,
      cx + Math.cos(a + 0.3) * r2,
      cy + Math.sin(a + 0.3) * r2
    );
    ctx.stroke();
  }

  // Edge border
  ctx.strokeStyle = '#e8c060';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  // Inner border
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, size - 24, size - 24);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- Gold filigree pattern (for arch frame ring) ----------
export function makeGoldFiligreePattern(size = 512) {
  const cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext('2d');

  // Transparent base
  ctx.clearRect(0, 0, size, size);

  // Gold base
  ctx.fillStyle = '#c89040';
  ctx.fillRect(0, 0, size, size);

  // Subtle horizontal grain (gold leaf shimmer)
  for (let y = 0; y < size; y += 2) {
    const a = 0.05 + Math.sin(y * 0.1) * 0.05;
    ctx.fillStyle = `rgba(255,220,140,${a})`;
    ctx.fillRect(0, y, size, 1);
  }

  // Vine/leaf scrollwork
  ctx.strokeStyle = '#7a4a14';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const x = (i + 0.5) * size / 8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + 30, size * 0.3,
      x - 30, size * 0.7,
      x, size
    );
    ctx.stroke();
    // Small leaves
    for (let j = 0; j < 4; j++) {
      const ty = j * size / 4 + size / 8;
      const tx = x + Math.sin(j) * 15;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 6, 3, j * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#a86820';
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- Updatable canvas texture (for frame plane) ----------
export function makeUpdatableCanvasTexture(width = 1024, height = 1024) {
  const cvs = document.createElement('canvas');
  cvs.width = width; cvs.height = height;
  const ctx = cvs.getContext('2d');
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5);
  grad.addColorStop(0, '#ffeac4');
  grad.addColorStop(1, '#3a1f0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { texture: tex, canvas: cvs, ctx };
}
