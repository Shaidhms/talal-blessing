import { KeyScene } from './key-scene.js';
import { DuaaStream } from './duaa-cycler.js';
import { EffectsLayer } from './effects.js';
import { AudioController } from './audio.js';

async function boot() {
  const loaderEl = document.getElementById('loader');

  const keyCanvas = document.getElementById('key-canvas');
  const keyScene = new KeyScene(keyCanvas);

  const effects = new EffectsLayer(document.getElementById('effects-canvas'));

  const audio = new AudioController({
    nasheedEl: document.getElementById('nasheed'),
    toggleEl: document.getElementById('audio-toggle'),
    iconMuted: document.getElementById('icon-muted'),
    iconUnmuted: document.getElementById('icon-unmuted'),
  });

  const video = document.getElementById('bg-video');
  video.muted = true;

  const stream = new DuaaStream(
    document.getElementById('stream-track'),
    { speed: 95 } // px/sec — readable but doesn't drag
  );

  keyScene.setOnUnlock(() => {
    audio.playCreak();
    const dpr = Math.min(window.devicePixelRatio, 2);
    const cx = (window.innerWidth / 2) * dpr;
    const cy = (window.innerHeight / 2) * dpr;
    effects.spawnFirework(cx, cy, 90);
    effects.spawnFirework(cx - 200 * dpr, cy - 100 * dpr, 60);
    effects.spawnFirework(cx + 200 * dpr, cy - 60 * dpr, 60);
    effects.spawnConfetti(120);
    setTimeout(() => effects.setAutoFireworks(true), 200);
    setTimeout(() => effects.setAutoFireworks(false), 3500);

    setTimeout(() => {
      document.body.classList.remove('locked');
      document.body.classList.add('unlocked');
      video.play().catch(() => {});
      stream.start();
    }, 900);

    setTimeout(() => keyScene.hide(), 2200);
  });

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    keyScene.update(dt);
    keyScene.render();
    effects.update(dt);
    effects.draw();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  setTimeout(() => loaderEl.classList.add('gone'), 500);
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  const loader = document.getElementById('loader');
  if (loader) {
    loader.innerHTML = `<div style="color:#f6e5c8;font-family:serif;padding:2rem;text-align:center"><p>Something went wrong.</p><p style="opacity:0.6;font-size:0.85rem;margin-top:1rem">${err.message || err}</p></div>`;
  }
});
