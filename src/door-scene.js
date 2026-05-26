import * as THREE from 'three';
import { makeWoodTexture, makeWoodRoughnessTexture, makeUpdatableCanvasTexture } from './textures.js';

export class DoorScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0503);
    this.scene.fog = new THREE.Fog(0x0a0503, 4, 18);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 1.4, 5.2);
    this.camera.lookAt(0, 1.4, 0);

    this._buildScene();
    this._setupResize();
  }

  _buildScene() {
    // ---------- Ambient + key lighting ----------
    const ambient = new THREE.AmbientLight(0x5a3520, 0.8);
    this.scene.add(ambient);

    // Warm front fill so the closed door has soft visibility before opening
    const frontFill = new THREE.DirectionalLight(0xd9a878, 0.9);
    frontFill.position.set(2, 4, 6);
    this.scene.add(frontFill);

    // Small key from above to define the architrave/door edges
    const keyLight = new THREE.DirectionalLight(0xffd29c, 0.5);
    keyLight.position.set(-3, 6, 4);
    this.scene.add(keyLight);

    // ---------- Wall (with door-shaped hole — built as 4 panels around the doorway) ----------
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x140905,
      roughness: 0.95,
      metalness: 0,
    });
    const doorOpenW = 1.6;
    const doorOpenH = 3.2;
    const wallZ = -0.06;
    // Top strip
    const wallTop = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMat);
    wallTop.position.set(0, doorOpenH + 3, wallZ);
    this.scene.add(wallTop);
    // Bottom strip
    const wallBot = new THREE.Mesh(new THREE.PlaneGeometry(20, 3), wallMat);
    wallBot.position.set(0, -1.5, wallZ);
    this.scene.add(wallBot);
    // Left
    const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(10, doorOpenH + 0.4), wallMat);
    wallLeft.position.set(-(doorOpenW / 2 + 5 + 0.05), doorOpenH / 2, wallZ);
    this.scene.add(wallLeft);
    // Right
    const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(10, doorOpenH + 0.4), wallMat);
    wallRight.position.set((doorOpenW / 2 + 5 + 0.05), doorOpenH / 2, wallZ);
    this.scene.add(wallRight);

    // ---------- Frame plane (video frames painted here, behind the door) ----------
    const { texture: frameTex, canvas: frameCanvas, ctx: frameCtx } = makeUpdatableCanvasTexture(1024, 1024);
    this.frameTexture = frameTex;
    this.frameCanvas = frameCanvas;
    this.frameCtx = frameCtx;

    const framePlaneGeom = new THREE.PlaneGeometry(1.7, 3.2);
    const framePlaneMat = new THREE.MeshBasicMaterial({
      map: frameTex,
      toneMapped: true,
    });
    this.framePlane = new THREE.Mesh(framePlaneGeom, framePlaneMat);
    this.framePlane.position.set(0, 1.55, -0.8);
    this.scene.add(this.framePlane);

    // ---------- Warm "room behind the door" light ----------
    // Sits between the frame plane and the door, casts warm light forward
    this.warmLight = new THREE.PointLight(0xffb066, 0, 8, 1.6);
    this.warmLight.position.set(0, 1.6, -0.25);
    this.scene.add(this.warmLight);

    // A secondary spotlight that points at the door from behind for rim
    this.rimLight = new THREE.SpotLight(0xffd09a, 0, 10, Math.PI / 3, 0.7, 1.4);
    this.rimLight.position.set(0, 1.5, -1.4);
    this.rimLight.target.position.set(0, 1.5, 1);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    // ---------- Door frame (architrave) ----------
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x2c1a0a,
      roughness: 0.85,
      metalness: 0.0,
    });
    const archThickness = 0.12;
    const archDepth = 0.15;
    const doorW = 1.6;
    const doorH = 3.2;

    // Top
    const archTop = new THREE.Mesh(
      new THREE.BoxGeometry(doorW + archThickness * 2 + 0.05, archThickness, archDepth),
      archMat
    );
    archTop.position.set(0, doorH + archThickness / 2 - 0.05, 0);
    this.scene.add(archTop);

    // Left
    const archLeft = new THREE.Mesh(
      new THREE.BoxGeometry(archThickness, doorH, archDepth),
      archMat
    );
    archLeft.position.set(-(doorW / 2 + archThickness / 2), doorH / 2, 0);
    this.scene.add(archLeft);

    // Right
    const archRight = archLeft.clone();
    archRight.position.x = (doorW / 2 + archThickness / 2);
    this.scene.add(archRight);

    // Threshold (floor lip)
    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(doorW + archThickness * 2 + 0.05, archThickness * 0.6, archDepth),
      archMat
    );
    threshold.position.set(0, -archThickness * 0.3, 0);
    this.scene.add(threshold);

    // ---------- The Door itself ----------
    const woodTex = makeWoodTexture(512, 1024);
    const roughTex = makeWoodRoughnessTexture(256, 512);

    const doorMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughnessMap: roughTex,
      roughness: 0.75,
      metalness: 0.05,
      color: 0xffffff,
    });

    // Pivot group so the door rotates around its left edge (hinge)
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-doorW / 2, doorH / 2, 0);
    this.scene.add(this.doorPivot);

    const doorGeom = new THREE.BoxGeometry(doorW, doorH, 0.08);
    this.door = new THREE.Mesh(doorGeom, doorMat);
    // Offset the door so its left edge is at the pivot
    this.door.position.set(doorW / 2, 0, 0);
    this.doorPivot.add(this.door);

    // Raised door panels (decorative)
    const panelMat = new THREE.MeshStandardMaterial({
      map: woodTex.clone(),
      roughness: 0.6,
      metalness: 0.05,
      color: 0xb88b5a,
    });
    panelMat.map.needsUpdate = true;

    const panelGeom = new THREE.BoxGeometry(doorW * 0.6, doorH * 0.28, 0.02);
    // Top panel
    const panelTop = new THREE.Mesh(panelGeom, panelMat);
    panelTop.position.set(doorW / 2, doorH * 0.28, 0.05);
    this.doorPivot.add(panelTop);
    // Bottom panel
    const panelBot = new THREE.Mesh(panelGeom, panelMat);
    panelBot.position.set(doorW / 2, -doorH * 0.28, 0.05);
    this.doorPivot.add(panelBot);

    // ---------- Brass handle ----------
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc8a55a,
      roughness: 0.25,
      metalness: 0.9,
    });
    const handleBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16),
      brassMat
    );
    handleBase.rotation.x = Math.PI / 2;
    handleBase.position.set(doorW * 0.9, 0, 0.07);
    this.doorPivot.add(handleBase);

    const handleKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 24, 16),
      brassMat
    );
    handleKnob.position.set(doorW * 0.9, 0, 0.12);
    this.doorPivot.add(handleKnob);

    // ---------- Dust particles ----------
    this._buildParticles();

    // ---------- God-ray volume (a soft warm plane in front of the door) ----------
    this.glowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 5),
      new THREE.MeshBasicMaterial({
        color: 0xffb066,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.glowPlane.position.set(0, 1.6, 0.4);
    this.scene.add(this.glowPlane);
  }

  _buildParticles() {
    const count = 240;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.3) * 3;
      velocities[i] = 0.0005 + Math.random() * 0.001;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffd9a8,
      size: 0.03,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geom, mat);
    this.particleVelocities = velocities;
    this.scene.add(this.particles);
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

  // Paint the current video frame onto the texture for the plane behind the door.
  updateFrameImage(img) {
    if (!img) return;
    const cw = this.frameCanvas.width;
    const ch = this.frameCanvas.height;
    const ctx = this.frameCtx;
    ctx.fillStyle = '#0a0503';
    ctx.fillRect(0, 0, cw, ch);

    // Letterbox/cover the image into the canvas
    const ir = img.width / img.height;
    const cr = cw / ch;
    let dw, dh;
    if (ir > cr) {
      dh = ch;
      dw = ch * ir;
    } else {
      dw = cw;
      dh = cw / ir;
    }
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    this.frameTexture.needsUpdate = true;
  }

  // Master update: state is { doorAngle, lightIntensity, cameraZ, glowOpacity, particlePulse }
  update(state, dt) {
    this.doorPivot.rotation.y = -state.doorAngle;          // negative = opens away from camera
    this.warmLight.intensity = state.lightIntensity * 5.5;
    this.rimLight.intensity = state.lightIntensity * 4;
    this.camera.position.z = state.cameraZ;
    this.camera.position.y = 1.4 + state.cameraLift;
    this.glowPlane.material.opacity = state.glowOpacity;
    this.glowPlane.scale.setScalar(1 + state.glowOpacity * 0.6);

    // Particles drift slowly upward
    const positions = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleVelocities.length; i++) {
      positions[i * 3 + 1] += this.particleVelocities[i] * (60 * (dt || 0.016));
      if (positions[i * 3 + 1] > 4.5) {
        positions[i * 3 + 1] = -0.2;
        positions[i * 3 + 0] = (Math.random() - 0.5) * 6;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // Subtle particle brightness pulse with warm light
    this.particles.material.opacity = 0.35 + state.lightIntensity * 0.4;
  }

  setSceneOpacity(o) {
    this.renderer.domElement.style.opacity = o;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
