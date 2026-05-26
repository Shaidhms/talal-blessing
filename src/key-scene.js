import * as THREE from 'three';

// 3D ornate gold key + ornate keyhole plate. User drags the key into the
// keyhole. When close enough, it snaps in, rotates 90° (the lock turn),
// then triggers the unlock transition.

const SNAP_DISTANCE = 1.4;        // world units — generous "magnet zone"
const KEY_START_POS = { x: 0, y: -1.8, z: 0 };
const KEYHOLE_POS   = { x: 0, y:  1.4, z: 0 };
// Key origin position that lines up the teeth tip with the keyhole
const KEY_ALIGNED_POS = { x: 0, y: 0.55, z: 0 };

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
    this._buildKeyhole();
    this._buildKey();
    this._buildAura();
    this._setupResize();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.isDragging = false;
    this.dragOffset = new THREE.Vector3();
    this._near = 0;          // 0..1 — how close key is to keyhole (for visual feedback)

    this.state = 'idle';     // 'idle' | 'unlocking' | 'gone'
    this.t0 = 0;
    this._onUnlock = () => {};
    this._onNear = () => {};

    this._setupInteraction();
  }

  setOnUnlock(fn) { this._onUnlock = fn; }
  setOnNear(fn) { this._onNear = fn; }

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

  _buildKeyhole() {
    // Ornate decorative plate that holds the keyhole
    this.keyholeGroup = new THREE.Group();
    this.keyholeGroup.position.set(KEYHOLE_POS.x, KEYHOLE_POS.y, KEYHOLE_POS.z);
    this.scene.add(this.keyholeGroup);

    const goldDark = new THREE.MeshStandardMaterial({
      color: 0x6a4a14,
      metalness: 0.8,
      roughness: 0.45,
      emissive: 0x2a1a08,
      emissiveIntensity: 0.4,
    });
    const goldBright = new THREE.MeshStandardMaterial({
      color: 0xe8c060,
      metalness: 0.95,
      roughness: 0.25,
      emissive: 0x5a3a18,
      emissiveIntensity: 0.5,
    });

    // Plate (decorative rounded rectangle)
    const plateShape = new THREE.Shape();
    const pw = 1.3, ph = 1.8, pr = 0.25;
    plateShape.moveTo(-pw + pr, -ph);
    plateShape.lineTo(pw - pr, -ph);
    plateShape.quadraticCurveTo(pw, -ph, pw, -ph + pr);
    plateShape.lineTo(pw, ph - pr);
    plateShape.quadraticCurveTo(pw, ph, pw - pr, ph);
    plateShape.lineTo(-pw + pr, ph);
    plateShape.quadraticCurveTo(-pw, ph, -pw, ph - pr);
    plateShape.lineTo(-pw, -ph + pr);
    plateShape.quadraticCurveTo(-pw, -ph, -pw + pr, -ph);

    // Keyhole cutout (a circle + downward slot — classic keyhole shape)
    const holePath = new THREE.Path();
    const cr = 0.32;           // circle radius
    const slotW = 0.20;        // slot half-width
    const slotBottom = -1.0;
    // Build keyhole shape as a path:
    // start at top of circle, go right around to where it meets slot,
    // go down to slot bottom, across, back up.
    holePath.absarc(0, 0.2, cr, 0, Math.PI * 2, false);
    plateShape.holes.push(holePath);

    // Separate slot path
    const slotPath = new THREE.Path();
    slotPath.moveTo(-slotW, 0.2);
    slotPath.lineTo(-slotW, slotBottom);
    slotPath.lineTo(slotW, slotBottom);
    slotPath.lineTo(slotW, 0.2);
    slotPath.lineTo(-slotW, 0.2);
    plateShape.holes.push(slotPath);

    const plateGeom = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 3,
    });
    this.plate = new THREE.Mesh(plateGeom, goldDark);
    this.plate.position.z = -0.1;
    this.keyholeGroup.add(this.plate);

    // Glowing keyhole interior (a black shape behind the cutout, lit by a point light)
    this.keyholeInteriorMat = new THREE.MeshBasicMaterial({
      color: 0x1a0a00,
      transparent: true,
      opacity: 0.95,
    });
    const interiorShape = new THREE.Shape();
    interiorShape.absarc(0, 0.2, cr - 0.02, 0, Math.PI * 2, false);
    const interiorSlot = new THREE.Path();
    interiorSlot.moveTo(-slotW + 0.02, 0.2);
    interiorSlot.lineTo(-slotW + 0.02, slotBottom);
    interiorSlot.lineTo(slotW - 0.02, slotBottom);
    interiorSlot.lineTo(slotW - 0.02, 0.2);
    interiorSlot.lineTo(-slotW + 0.02, 0.2);
    interiorShape.holes.push(interiorSlot);
    const interiorGeom = new THREE.ShapeGeometry(interiorShape);
    this.keyholeInterior = new THREE.Mesh(interiorGeom, this.keyholeInteriorMat);
    this.keyholeInterior.position.z = -0.25;
    this.keyholeGroup.add(this.keyholeInterior);

    // Inner glow that pulses + brightens as key gets close
    this.keyholeGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.2),
      new THREE.MeshBasicMaterial({
        color: 0xffc878,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.keyholeGlow.position.z = -0.3;
    this.keyholeGroup.add(this.keyholeGlow);

    // Decorative corner studs
    const studs = [
      { x: -pw + 0.18, y: ph - 0.18 },
      { x:  pw - 0.18, y: ph - 0.18 },
      { x: -pw + 0.18, y: -ph + 0.18 },
      { x:  pw - 0.18, y: -ph + 0.18 },
    ];
    studs.forEach((s) => {
      const stud = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 12),
        goldBright
      );
      stud.position.set(s.x, s.y, 0.1);
      this.keyholeGroup.add(stud);
    });

    // Ornate top/bottom medallions
    const medallion = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.18, 24),
      goldBright
    );
    medallion.position.set(0, ph - 0.22, 0.12);
    this.keyholeGroup.add(medallion);
    const medallionB = medallion.clone();
    medallionB.position.set(0, -ph + 0.22, 0.12);
    this.keyholeGroup.add(medallionB);
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
    this.keyGroup.position.set(KEY_START_POS.x, KEY_START_POS.y, KEY_START_POS.z);
    // Orient key HORIZONTALLY (teeth pointing up toward keyhole)
    this.keyGroup.rotation.z = Math.PI;
    this.scene.add(this.keyGroup);

    // Bow (head)
    const bowOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.10, 24, 48),
      gold
    );
    bowOuter.position.set(0, 1.0, 0);
    this.keyGroup.add(bowOuter);

    const bowInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.045, 20, 36),
      goldBright
    );
    bowInner.position.set(0, 1.0, 0);
    this.keyGroup.add(bowInner);

    // 8-pointed star inside the bow
    const starShape = new THREE.Shape();
    const points = 16;
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 === 0) ? 0.22 : 0.10;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const starGeom = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.018,
      bevelSegments: 3,
    });
    const star = new THREE.Mesh(starGeom, goldBright);
    star.position.set(0, 1.0, -0.04);
    this.keyGroup.add(star);

    // Shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.2, 24),
      gold
    );
    shaft.position.set(0, 0.18, 0);
    this.keyGroup.add(shaft);

    // Decorative collars
    for (const y of [0.55, 0.15, -0.40]) {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.10, 0.05, 20),
        goldBright
      );
      collar.position.set(0, y, 0);
      this.keyGroup.add(collar);
    }

    // Teeth at the bottom (pointing -Y, will be toward keyhole once we flip)
    const teethGroup = new THREE.Group();
    teethGroup.position.set(0, -0.50, 0);
    this.keyGroup.add(teethGroup);

    const teeth = [
      { w: 0.10, y: -0.05 },
      { w: 0.20, y: -0.15 },
      { w: 0.13, y: -0.25 },
    ];
    for (const t of teeth) {
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 + t.w, 0.08, 0.08),
        gold
      );
      tooth.position.set(0.04 + t.w / 2, t.y, 0);
      teethGroup.add(tooth);
    }

    this.keyGroup.scale.setScalar(1.0);
  }

  _buildAura() {
    // Soft warm glow around the key
    const glowGeom = new THREE.PlaneGeometry(3, 4);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffc878,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.aura = new THREE.Mesh(glowGeom, glowMat);
    this.aura.position.copy(this.keyGroup.position);
    this.aura.position.z = -0.5;
    this.scene.add(this.aura);

    // Particle motes
    const count = 180;
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
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.motes = new THREE.Points(geom, mat);
    this.moteVels = vels;
    this.scene.add(this.motes);
  }

  _setupInteraction() {
    this.canvas.style.cursor = 'grab';

    const getNDC = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (event.clientX ?? event.touches?.[0]?.clientX) - rect.left;
      const y = (event.clientY ?? event.touches?.[0]?.clientY) - rect.top;
      this.pointer.x = (x / rect.width) * 2 - 1;
      this.pointer.y = -(y / rect.height) * 2 + 1;
    };

    const onDown = (e) => {
      if (this.state !== 'idle') return;
      getNDC(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObject(this.keyGroup, true);
      if (hits.length > 0) {
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
        // Compute offset between hit point and key origin so the key doesn't jump
        const hit = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, hit);
        this.dragOffset.subVectors(this.keyGroup.position, hit);
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!this.isDragging || this.state !== 'idle') return;
      getNDC(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, hit);
      this.keyGroup.position.x = hit.x + this.dragOffset.x;
      this.keyGroup.position.y = hit.y + this.dragOffset.y;
      this.aura.position.x = this.keyGroup.position.x;
      this.aura.position.y = this.keyGroup.position.y;
      e.preventDefault();
    };

    const onUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';

      // Distance from key origin to its "aligned" position (where teeth meet keyhole)
      const target = new THREE.Vector3(KEY_ALIGNED_POS.x, KEY_ALIGNED_POS.y, KEY_ALIGNED_POS.z);
      const dist = this.keyGroup.position.distanceTo(target);

      if (dist < SNAP_DISTANCE) {
        this._beginUnlock();
      } else {
        this._returnToStart();
      }
    };

    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // Touch
    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }

  _beginUnlock() {
    this.state = 'unlocking';
    this.t0 = performance.now();
    this._snapStartPos = this.keyGroup.position.clone();
    this._snapStartRotZ = this.keyGroup.rotation.z;
    this._onUnlock();
  }

  _returnToStart() {
    // Animate position back to KEY_START_POS over ~400ms
    const startPos = this.keyGroup.position.clone();
    const target = new THREE.Vector3(KEY_START_POS.x, KEY_START_POS.y, KEY_START_POS.z);
    const t0 = performance.now();
    const dur = 400;
    const animate = () => {
      const elapsed = performance.now() - t0;
      const p = Math.min(1, elapsed / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      this.keyGroup.position.lerpVectors(startPos, target, ease);
      this.aura.position.copy(this.keyGroup.position);
      this.aura.position.z = -0.5;
      if (p < 1) requestAnimationFrame(animate);
    };
    animate();
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

  update(dt) {
    const t = performance.now();

    // Compute proximity to ideal aligned position (for glow feedback)
    if (this.state === 'idle') {
      const dx = this.keyGroup.position.x - KEY_ALIGNED_POS.x;
      const dy = this.keyGroup.position.y - KEY_ALIGNED_POS.y;
      const d = Math.hypot(dx, dy);
      // 0 when far (>3.5), 1 when within snap zone
      this._near = Math.max(0, Math.min(1, 1 - (d - SNAP_DISTANCE) / (3.5 - SNAP_DISTANCE)));

      // Idle floating animation when not dragging
      if (!this.isDragging) {
        this.keyGroup.position.x += Math.sin(t * 0.0015) * 0.001;
        this.keyGroup.position.y += Math.sin(t * 0.0018 + 1) * 0.0006;
        this.aura.position.x = this.keyGroup.position.x;
        this.aura.position.y = this.keyGroup.position.y;
      }

      // Aura grows with proximity to keyhole
      this.aura.material.opacity = 0.18 + this._near * 0.35;
      this.aura.scale.setScalar(1 + this._near * 0.3);

      // Keyhole glow brightens with proximity
      this.keyholeGlow.material.opacity = 0.18 + this._near * 0.55;
      this.keyholeGlow.scale.setScalar(1 + this._near * 0.4);
    }

    // Unlocking — snap to keyhole + rotate
    if (this.state === 'unlocking') {
      const elapsed = (t - this.t0) / 1000;
      const phase1Dur = 0.25;  // snap-in
      const phase2Dur = 0.55;  // rotate (90°)
      const phase3Dur = 0.65;  // fly up + fade

      if (elapsed < phase1Dur) {
        // Snap to aligned position
        const p = elapsed / phase1Dur;
        const ease = 1 - Math.pow(1 - p, 3);
        const target = new THREE.Vector3(KEY_ALIGNED_POS.x, KEY_ALIGNED_POS.y, 0);
        this.keyGroup.position.lerpVectors(this._snapStartPos, target, ease);
        this.aura.position.copy(this.keyGroup.position);
      } else if (elapsed < phase1Dur + phase2Dur) {
        const p = (elapsed - phase1Dur) / phase2Dur;
        const ease = p * p;
        // Rotate 90° around z axis from current orientation
        this.keyGroup.rotation.z = this._snapStartRotZ + ease * (Math.PI / 2);
        // Brighten the keyhole glow
        this.keyholeGlow.material.opacity = 0.55 + p * 0.4;
        this.keyholeGlow.scale.setScalar(1.4 + p * 0.5);
      } else if (elapsed < phase1Dur + phase2Dur + phase3Dur) {
        const p = (elapsed - phase1Dur - phase2Dur) / phase3Dur;
        const ease = p * p;
        this.keyGroup.position.y = KEY_ALIGNED_POS.y + ease * 4.5;
        this.keyGroup.rotation.z += dt * 12;
        this.keyGroup.scale.setScalar(1 - ease * 0.6);
        this.keyGroup.traverse((c) => {
          if (c.material) {
            c.material.transparent = true;
            c.material.opacity = 1 - p;
          }
        });
        // Keyhole + plate also fade
        this.plate.material.transparent = true;
        this.plate.material.opacity = 1 - p;
        this.keyholeInteriorMat.opacity = (1 - p) * 0.95;
        this.keyholeGlow.material.opacity = (1 - p) * 0.9;
      } else {
        this.state = 'gone';
      }
    }

    // Particles
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
