// 2D canvas overlay for festive effects: fireworks, confetti, cursor trail, click bursts.
// Lives in a transparent canvas that sits OVER the WebGL stage but UNDER the text overlays.

export class EffectsLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.fireworks = [];
    this.particles = [];
    this.confetti = [];
    this.trail = [];      // mouse sparkle trail
    this.scrollPulses = []; // sparkles spawned by scrolling

    this._setupCursor();
    this._setupClick();

    // Idle: while scene is "active" (fireworks scene), auto-spawn fireworks
    this.autoFireworks = false;
    this._lastAutoFw = 0;
  }

  _resize() {
    this.canvas.width = window.innerWidth * Math.min(window.devicePixelRatio, 2);
    this.canvas.height = window.innerHeight * Math.min(window.devicePixelRatio, 2);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.dpr = Math.min(window.devicePixelRatio, 2);
  }

  _setupCursor() {
    window.addEventListener('mousemove', (e) => {
      this.trail.push({
        x: e.clientX * this.dpr,
        y: e.clientY * this.dpr,
        life: 1,
        size: 2 + Math.random() * 2,
        color: this._goldHue(),
      });
      if (this.trail.length > 60) this.trail.shift();
    });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        this.trail.push({
          x: e.touches[0].clientX * this.dpr,
          y: e.touches[0].clientY * this.dpr,
          life: 1,
          size: 2 + Math.random() * 2,
          color: this._goldHue(),
        });
        if (this.trail.length > 60) this.trail.shift();
      }
    });
  }

  _setupClick() {
    const burst = (e) => {
      const x = (e.clientX ?? (e.touches && e.touches[0]?.clientX)) * this.dpr;
      const y = (e.clientY ?? (e.touches && e.touches[0]?.clientY)) * this.dpr;
      if (!x || !y) return;
      this.spawnBurst(x, y, 28);
    };
    window.addEventListener('click', burst);
    window.addEventListener('touchstart', (e) => {
      if (e.touches[0]) burst(e);
    });
  }

  _goldHue() {
    const palette = ['#ffe9a8', '#ffd47a', '#f3c450', '#d4a857', '#fff2c2', '#ffcc66'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  spawnBurst(x, y, count = 24) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed * this.dpr,
        vy: Math.sin(a) * speed * this.dpr,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        size: 1.5 + Math.random() * 3,
        color: this._goldHue(),
        gravity: 0.08 * this.dpr,
      });
    }
  }

  spawnFirework(x, y, count = 60) {
    const hueBase = Math.random();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const colors = ['#ffd47a', '#fff2c2', '#f3c450', '#ffcc66', '#ffaa44'];
      // Some bursts go warm-white, some warm-gold
      const col = hueBase > 0.5 ? '#fff2c2' : colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed * this.dpr,
        vy: Math.sin(a) * speed * this.dpr,
        life: 1,
        decay: 0.008 + Math.random() * 0.015,
        size: 2 + Math.random() * 3,
        color: col,
        gravity: 0.04 * this.dpr,
        sparkle: true,
      });
    }
  }

  spawnConfetti(count = 60) {
    const colors = ['#ffd47a', '#f3c450', '#ffe9a8', '#d4a857', '#fff2c2', '#e8b840'];
    for (let i = 0; i < count; i++) {
      this.confetti.push({
        x: Math.random() * this.canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 1.5 * this.dpr,
        vy: (1 + Math.random() * 2) * this.dpr,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        w: 6 + Math.random() * 8,
        h: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        sway: Math.random() * Math.PI * 2,
      });
    }
  }

  setAutoFireworks(on) {
    this.autoFireworks = on;
  }

  update(dt) {
    // Auto-fire fireworks during the fireworks scene
    if (this.autoFireworks) {
      const now = performance.now();
      if (now - this._lastAutoFw > 400 + Math.random() * 300) {
        this._lastAutoFw = now;
        const x = (0.15 + Math.random() * 0.7) * this.canvas.width;
        const y = (0.15 + Math.random() * 0.5) * this.canvas.height;
        this.spawnFirework(x, y, 50);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.sway += 0.04;
      c.x += c.vx + Math.sin(c.sway) * 0.5;
      c.y += c.vy;
      c.rot += c.rotSpeed;
      if (c.y > this.canvas.height + 30) this.confetti.splice(i, 1);
    }

    // Trail decay
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= 0.035;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Trail
    ctx.globalCompositeOperation = 'lighter';
    for (const t of this.trail) {
      ctx.globalAlpha = t.life * 0.9;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * (0.5 + t.life * 0.8) * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles (fireworks + bursts)
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      const sz = p.size * (p.sparkle ? (0.6 + Math.sin(p.life * 30) * 0.4) : 1) * this.dpr;
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    // Confetti
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w * this.dpr, c.h * this.dpr);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }
}
