import * as THREE from 'three';
import { makeOrnateArchTexture, makeGoldFiligreePattern, makeUpdatableCanvasTexture } from './textures.js';

// ARCH-SHAPE constants (pointed Islamic mihrab arch built from a Shape)
const ARCH_W = 1.8;
const ARCH_BASE_H = 1.6;          // rectangular base
const ARCH_PEAK_H = ARCH_BASE_H + 1.4;  // tip of the pointed arch
const ARCH_HALF_W = ARCH_W / 2;

function makeArchShape() {
  const s = new THREE.Shape();
  s.moveTo(-ARCH_HALF_W, 0);
  s.lineTo(-ARCH_HALF_W, ARCH_BASE_H);
  // Pointed arch — two bezier curves meeting at the top
  s.bezierCurveTo(
    -ARCH_HALF_W, ARCH_BASE_H + 0.5,
    -ARCH_HALF_W * 0.6, ARCH_PEAK_H,
    0, ARCH_PEAK_H
  );
  s.bezierCurveTo(
    ARCH_HALF_W * 0.6, ARCH_PEAK_H,
    ARCH_HALF_W, ARCH_BASE_H + 0.5,
    ARCH_HALF_W, ARCH_BASE_H
  );
  s.lineTo(ARCH_HALF_W, 0);
  s.lineTo(-ARCH_HALF_W, 0);
  return s;
}

// Build the "wall" as a big rectangle with the arch shape cut out
function makeWallWithArchHole() {
  const wallW = 30;
  const wallH = 16;
  const outer = new THREE.Shape();
  outer.moveTo(-wallW / 2, -2);
  outer.lineTo(-wallW / 2, wallH);
  outer.lineTo(wallW / 2, wallH);
  outer.lineTo(wallW / 2, -2);
  outer.lineTo(-wallW / 2, -2);

  // Hole = arch
  const hole = new THREE.Path();
  hole.moveTo(-ARCH_HALF_W, 0);
  hole.lineTo(-ARCH_HALF_W, ARCH_BASE_H);
  hole.bezierCurveTo(
    -ARCH_HALF_W, ARCH_BASE_H + 0.5,
    -ARCH_HALF_W * 0.6, ARCH_PEAK_H,
    0, ARCH_PEAK_H
  );
  hole.bezierCurveTo(
    ARCH_HALF_W * 0.6, ARCH_PEAK_H,
    ARCH_HALF_W, ARCH_BASE_H + 0.5,
    ARCH_HALF_W, ARCH_BASE_H
  );
  hole.lineTo(ARCH_HALF_W, 0);
  hole.lineTo(-ARCH_HALF_W, 0);
  outer.holes.push(hole);
  return outer;
}

export class DoorScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0612);
    this.scene.fog = new THREE.Fog(0x0a0612, 5, 22);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 1.4, 5.6);
    this.camera.lookAt(0, 1.5, 0);

    this._buildScene();
    this._setupResize();
  }

  _buildScene() {
    // ---------- Lighting ----------
    this.scene.add(new THREE.AmbientLight(0x4a2f1a, 1.0));

    const keyLight = new THREE.DirectionalLight(0xffd99c, 1.1);
    keyLight.position.set(2, 5, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8a6a4a, 0.5);
    fillLight.position.set(-3, 2, 6);
    this.scene.add(fillLight);

    // ---------- Wall (deep navy with cut-out arch) ----------
    const wallShape = makeWallWithArchHole();
    const wallGeom = new THREE.ShapeGeometry(wallShape);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0e0a1a,
      roughness: 0.95,
      metalness: 0,
    });
    this.wall = new THREE.Mesh(wallGeom, wallMat);
    this.wall.position.set(0, 0, 0);
    this.scene.add(this.wall);

    // ---------- Gold filigree border around the arch ----------
    const filigreeTex = makeGoldFiligreePattern();
    const filigreeMat = new THREE.MeshStandardMaterial({
      map: filigreeTex,
      transparent: true,
      alphaTest: 0.05,
      emissive: 0x6a4a18,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });

    // Build filigree border by extruding the arch shape into a thin ring
    const archShape = makeArchShape();
    const innerArchShape = makeArchShape();
    // Inset the inner shape to create a "frame" ring (we'll do this via an offset Shape)
    const ringShape = new THREE.Shape();
    {
      const s = ringShape;
      const inset = 0.18;
      s.moveTo(-ARCH_HALF_W - inset, -inset);
      s.lineTo(-ARCH_HALF_W - inset, ARCH_BASE_H);
      s.bezierCurveTo(
        -ARCH_HALF_W - inset, ARCH_BASE_H + 0.55,
        -ARCH_HALF_W * 0.55, ARCH_PEAK_H + inset * 1.2,
        0, ARCH_PEAK_H + inset * 1.2
      );
      s.bezierCurveTo(
        ARCH_HALF_W * 0.55, ARCH_PEAK_H + inset * 1.2,
        ARCH_HALF_W + inset, ARCH_BASE_H + 0.55,
        ARCH_HALF_W + inset, ARCH_BASE_H
      );
      s.lineTo(ARCH_HALF_W + inset, -inset);
      s.lineTo(-ARCH_HALF_W - inset, -inset);

      const innerHole = new THREE.Path();
      innerHole.moveTo(-ARCH_HALF_W, 0);
      innerHole.lineTo(-ARCH_HALF_W, ARCH_BASE_H);
      innerHole.bezierCurveTo(
        -ARCH_HALF_W, ARCH_BASE_H + 0.5,
        -ARCH_HALF_W * 0.6, ARCH_PEAK_H,
        0, ARCH_PEAK_H
      );
      innerHole.bezierCurveTo(
        ARCH_HALF_W * 0.6, ARCH_PEAK_H,
        ARCH_HALF_W, ARCH_BASE_H + 0.5,
        ARCH_HALF_W, ARCH_BASE_H
      );
      innerHole.lineTo(ARCH_HALF_W, 0);
      innerHole.lineTo(-ARCH_HALF_W, 0);
      ringShape.holes.push(innerHole);
    }

    const ringGeom = new THREE.ShapeGeometry(ringShape);
    // Use a gold metallic material for the filigree frame
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe8c060,
      roughness: 0.3,
      metalness: 0.95,
      emissive: 0x5a3010,
      emissiveIntensity: 0.4,
    });
    this.filigreeFrame = new THREE.Mesh(ringGeom, goldMat);
    this.filigreeFrame.position.set(0, 0, 0.05);
    this.scene.add(this.filigreeFrame);

    // ---------- Ornate gold motif tiles flanking the arch ----------
    const motifTex = makeOrnateArchTexture(256);
    const motifMat = new THREE.MeshStandardMaterial({
      map: motifTex,
      transparent: true,
      alphaTest: 0.1,
      emissive: 0x6a4a18,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    });

    const leftMotif = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.6), motifMat);
    leftMotif.position.set(-ARCH_HALF_W - 0.95, ARCH_BASE_H / 2 + 0.5, 0.08);
    this.scene.add(leftMotif);

    const rightMotif = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.6), motifMat);
    rightMotif.position.set(ARCH_HALF_W + 0.95, ARCH_BASE_H / 2 + 0.5, 0.08);
    this.scene.add(rightMotif);

    // Top medallion above the arch (crown motif)
    const medallionMat = new THREE.MeshStandardMaterial({
      map: motifTex,
      transparent: true,
      alphaTest: 0.1,
      emissive: 0x8a5a20,
      emissiveIntensity: 0.7,
      side: THREE.DoubleSide,
    });
    const medallion = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), medallionMat);
    medallion.position.set(0, ARCH_PEAK_H + 0.6, 0.08);
    this.scene.add(medallion);
    this.medallion = medallion;

    // ---------- The "veil" — covers the arch opening before reveal ----------
    // This is a gold geometric shape that pulls apart to reveal what's inside
    const veilShape = makeArchShape();
    const veilGeom = new THREE.ShapeGeometry(veilShape);

    const veilMat = new THREE.MeshStandardMaterial({
      map: motifTex,
      color: 0xc89040,
      roughness: 0.4,
      metalness: 0.85,
      emissive: 0x4a2810,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });

    // Veil split in two halves that swing apart
    this.veilLeft = new THREE.Mesh(veilGeom, veilMat.clone());
    this.veilRight = new THREE.Mesh(veilGeom.clone(), veilMat.clone());

    // Pivot groups
    this.veilLeftPivot = new THREE.Group();
    this.veilLeftPivot.position.set(-ARCH_HALF_W, 0, 0.07);
    this.veilLeft.position.set(ARCH_HALF_W, 0, 0); // local origin at left edge
    // Use a clipping plane to show only the left half of the arch shape
    this.veilLeft.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)];
    this.veilLeftPivot.add(this.veilLeft);
    this.scene.add(this.veilLeftPivot);

    this.veilRightPivot = new THREE.Group();
    this.veilRightPivot.position.set(ARCH_HALF_W, 0, 0.07);
    this.veilRight.position.set(-ARCH_HALF_W, 0, 0);
    this.veilRight.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
    this.veilRightPivot.add(this.veilRight);
    this.scene.add(this.veilRightPivot);

    this.renderer.localClippingEnabled = true;

    // ---------- Frame plane (behind the arch — shows video frames) ----------
    const { texture: frameTex, canvas: frameCanvas, ctx: frameCtx } = makeUpdatableCanvasTexture(1024, 1024);
    this.frameTexture = frameTex;
    this.frameCanvas = frameCanvas;
    this.frameCtx = frameCtx;

    // Frame plane sized to the arch interior — letterboxing handled in updateFrameImage
    const framePlaneGeom = new THREE.PlaneGeometry(1.7, 2.8);
    const framePlaneMat = new THREE.MeshBasicMaterial({ map: frameTex });
    this.framePlane = new THREE.Mesh(framePlaneGeom, framePlaneMat);
    this.framePlane.position.set(0, ARCH_PEAK_H / 2 - 0.2, -0.6);
    this.scene.add(this.framePlane);

    // ---------- Warm light behind the arch ----------
    this.warmLight = new THREE.PointLight(0xffd080, 0, 10, 1.4);
    this.warmLight.position.set(0, 1.4, -0.2);
    this.scene.add(this.warmLight);

    // ---------- Gold particle motes ----------
    this._buildParticles();

    // ---------- God-ray glow plane ----------
    this.glowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 5.5),
      new THREE.MeshBasicMaterial({
        color: 0xffc878,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.glowPlane.position.set(0, ARCH_PEAK_H / 2, 0.4);
    this.scene.add(this.glowPlane);
  }

  _buildParticles() {
    const count = 320;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.3) * 3;
      velocities[i] = 0.0007 + Math.random() * 0.0012;
      sizes[i] = 0.03 + Math.random() * 0.04;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xffd680,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
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

  updateFrameImage(img) {
    if (!img) return;
    const cw = this.frameCanvas.width;
    const ch = this.frameCanvas.height;
    const ctx = this.frameCtx;
    // Soft warm backdrop so letterboxing looks intentional (not black bars)
    const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw * 0.8);
    grad.addColorStop(0, '#3a1f10');
    grad.addColorStop(1, '#0a0612');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // CONTAIN (letterbox) — preserve aspect ratio so full video frame is visible
    const ir = img.width / img.height;
    const cr = cw / ch;
    let dw, dh;
    if (ir > cr) {
      // image wider than canvas: scale to fit canvas WIDTH, leave bars top/bottom
      dw = cw;
      dh = cw / ir;
    } else {
      // image taller than canvas: scale to fit canvas HEIGHT, leave bars left/right
      dh = ch;
      dw = ch * ir;
    }
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    this.frameTexture.needsUpdate = true;
  }

  // State: { veilOpen (0..1), lightIntensity, cameraZ, cameraLift, glowOpacity, medallionPulse }
  update(state, dt) {
    // Veil splits apart by translating each half outward + rotating slightly + fading
    const slide = state.veilOpen * 2.2;
    this.veilLeftPivot.position.x = -ARCH_HALF_W - slide;
    this.veilRightPivot.position.x = ARCH_HALF_W + slide;
    this.veilLeft.material.opacity = 1 - state.veilOpen * 0.95;
    this.veilRight.material.opacity = 1 - state.veilOpen * 0.95;
    this.veilLeftPivot.rotation.z = state.veilOpen * 0.15;
    this.veilRightPivot.rotation.z = -state.veilOpen * 0.15;

    this.warmLight.intensity = state.lightIntensity * 7;

    this.camera.position.z = state.cameraZ;
    this.camera.position.y = 1.4 + state.cameraLift;
    this.camera.lookAt(0, ARCH_PEAK_H / 2 - 0.3, 0);

    this.glowPlane.material.opacity = state.glowOpacity;
    this.glowPlane.scale.setScalar(1 + state.glowOpacity * 0.8);

    // Medallion pulse — gentle breathing of emissiveness with light
    this.medallion.material.emissiveIntensity = 0.55 + state.lightIntensity * 0.6 + Math.sin(performance.now() * 0.002) * 0.1;

    // Filigree frame brightens with the warm light
    this.filigreeFrame.material.emissiveIntensity = 0.35 + state.lightIntensity * 0.9;

    // Particles drift up
    const positions = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleVelocities.length; i++) {
      positions[i * 3 + 1] += this.particleVelocities[i] * (60 * (dt || 0.016));
      // Gentle horizontal sway
      positions[i * 3 + 0] += Math.sin(performance.now() * 0.0006 + i) * 0.002;
      if (positions[i * 3 + 1] > 5.5) {
        positions[i * 3 + 1] = -0.5;
        positions[i * 3 + 0] = (Math.random() - 0.5) * 8;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.material.opacity = 0.5 + state.lightIntensity * 0.4;
  }

  setSceneOpacity(o) {
    this.renderer.domElement.style.opacity = o;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
