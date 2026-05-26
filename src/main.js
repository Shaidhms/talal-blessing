import { DoorScene } from './door-scene.js';
import { FrameScrubber } from './frame-scrubber.js';
import { ScrollChoreography } from './scroll-choreography.js';
import { AudioController } from './audio.js';
import { EffectsLayer } from './effects.js';
import { Balloons } from './balloons.js';

async function boot() {
  const loaderEl = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');

  // 1) Frames first
  const scrubber = new FrameScrubber({
    count: 200,
    basePath: 'assets/frames/',
    onProgress: (pct) => {
      loaderFill.style.width = `${Math.floor(pct * 100)}%`;
    },
  });

  // 2) 3D scene
  const canvas = document.getElementById('webgl');
  const scene = new DoorScene(canvas);

  // 3) Effects overlay
  const effects = new EffectsLayer(document.getElementById('effects-canvas'));

  // 4) Balloons
  const balloons = new Balloons(document.getElementById('balloons-layer'), {
    onSpawnBurst: (x, y) => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      effects.spawnBurst(x * dpr, y * dpr, 36);
    },
  });

  await scrubber.load();

  // 5) Audio
  const audio = new AudioController({
    nasheedEl: document.getElementById('nasheed'),
    toggleEl: document.getElementById('audio-toggle'),
    iconMuted: document.getElementById('icon-muted'),
    iconUnmuted: document.getElementById('icon-unmuted'),
  });

  // 6) Scroll choreography orchestrating everything
  const choreography = new ScrollChoreography({
    doorScene: scene,
    frameScrubber: scrubber,
    effects,
    balloons,
    hintEl: document.getElementById('hint'),
    nameRevealEl: document.getElementById('name-reveal'),
    arabicEl: document.getElementById('arabic'),
    englishEl: document.getElementById('english'),
    onReveal: () => audio.playCreak(),
    onFireworksStart: () => {},
    onConfetti: () => {},
  });

  // 7) Render loop
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    choreography.apply(dt);
    scene.render();
    effects.update(dt);
    effects.draw();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  setTimeout(() => loaderEl.classList.add('gone'), 250);
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  const loader = document.getElementById('loader');
  if (loader) {
    loader.innerHTML = `<div style="color:#f6e5c8;font-family:serif;padding:2rem;text-align:center"><p>Something went wrong loading the page.</p><p style="opacity:0.6;font-size:0.85rem;margin-top:1rem">${err.message || err}</p></div>`;
  }
});
