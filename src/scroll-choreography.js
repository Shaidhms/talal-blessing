// Drives all 6 scenes via overall scroll progress (0..1).

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const remap = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export class ScrollChoreography {
  constructor({
    doorScene, frameScrubber, effects, balloons,
    hintEl, nameRevealEl, arabicEl, englishEl,
    onReveal, onFireworksStart, onConfetti,
  }) {
    this.doorScene = doorScene;
    this.frameScrubber = frameScrubber;
    this.effects = effects;
    this.balloons = balloons;
    this.hintEl = hintEl;
    this.nameRevealEl = nameRevealEl;
    this.arabicEl = arabicEl;
    this.englishEl = englishEl;
    this.onReveal = onReveal || (() => {});
    this.onFireworksStart = onFireworksStart || (() => {});
    this.onConfetti = onConfetti || (() => {});

    this._revealFired = false;
    this._fireworksStarted = false;
    this._confettiFired = false;

    this.progress = 0;
    this._initTrigger();
  }

  _initTrigger() {
    gsap.registerPlugin(ScrollTrigger);
    this.trigger = ScrollTrigger.create({
      trigger: '#scroll-runway',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        this.progress = self.progress;
      },
    });
  }

  apply(dt) {
    const p = this.progress;

    // ============================================================
    //   SCENE 1 — 0-15% — closed arch with name + hint
    // ============================================================
    const hintOp = remap(p, 0.01, 0.04) * (1 - remap(p, 0.12, 0.16));
    this.hintEl.style.opacity = hintOp;
    this.hintEl.style.transform = `translateY(${(1 - hintOp) * 14}px)`;

    // "For Talal" name reveal on top — visible from 4% to 18%
    const nameIn = remap(p, 0.04, 0.10);
    const nameOut = remap(p, 0.16, 0.20);
    const nameOp = nameIn * (1 - nameOut);
    this.nameRevealEl.style.opacity = nameOp;
    this.nameRevealEl.style.transform = `translateY(${(1 - nameIn) * 30}px) scale(${0.92 + nameIn * 0.08})`;

    // ============================================================
    //   SCENE 2 — 15-32% — veil splits open, big burst of light
    // ============================================================
    const veilProgress = easeInOut(remap(p, 0.15, 0.35));
    const lightIntensity = remap(p, 0.18, 0.42);

    if (!this._revealFired && p > 0.17) {
      this._revealFired = true;
      this.onReveal();
      // Big celebratory burst when the veil first cracks
      setTimeout(() => {
        const cx = window.innerWidth / 2 * (window.devicePixelRatio || 1);
        const cy = window.innerHeight / 2 * (window.devicePixelRatio || 1);
        this.effects.spawnFirework(cx, cy, 90);
      }, 200);
    }
    if (p < 0.14) this._revealFired = false;

    // ============================================================
    //   SCENE 3 — 32-52% — camera dollies, video frames scrub
    // ============================================================
    const dollyProgress = easeInOut(remap(p, 0.32, 0.55));
    const cameraZ = 5.6 - dollyProgress * 3.5;
    const cameraLift = dollyProgress * 0.18;
    const frameProgress = remap(p, 0.32, 0.55);
    const img = this.frameScrubber.getFrameAt(frameProgress);
    this.doorScene.updateFrameImage(img);

    // ============================================================
    //   SCENE 4 — 50-68% — balloons + confetti
    // ============================================================
    const balloonsIn = remap(p, 0.50, 0.58);
    const balloonsOut = remap(p, 0.66, 0.72);
    const balloonsOp = balloonsIn * (1 - balloonsOut);
    this.balloons.setOpacity(balloonsOp);
    if (balloonsIn > 0.4) this.balloons.spawnAll();

    if (!this._confettiFired && p > 0.52) {
      this._confettiFired = true;
      this.effects.spawnConfetti(80);
      this.onConfetti();
    }
    if (p < 0.48) this._confettiFired = false;

    // ============================================================
    //   SCENE 5 — 68-82% — fireworks + Arabic calligraphy
    // ============================================================
    const fireworksActive = p > 0.66 && p < 0.86;
    if (fireworksActive && !this._fireworksStarted) {
      this._fireworksStarted = true;
      this.effects.setAutoFireworks(true);
      this.onFireworksStart();
    } else if (!fireworksActive && this._fireworksStarted) {
      this._fireworksStarted = false;
      this.effects.setAutoFireworks(false);
    }

    const arabicIn = remap(p, 0.66, 0.76);
    const arabicOut = remap(p, 0.84, 0.90);
    const arabicOp = arabicIn * (1 - arabicOut);
    this.arabicEl.style.opacity = arabicOp;
    this.arabicEl.style.transform = `translateY(${(1 - arabicIn) * 30 - arabicOut * 20}px) scale(${0.94 + arabicIn * 0.06})`;

    // ============================================================
    //   SCENE 6 — 86-100% — English duaa + footer
    // ============================================================
    const englishIn = remap(p, 0.88, 0.97);
    this.englishEl.style.opacity = englishIn;
    this.englishEl.style.transform = `translateY(${(1 - englishIn) * 24}px)`;

    // ============================================================
    //   Final compositing
    // ============================================================
    const glowOpacity = clamp(lightIntensity * 0.5 + dollyProgress * 0.18, 0, 0.65);

    this.doorScene.update({
      veilOpen: veilProgress,
      lightIntensity,
      cameraZ,
      cameraLift,
      glowOpacity,
    }, dt);

    // Fade three.js scene when overlays take focus
    const textFocus = Math.max(arabicOp * 0.7, englishIn * 0.7, balloonsOp * 0.3);
    this.doorScene.setSceneOpacity(1 - textFocus * 0.55);
  }
}
