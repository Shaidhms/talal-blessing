import * as THREE from 'three';

// Cockpit-style entry: 4 ornate 3D knobs arranged in a 2x2 grid, each placed
// at the visual center of its screen quadrant. User clicks them in any order;
// each click turns its knob 90° and triggers the corresponding panel to open.

// Knob world positions — tuned to appear roughly at the center of each screen quadrant
const KNOBS = [
  { id: 'tl', x: -2.6, y:  1.5 },
  { id: 'tr', x:  2.6, y:  1.5 },
  { id: 'bl', x: -2.6, y: -1.5 },
  { id: 'br', x:  2.6, y: -1.5 },
];

export class CockpitScene {
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
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    this.knobs = [];       // [{ id, group, body, indicator, turned, hover, target, baseY, ... }]
    this.activated = new Set();

    this._buildLights();
    this._buildKnobs();
    this._buildMotes();
    this._setupResize();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._hoveredId = null;
    this._onKnobActivate = () => {};
    this._onAllActivated = () => {};

    this._setupInteraction();
  }

  setOnKnobActivate(fn) { this._onKnobActivate = fn; }
  setOnAllActivated(fn) { this._onAllActivated = fn; }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xffe9c4, 0x1a0608, 0.55));

    const key = new THREE.DirectionalLight(0xfff0c8, 1.5);
    key.position.set(3, 4, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x8a6a4a, 0.4);
    fill.position.set(-3, -2, 4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffd080, 0.7);
    rim.position.set(0, 0, -4);
    this.scene.add(rim);

    // One small point light per knob — warm pop on the gold caps
    this.knobLights = KNOBS.map((k) => {
      const l = new THREE.PointLight(0xffc070, 0.8, 4, 1.4);
      l.position.set(k.x, k.y, 1.2);
      this.scene.add(l);
      return l;
    });
  }

  _buildKnobs() {
    const goldDark = new THREE.MeshStandardMaterial({
      color: 0x9a6820, metalness: 0.95, roughness: 0.32,
      emissive: 0x3a1f08, emissiveIntensity: 0.35,
    });
    const goldBright = new THREE.MeshStandardMaterial({
      color: 0xfff0c8, metalness: 1.0, roughness: 0.18,
      emissive: 0x8a5a18, emissiveIntensity: 0.5,
    });
    const ruby = new THREE.MeshStandardMaterial({
      color: 0xff5530, metalness: 0.4, roughness: 0.35,
      emissive: 0xff2200, emissiveIntensity: 0.7,
    });

    KNOBS.forEach((k) => {
      const group = new THREE.Group();
      group.position.set(k.x, k.y, 0);
      this.scene.add(group);

      // Base ring (the bezel) — flat ornate disc
      const baseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.78, 36),
        goldDark
      );
      baseRing.position.z = 0.02;
      group.add(baseRing);

      // Ornate teeth around the bezel
      const teethGeom = new THREE.TorusGeometry(0.78, 0.04, 8, 64);
      const bezelEdge = new THREE.Mesh(teethGeom, goldBright);
      bezelEdge.position.z = 0.04;
      group.add(bezelEdge);

      // Base plate (raised cylinder behind the knob)
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.6, 0.18, 32),
        goldDark
      );
      base.rotation.x = Math.PI / 2;
      base.position.z = 0.05;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      // The actual knob (cylinder)
      const knobBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.46, 0.32, 36),
        goldBright
      );
      knobBody.rotation.x = Math.PI / 2;
      knobBody.position.z = 0.22;
      knobBody.castShadow = true;
      group.add(knobBody);

      // Top face of knob — a slightly darker recessed disc
      const topFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.04, 32),
        goldDark
      );
      topFace.rotation.x = Math.PI / 2;
      topFace.position.z = 0.40;
      group.add(topFace);

      // Indicator notch — a small box on top pointing "up" by default
      const indicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.32, 0.06),
        ruby
      );
      indicator.position.z = 0.42;
      group.add(indicator);

      // Tiny LED below the knob
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 12),
        ruby
      );
      led.position.set(0, -0.95, 0.1);
      group.add(led);

      // Glow aura behind the knob
      const aura = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshBasicMaterial({
          color: 0xffc070, transparent: true, opacity: 0.18,
          depthWrite: false, blending: THREE.AdditiveBlending,
        })
      );
      aura.position.z = -0.3;
      group.add(aura);

      // Make geometry hit-testable
      knobBody.userData.knobId = k.id;
      topFace.userData.knobId = k.id;
      indicator.userData.knobId = k.id;
      base.userData.knobId = k.id;

      this.knobs.push({
        id: k.id,
        group,
        indicator,
        knobBody,
        topFace,
        led,
        aura,
        turned: false,
        hover: 0,
        targetHover: 0,
        rotZ: 0,         // current visual rotation of the indicator
        targetRotZ: 0,   // target rotation (we'll lerp toward it)
        baseY: k.y,
      });
    });
  }

  _buildMotes() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1;
      vels[i] = 0.0005 + Math.random() * 0.0012;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd680, size: 0.03,
      transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.motes = new THREE.Points(geom, mat);
    this.moteVels = vels;
    this.scene.add(this.motes);
  }

  _setupInteraction() {
    const getNDC = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const cx = event.clientX ?? event.touches?.[0]?.clientX;
      const cy = event.clientY ?? event.touches?.[0]?.clientY;
      const x = cx - rect.left;
      const y = cy - rect.top;
      this.pointer.x = (x / rect.width) * 2 - 1;
      this.pointer.y = -(y / rect.height) * 2 + 1;
    };

    const hitTestKnob = () => {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      // Build a flat array of all hit-testable knob meshes
      const meshes = [];
      this.knobs.forEach((k) => {
        meshes.push(k.knobBody, k.topFace, k.indicator);
        k.group.children.forEach((c) => {
          if (c.userData?.knobId) meshes.push(c);
        });
      });
      const hits = this.raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const hit = hits[0];
        return hit.object.userData?.knobId
          ?? (hit.object.parent && hit.object.parent.parent && this.knobs.find(k => k.group === hit.object.parent.parent)?.id)
          ?? null;
      }
      return null;
    };

    const onMove = (e) => {
      getNDC(e);
      const id = hitTestKnob();
      if (id !== this._hoveredId) {
        this._hoveredId = id;
        this.canvas.style.cursor = id ? 'pointer' : 'default';
        this.knobs.forEach((k) => { k.targetHover = (k.id === id) ? 1 : 0; });
      }
    };

    const onDown = (e) => {
      getNDC(e);
      const id = hitTestKnob();
      if (id) {
        this._activate(id);
        e.preventDefault();
      }
    };

    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('touchstart', (e) => { onDown(e); }, { passive: false });
  }

  _activate(id) {
    const knob = this.knobs.find((k) => k.id === id);
    if (!knob || knob.turned) return;
    knob.turned = true;
    knob.targetRotZ = Math.PI / 2;   // rotate the indicator 90°
    this.activated.add(id);
    this._onKnobActivate(id);
    if (this.activated.size === KNOBS.length) {
      setTimeout(() => this._onAllActivated(), 400);
    }
  }

  _setupResize() {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      // Adjust knob positions slightly based on aspect (wider screens, push knobs out more)
      const aspectScale = Math.min(1.4, Math.max(0.85, w / h / 1.6));
      this.knobs.forEach((knob, i) => {
        const K = KNOBS[i];
        knob.group.position.x = K.x * aspectScale;
      });
    };
    window.addEventListener('resize', onResize);
    onResize();
  }

  update(dt) {
    const t = performance.now();

    this.knobs.forEach((k) => {
      // Smooth hover transition
      k.hover += (k.targetHover - k.hover) * 0.12;

      // Smooth indicator rotation
      const rotDelta = k.targetRotZ - k.rotZ;
      if (Math.abs(rotDelta) > 0.001) {
        k.rotZ += rotDelta * 0.18;     // ease toward target
        k.indicator.rotation.z = k.rotZ;
      }

      // Idle gentle float (only if not yet turned)
      if (!k.turned) {
        const float = Math.sin(t * 0.0014 + k.id.charCodeAt(0)) * 0.025;
        k.group.position.y = k.baseY + float;
      }

      // Hover bump — knob lifts slightly
      const scale = 1 + k.hover * 0.07;
      k.knobBody.scale.set(scale, 1, scale);
      k.topFace.scale.set(scale, 1, scale);

      // Aura ramps with hover + when turned
      const auraOp = 0.18 + k.hover * 0.3 + (k.turned ? 0.35 : 0);
      k.aura.material.opacity = auraOp;
      k.aura.scale.setScalar(1 + k.hover * 0.2 + (k.turned ? 0.3 : 0));

      // LED brightens when turned
      const turnedAmt = k.turned ? 1 : 0;
      k.led.material.emissiveIntensity = 0.5 + turnedAmt * 1.0 + Math.sin(t * 0.005 + k.id.charCodeAt(0)) * 0.15;

      // Indicator turns green-ish glow when turned — boost emissive
      k.indicator.material.emissiveIntensity = 0.7 + turnedAmt * 0.8;
    });

    // Knob point-lights brighten when their knob is hovered or turned
    this.knobLights.forEach((l, i) => {
      const k = this.knobs[i];
      l.intensity = 0.8 + k.hover * 1.0 + (k.turned ? 1.2 : 0);
    });

    // Motes drift
    const positions = this.motes.geometry.attributes.position.array;
    for (let i = 0; i < this.moteVels.length; i++) {
      positions[i * 3 + 1] += this.moteVels[i] * (60 * dt);
      if (positions[i * 3 + 1] > 3.5) positions[i * 3 + 1] = -3.5;
    }
    this.motes.geometry.attributes.position.needsUpdate = true;
  }

  fadeOut(durationMs = 1000) {
    // Fade the whole canvas
    const startOp = parseFloat(this.canvas.style.opacity || '1');
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / durationMs);
      this.canvas.style.opacity = startOp * (1 - p);
      if (p < 1) requestAnimationFrame(step);
      else this.canvas.style.display = 'none';
    };
    requestAnimationFrame(step);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
