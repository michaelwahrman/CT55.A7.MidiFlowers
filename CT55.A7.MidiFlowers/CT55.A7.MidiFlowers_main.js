/* CT55.A7.MidiFlowers -- main: the scene, the flowers, the emitter, the camera, the buttons and the frame loop.
 *
 * CT55.A5: a flower emitter travels at waist height to the right (+x) through one of several environments (_world.js,
 * _scene_*.js (CT55.A7: three scenes): a town at night, an autumn town at Halloween,
 * a Kali shrine from the user's own pictures); we look
 * down at the floor in front of the back wall, past chandeliers / light fixtures hanging below the camera. Flowers billow out of the emitter, gravity pulls them down, they land
 * and stay, all casting soft shadows (VSM). Swirl flowers = a gentle turbulence in the room's air. Units: metres, s.
 *
 * Everything is driven through ONE set of actions (CT55.act) used by the on-screen buttons, the keyboard and MIDI
 * (CT55.A7.MidiFlowers_midi.js, built on the CT45 MIDI layer).
 *
 * The frame loop has one clock for the screen and the movie (the CT54.A6 rule, harness v4):
 *   not recording: the scene advances by the real time since the last frame (any frame rate, real speed);
 *   recording:     every drawn frame is exactly one movie frame of 1/fps s, then it is encoded with its sound.
 */
(function () {
  'use strict';
  const LABEL = 'CT55.A7.MidiFlowers';
  const qs = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smoothK = (rate, dt) => 1 - Math.exp(-rate * dt);
  let seed = 0x55a1;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

  // ------------------------------------------------------------------ settings (the steps the +/- buttons walk)
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];                  // m/s
  const RATES = [1, 2, 4, 6, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 320, 400];    // flowers/s
  const PULSES = [0.25, 0.35, 0.5, 0.75, 1, 1.5, 2, 3, 4];                  // s between bursts
  const BURSTS = [6, 10, 16, 24, 36, 48, 72, 100];                          // flowers per burst
  const MAX_FLOWERS = clamp(parseInt(qs.get('max') ?? '30000', 10) || 30000, 300, 60000);   // CT55.A7: many more flowers   // CT55.A5: smaller flowers, more of them
  const EMIT_H = 0.95;                         // CT55.A5: waist height
  let TRACK_Z = 3.2;                           // the emitter's line out from the back wall (set by each environment)

  const S = {                                  // the state everything reads
    forward: true, speedIdx: 4,                // CT55.A5: it all starts going - travelling, gushing and swirling
    emitLatched: true, emitHeld: false, emitPressT: 0, rateIdx: 12,   // CT55.A7: 180 a second
    pulse: false, pulseIdx: 4, burstIdx: 3, pulseT: 0,
    swirlEmitter: true, swirlFlowers: true, swirlStrength: 1.5,   // CT55.A7: more swirl
    recording: false, follow: true, hud: true,
  };
  const emitting = () => S.emitLatched || S.emitHeld;

  // ------------------------------------------------------------------ renderer, scene, light
  const canvas = $('c'), stage = $('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setPixelRatio(1);

  const BG = new THREE.Color('#070b18');
  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 25, 80);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.2, 400);
  const SHADOW_MAP = qs.get('shadow') ? parseInt(qs.get('shadow'), 10) : 2048;
  const world = CT55World.create(scene, renderer, { shadow: SHADOW_MAP });   // the environments and their lights
  let ENV = world.set(0);                      // CT55.A5: the town at night comes first
  TRACK_Z = ENV.trackZ;

  // ------------------------------------------------------------------ flower geometry: three kinds, instanced
  function petalGeometry(n, width, pointy, cup, layers = 1) {
    const geos = [];
    for (let L = 0; L < layers; L++) {
      for (let i = 0; i < n; i++) {
        const sh = new THREE.Shape();
        const w = width * (L ? 0.9 : 1), len = L ? 0.86 : 1;
        sh.moveTo(0, 0.06);
        if (pointy) { sh.bezierCurveTo(w * 0.9, len * 0.3, w * 0.6, len * 0.75, 0, len); sh.bezierCurveTo(-w * 0.6, len * 0.75, -w * 0.9, len * 0.3, 0, 0.06); }
        else { sh.bezierCurveTo(w * 1.05, len * 0.2, w * 0.95, len * 0.95, 0, len); sh.bezierCurveTo(-w * 0.95, len * 0.95, -w * 1.05, len * 0.2, 0, 0.06); }
        const g = new THREE.ShapeGeometry(sh, 5);
        g.rotateX(-Math.PI / 2);                              // lie flat, pointing -z
        g.rotateY(i / n * TAU + (L ? Math.PI / n : 0) + (L ? 0 : 0));
        const p = g.attributes.position, col = new Float32Array(p.count * 3);
        for (let k = 0; k < p.count; k++) {
          const x = p.getX(k), z = p.getZ(k), r = Math.hypot(x, z);
          p.setY(k, cup * r * r + 0.012 * i / n + (L ? 0.022 : 0));   // cupped; each petal a hair above the last (no z-fighting)
          const c = 0.80 + 0.2 * Math.min(1, r);               // a little deeper at the base
          col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = c;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geos.push(g);
      }
    }
    return mergeGeos(geos);
  }
  function mergeGeos(list) {
    let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
    let ov = 0, oi = 0;
    for (const g of list) {
      g.computeVertexNormals();
      pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3);
      if (g.attributes.color) col.set(g.attributes.color.array, ov * 3); else col.fill(1, ov * 3, (ov + g.attributes.position.count) * 3);
      const ix = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
      for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + ov;
      ov += g.attributes.position.count; oi += ix.length;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.setIndex(new THREE.BufferAttribute(idx, 1));
    m.computeVertexNormals();
    return m;
  }
  function centerGeometry(r, h) {
    const g = new THREE.SphereGeometry(r, 14, 7, 0, TAU, 0, Math.PI / 2);
    g.scale(1, h / r, 1); g.translate(0, 0.03, 0);
    return g;
  }
  function brightMaterial(vertexColors) {
    const m = new THREE.MeshStandardMaterial({ vertexColors, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
    m.shadowSide = THREE.DoubleSide;
    m.onBeforeCompile = (s) => {                            // pastel glow: a little of the flower's own colour as light
      s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.34;');
    };
    return m;
  }
  const KINDS = [
    { name: 'blossom', weight: 0.42, petals: petalGeometry(5, 0.62, false, 0.22), center: centerGeometry(0.22, 0.12) },
    { name: 'star', weight: 0.30, petals: petalGeometry(6, 0.40, true, 0.32), center: centerGeometry(0.15, 0.16) },
    { name: 'daisy', weight: 0.28, petals: petalGeometry(12, 0.17, false, 0.10, 2), center: centerGeometry(0.30, 0.10) },
  ];
  const PER_KIND = Math.floor(MAX_FLOWERS / KINDS.length);
  const petalMat = brightMaterial(true), centerMat = brightMaterial(false);
  for (const k of KINDS) {
    k.mesh = new THREE.InstancedMesh(k.petals, petalMat, PER_KIND);
    k.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    k.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    k.cmesh = new THREE.InstancedMesh(k.center, centerMat, PER_KIND);
    k.cmesh.instanceMatrix = k.mesh.instanceMatrix;       // same matrices: the centre goes where the petals go
    k.cmesh.setColorAt(0, new THREE.Color(1, 1, 1));
    for (const m of [k.mesh, k.cmesh]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); }
    k.next = 0; k.hw = 0;                                  // ring buffer: next slot, high-water mark
  }

  // ------------------------------------------------------------------ flower state (structure of arrays)
  const N = PER_KIND * KINDS.length;
  const F = {
    st: new Uint8Array(N),                                 // 0 empty, 1 in the air, 2 landed, 3 swirling
    px: new Float32Array(N), py: new Float32Array(N), pz: new Float32Array(N),
    vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N),
    spin: new Float32Array(N), spinV: new Float32Array(N), tx: new Float32Array(N), tz: new Float32Array(N),
    tilt: new Float32Array(N), flA: new Float32Array(N), flW: new Float32Array(N), flPh: new Float32Array(N), flDir: new Float32Array(N),
    sc: new Float32Array(N), kd: new Float32Array(N), r0: new Float32Array(N), h0: new Float32Array(N), restY: new Float32Array(N), hue: new Float32Array(N),
  };
  let alive = 0, swirling = 0, lastPan = 0;
  const _col = new THREE.Color();
  const CENTER_COLS = ['#ffd978', '#ffe9a6', '#fff4dc', '#ffc78a', '#ffe3ef'].map(c => new THREE.Color(c));

  function spawn(x, y, z, vx, vy, vz, hue) {
    let u = rnd(), ki = 0; while (ki < KINDS.length - 1 && u > KINDS[ki].weight) { u -= KINDS[ki].weight; ki++; }
    const K = KINDS[ki], slot = K.next; K.next = (K.next + 1) % PER_KIND; K.hw = Math.max(K.hw, slot + 1);
    const i = ki * PER_KIND + slot;
    if (F.st[i] === 0) alive++; else if (F.st[i] === 3) swirling--;
    F.st[i] = 1;
    F.px[i] = x; F.py[i] = y; F.pz[i] = z; F.vx[i] = vx; F.vy[i] = vy; F.vz[i] = vz;
    F.spin[i] = rnd() * TAU; F.spinV[i] = (rnd() - 0.5) * 6; F.tx[i] = 0; F.tz[i] = 0;
    F.tilt[i] = 0.3 + rnd() * 0.6; F.flA[i] = 1.2 + rnd() * 2.0; F.flW[i] = 4 + rnd() * 4; F.flPh[i] = rnd() * TAU; F.flDir[i] = rnd() * TAU;
    F.sc[i] = (0.065 + rnd() * 0.05) * (ki === 2 ? 1.1 : 1);   // CT55.A5: 13-23 cm across (A3: 24-40)     // CT55.A5: 24-40 cm across: big blooms that read from across the hall
    F.kd[i] = 0.7 + 0.4 * rnd();                           // CT55.A5: air drag -> falls at 3.0..3.7 m/s
    F.r0[i] = 0.7 + 3.8 * Math.pow(rnd(), 0.8); F.h0[i] = 0.35 + 3.4 * rnd();
    F.restY[i] = 0.002 + rnd() * 0.014;
    // CT55.A5: each environment has its own palette (ENV.palette: [hue 0..1, saturation, lightness] picks); a pulse
    // burst passes a palette index so its ring comes out in matching colours
    const pal = ENV.palette, pick = hue === undefined ? pal[Math.floor(rnd() * pal.length)] : pal[Math.floor(hue * pal.length) % pal.length];
    const h = (pick[0] + (rnd() - 0.5) * 0.05 + 1) % 1;
    F.hue[i] = h;
    _col.setHSL(h, clamp(pick[1] + (rnd() - 0.5) * 0.15, 0, 1), clamp(pick[2] + (rnd() - 0.5) * 0.08, 0, 1));
    K.mesh.setColorAt(slot, _col); K.mesh.instanceColor.needsUpdate = true;
    const cc = rnd() < 0.7 ? CENTER_COLS[Math.floor(rnd() * CENTER_COLS.length)] : _col.clone().offsetHSL(0, 0.1, -0.12);
    K.cmesh.setColorAt(slot, cc); K.cmesh.instanceColor.needsUpdate = true;
    K.mesh.count = K.cmesh.count = K.hw;
    return i;
  }
  function clearFlowers() {
    F.st.fill(0); alive = 0; swirling = 0;
    for (const K of KINDS) { K.next = 0; K.hw = 0; K.mesh.count = K.cmesh.count = 0; }
  }

  // ------------------------------------------------------------------ the emitter
  const emitter = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe6f2', emissiveIntensity: 0.9, roughness: 0.3 }));
  core.castShadow = true; emitter.add(core);
  const crown = new THREE.Group(); emitter.add(crown);
  const crownGeo = petalGeometry(1, 0.5, true, 0.0);
  const CROWN_COLS = ['#f7b5c9', '#ffd2a8', '#f9eaa0', '#b6ecd0', '#b4d6f7', '#d5c2f5'];
  CROWN_COLS.forEach((c, i) => {
    const m = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.5 }));
    m.scale.setScalar(0.17); m.castShadow = true; m.position.set(0, 0, -0.12); m.rotation.x = 0.55;
    const holder = new THREE.Group(); holder.rotation.y = i / 6 * TAU; holder.add(m); crown.add(holder);
  });
  function glowTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.25, 'rgba(255,225,240,0.5)'); gr.addColorStop(1, 'rgba(255,220,240,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
  halo.scale.setScalar(1.0); emitter.add(halo);
  scene.add(emitter);

  // pulse rings on the floor
  const rings = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 96), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.visible = false; scene.add(m); rings.push({ m, t: 9 });
  }
  let ringNext = 0;

  // ------------------------------------------------------------------ world state
  const W = { t: 0, baseX: 0, baseVX: 0, swR: 1.6, swA: 0, ex: 0, ey: EMIT_H, ez: TRACK_Z, tz: TRACK_Z, evx: 0, evz: 0, acc: 0, glow: 0, gush: 1, vsense: -1 };

  // ------------------------------------------------------------------ sound
  const synth = new CT55Sound.Synth(), speaker = new CT55Sound.Speaker(synth);
  const startSound = () => speaker.start();
  addEventListener('pointerdown', startSound, true); addEventListener('keydown', startSound, true);
  const _v = new THREE.Vector3();
  const screenPan = (x, y, z) => { _v.set(x, y, z).project(camera); return clamp(_v.x * 0.85, -1, 1); };

  // ------------------------------------------------------------------ emission
  // Flowers GUSH out (CT55.A5): a fountain - thrown hard, mostly upward in a wide cone, in surges (W.gush), quickly
  // slowed by the air so they billow, then gravity takes them down to the floor.
  function emitOne() {
    const a = rnd() * TAU, e = 0.7 + 0.8 * Math.pow(rnd(), 0.6), sp = (6 + 5.5 * rnd()) * (0.8 + 0.25 * W.gush);
    spawn(W.ex + (rnd() - 0.5) * 0.1, W.ey + 0.1, W.ez + (rnd() - 0.5) * 0.1,
      Math.cos(e) * Math.cos(a) * sp + 0.5 * W.evx, Math.sin(e) * sp + 0.5 * W.evy, Math.cos(e) * Math.sin(a) * sp * (Math.sin(a) < 0 ? 0.45 : 1) + 0.5 * W.evz);   // CT55.A5: less toward the back wall
  }
  function burst() {
    const B = BURSTS[S.burstIdx], ph = rnd() * TAU, hue = rnd();
    for (let k = 0; k < B; k++) {
      const a = ph + k / B * TAU + (rnd() - 0.5) * 0.1, e = 0.5 + 0.3 * rnd(), sp = 8 + 2 * rnd();   // a billowing ring
      spawn(W.ex, W.ey + 0.08, W.ez, Math.cos(e) * Math.cos(a) * sp + 0.5 * W.evx, Math.sin(e) * sp, Math.cos(e) * Math.sin(a) * sp * (Math.sin(a) < 0 ? 0.45 : 1) + 0.5 * W.evz, (hue + (k % 2) * 0.37) % 1);
    }
    const r = rings[ringNext]; ringNext = (ringNext + 1) % rings.length;
    r.t = 0; r.m.visible = true; r.m.position.x = W.ex; r.m.position.z = W.ez; r.m.material.color.setHSL(hue, 0.7, 0.8);
    synth.bloom(screenPan(W.ex, 0, W.ez), 0.5);
    W.glow = 1;
  }

  // ------------------------------------------------------------------ physics (CT55.A5)
  // GRAVITY + AIR: each flower falls under gravity with QUADRATIC air drag relative to the air around it,
  //   a = g - k |v - u| (v - u),   k = 0.7..1.1 per flower  ->  falls at 3.0..3.7 m/s at most,
  // so a flower thrown out fast billows (the air stops it within a metre or two) and then drops to the floor.
  // Falling makes it flutter (a small sideways rocking) and tumble.
  // SWIRL = a gentle TURBULENCE u(x, y, z, t) in the room: two Arnold-Beltrami-Childress flows (divergence-free, so it
  //   looks like real air moving in eddies), one 11 m across and one 4.6 m across, slowly changing. Flowers in the air
  //   drift and eddy in it; where it gusts along the floor it lifts flowers that have landed.
  const G = 9.81, WIND = { u: 0, v: 0, w: 0 };
  function wind(x, y, z, t) {
    const A = 0.55 * S.swirlStrength;
    const k1 = 0.57, p1 = 0.21 * t, p2 = 0.17 * t + 1.3, p3 = -0.19 * t + 2.1;
    const k2 = 1.37, q1 = -0.33 * t + 0.4, q2 = 0.29 * t + 2.7, q3 = 0.31 * t + 4.2;
    const xs = x - 0.35 * t;                                  // the eddies drift slowly down the hall
    let u = Math.sin(k1 * z + p1) + Math.cos(k1 * y + p2);
    let v = Math.sin(k1 * xs + p3) + Math.cos(k1 * z + p1);
    let w = Math.sin(k1 * y + p2) + Math.cos(k1 * xs + p3);
    u += 0.45 * (Math.sin(k2 * z + q1) + Math.cos(k2 * y + q2));
    v += 0.45 * (Math.sin(k2 * xs + q3) + Math.cos(k2 * z + q1));
    w += 0.45 * (Math.sin(k2 * y + q2) + Math.cos(k2 * xs + q3));
    WIND.u = A * u; WIND.v = A * v * 0.8; WIND.w = A * w;
    // CT55.A3: plus a swirling vortex standing on the emitter's line - flowers spiral round it as they fall, and it
    // sweeps the ones on the floor up into it (a soft dust-devil: round and round, a lift in the middle, inflow low down).
    // CT55.A5 fix for "the flowers bunch against the far wall": (1) the wall is respected by the METHOD OF IMAGES - a
    // mirror vortex behind the wall (opposite turn, same inflow), so the air next to the wall runs along it, never
    // into it; (2) the vortex travels with the emitter and its trailing side used to lead toward the wall, so while
    // travelling it turns the other way (W.vsense eases -1 travelling / +1 standing) and fades out behind the emitter.
    const S1 = S.swirlStrength, rc = 1.7, zi = 2 * world.wallZ(x) - W.tz;
    const bx = x - W.baseX, behindK = (S.forward && bx < -2.2) ? Math.exp(-(bx + 2.2) * (bx + 2.2) / 3) : 1;
    for (let im = 0; im < 2; im++) {
      const turn = im ? -1 : 1, dx = bx, dz = z - (im ? zi : W.tz), r2 = dx * dx + dz * dz, r = Math.sqrt(r2) + 1e-6;
      const vt = 2.8 * S1 * W.vsense * turn * behindK * 2 * r * rc / (r2 + rc * rc);
      const inflow = -0.7 * S1 * Math.exp(-r2 / (5 * rc * rc)) * Math.max(0, 1 - y / 1.4);
      WIND.u += -dz / r * vt + dx / r * inflow; WIND.w += dx / r * vt + dz / r * inflow;
      if (!im) WIND.v += 1.9 * S1 * Math.exp(-r2 / (2 * rc * rc)) * Math.max(0, 1 - y / 7);
    }
    // CT55.A5: the air cannot blow through the back wall: within 1.5 m of it any flow toward the wall fades out and a
    // slight draught leads away from it (in A3 the eddies and the vortex drove flowers into the wall, where they piled up)
    const dw = z - world.wallZ(x);
    if (dw < 1.5) { const k = Math.max(0, dw) / 1.5; if (WIND.w < 0) WIND.w *= k * k; WIND.w += 0.35 * (1 - k); }
    return WIND;
  }
  function stepFlowers(dt) {
    const turb = S.swirlFlowers, t = W.t, slide = Math.exp(-5 * dt), settle = smoothK(10, dt);
    const camX = cam.tgt.x, ytop = (ENV.ceiling || 40) - 0.25, zmax = (ENV.front || 200) - 0.15;
    let air = 0;
    for (let i = 0; i < N; i++) {
      const st = F.st[i]; if (!st) continue;
      if (st === 2) {                                        // on the floor
        if (turb && rnd() < 0.12 && Math.abs(F.px[i] - camX) < 30) {   // a gust along the floor lifts it (checked on 12 % a frame)
          const wd = wind(F.px[i], 0.3, F.pz[i], t), gust = Math.hypot(wd.u, wd.w) + Math.max(0, wd.v) - 1.0;
          if (gust > 0 && rnd() < gust * dt * 3.5 / 0.12) {
            F.st[i] = 1; F.vy[i] = 1.3 + 1.8 * rnd() + Math.max(0, wd.v); F.vx[i] = wd.u; F.vz[i] = wd.w; F.spinV[i] = (rnd() - 0.5) * 8;
            continue;
          }
        }
        if (F.vx[i] !== 0 || F.vz[i] !== 0) {
          F.px[i] += F.vx[i] * dt; F.pz[i] += F.vz[i] * dt; F.vx[i] *= slide; F.vz[i] *= slide;
          const zmin = world.wallZ(F.px[i]) + F.sc[i] + 0.03; if (F.pz[i] < zmin) { F.pz[i] = zmin; F.vz[i] = 0; }
          F.py[i] = F.restY[i] + world.floorY(F.px[i], F.pz[i]);
          if (Math.abs(F.vx[i]) + Math.abs(F.vz[i]) < 1e-3) { F.vx[i] = 0; F.vz[i] = 0; }
          F.spin[i] += F.spinV[i] * dt; F.spinV[i] *= slide;
          F.tx[i] -= F.tx[i] * settle; F.tz[i] -= F.tz[i] * settle;
        }
        continue;
      }
      // in the air
      air++;
      let ux = 0, uy = 0, uz = 0;
      if (turb) { const wd = wind(F.px[i], F.py[i], F.pz[i], t); ux = wd.u; uy = wd.v; uz = wd.w; }
      F.flPh[i] += F.flW[i] * dt;
      const sn = Math.sin(F.flPh[i]), fall = Math.min(1, Math.max(0, -F.vy[i]) / 1.5);
      const flx = Math.cos(F.flDir[i]) * F.flA[i] * sn * fall, flz = Math.sin(F.flDir[i]) * F.flA[i] * sn * fall;
      const rx = F.vx[i] - ux, ry = F.vy[i] - uy, rz = F.vz[i] - uz, kv = F.kd[i] * Math.hypot(rx, ry, rz);
      const den = 1 + kv * dt;                                 // semi-implicit drag: stable at any frame rate
      F.vx[i] = (F.vx[i] + (flx + kv * ux) * dt) / den;
      F.vy[i] = (F.vy[i] + (-G + kv * uy) * dt) / den;
      F.vz[i] = (F.vz[i] + (flz + kv * uz) * dt) / den;
      F.px[i] += F.vx[i] * dt; F.py[i] += F.vy[i] * dt; F.pz[i] += F.vz[i] * dt;
      const zmin = world.wallZ(F.px[i]) + F.sc[i] + 0.03;    // CT55.A5: the whole flower stays in front of the wall
      if (F.pz[i] < zmin + 0.6 && F.vz[i] < 0) F.vz[i] *= Math.exp(-5 * dt);       // the air cushion in front of a wall
      if (F.pz[i] < zmin) { F.pz[i] = zmin; F.vz[i] = Math.abs(F.vz[i]) * 0.5 + 0.2; }   // the back wall: bounce off it
      if (F.pz[i] > zmax) { F.pz[i] = zmax; F.vz[i] = -Math.abs(F.vz[i]) * 0.25; }  // the wall behind us
      if (F.py[i] > ytop) { F.py[i] = ytop; F.vy[i] = -Math.abs(F.vy[i]) * 0.3; }    // the ceiling
      const tumble = F.tilt[i] * (0.4 + fall);
      F.tx[i] = tumble * sn * Math.sin(F.flDir[i]); F.tz[i] = -tumble * sn * Math.cos(F.flDir[i]);
      F.spin[i] += F.spinV[i] * dt;
      const ground = F.restY[i] + world.floorY(F.px[i], F.pz[i]);
      if (F.py[i] <= ground && F.vy[i] <= 0) { F.st[i] = 2; F.py[i] = ground; F.vy[i] = 0; F.vx[i] *= 0.35; F.vz[i] *= 0.35; }
    }
    swirling = air;                                            // CT55.A5: 'swirling' = flowers in the air (HUD, wind sound)
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'XZY'), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function writeMatrices() {
    for (let ki = 0; ki < KINDS.length; ki++) {
      const K = KINDS[ki], arr = K.mesh.instanceMatrix;
      for (let slot = 0; slot < K.hw; slot++) {
        const i = ki * PER_KIND + slot;
        if (!F.st[i]) { ZERO.toArray(arr.array, slot * 16); continue; }
        _e.set(F.tx[i], F.spin[i], F.tz[i]); _q.setFromEuler(_e);
        _p.set(F.px[i], F.py[i], F.pz[i]); _s.setScalar(F.sc[i]);
        _m.compose(_p, _q, _s); _m.toArray(arr.array, slot * 16);
      }
      arr.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------------ one step of the world
  let bellBudget = 0;
  function step(dt) {
    W.t += dt;
    if (TOUR.on) tourStep(dt);
    // travel
    W.baseVX = S.forward ? SPEEDS[S.speedIdx] : 0;
    W.baseX += W.baseVX * dt;
    // emitter loops (Swirl emitter): radius eases in / out
    // the emitter swirls (CT55.A5: playfully - the loop breathes in and out, speeds up and slows, and the emitter
    // swoops up and down around waist height as it goes)
    const t = W.t, play = W.swR / 2.0;
    W.swR += ((S.swirlEmitter ? 2.5 * (0.8 + 0.3 * Math.sin(t * 0.37)) : 0) - W.swR) * smoothK(1.4, dt);   // CT55.A7: wider circles
    if (W.swR > 1e-3) W.swA += (2.5 + 0.8 * Math.sin(t * 0.53) + 0.15 * SPEEDS[S.speedIdx] * (S.forward ? 1 : 0)) * dt;
    W.tz += (TRACK_Z - W.tz) * smoothK(2, dt);
    W.vsense += ((S.forward ? -1 : 1) - W.vsense) * smoothK(0.6, dt);
    const ox = W.ex, oy = W.ey, oz = W.ez;
    W.ex = W.baseX + W.swR * Math.cos(W.swA);
    W.ez = Math.max(W.tz + W.swR * Math.sin(W.swA), world.wallZ(W.ex) + 0.7);   // CT55.A7: wider circles never touch the back wall
    W.ey = Math.max(0.35, EMIT_H + 0.04 * Math.sin(t * 2.1) + play * (0.6 * Math.sin(t * 1.15 + 0.6 * Math.sin(t * 0.41)) + 0.25 * Math.sin(t * 2.6 + 1)));
    W.evx = (W.ex - ox) / dt; W.evy = (W.ey - oy) / dt; W.evz = (W.ez - oz) / dt;
    W.gush = Math.max(0.2, 1 + 0.55 * Math.sin(t * 2.3) + 0.3 * Math.sin(t * 5.7 + 1));   // surges
    // continuous emission
    if (emitting()) {
      const rate = RATES[S.rateIdx];
      W.acc += rate * W.gush * dt;
      let n = Math.min(500, Math.floor(W.acc)); W.acc -= n;
      bellBudget = Math.min(2, bellBudget + dt * 7);         // at most ~7 bells a second, however many flowers
      while (n-- > 0) { emitOne(); if (bellBudget >= 1 && rnd() < Math.min(1, 9 / rate + 0.05)) { bellBudget -= 1; synth.bell(screenPan(W.ex, W.ey, W.ez), rnd(), 0.15); } }
      W.glow = Math.max(W.glow, 0.6);
    } else W.acc = 0;
    // pulse
    if (S.pulse) { S.pulseT += dt; if (S.pulseT >= PULSES[S.pulseIdx]) { S.pulseT -= PULSES[S.pulseIdx]; if (S.pulseT > PULSES[S.pulseIdx]) S.pulseT = 0; burst(); } }
    stepFlowers(dt);
    // the emitter's look
    emitter.position.set(W.ex, W.ey, W.ez);
    crown.rotation.y += dt * (1.2 + (emitting() ? 2.5 : 0) + (S.pulse ? 1 : 0));
    W.glow = Math.max(0, W.glow - dt * 1.6);
    halo.scale.setScalar(0.9 + 0.9 * W.glow); halo.material.opacity = 0.45 + 0.45 * W.glow;
    core.material.emissiveIntensity = 0.8 + 1.2 * W.glow;
    for (const r of rings) if (r.m.visible) {
      r.t += dt; const u = r.t / 1.3;
      if (u >= 1) { r.m.visible = false; continue; }
      r.m.scale.setScalar(0.3 + 2.0 * (1 - Math.pow(1 - u, 2.2))); r.m.material.opacity = 0.35 * (1 - u) * (1 - u);   // CT55.A5: a subtle ripple
    }
    // wind: louder with the whirlwind and the travel speed
    synth.setWind((S.swirlFlowers ? 0.18 * S.swirlStrength + 0.25 * Math.sqrt(swirling / 900) : 0) + (S.forward ? 0.05 * SPEEDS[S.speedIdx] / 8 : 0));
  }

  // ------------------------------------------------------------------ camera: follows the emitter; mouse turns / moves / zooms
  // CT55.A5: from the open side of the hall, looking down at the floor in front of the back wall (35 degrees down)
  const HOME = { az: 0, el: 0.80, dist: 14.5 };   // CT55.A7: a little higher, looking down a little more (46 deg)
  const cam = { az: HOME.az, el: HOME.el, dist: HOME.dist, pan: new THREE.Vector3(), tgt: new THREE.Vector3(0, 1, TRACK_Z - 0.4), first: true, used: HOME.dist };
  function updateCamera(dt) {
    if (S.follow) {
      _p.set(W.baseX - cam.dist * 0.12 + cam.pan.x, 1.3, W.tz - 0.4 + cam.pan.z);
      if (cam.first) cam.tgt.copy(_p); else cam.tgt.lerp(_p, smoothK(3.5, dt));
    }
    cam.first = false;
    // CT55.A5: the camera never goes through a wall, the ceiling or the floor. It looks at the target from the chosen
    // direction; if a wall/ceiling/floor is in the way it comes in along that line to stay inside (like a game camera).
    const box = ENV.camBox, ce = Math.cos(cam.el);
    cam.tgt.z = clamp(cam.tgt.z, box.zmin + 0.3, box.zmax - 0.3); cam.tgt.y = clamp(cam.tgt.y, 0.4, box.ymax - 0.3);
    const dx = Math.sin(cam.az) * ce, dy = Math.sin(cam.el), dz = Math.cos(cam.az) * ce;
    let tmax = cam.dist;
    if (dz < -1e-6) tmax = Math.min(tmax, (box.zmin - cam.tgt.z) / dz);
    if (dz > 1e-6) tmax = Math.min(tmax, (box.zmax - cam.tgt.z) / dz);
    if (dy > 1e-6) tmax = Math.min(tmax, (box.ymax - cam.tgt.y) / dy);
    if (dy < -1e-6) tmax = Math.min(tmax, (0.3 - cam.tgt.y) / dy);
    cam.used = Math.max(0.5, tmax);
    camera.position.set(cam.tgt.x + cam.used * dx, cam.tgt.y + cam.used * dy, cam.tgt.z + cam.used * dz);
    camera.lookAt(cam.tgt);
    scene.fog.near = cam.dist * 1.6; scene.fog.far = cam.dist * 5.5;
    world.update(cam.tgt.x, cam.tgt.z, W.t, cam.dist);      // bays, lights, shadow boxes and fixtures follow the view
  }
  {
    let drag = null;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, mode: (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'orbit' };
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag');
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.mode === 'orbit') { cam.az -= dx * 0.005; cam.el = clamp(cam.el + dy * 0.005, 0.12, 1.555); }
      else {
        const k = cam.dist * 1.15 / Math.max(300, canvas.clientHeight);
        const rx = Math.cos(cam.az), rz = -Math.sin(cam.az), fx = -Math.sin(cam.az), fz = -Math.cos(cam.az);
        const mx = (-dx * rx + dy * fx) * k, mz = (-dx * rz + dy * fz) * k;
        if (S.follow) { cam.pan.x += mx; cam.pan.z += mz; } else { cam.tgt.x += mx; cam.tgt.z += mz; }
      }
    });
    const up = (e) => { drag = null; canvas.classList.remove('drag'); try { canvas.releasePointerCapture(e.pointerId); } catch { /* */ } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 2.5, 120); }, { passive: false });
    canvas.addEventListener('dblclick', () => homeView());
  }
  function homeView() { cam.az = HOME.az; cam.el = HOME.el; cam.dist = HOME.dist; cam.pan.set(0, 0, 0); S.follow = true; notify(); }

  // ------------------------------------------------------------------ picture size = the canvas's real device pixels
  let PW = 0, PH = 0, resizeT = 0;
  function pictureSize() {
    if (qs.has('w') && qs.has('h')) return [Math.max(320, parseInt(qs.get('w'), 10) & ~1), Math.max(180, parseInt(qs.get('h'), 10) & ~1)];   // CT55.A5: a fixed movie size
    const dpr = window.devicePixelRatio || 1;
    let w = Math.max(320, stage.clientWidth * dpr), h = Math.max(180, stage.clientHeight * dpr);
    const s = Math.min(1, Math.sqrt(3840 * 2160 / (w * h)), 4096 / w, 2304 / h);
    return [Math.max(320, Math.floor(w * s / 2) * 2), Math.max(180, Math.floor(h * s / 2) * 2)];
  }
  function fit() {
    if (S.recording) return;                                // a take keeps its size (CSS scales the picture meanwhile)
    const [w, h] = pictureSize();
    if (w === PW && h === PH) return;
    PW = w; PH = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    clearTimeout(resizeT); resizeT = setTimeout(prepareRecorder, 900);
  }
  addEventListener('resize', fit);

  // ------------------------------------------------------------------ recording
  const FPS_KEY = 'CT55.fps';
  let FPS = parseInt(qs.get('fps') || (() => { try { return localStorage.getItem(FPS_KEY); } catch { return null; } })() || '60', 10) === 30 ? 30 : 60;
  let take = null, recBusy = false, recReady = '';
  async function prepareRecorder() {
    if (!CT55Rec.supported()) { recReady = 'this browser cannot make movies (use Chrome or Edge)'; return; }
    recReady = 'preparing…';
    const w = PW, h = PH, f = FPS;
    const pick = await CT55Rec.prepare(w, h, f, CT55Sound.SR);
    if (w === PW && h === PH && f === FPS) recReady = pick ? `${pick.name}${CT55Rec.audioPick ? ' + ' + (CT55Rec.audioPick.mux === 'aac' ? 'AAC' : 'Opus') + ' sound' : ' (no sound encoder)'}` : 'no video encoder works at this size';
  }
  async function startRecording() {
    if (recBusy || S.recording) return;
    if (!CT55Rec.supported()) { toast('This browser cannot make movies — use Chrome or Edge. Everything else works.'); return; }
    recBusy = true; fit();
    toast('Starting the recorder…');
    const w = PW, h = PH;
    let pick = CT55Rec.cached(w, h, FPS);
    if (pick === undefined) pick = await CT55Rec.prepare(w, h, FPS, CT55Sound.SR);
    recBusy = false;
    if (!pick) { toast('No video encoder works at ' + w + '×' + h + ' here. (' + CT55Rec.tried.slice(-3).join('; ') + ')'); return; }
    try { take = CT55Rec.Take(canvas, w, h, FPS, CT55Sound.SR, pick, CT55Rec.audioPick); }
    catch (e) { toast('The recorder could not start: ' + (e && e.message || e)); return; }
    S.recording = true; speaker.setMode('film'); document.body.classList.add('recording');
    toast(`● Recording ${w}×${h}, ${FPS} fps, ${pick.name}, sound ${take.audio}. Press Record again to stop and download the MP4.`, 5000);
    notify();
  }
  async function stopRecording() {
    if (!S.recording || !take) return;
    const t = take; take = null; S.recording = false; speaker.setMode('live'); document.body.classList.remove('recording'); notify();
    if (t.frames === 0) { t.abort(); toast('Nothing was recorded.'); fit(); return; }
    toast(`Finishing the movie (${t.frames} frames)…`, 60000);
    let blob;
    try { blob = await t.finish(); } catch (e) { toast('The movie failed in the browser encoder: ' + (e && e.message || e), 12000); fit(); return; }
    const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
    const name = `${LABEL}_movie_${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}.mp4`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    lastMovie = { name, url, bytes: blob.size, frames: t.frames, seconds: t.seconds, w: t.w, h: t.h, fps: t.fps, codec: t.codec, audio: t.audio, mbps: t.mbps };
    $('toast').innerHTML = `Movie downloaded: <b>${name}</b> — ${t.seconds.toFixed(1)} s, ${t.w}×${t.h}, ${t.fps} fps, ${(blob.size / 1048576).toFixed(1)} MB (in your Downloads folder) · <a href="${url}" download="${name}">save another copy</a>`;
    $('toast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('on'), 12000);
    fit();
  }
  let lastMovie = null;

  // ------------------------------------------------------------------ actions (buttons, keys and MIDI all come here)
  const listeners = [];
  function notify() { for (const f of listeners) { try { f(S); } catch (e) { console.error(e); } } refreshUI(); }
  const step1 = (key, arr, d) => { S[key] = clamp(S[key] + d, 0, arr.length - 1); };
  const ACT = {
    reset() {
      clearFlowers(); synth.clear();
      // CT55.A5: back to the opening state - travelling, gushing and swirling again, from the start of the street/hall
      Object.assign(S, { forward: true, emitLatched: true, emitHeld: false, pulse: false, pulseT: 0, swirlEmitter: true, swirlFlowers: true });   // CT55.A7 rates/strength survive
      Object.assign(W, { baseX: 0, baseVX: 0, swR: 1.6, swA: 0, ex: 0, ez: TRACK_Z, tz: TRACK_Z, evx: 0, evy: 0, evz: 0, acc: 0, glow: 1 });
      for (const r of rings) r.m.visible = false;
      cam.az = HOME.az; cam.el = HOME.el; cam.dist = HOME.dist; cam.pan.set(0, 0, 0); cam.first = true; S.follow = true;
      toast('Reset');
    },
    forward() { S.forward = !S.forward; },
    faster() { step1('speedIdx', SPEEDS, 1); },
    slower() { step1('speedIdx', SPEEDS, -1); },
    emit() {                                                 // CT55.A5: a plain on/off switch (A1's tap/hold timing is gone)
      S.emitLatched = !S.emitLatched; S.emitHeld = false;
      if (S.emitLatched) { for (let k = 0; k < 8; k++) emitOne(); synth.bell(screenPan(W.ex, W.ey, W.ez), 0.5, 0.15); W.glow = 1; }   // instant feedback
    },
    rateUp() { step1('rateIdx', RATES, 1); },
    rateDown() { step1('rateIdx', RATES, -1); },
    pulse() { S.pulse = !S.pulse; S.pulseT = S.pulse ? PULSES[S.pulseIdx] : 0; },   // the first burst comes at once
    pulseFaster() { step1('pulseIdx', PULSES, -1); },
    pulseSlower() { step1('pulseIdx', PULSES, 1); },
    burstUp() { step1('burstIdx', BURSTS, 1); },
    burstDown() { step1('burstIdx', BURSTS, -1); },
    swirlEmitter() { S.swirlEmitter = !S.swirlEmitter; },
    swirlFlowers() { S.swirlFlowers = !S.swirlFlowers; },
    record() { if (TOUR.on) { tourEnd(true); return; } if (S.recording) stopRecording(); else startRecording(); },
    tour() { tourStart(); },
    hud() { S.hud = !S.hud; document.body.classList.toggle('nohud', !S.hud); },
    sceneNext() { setScene(world.index + 1); },
    scenePrev() { setScene(world.index - 1); },
    scene1() { setScene(0); }, scene2() { setScene(1); }, scene3() { setScene(2); }, scene4() { setScene(3); }, scene5() { setScene(4); }, scene6() { setScene(5); },
    follow() { S.follow = !S.follow; if (S.follow) cam.pan.set(0, 0, 0); toast(S.follow ? 'The view follows the emitter' : 'The view stays put'); },
    mute() { synth.muted = !synth.muted; toast(synth.muted ? 'Sound off' : 'Sound on'); },
  };
  /** phase: 'press' | 'release' | 'tap'. Only 'emit' uses 'release'; everything else acts on press/tap. */
  function act(name, phase = 'tap') {
    const f = ACT[name]; if (!f) return;
    if (phase === 'release') return;                       // CT55.A5: every action acts on press / tap
    f(phase);
    flash(name); notify();
  }
  /** value controls from encoders / knobs / faders: {delta} in detents or {value} 0..1 */
  const VALUES = { speed: ['speedIdx', SPEEDS], rate: ['rateIdx', RATES], pulseInterval: ['pulseIdx', PULSES], pulseBurst: ['burstIdx', BURSTS] };
  function setValue(name, how) {
    if (name === 'swirlStrength') {
      S.swirlStrength = how.value !== undefined ? 0.3 + 2.9 * how.value : clamp(S.swirlStrength + 0.05 * how.delta, 0.3, 3.2);
    } else if (VALUES[name]) {
      const [key, arr] = VALUES[name];
      if (how.value !== undefined) S[key] = Math.round(clamp(how.value, 0, 1) * (arr.length - 1));
      else step1(key, arr, Math.sign(how.delta) * Math.max(1, Math.round(Math.abs(how.delta) / 2)));
    } else return;
    notify();
  }
  const isOn = (name) => ({ forward: S.forward, emit: emitting(), pulse: S.pulse, swirlEmitter: S.swirlEmitter, swirlFlowers: S.swirlFlowers, record: S.recording, tour: TOUR.on, hud: S.hud,
    scene1: world.index === 0, scene2: world.index === 1, scene3: world.index === 2, scene4: world.index === 3, scene5: world.index === 4, scene6: world.index === 5 })[name];
  // CT55.A5: switch environment (the flowers stay where they are; the view and the emitter's line follow)
  function setScene(i) {
    if (i < 0 || i >= world.count) return;   // CT55.A7: three scenes
    ENV = world.set(i); TRACK_Z = ENV.trackZ; cam.first = true;
    toast(`Scene ${world.index + 1} of ${world.count}: ${ENV.name}`);
  }

  // ------------------------------------------------------------------ on-screen buttons and keys
  const btns = [...document.querySelectorAll('#bar button[data-action]')];
  let learnHook = null;                                      // set by midi.js: right-click = learn
  for (const b of btns) {
    const name = b.dataset.action;
    b.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; b.setPointerCapture(e.pointerId); act(name, 'press'); });
    const rel = (e) => { if (e.button !== 0 && e.type === 'pointerup') return; if (name === 'emit') act(name, 'release'); };
    b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel);
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); if (learnHook) learnHook(name, b); });
    b.addEventListener('click', (e) => e.preventDefault());
  }
  function flash(name) { const b = btns.find(x => x.dataset.action === name); if (b) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120); } }
  const KEYS = { ' ': 'forward', Backspace: 'reset', '[': 'slower', ']': 'faster', e: 'emit', '-': 'rateDown', '_': 'rateDown', '=': 'rateUp', '+': 'rateUp',
    '1': 'scene1', '2': 'scene2', '3': 'scene3', '4': 'scene4', '5': 'scene5', '6': 'scene6', ',': 'scenePrev', '.': 'sceneNext', PageUp: 'scenePrev', PageDown: 'sceneNext',
    p: 'pulse', s: 'swirlEmitter', w: 'swirlFlowers', v: 'record', t: 'tour', h: 'hud', f: 'follow', m: 'mute' };
  const REPEATS = new Set(['slower', 'faster', 'rateDown', 'rateUp']);
  addEventListener('keydown', (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Escape') { for (const p of document.querySelectorAll('.panel.on')) p.classList.remove('on'); return; }
    if (e.key === '?' || e.key === '/') { $('helpPanel').classList.toggle('on'); return; }
    const name = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (!name) return;
    e.preventDefault();
    if (e.repeat && !REPEATS.has(name)) return;
    act(name, 'press');
  });
  $('b_help').onclick = () => $('helpPanel').classList.toggle('on');
  for (const x of document.querySelectorAll('[data-close]')) x.onclick = () => x.closest('.panel').classList.remove('on');
  $('fpsSel').value = String(FPS);
  $('fpsSel').onchange = () => { if (S.recording) { $('fpsSel').value = String(FPS); toast('Stop recording first'); return; } FPS = parseInt($('fpsSel').value, 10); try { localStorage.setItem(FPS_KEY, String(FPS)); } catch { /* */ } prepareRecorder(); };

  function refreshUI() {
    for (const b of btns) { const on = isOn(b.dataset.action); if (on !== undefined) b.classList.toggle('on', !!on); }
    $('v_speed').textContent = SPEEDS[S.speedIdx];
    $('v_rate').textContent = RATES[S.rateIdx];
    $('v_pulse').textContent = PULSES[S.pulseIdx].toFixed(2).replace(/0$/, '');
    $('v_burst').textContent = BURSTS[S.burstIdx];
    $('v_scene').textContent = `${world.index + 1} · ${ENV.name}`;
  }
  let toastT = 0;
  function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }

  // ------------------------------------------------------------------ HUD
  const perf = { n: 0, t0: 0, fps: 0 };
  let midiLine = 'MIDI: —';
  function hud(now) {
    perf.n++; if (now - perf.t0 > 500) { perf.fps = perf.n * 1000 / (now - perf.t0); perf.n = 0; perf.t0 = now; }
    if (!S.hud || (perf.n % 6)) return;
    const rec = S.recording && take ? `<b>● REC</b> ${take.seconds.toFixed(1)} s · ${take.frames} frames · ${take.w}×${take.h} @ ${take.fps} · ${take.codec} · ${take.mbps.toFixed(0)} Mbit/s${take.failed ? ' · ERROR ' + take.failed : ''}`
      : `movie: ${PW}×${PH} @ ${FPS} fps · ${recReady}`;
    $('hud').innerHTML =
      `<b>CT55.A7 · MIDI Flowers</b>\n` +
      `${ENV.name} · flowers ${alive.toLocaleString()} (${swirling} in the air) · emitter at ${W.baseX.toFixed(1)} m, ${W.ey.toFixed(2)} m up\n` +
      `${S.forward ? 'forward' : 'stopped'} ${SPEEDS[S.speedIdx]} m/s · emit ${emitting() ? 'ON' : 'off'} ${RATES[S.rateIdx]}/s · pulse ${S.pulse ? 'ON' : 'off'} every ${PULSES[S.pulseIdx]} s × ${BURSTS[S.burstIdx]}\n` +
      `swirl emitter ${S.swirlEmitter ? 'ON' : 'off'} · swirl flowers ${S.swirlFlowers ? 'ON' : 'off'} (strength ${S.swirlStrength.toFixed(2)})\n` +
      `view ${((cam.az * 180 / Math.PI) % 360).toFixed(0)}° / ${(cam.el * 180 / Math.PI).toFixed(0)}° · ${cam.dist.toFixed(1)} m${S.follow ? ' · following' : ''} · ${perf.fps.toFixed(0)} fps · sound ${speaker.running ? (synth.muted ? 'muted' : 'on') : 'click to start'}\n` +
      `${rec}\n${midiLine}`;
    if (S.recording && take) $('recTime').textContent = `${Math.floor(take.seconds / 60)}:${String(Math.floor(take.seconds) % 60).padStart(2, '0')}`;
  }

  // ------------------------------------------------------------------ CT55.A5: THE TOUR - one button, one movie of every scene
  // Press Tour: every scene is built first (so the take never stutters), recording starts, and each scene plays for
  // TOUR.seg seconds of movie time (default 15, ?seg=) from the opening state - travelling, gushing, swirling - with
  // the pulse joining in, a slow camera drift, a fade from and to black and the scene's name for the first seconds.
  // At the end the recording stops and the MP4 downloads. Press Tour again to stop early (the movie so far is kept).
  // The tour runs on the movie's own clock, so its timing in the movie is exact however slowly the computer draws.
  const TOUR = { on: false, k: 0, t: 0, seg: clamp(parseFloat(qs.get('seg') || '15'), 4, 120), list: [], fade: 1, title: 0 };
  const ovScene = new THREE.Scene(), ovCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  ovScene.add(fadeMesh);
  const titleCv = document.createElement('canvas'); titleCv.width = 1024; titleCv.height = 256;
  const titleTex = new THREE.CanvasTexture(titleCv); titleTex.colorSpace = THREE.SRGBColorSpace;
  const titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.25), new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  ovScene.add(titleMesh);
  function setTitle(name, sub) {
    const g = titleCv.getContext('2d'); g.clearRect(0, 0, 1024, 256);
    g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 18; g.fillStyle = '#fff7ec';
    g.font = '600 92px Georgia, "Times New Roman", serif'; g.fillText(name, 24, 130);
    g.font = '400 40px Georgia, "Times New Roman", serif'; g.fillStyle = 'rgba(255,240,225,0.85)'; g.fillText(sub, 28, 200);
    titleTex.needsUpdate = true;
  }
  function draw() {
    renderer.render(scene, camera);
    const show = fadeMesh.material.opacity > 0.001 || titleMesh.material.opacity > 0.001;
    if (!show) return;
    const asp = PW / PH, w = 0.9, hN = 0.225 * asp;             // the title: 45 % of the width, lower left, 4:1
    titleMesh.scale.set(w, hN / 0.25, 1); titleMesh.position.set(-1 + w / 2 + 0.05, -1 + hN / 2 + 0.08, 0);
    renderer.autoClear = false; renderer.render(ovScene, ovCam); renderer.autoClear = true;
  }
  function tourBegin(k) {
    TOUR.k = k; TOUR.t = 0;
    const i = TOUR.list[k];
    ENV = world.set(i); TRACK_Z = ENV.trackZ;
    ACT.reset();                                              // the opening state: travelling, gushing, swirling
    W.t = 0; S.pulse = false;
    setTitle(ENV.name, `CT55 · MIDI Flowers   ${i + 1} / ${world.count}`);
    notify();
  }
  function tourStep(dt) {
    TOUR.t += dt;
    const t = TOUR.t, seg = TOUR.seg;
    if (!S.pulse && t > seg * 0.38 && t < seg * 0.8) { S.pulse = true; S.pulseT = PULSES[S.pulseIdx]; notify(); }   // the pulse joins in
    if (S.pulse && t >= seg * 0.8) { S.pulse = false; notify(); }
    cam.az = 0.32 * Math.sin(t / seg * Math.PI * 2 + TOUR.k);                            // a slow camera drift
    cam.el = HOME.el + 0.07 * Math.sin(t / seg * Math.PI * 4 + TOUR.k);
    const F = 0.9;                                                                   // fade from / to black
    fadeMesh.material.opacity = t < F ? 1 - t / F : t > seg - F ? Math.min(1, (t - (seg - F)) / F) : 0;
    titleMesh.material.opacity = t < 0.6 ? t / 0.6 : t < 4 ? 1 : t < 5 ? 5 - t : 0;
    if (t >= seg) {
      if (TOUR.k + 1 < TOUR.list.length) tourBegin(TOUR.k + 1);
      else tourEnd(false);
    }
  }
  async function tourStart() {
    if (TOUR.on) { tourEnd(true); return; }
    if (S.recording) await stopRecording();
    const only = qs.has('only') ? qs.get('only').split(',').map(n => parseInt(n, 10) - 1) : null;   // ?only=3 or 2,5 : just those scenes
    TOUR.list = only || [...Array(world.count).keys()];
    toast('Tour: getting all the scenes ready…', 60000);
    for (const i of TOUR.list) { world.set(i); updateCamera(1); renderer.compile(scene, camera); draw(); await new Promise(r => setTimeout(r, 30)); }
    tourBegin(0); fadeMesh.material.opacity = 1;
    await startRecording();
    if (!S.recording) { toast('The tour needs the recorder, which did not start.'); return; }
    TOUR.on = true; notify();
    toast(`Tour: ${TOUR.list.length} scenes × ${TOUR.seg} s = ${TOUR.list.length * TOUR.seg} s of movie. The MP4 downloads at the end. Press Tour again to stop early.`, 6000);
  }
  function tourEnd(early) {
    TOUR.on = false; fadeMesh.material.opacity = 0; titleMesh.material.opacity = 0;
    cam.az = HOME.az; cam.el = HOME.el; notify();
    if (S.recording) stopRecording();
    if (early) toast('Tour stopped - saving the movie so far…');
  }

  // ------------------------------------------------------------------ the frame loop (one clock for screen and movie)
  let lastTick = 0;
  let frozen = false;                                        // tests only: stop the live loop (CT55.freeze)
  function tick(now) {
    requestAnimationFrame(tick);
    if (frozen) { lastTick = 0; return; }
    const filming = S.recording && take;
    if (filming) {
      if (now - lastTick < 1000 / FPS - 2) return;           // no more than fps frames a real second
      if (take.busy()) return;                               // let the encoder catch up (the movie is not affected)
      lastTick = now;
      const dt = 1 / FPS;                                    // exactly one movie frame
      step(dt); updateCamera(dt); writeMatrices(); draw();
      if (!take) return;                                     // the tour just ended this take
      const audio = synth.render(take.samplesForNextFrame());
      take.add(audio); speaker.feed(audio);
    } else {
      const dt = lastTick ? Math.min(0.1, Math.max(0.001, (now - lastTick) / 1000)) : 1 / 60;
      lastTick = now;
      step(dt); updateCamera(dt); writeMatrices(); draw();
    }
    hud(now);
  }

  // ------------------------------------------------------------------ public handle (midi.js, tests)
  window.CT55 = {
    LABEL, S, W, F, act, setValue, isOn, onChange: (f) => listeners.push(f), toast, synth, speaker, notify,
    setMidiLine(t) { midiLine = t; }, setLearnHook(f) { learnHook = f; }, buttons: btns,
    get alive() { return alive; }, get swirling() { return swirling; }, get picture() { return [PW, PH]; }, get fps() { return FPS; },
    get take() { return take; }, get lastMovie() { return lastMovie; }, get recReady() { return recReady; },
    world, setScene, get env() { return ENV; }, tour: TOUR, tourStart,
    renderer, scene, camera, cam, step, stepTo(sec, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) step(dt); updateCamera(1); writeMatrices(); draw(); },
    RATES, SPEEDS, PULSES, BURSTS, freeze(v) { frozen = !!v; },
  };

  fit(); refreshUI(); updateCamera(1); requestAnimationFrame(tick);
  setTimeout(prepareRecorder, 400);
  if (qs.get('tour') === '1') setTimeout(() => tourStart(), 1500);   // CT55.A5: ?tour=1 starts the tour by itself                          // in the background: the page never waits for it
  // CT55.A5: no help panel at start - in A1 it opened on the first run right over the emitter and hid every flower.
  window.addEventListener('error', (e) => toast('Error: ' + (e.message || e), 15000));   // CT55.A5: never fail silently
  window.addEventListener('unhandledrejection', (e) => toast('Error: ' + (e.reason && e.reason.message || e.reason), 15000));
})();
