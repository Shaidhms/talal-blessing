// Drives the door + frame + text reveals based on overall scroll progress (0..1).
// Uses GSAP ScrollTrigger to compute progress against the scroll runway.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const remap = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export class ScrollChoreography {
  constructor({ doorScene, frameScrubber, hintEl, arabicEl, englishEl, onCreak }) {
    this.doorScene = doorScene;
    this.frameScrubber = frameScrubber;
    this.hintEl = hintEl;
    this.arabicEl = arabicEl;
    this.englishEl = englishEl;
    this.onCreak = onCreak;
    this._creakFired = false;
    this.progress = 0;

    this._initTrigger();
  }

  _initTrigger() {
    gsap.registerPlugin(ScrollTrigger);
    this.trigger = ScrollTrigger.create({
      trigger: '#scroll-runway',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => {
        this.progress = self.progress;
      },
    });
  }

  apply(dt) {
    const p = this.progress;

    // ---------- Stage 1: 0-15% — door closed, hint visible ----------
    const hintOpacity = remap(p, 0.01, 0.04) * (1 - remap(p, 0.10, 0.16));
    this.hintEl.style.opacity = hintOpacity;
    this.hintEl.style.transform = `translateY(${(1 - hintOpacity) * 20}px)`;

    // ---------- Stage 2: 15-35% — door opens, warm light grows ----------
    const doorProgress = easeInOut(remap(p, 0.15, 0.38));
    const doorAngle = doorProgress * (Math.PI * 0.6); // ~108°
    if (!this._creakFired && p > 0.16) {
      this._creakFired = true;
      this.onCreak && this.onCreak();
    }
    if (p < 0.14) this._creakFired = false;
    const lightIntensity = remap(p, 0.16, 0.45);

    // ---------- Stage 3: 35-70% — camera dollies CLOSER (but stays outside doorway) ----------
    const dollyProgress = easeInOut(remap(p, 0.35, 0.72));
    const cameraZ = 5.2 - dollyProgress * 3.4;     // 5.2 -> 1.8 (still outside)
    const cameraLift = dollyProgress * 0.12;

    const frameProgress = remap(p, 0.35, 0.72);
    const img = this.frameScrubber.getFrameAt(frameProgress);
    this.doorScene.updateFrameImage(img);

    // ---------- Stage 4: 65-82% — Arabic calligraphy reveal, then fades out ----------
    const arabicIn = remap(p, 0.65, 0.78);
    const arabicOut = remap(p, 0.82, 0.88);
    const arabicOp = arabicIn * (1 - arabicOut);
    this.arabicEl.style.opacity = arabicOp;
    this.arabicEl.style.transform = `translateY(${(1 - arabicIn) * 30 - arabicOut * 20}px) scale(${0.96 + arabicIn * 0.04})`;

    // ---------- Stage 5: 88-97% — English duaa reveal (clean handoff from Arabic) ----------
    const englishIn = remap(p, 0.88, 0.97);
    this.englishEl.style.opacity = englishIn;
    this.englishEl.style.transform = `translateY(${(1 - englishIn) * 30}px)`;

    // When Arabic / English duaa is on-screen, fade the door scene to keep focus on the text
    const textFocus = Math.max(arabicOp, englishIn);
    this.doorScene.setSceneOpacity(1 - textFocus * 0.6);

    // ---------- Glow grows from stage 2 onward ----------
    const glowOpacity = clamp(lightIntensity * 0.45 + dollyProgress * 0.15, 0, 0.55);

    // Send everything to the 3D scene
    this.doorScene.update({
      doorAngle,
      lightIntensity,
      cameraZ,
      cameraLift,
      glowOpacity,
    }, dt);
  }
}
