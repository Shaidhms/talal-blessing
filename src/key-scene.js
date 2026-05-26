import * as THREE from 'three';

// 3D ornate gold key + keyhole plate, rendered with real depth — tilted
// perspective, thick extruded geometry, strong PBR lighting. User drags
// the key into the keyhole; once close enough, magnetic pull snaps it in,
// it rotates 90° (the lock turn), then dissolves to unlock the page.

const SNAP_DISTANCE = 1.5;
const MAGNET_DISTANCE = 2.5;          // start pulling toward keyhole within this radius
const KEY_START_POS = { x: 0, y: -2.0, z: 0 };
const KEYHOLE_POS   = { x: 0, y:  1.6, z: 0 };
const KEY_ALIGNED_POS = { x: 0, y: 0.6, z: 0 };  // teeth meet the hole

export class KeyScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();

    // Tilted camera for a 3D feel — looking slightly upward at the scene
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, -0.4, 9);
    this.camera.lookAt(0, 0.2, 0);

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
    this.targetPos = new THREE.Vector3(KEY_START_POS.x, KEY_START_POS.y, KEY_START_POS.z);
    this._near = 0;

    this.state = 'idle';
    this.t0 = 0;
    this._onUnlock = () => {};

    this._setupInteraction();
  }

  setOnUnlock(fn) { this._onUnlock = fn; }

  _buildLights() {
    // Hemisphere — warm sky, cool ground (subtle ambient variation)
    const hemi = new THREE.HemisphereLight(0xffe9c4, 0x1a0608, 0.6);
    this.scene.add(hemi);

    // Strong key light from upper-right (creates highlights on the gold)
    const key = new THREE.DirectionalLight(0xfff0c8, 1.6);
    key.position.set(4, 5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    // Cool fill from lower-left (separation)
    const fill = new THREE.DirectionalLight(0x8a6a4a, 0.4);
    fill.position.set(-4, -2, 4);
    this.scene.add(fill);

    // Warm rim from behind (golden edge glow)
    const rim = new THREE.DirectionalLight(0xffd080, 0.9);
    rim.position.set(0, 0, -4);
    this.scene.add(rim);

    // Point light just in front of the keyhole — makes the gold pop
    this.keyholeLight = new THREE.PointLight(0xffc070, 1.2, 6, 1.5);
    this.keyholeLight.position.set(KEYHOLE_POS.x, KEYHOLE_POS.y, 1.5);
    this.scene.add(this.keyholeLight);
  }

  _buildKeyhole() {
    this.keyholeGroup = new THREE.Group();
    this.keyholeGroup.position.set(KEYHOLE_POS.x, KEYHOLE_POS.y, KEYHOLE_POS.z);
    // Subtle tilt for 3D depth
    this.keyholeGroup.rotation.x = -0.18;
    this.scene.add(this.keyholeGroup);

    const goldPlate = new THREE.MeshStandardMaterial({
      color: 0x9a6820, metalness: 0.92, roughness: 0.35,
      emissive: 0x3a1f08, emissiveIntensity: 0.45,
    });
    const goldBright = new THREE.MeshStandardMaterial({
      color: 0xfff0c8, metalness: 1.0, roughness: 0.18,
      emissive: 0x8a5a18, emissiveIntensity: 0.5,
    });

    // Ornate plate with rounded corners
    const plateShape = new THREE.Shape();
    const pw = 1.4, ph = 1.95, pr = 0.28;
    plateShape.moveTo(-pw + pr, -ph);
    plateShape.lineTo(pw - pr, -ph);
    plateShape.quadraticCurveTo(pw, -ph, pw, -ph + pr);
    plateShape.lineTo(pw, ph - pr);
    plateShape.quadraticCurveTo(pw, ph, pw - pr, ph);
    plateShape.lineTo(-pw + pr, ph);
    plateShape.quadraticCurveTo(-pw, ph, -pw, ph - pr);
    plateShape.lineTo(-pw, -ph + pr);
    plateShape.quadraticCurveTo(-pw, -ph, -pw + pr, -ph);

    // Keyhole cutout
    const cr = 0.34;
    const slotW = 0.20;
    const slotBottom = -0.95;
    const holePath = new THREE.Path();
    holePath.absarc(0, 0.3, cr, 0, Math.PI * 2, false);
    plateShape.holes.push(holePath);
    const slotPath = new THREE.Path();
    slotPath.moveTo(-slotW, 0.3);
    slotPath.lineTo(-slotW, slotBottom);
    slotPath.lineTo(slotW, slotBottom);
    slotPath.lineTo(slotW, 0.3);
    slotPath.lineTo(-slotW, 0.3);
    plateShape.holes.push(slotPath);

    const plateGeom = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 4,
    });
    plateGeom.center();
    this.plate = new THREE.Mesh(plateGeom, goldPlate);
    this.plate.castShadow = true;
    this.plate.receiveShadow = true;
    this.keyholeGroup.add(this.plate);

    // Inner darkness inside the keyhole (a black plane behind)
    this.keyholeInteriorMat = new THREE.MeshBasicMaterial({
      color: 0x0a0500, transparent: true, opacity: 0.95,
    });
    const interiorShape = new THREE.Shape();
    interiorShape.absarc(0, 0.3, cr - 0.02, 0, Math.PI * 2, false);
    const interiorSlot = new THREE.Path();
    interiorSlot.moveTo(-slotW + 0.02, 0.3);
    interiorSlot.lineTo(-slotW + 0.02, slotBottom);
    interiorSlot.lineTo(slotW - 0.02, slotBottom);
    interiorSlot.lineTo(slotW - 0.02, 0.3);
    interiorSlot.lineTo(-slotW + 0.02, 0.3);
    interiorShape.holes.push(interiorSlot);
    const interiorGeom = new THREE.ShapeGeometry(interiorShape);
    this.keyholeInterior = new THREE.Mesh(interiorGeom, this.keyholeInteriorMat);
    this.keyholeInterior.position.set(0, 0, -0.16);
    this.keyholeGroup.add(this.keyholeInterior);

    // Warm glow plane behind the keyhole
    this.keyholeGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 2.3),
      new THREE.MeshBasicMaterial({
        color: 0xffb060, transparent: true, opacity: 0.22,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    this.keyholeGlow.position.z = -0.4;
    this.keyholeGroup.add(this.keyholeGlow);

    // Decorative studs
    [[-pw + 0.20, ph - 0.20], [pw - 0.20, ph - 0.20], [-pw + 0.20, -ph + 0.20], [pw - 0.20, -ph + 0.20]]
      .forEach(([x, y]) => {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), goldBright);
        stud.position.set(x, y, 0.20);
        stud.castShadow = true;
        this.keyholeGroup.add(stud);
      });

    // Top + bottom medallions
    const top = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.04, 16, 24),
      goldBright
    );
    top.position.set(0, ph - 0.30, 0.20);
    top.castShadow = true;
    this.keyholeGroup.add(top);
    const bot = top.clone();
    bot.position.set(0, -ph + 0.30, 0.20);
    this.keyholeGroup.add(bot);
  }

  _buildKey() {
    const goldDark = new THREE.MeshStandardMaterial({
      color: 0xb88a30, metalness: 0.95, roughness: 0.25,
      emissive: 0x4a2a08, emissiveIntensity: 0.35,
    });
    const goldBright = new THREE.MeshStandardMaterial({
      color: 0xfff0c8, metalness: 1.0, roughness: 0.12,
      emissive: 0x8a5a18, emissiveIntensity: 0.55,
    });

    this.keyGroup = new THREE.Group();
    this.keyGroup.position.set(KEY_START_POS.x, KEY_START_POS.y, KEY_START_POS.z);
    this.keyGroup.rotation.z = Math.PI;       // teeth point up
    this.keyGroup.rotation.x = -0.18;         // matches keyhole tilt
    this.scene.add(this.keyGroup);

    // Bow (head) — chunky torus
    const bow = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.14, 32, 64),
      goldDark
    );
    bow.position.set(0, 1.05, 0);
    bow.castShadow = true;
    this.keyGroup.add(bow);

    // Inner bow ring (bright accent)
    const bowInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.30, 0.06, 24, 48),
      goldBright
    );
    bowInner.position.set(0, 1.05, 0);
    this.keyGroup.add(bowInner);

    // 8-pointed star inside the bow — extruded thick
    const starShape = new THREE.Shape();
    const points = 16;
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 === 0) ? 0.26 : 0.12;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const starGeom = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 4,
    });
    const star = new THREE.Mesh(starGeom, goldBright);
    star.position.set(0, 1.05, -0.10);
    star.castShadow = true;
    this.keyGroup.add(star);

    // Shaft — long cylinder
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 1.35, 24),
      goldDark
    );
    shaft.position.set(0, 0.20, 0);
    shaft.castShadow = true;
    this.keyGroup.add(shaft);

    // Three decorative collars
    for (const y of [0.65, 0.18, -0.40]) {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.07, 24),
        goldBright
      );
      collar.position.set(0, y, 0);
      collar.castShadow = true;
      this.keyGroup.add(collar);
    }

    // Teeth — three small extruded boxes pointing -X (will be at the top after flip)
    const teethGroup = new THREE.Group();
    teethGroup.position.set(0, -0.55, 0);
    this.keyGroup.add(teethGroup);

    const teeth = [
      { w: 0.10, y: -0.04, depth: 0.14 },
      { w: 0.22, y: -0.18, depth: 0.14 },
      { w: 0.14, y: -0.30, depth: 0.14 },
    ];
    for (const t of teeth) {
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.10 + t.w, 0.10, t.depth),
        goldDark
      );
      tooth.position.set(0.05 + t.w / 2, t.y, 0);
      tooth.castShadow = true;
      teethGroup.add(tooth);
    }

    this.keyGroup.scale.setScalar(1.0);
  }

  _buildAura() {
    // Warm glow behind the key
    this.aura = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 4.5),
      new THREE.MeshBasicMaterial({
        color: 0xffc070, transparent: true, opacity: 0.20,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    this.aura.position.copy(this.keyGroup.position);
    this.aura.position.z = -0.6;
    this.scene.add(this.aura);

    // Dust motes
    const count = 220;
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1;
      vels[i] = 0.0005 + Math.random() * 0.0012;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd680, size: 0.035,
      transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending,
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
      // Hit-test against a generous bounding sphere — the whole key group
      const hits = this.raycaster.intersectObject(this.keyGroup, true);
      // Also accept clicks within 1.2 world units of the key position
      // (so the user doesn't have to hit a tiny geometry pixel)
      const hitPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, hitPoint);
      const distToKey = hitPoint.distanceTo(this.keyGroup.position);
      if (hits.length > 0 || distToKey < 1.2) {
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
        this.dragOffset.subVectors(this.keyGroup.position, hitPoint);
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!this.isDragging || this.state !== 'idle') return;
      getNDC(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, hit);
      this.targetPos.x = hit.x + this.dragOffset.x;
      this.targetPos.y = hit.y + this.dragOffset.y;

      // Magnetic pull when near the keyhole aligned position
      const alignTarget = new THREE.Vector3(KEY_ALIGNED_POS.x, KEY_ALIGNED_POS.y, 0);
      const distToAlign = this.targetPos.distanceTo(alignTarget);
      if (distToAlign < MAGNET_DISTANCE) {
        // Blend toward alignment — stronger pull the closer you are
        const pull = 1 - (distToAlign / MAGNET_DISTANCE);   // 0..1
        const pullStrength = pull * pull * 0.55;            // ease into the snap zone
        this.targetPos.lerp(alignTarget, pullStrength);
      }

      e.preventDefault();
    };

    const onUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';

      const target = new THREE.Vector3(KEY_ALIGNED_POS.x, KEY_ALIGNED_POS.y, 0);
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
    this.targetPos.set(KEY_START_POS.x, KEY_START_POS.y, KEY_START_POS.z);
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

    if (this.state === 'idle') {
      // Idle floating
      if (!this.isDragging) {
        this.targetPos.x += Math.sin(t * 0.0014) * 0.0008;
        this.targetPos.y += Math.sin(t * 0.0017 + 1) * 0.0005;
      }

      // Smooth lerp toward target position — this is what makes drag buttery
      const lerpFactor = this.isDragging ? 0.35 : 0.12;
      this.keyGroup.position.x += (this.targetPos.x - this.keyGroup.position.x) * lerpFactor;
      this.keyGroup.position.y += (this.targetPos.y - this.keyGroup.position.y) * lerpFactor;

      // Sync aura to key
      this.aura.position.x = this.keyGroup.position.x;
      this.aura.position.y = this.keyGroup.position.y;

      // Proximity (0=far, 1=in snap zone)
      const dx = this.keyGroup.position.x - KEY_ALIGNED_POS.x;
      const dy = this.keyGroup.position.y - KEY_ALIGNED_POS.y;
      const d = Math.hypot(dx, dy);
      this._near = Math.max(0, Math.min(1, 1 - (d - SNAP_DISTANCE) / (4 - SNAP_DISTANCE)));

      // Aura + keyhole glow ramp with proximity
      this.aura.material.opacity = 0.18 + this._near * 0.4;
      this.aura.scale.setScalar(1 + this._near * 0.35);
      this.keyholeGlow.material.opacity = 0.22 + this._near * 0.55 + (this._near > 0.7 ? Math.sin(t * 0.012) * 0.1 : 0);
      this.keyholeGlow.scale.setScalar(1 + this._near * 0.5);

      // When the key is very close, the keyhole point-light pulses
      this.keyholeLight.intensity = 1.2 + this._near * 1.5 + (this._near > 0.8 ? Math.sin(t * 0.015) * 0.4 : 0);
    }

    if (this.state === 'unlocking') {
      const elapsed = (t - this.t0) / 1000;
      const phase1 = 0.25, phase2 = 0.55, phase3 = 0.7;

      if (elapsed < phase1) {
        const p = elapsed / phase1;
        const ease = 1 - Math.pow(1 - p, 3);
        const target = new THREE.Vector3(KEY_ALIGNED_POS.x, KEY_ALIGNED_POS.y, 0);
        this.keyGroup.position.lerpVectors(this._snapStartPos, target, ease);
        this.aura.position.copy(this.keyGroup.position);
      } else if (elapsed < phase1 + phase2) {
        const p = (elapsed - phase1) / phase2;
        const ease = p * p;
        this.keyGroup.rotation.z = this._snapStartRotZ + ease * (Math.PI / 2);
        this.keyholeGlow.material.opacity = 0.6 + p * 0.4;
        this.keyholeLight.intensity = 2.5 + p * 2;
      } else if (elapsed < phase1 + phase2 + phase3) {
        const p = (elapsed - phase1 - phase2) / phase3;
        const ease = p * p;
        this.keyGroup.position.y = KEY_ALIGNED_POS.y + ease * 5;
        this.keyGroup.rotation.z += dt * 12;
        this.keyGroup.scale.setScalar(1 - ease * 0.6);
        this.keyGroup.traverse((c) => {
          if (c.material) { c.material.transparent = true; c.material.opacity = 1 - p; }
        });
        this.plate.material.transparent = true;
        this.plate.material.opacity = 1 - p;
        this.keyholeInteriorMat.opacity = (1 - p) * 0.95;
        this.keyholeGlow.material.opacity = (1 - p) * 0.9;
        this.keyholeLight.intensity = (1 - p) * 4;
      } else {
        this.state = 'gone';
      }
    }

    // Motes drift up
    const positions = this.motes.geometry.attributes.position.array;
    for (let i = 0; i < this.moteVels.length; i++) {
      positions[i * 3 + 1] += this.moteVels[i] * (60 * dt);
      if (positions[i * 3 + 1] > 3.5) positions[i * 3 + 1] = -3.5;
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
