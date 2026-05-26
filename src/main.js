import { DuaaStream } from './duaa-cycler.js';
import { EffectsLayer } from './effects.js';
import { AudioController } from './audio.js';

async function boot() {
  const loaderEl = document.getElementById('loader');

  const effects = new EffectsLayer(document.getElementById('effects-canvas'));

  const audio = new AudioController({
    nasheedEl: document.getElementById('nasheed'),
    toggleEl: document.getElementById('audio-toggle'),
    iconMuted: document.getElementById('icon-muted'),
    iconUnmuted: document.getElementById('icon-unmuted'),
  });

  const video = document.getElementById('bg-video');
  video.muted = true;
  // DO NOT play yet — video stays paused on frame 0 until all 4 dials are turned.
  // We only preload so it's ready to start instantly on unlock.
  video.load();

  const mainStage = document.getElementById('main-stage');

  const stream = new DuaaStream(
    document.getElementById('stream-track'),
    {
      speed: 70,           // overridden once video metadata loads
      holdAtEndMs: 0,
      onEnd: () => {
        // Keep the closing card visible.
        // Hide the dark left gradient so the video's final frame is clean.
        document.body.classList.add('final-shot');
      },
    }
  );

  function calibrateScrollSpeed() {
    const d = video.duration;
    if (!isFinite(d) || d <= 0) return;
    // Leave ~2.5s at the end of the video for a clean shot of the last frame
    const scrollDuration = Math.max(8, d - 2.5);
    const distance = stream.scrollDistance;
    if (distance > 0) {
      stream.setSpeed(distance / scrollDuration);
    }
  }
  video.addEventListener('loadedmetadata', calibrateScrollSpeed);
  // Also re-calibrate after fonts/cards finalize
  setTimeout(calibrateScrollSpeed, 600);

  // When the video reaches its last frame:
  //   - Reveal the freeze-frame card (آمين + From — Shaid Mama)
  //   - Hold for ~7 seconds
  //   - Then loop everything from the start
  video.addEventListener('ended', () => {
    document.body.classList.add('freeze-frame');
    setTimeout(() => {
      // Hide freeze card + restore gradient for next cycle
      document.body.classList.remove('freeze-frame');
      document.body.classList.remove('final-shot');
      stream.reset();
      video.currentTime = 0;
      video.play().catch(() => {});
      calibrateScrollSpeed();
      stream.start();
    }, 4000);
  });

  // ----- Cockpit hotspot interactions (sequential, one at a time) -----
  // Required click order — TR first, then TL, then BL, then BR
  const SEQUENCE = ['tr', 'tl', 'bl', 'br'];
  let currentStep = 0;
  const activated = new Set();

  // Cockpit voice-over per control
  const CALLOUTS = {
    tr: 'Avionics, online.',
    tl: 'Fuel system, ready.',
    bl: 'Pre-flight check, complete.',
    br: 'Cleared for takeoff.',
  };

  const quadrantCenter = {
    tl: { x: 0.25, y: 0.25 },
    tr: { x: 0.75, y: 0.25 },
    bl: { x: 0.25, y: 0.75 },
    br: { x: 0.75, y: 0.75 },
  };

  if ('speechSynthesis' in window) speechSynthesis.getVoices();

  // Show a callout popup near the clicked hotspot — appears, holds, fades
  function showCalloutPopup(text, quadrantId) {
    const hotspot = document.querySelector(`.cockpit-hotspot[data-quadrant="${quadrantId}"]`);
    if (!hotspot) return;
    const rect = hotspot.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Position above the hotspot, with a slight pull toward the center
    const dx = (window.innerWidth / 2 - cx) * 0.10;
    const popup = document.createElement('div');
    popup.className = 'callout-popup';
    popup.textContent = text;
    popup.style.left = `${cx + dx}px`;
    popup.style.top  = `${cy - 90}px`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => {
      popup.classList.remove('show');
      popup.classList.add('hide');
      setTimeout(() => popup.remove(), 600);
    }, 1700);
  }

  // Set initial states — only the first one in the sequence is active
  function refreshHotspotStates() {
    SEQUENCE.forEach((id, idx) => {
      const btn = document.querySelector(`.cockpit-hotspot[data-quadrant="${id}"]`);
      if (!btn) return;
      if (activated.has(id)) {
        btn.classList.remove('locked');
        btn.classList.add('engaged');
      } else if (idx === currentStep) {
        btn.classList.remove('locked', 'engaged');  // active (pulsing default)
      } else {
        btn.classList.remove('engaged');
        btn.classList.add('locked');
      }
    });
  }
  refreshHotspotStates();

  function activate(id) {
    if (activated.has(id)) return;
    // Strict sequence: only the next-expected hotspot is accepted
    if (SEQUENCE[currentStep] !== id) return;
    activated.add(id);
    currentStep++;

    audio.playDing();
    // Speak the cockpit callout a beat after the ding so they don't clash
    setTimeout(() => audio.speak(CALLOUTS[id]), 220);

    // Visual popup with the same callout — anchored above the clicked control
    showCalloutPopup(CALLOUTS[id], id);

    // Light the corresponding progress pip
    const pip = document.querySelector(`.counter-pip[data-id="${id}"]`);
    if (pip) pip.classList.add('lit');

    // Mark the hotspot as engaged (CSS shows the rotated indicator)
    const hotspot = document.querySelector(`.cockpit-hotspot[data-quadrant="${id}"]`);
    if (hotspot) {
      hotspot.classList.add('engaged');
      hotspot.disabled = true;
    }

    // Open the corresponding shutter
    const shutter = document.querySelector(`.shutter[data-quadrant="${id}"]`);
    if (shutter) shutter.classList.add('open');

    // Localized firework burst
    const dpr = Math.min(window.devicePixelRatio, 2);
    const c = quadrantCenter[id];
    if (c) {
      effects.spawnFirework(window.innerWidth * c.x * dpr, window.innerHeight * c.y * dpr, 55);
    }

    // Refresh which hotspot is now active (the next one in sequence)
    refreshHotspotStates();

    if (activated.size === SEQUENCE.length) {
      setTimeout(unlock, 500);
    }
  }

  function unlock() {
    // Final celebration
    const dpr = Math.min(window.devicePixelRatio, 2);
    const cx = (window.innerWidth / 2) * dpr;
    const cy = (window.innerHeight / 2) * dpr;
    effects.spawnFirework(cx, cy, 90);
    effects.spawnConfetti(140);
    setTimeout(() => effects.setAutoFireworks(true), 200);
    setTimeout(() => effects.setAutoFireworks(false), 3500);

    // Auto-play the nasheed — user has clicked, audio unlock is granted
    if (audio.isMuted) audio.toggleMute();

    setTimeout(() => {
      document.body.classList.remove('locked');
      document.body.classList.add('unlocked');
      // Start the video from frame 0 in sync with the duaa stream
      video.currentTime = 0;
      video.play().catch(() => {});
      calibrateScrollSpeed();
      stream.start();
    }, 600);
  }

  // Bind hotspot clicks
  document.querySelectorAll('.cockpit-hotspot').forEach((btn) => {
    const id = btn.dataset.quadrant;
    const fire = (e) => {
      e.preventDefault();
      activate(id);
    };
    btn.addEventListener('click', fire);
    btn.addEventListener('touchstart', fire, { passive: false });
  });

  // ----- Render loop for effects -----
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
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
