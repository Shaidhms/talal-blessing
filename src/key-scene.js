import * as THREE from 'three';

// A 3D ornate golden key, rotating gently. Hover lifts + glows.
// On click, it animates: stops idle rotation, tips horizontally,
// spins 360° around its shaft, then flies upward and fades out.

export class KeyScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    this._buildLights();
    this._buildKey();
    this._buildAura();
    this._setupResize();

    this.state = 'idle';            // 'idle' | 'unlocking' | 'flying' | 'gone'
    this.t0 = 0;                    // anim start time
    this.hover = 0;                 // 0..1 hover blend
    this._targetHover = 0;
    this._onUnlock = () => {};

    this._setupInteraction();
  }

  setOnUnlock(fn) { this._onUnlock = fn; }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0x553a1a, 0.7));

    const key = new THREE.DirectionalLight(0xfff0c8, 1.4);
    key.position.set(2, 3, 4);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xd09060, 0.55);
    fill.position.set(-3, 1, 4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffe9a8, 0.7);
    rim.position.set(0, 1, -3);
    this.scene.add(rim);
  }

  _buildKey() {
    const gold = new THREE.MeshStandardMaterial({
      color: 0xe8c060,
      metalness: 0.95,
      roughness: 0.22,
      emissive: 0x4a2a08,
      emissiveIntensity: 0.4,
    });
    const goldBright = new THREE.MeshStandardMaterial({
      color: 0xfff0c8,
      metalness: 1.0,
      roughness: 0.15,
      emissive: 0x8a5a18,
      emissiveIntensity: 0.6,
    });

    this.keyGroup = new THREE.Group();
    this.scene.add(this.keyGroup);

    // ----- Bow (head of the key) — ornate ring with arabesque inside -----
    const bowOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.18, 32, 64),
      gold
    );
    bowOuter.position.set(0, 1.45, 0);
    this.keyGroup.add(bowOuter);

    // Inner decorative ring (slightly recessed)
    const bowInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.07, 24, 48),
      goldBright
    );
    bowInner.position.set(0, 1.45, 0);
    this.keyGroup.add(bowInner);

    // 8-pointed star inside the bow (extruded shape)
    const starShape = new THREE.Shape();
    const points = 16; // 8 points = 16 vertices
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 === 0) ? 0.42 : 0.20;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const starGeom = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.025,
      bevelSegments: 3,
    });
    const star = new THREE.Mesh(starGeom, goldBright);
    star.position.set(0, 1.45, -0.06);
    this.keyGroup.add(star);

    // Small crown nub at the very top of the bow
    const crownGeom = new THREE.ConeGeometry(0.18, 0.32, 6);
    const crown = new THREE.Mesh(crownGeom, gold);
    crown.position.set(0, 2.45, 0);
    this.keyGroup.add(crown);
    // Tiny ball on top
    const ballTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 12),
      goldBright
    );
    ballTop.position.set(0, 2.7, 0);
    this.keyGroup.add(ballTop);

    // ----- Shaft (cylinder) -----
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 1.8, 24),
      gold
    );
    shaft.position.set(0, 0.25, 0);
    this.keyGroup.add(shaft);

    // Decorative collars on the shaft
    for (const y of [0.95, 0.45, -0.55]) {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24),
        goldBright
      );
      collar.position.set(0, y, 0);
      this.keyGroup.add(collar);
    }

    // ----- Teeth at the bottom -----
    const teethGroup = new THREE.Group();
    teethGroup.position.set(0, -0.7, 0);
    this.keyGroup.add(teethGroup);

    const toothSizes = [
      { w: 0.16, h: 0.30, y: -0.10 },
      { w: 0.32, h: 0.22, y: -0.30 },
      { w: 0.22, h: 0.18, y: -0.46 },
    ];
    for (const t of toothSizes) {
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.14 + t.w, 0.14, 0.14),
        gold
      );
      // Offset on +X so teeth stick out the side of the shaft
      tooth.position.set(0.05 + t.w / 2, t.y, 0);
      teethGroup.add(tooth);
    }

    // Tilt key slightly toward camera so the teeth and star are both visible
    this.keyGroup.rotation.set(0.0, -0.25, 0.0);
    this.keyGroup.scale.setScalar(1.05);
  }

  _buildAura() {
    // Soft warm glow behind the key
    const glowGeom = new THREE.PlaneGeometry(6, 7);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffc878,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.aura = new THREE.Mesh(glowGeom, glowMat);
    this.aura.position.set(0, 0.4, -1);
    this.scene.add(this.aura);

    // Particle motes
    const count = 200;
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
      vels[i] = 0.0006 + Math.random() * 0.0012;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd680,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.motes = new THREE.Points(geom, mat);
    this.moteVels = vels;
    this.scene.add(this.motes);
  }

  _setupInteraction() {
    this.canvas.style.cursor = 'pointer';
    this.canvas.addEventListener('mouseenter', () => { this._targetHover = 1; });
    this.canvas.addEventListener('mouseleave', () => { this._targetHover = 0; });
    this.canvas.addEventListener('mousemove', () => { this._targetHover = 1; });
    this.canvas.addEventListener('touchstart', () => { this._targetHover = 1; });

    const handleClick = () => {
      if (this.state !== 'idle') return;
      this.state = 'unlocking';
      this.t0 = performance.now();
      this._onUnlock();
    };
    this.canvas.addEventListener('click', handleClick);
  }

  _setupResize() {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    onResize();
  }

  // Returns true while still animating; false once key has fully gone
  update(dt) {
    const t = performance.now();

    // Smooth hover blend
    this.hover += (this._targetHover - this.hover) * 0.1;

    // Idle state — slow rotation + breathing
    if (this.state === 'idle') {
      this.keyGroup.rotation.y += dt * 0.7;
      this.keyGroup.position.y = Math.sin(t * 0.0015) * 0.15 + this.hover * 0.25;
      this.keyGroup.scale.setScalar(1.05 + this.hover * 0.08);
      this.aura.material.opacity = 0.15 + this.hover * 0.20;
      this.aura.scale.setScalar(1 + this.hover * 0.3);
    }

    // Unlocking state — fast spin, then upward flight
    if (this.state === 'unlocking') {
      const elapsed = (t - this.t0) / 1000;
      const phase1Dur = 0.8; // spin in place
      const phase2Dur = 0.6; // fly up + fade
      if (elapsed < phase1Dur) {
        const p = elapsed / phase1Dur;
        this.keyGroup.rotation.y += dt * (4 + p * 18);
        this.keyGroup.position.y = Math.sin(t * 0.001) * 0.15;
        // Aura grows + brightens
        this.aura.material.opacity = 0.15 + p * 0.55;
        this.aura.scale.setScalar(1 + p * 0.8);
      } else if (elapsed < phase1Dur + phase2Dur) {
        const p = (elapsed - phase1Dur) / phase2Dur;
        const ease = p * p;
        this.keyGroup.rotation.y += dt * 22;
        this.keyGroup.position.y = ease * 5;
        this.keyGroup.scale.setScalar(1.05 * (1 - ease * 0.4));
        // Fade everything via opacity hack on materials
        this.keyGroup.traverse((c) => {
          if (c.material) {
            c.material.transparent = true;
            c.material.opacity = 1 - p;
          }
        });
        this.aura.material.opacity = 0.7 * (1 - p);
      } else {
        this.state = 'gone';
      }
    }

    // Particle drift
    const positions = this.motes.geometry.attributes.position.array;
    for (let i = 0; i < this.moteVels.length; i++) {
      positions[i * 3 + 1] += this.moteVels[i] * (60 * dt);
      if (positions[i * 3 + 1] > 3) positions[i * 3 + 1] = -3;
    }
    this.motes.geometry.attributes.position.needsUpdate = true;

    return this.state !== 'gone';
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  hide() {
    this.canvas.style.display = 'none';
  }
}
