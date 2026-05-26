import { CockpitScene } from './cockpit-scene.js';
import { DuaaStream } from './duaa-cycler.js';
import { EffectsLayer } from './effects.js';
import { AudioController } from './audio.js';

async function boot() {
  const loaderEl = document.getElementById('loader');

  const keyCanvas = document.getElementById('key-canvas');
  const cockpit = new CockpitScene(keyCanvas);

  const effects = new EffectsLayer(document.getElementById('effects-canvas'));

  const audio = new AudioController({
    nasheedEl: document.getElementById('nasheed'),
    toggleEl: document.getElementById('audio-toggle'),
    iconMuted: document.getElementById('icon-muted'),
    iconUnmuted: document.getElementById('icon-unmuted'),
  });

  const video = document.getElementById('bg-video');
  video.muted = true;
  // Start playing the video silently behind the shutters so it's running when revealed
  video.play().catch(() => {});

  const stream = new DuaaStream(
    document.getElementById('stream-track'),
    { speed: 95 }
  );

  // Map knob id to shutter element + counter pip
  const shutterByQuadrant = (id) => document.querySelector(`.shutter[data-quadrant="${id}"]`);
  const pipById = (id) => document.querySelector(`.counter-pip[data-id="${id}"]`);

  cockpit.setOnKnobActivate((id) => {
    audio.playCreak();
    // Light up the corresponding pip
    const pip = pipById(id);
    if (pip) pip.classList.add('lit');
    // Open the corresponding shutter
    const shutter = shutterByQuadrant(id);
    if (shutter) shutter.classList.add('open');

    // Small burst over the shutter
    const dpr = Math.min(window.devicePixelRatio, 2);
    const quadrantCenter = {
      tl: { x: 0.25, y: 0.25 },
      tr: { x: 0.75, y: 0.25 },
      bl: { x: 0.25, y: 0.75 },
      br: { x: 0.75, y: 0.75 },
    }[id];
    if (quadrantCenter) {
      const cx = window.innerWidth * quadrantCenter.x * dpr;
      const cy = window.innerHeight * quadrantCenter.y * dpr;
      effects.spawnFirework(cx, cy, 50);
    }
  });

  cockpit.setOnAllActivated(() => {
    // Final celebration
    const dpr = Math.min(window.devicePixelRatio, 2);
    const cx = (window.innerWidth / 2) * dpr;
    const cy = (window.innerHeight / 2) * dpr;
    effects.spawnFirework(cx, cy, 90);
    effects.spawnConfetti(120);
    setTimeout(() => effects.setAutoFireworks(true), 200);
    setTimeout(() => effects.setAutoFireworks(false), 3500);

    // Fade the cockpit + reveal main stage
    cockpit.fadeOut(900);
    setTimeout(() => {
      document.body.classList.remove('locked');
      document.body.classList.add('unlocked');
      stream.start();
    }, 700);
  });

  // Render loop
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    cockpit.update(dt);
    cockpit.render();
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
