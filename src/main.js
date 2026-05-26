import { DoorScene } from './door-scene.js';
import { FrameScrubber } from './frame-scrubber.js';
import { ScrollChoreography } from './scroll-choreography.js';
import { AudioController } from './audio.js';

async function boot() {
  const loaderEl = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');

  // 1) Frames first — they're the heaviest asset
  const scrubber = new FrameScrubber({
    count: 200,
    basePath: 'assets/frames/',
    onProgress: (pct) => {
      loaderFill.style.width = `${Math.floor(pct * 100)}%`;
    },
  });

  // 2) Build the 3D scene in parallel
  const canvas = document.getElementById('webgl');
  const scene = new DoorScene(canvas);

  // 3) Wait for frames
  await scrubber.load();

  // 4) Audio + scroll choreography
  const audio = new AudioController({
    nasheedEl: document.getElementById('nasheed'),
    toggleEl: document.getElementById('audio-toggle'),
    iconMuted: document.getElementById('icon-muted'),
    iconUnmuted: document.getElementById('icon-unmuted'),
  });

  const choreography = new ScrollChoreography({
    doorScene: scene,
    frameScrubber: scrubber,
    hintEl: document.getElementById('hint'),
    arabicEl: document.getElementById('arabic'),
    englishEl: document.getElementById('english'),
    onCreak: () => audio.playCreak(),
  });

  // 5) Animation loop
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    choreography.apply(dt);
    scene.render();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // 6) Fade out the loader
  setTimeout(() => loaderEl.classList.add('gone'), 250);
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  const loader = document.getElementById('loader');
  if (loader) {
    loader.innerHTML = `<div style="color:#f6e5c8;font-family:serif;padding:2rem;text-align:center"><p>Something went wrong loading the page.</p><p style="opacity:0.6;font-size:0.85rem;margin-top:1rem">${err.message || err}</p></div>`;
  }
});
