/* CT55.A7.MidiFlowers -- the WORLD: several environments, one at a time, that we scroll sideways along.
 *
 * Every environment (CT55.A7.MidiFlowers_scene_*.js) registers itself in window.CT55Scenes and describes:
 *   id, name, bay (m, the repeat length along the hall/street), trackZ (the emitter's line), ceiling (m, or null outdoors),
 *   front (z of the wall behind the camera, or null), wallZ(x) (the back wall's face, for flowers and the camera),
 *   floorY(z) (the walking surface height, e.g. a raised pavement), light settings, and
 *   build(ctx) -> { root, makeBay(j) -> { group, anchors:[Vector3 local], anim:[fn(t)] }, update(t, cx) }.
 * The world keeps ONE shared set of lights (hemisphere, two shadow-casting directional lights, four point lights) and
 * only changes their colours / strengths / directions per environment, so switching never recompiles every shader.
 * Bays: nine copies of each environment's bay are re-used as the view travels (bay i uses copy i mod 9) - endless.
 * The four point lights move to the four light fixtures nearest the view (chandeliers, street lamps, tubes...).
 */
(function (global) {
  'use strict';
  const T = THREE, TAU = Math.PI * 2, NSETS = 9;

  // ------------------------------------------------------------------ helpers shared by the scenes
  function mulberry(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function canvasTex(w, h, draw, srgb = true) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const t = new T.CanvasTexture(cv); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const repeatTex = (t, rx, ry) => { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return t; };
  let _glow = null;
  function glowTex() {
    if (_glow) return _glow;
    _glow = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    return _glow;
  }
  function glow(color, size, opacity = 0.8) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity }));
    s.scale.setScalar(size); return s;
  }
  /** window outlines: 'pointed' (gothic), 'round' (semicircular top), 'rect' */
  function windowPath(kind, w, sill, spring, top, dx = 0) {
    const p = new T.Path(), hw = w / 2;
    p.moveTo(dx - hw, sill); p.lineTo(dx + hw, sill); p.lineTo(dx + hw, spring);
    if (kind === 'pointed') { const rise = top - spring; p.quadraticCurveTo(dx + hw, spring + rise * 0.75, dx, top); p.quadraticCurveTo(dx - hw, spring + rise * 0.75, dx - hw, spring); }
    else if (kind === 'round') p.absarc(dx, spring, hw, 0, Math.PI, false);
    else { p.lineTo(dx + hw, top); p.lineTo(dx - hw, top); p.lineTo(dx - hw, spring); }
    p.lineTo(dx - hw, sill);
    return p;
  }
  /** a wall slab (face at z = 0, going back to -depth) with window holes */
  function wallWithHoles(width, height, depth, holes) {
    const s = new T.Shape(); s.moveTo(-width / 2, 0); s.lineTo(width / 2, 0); s.lineTo(width / 2, height); s.lineTo(-width / 2, height); s.lineTo(-width / 2, 0);
    for (const h of holes) s.holes.push(h);
    const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -depth);
    return g;
  }
  /** glass in a window outline, UVs 0..1 over the opening */
  function glassGeo(path, w, sill, top) {
    const g = new T.ShapeGeometry(new T.Shape(path.getPoints(28)));
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) - sill) / (top - sill));
    return g;
  }
  /** a light shaft: the window outline swept along the light down to the floor (additive, faint) */
  function shaftGeo(path, dir, z0) {
    const pts = path.getPoints(24), pos = [], col = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], ta = a.y / -dir.y, tb = b.y / -dir.y;
      const A0 = [a.x, a.y, z0], B0 = [b.x, b.y, z0], A1 = [a.x + dir.x * ta, 0.01, z0 + dir.z * ta], B1 = [b.x + dir.x * tb, 0.01, z0 + dir.z * tb];
      pos.push(...A0, ...B0, ...B1, ...A0, ...B1, ...A1);
      col.push(1, 1, 1, 1, 1, 1, 0.22, 0.22, 0.22, 1, 1, 1, 0.22, 0.22, 0.22, 0.22, 0.22, 0.22);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }
  function shaftMat(color, opacity) { return new T.MeshBasicMaterial({ color, vertexColors: true, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: true }); }
  function painting(kind, seed) {
    return canvasTex(512, 384, (g, w, h) => {
      const r = mulberry(seed);
      if (kind === 'landscape') {
        const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
        sky.addColorStop(0, `hsl(${200 + r() * 25},45%,${55 + r() * 10}%)`); sky.addColorStop(1, `hsl(${35 + r() * 15},55%,78%)`);
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        for (let c = 0; c < 4; c++) { g.fillStyle = 'rgba(255,250,240,0.5)'; g.beginPath(); g.ellipse(r() * w, 30 + r() * 80, 40 + r() * 50, 12 + r() * 8, 0, 0, TAU); g.fill(); }
        for (let L = 0; L < 4; L++) {
          g.fillStyle = `hsl(${90 + r() * 40 - L * 8},${25 + L * 8}%,${48 - L * 9}%)`;
          g.beginPath(); g.moveTo(0, h); const base = h * (0.45 + L * 0.12);
          for (let x = 0; x <= w; x += 16) g.lineTo(x, base - 30 * Math.sin(x * 0.01 + L * 2 + r()) - 18 * Math.sin(x * 0.031 + L));
          g.lineTo(w, h); g.fill();
          if (L === 1) {
            const cx = 120 + r() * 260, cy = base - 40;
            g.fillStyle = '#6d6259'; g.fillRect(cx, cy - 40, 70, 50); g.fillRect(cx - 14, cy - 70, 22, 80); g.fillRect(cx + 62, cy - 62, 20, 72);
            for (let k = 0; k < 5; k++) g.fillRect(cx + k * 14, cy - 48, 8, 10);
            g.fillStyle = '#8a3a2a'; g.beginPath(); g.moveTo(cx - 16, cy - 70); g.lineTo(cx - 3, cy - 98); g.lineTo(cx + 10, cy - 70); g.fill();
          }
        }
        for (let k = 0; k < 7; k++) { const x = r() * w, y = h * (0.75 + r() * 0.2); g.fillStyle = '#2f4a2a'; g.beginPath(); g.ellipse(x, y - 30, 16, 32, 0, 0, TAU); g.fill(); g.fillStyle = '#3b2a1c'; g.fillRect(x - 2, y - 4, 4, 14); }
      } else if (kind === 'portrait') {
        const bg = g.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h / 2, w * 0.7);
        bg.addColorStop(0, `hsl(${20 + r() * 20},30%,30%)`); bg.addColorStop(1, '#140e0a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
        g.fillStyle = `hsl(${[0, 220, 120, 280, 30][Math.floor(r() * 5)]},${45 + r() * 20}%,${25 + r() * 12}%)`;
        g.beginPath(); g.moveTo(w * 0.2, h); g.quadraticCurveTo(w * 0.5, h * 0.42, w * 0.8, h); g.fill();
        g.fillStyle = '#e8dfcf'; g.beginPath(); g.moveTo(w * 0.42, h * 0.6); g.lineTo(w * 0.5, h * 0.72); g.lineTo(w * 0.58, h * 0.6); g.fill();
        g.fillStyle = '#d9b394'; g.beginPath(); g.ellipse(w / 2, h * 0.42, w * 0.085, h * 0.15, 0, 0, TAU); g.fill();
        g.fillStyle = r() < 0.5 ? '#3a2416' : '#7a5530'; g.beginPath(); g.ellipse(w / 2, h * 0.32, w * 0.1, h * 0.09, 0, Math.PI, TAU); g.fill();
        if (r() < 0.5) { g.fillStyle = '#c9a23a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(w * (0.41 + k * 0.045), h * 0.27); g.lineTo(w * (0.43 + k * 0.045), h * 0.2); g.lineTo(w * (0.45 + k * 0.045), h * 0.27); g.fill(); } g.fillRect(w * 0.41, h * 0.26, w * 0.18, h * 0.03); }
        g.fillStyle = 'rgba(30,20,15,0.6)'; g.fillRect(w * 0.47, h * 0.4, w * 0.015, h * 0.012); g.fillRect(w * 0.515, h * 0.4, w * 0.015, h * 0.012);
      } else {                                                       // 'still life': flowers in a vase, dark ground
        g.fillStyle = '#1d140d'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#5a3a22'; g.fillRect(0, h * 0.78, w, h * 0.22);
        g.fillStyle = '#8a6a4a'; g.beginPath(); g.ellipse(w / 2, h * 0.68, 40, 70, 0, 0, TAU); g.fill();
        for (let k = 0; k < 22; k++) { g.fillStyle = `hsl(${r() * 360},${50 + r() * 30}%,${55 + r() * 20}%)`; g.beginPath(); g.arc(w / 2 + (r() - 0.5) * 220, h * 0.18 + r() * h * 0.36, 12 + r() * 18, 0, TAU); g.fill(); }
        for (let k = 0; k < 12; k++) { g.fillStyle = '#2f4a2a'; g.beginPath(); g.ellipse(w / 2 + (r() - 0.5) * 200, h * 0.3 + r() * h * 0.3, 8, 22, r() * 3, 0, TAU); g.fill(); }
      }
      g.fillStyle = 'rgba(80,60,20,0.12)'; g.fillRect(0, 0, w, h);
    });
  }
  const TINCTURES = ['#9e1b22', '#1f3f8f', '#1e6b3a', '#5b2a7a', '#141414'], METALS = ['#d8b13c', '#e8e8e8'];
  function heraldry(seed) {
    return canvasTex(256, 320, (g, w, h) => {
      const r = mulberry(seed), field = TINCTURES[Math.floor(r() * TINCTURES.length)], metal = METALS[Math.floor(r() * 2)];
      g.fillStyle = field; g.fillRect(0, 0, w, h); g.fillStyle = metal; const k = Math.floor(r() * 4);
      if (k === 0) { g.fillRect(w * 0.4, 0, w * 0.2, h); g.fillRect(0, h * 0.35, w, h * 0.17); }
      else if (k === 1) { g.beginPath(); g.moveTo(0, h * 0.75); g.lineTo(w / 2, h * 0.3); g.lineTo(w, h * 0.75); g.lineTo(w, h * 0.95); g.lineTo(w / 2, h * 0.5); g.lineTo(0, h * 0.95); g.fill(); }
      else if (k === 2) g.fillRect(0, 0, w / 2, h);
      else { g.save(); g.translate(w / 2, h / 2); g.rotate(-0.7); g.fillRect(-w, -w * 0.11, 2 * w, w * 0.22); g.restore(); }
      g.fillStyle = k === 2 ? field : metal;
      g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 22 : 50; g.lineTo(w / 2 + rr * Math.cos(a), h * 0.28 + rr * Math.sin(a)); } g.fill();
    });
  }
  function banner(seed, field, trim = '#d8b13c', emblem = 'fleur') {
    return canvasTex(256, 768, (g, w, h) => {
      const r = mulberry(seed); field = field || TINCTURES[Math.floor(r() * 4)];
      g.clearRect(0, 0, w, h);
      g.fillStyle = field; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w / 2, h * 0.86); g.lineTo(0, h); g.closePath(); g.fill();
      g.strokeStyle = trim; g.lineWidth = 14; g.beginPath(); g.moveTo(10, 8); g.lineTo(w - 10, 8); g.lineTo(w - 10, h - 30); g.lineTo(w / 2, h * 0.86 - 22); g.lineTo(10, h - 30); g.closePath(); g.stroke();
      g.fillStyle = trim; g.strokeStyle = trim;
      if (emblem === 'fleur') { g.beginPath(); g.ellipse(w / 2, h * 0.32, 22, 70, 0, 0, TAU); g.ellipse(w / 2 - 46, h * 0.36, 16, 46, -0.6, 0, TAU); g.ellipse(w / 2 + 46, h * 0.36, 16, 46, 0.6, 0, TAU); g.fill(); g.fillRect(w / 2 - 60, h * 0.41, 120, 18); }
      else {                                                         // 'crest': a ring with a sword and a tower (a made-up house)
        g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h * 0.34, 80, 0, TAU); g.stroke();
        g.fillRect(w / 2 - 7, h * 0.2, 14, 190); g.fillRect(w / 2 - 40, h * 0.42, 80, 12);
        g.fillRect(w / 2 - 34, h * 0.26, 18, 40); g.fillRect(w / 2 + 16, h * 0.26, 18, 40);
      }
    });
  }
  function sword(len, mats) {
    const s = new T.Group();
    const blade = new T.Mesh(new T.BoxGeometry(0.06, len, 0.012), mats.steel); blade.position.y = -len / 2; s.add(blade);
    const tip = new T.Mesh(new T.ConeGeometry(0.042, 0.12, 4), mats.steel); tip.rotation.z = Math.PI; tip.scale.z = 0.3; tip.position.y = -len - 0.06; s.add(tip);
    const guard = new T.Mesh(new T.BoxGeometry(0.34, 0.045, 0.05), mats.gold); s.add(guard);
    const grip = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.22, 8), mats.leather); grip.position.y = 0.13; s.add(grip);
    const pommel = new T.Mesh(new T.SphereGeometry(0.045, 12, 8), mats.gold); pommel.position.y = 0.27; s.add(pommel);
    s.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return s;
  }
  function shieldAndSwords(x, y, seed, mats) {
    const g = new T.Group(); g.position.set(x, y, 0.06);
    for (const a of [-0.72, 0.72]) { const s = sword(1.15, mats); s.rotation.z = Math.PI + a; s.position.set(Math.sin(a) * 0.5, -Math.cos(a) * 0.5, 0.02); g.add(s); }
    const sh = new T.Shape(); sh.moveTo(-0.36, 0.4); sh.lineTo(0.36, 0.4); sh.lineTo(0.36, 0.05); sh.quadraticCurveTo(0.33, -0.3, 0, -0.5); sh.quadraticCurveTo(-0.33, -0.3, -0.36, 0.05); sh.lineTo(-0.36, 0.4);
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 16 });
    const uv = geo.attributes.uv, p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 0.36) / 0.72, (p.getY(i) + 0.5) / 0.9);
    const shield = new T.Mesh(geo, [new T.MeshStandardMaterial({ map: heraldry(seed), roughness: 0.5, metalness: 0.15 }), mats.gold]);
    shield.position.z = 0.08; shield.castShadow = true; g.add(shield);
    return g;
  }
  function frame(tex, w, h, x, y, mat, f = 0.11, depth = 0.09) {
    const g = new T.Group(); g.position.set(x, y, 0.05);
    const c = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, roughness: 0.75 })); c.position.z = 0.03; c.receiveShadow = true; g.add(c);
    for (const [bw, bh, bx, by] of [[w + 2 * f, f, 0, h / 2 + f / 2], [w + 2 * f, f, 0, -h / 2 - f / 2], [f, h, -w / 2 - f / 2, 0], [f, h, w / 2 + f / 2, 0]]) {
      const b = new T.Mesh(new T.BoxGeometry(bw, bh, depth), mat); b.position.set(bx, by, depth / 2); b.castShadow = true; g.add(b);
    }
    return g;
  }
  function chain(len, mat) {                    // a hanging chain/rod from y=0 up to y=len
    const m = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, len, 6), mat); m.position.y = len / 2; return m;
  }
  /** floor, ceiling and the wall behind the camera of an interior; they follow the view in whole pattern periods */
  function room(root, o) {
    const L = 240, D = o.front ?? 16;
    const floor = new T.Mesh(new T.PlaneGeometry(L, D + 1), o.floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (D + 1) / 2 - 1);
    floor.receiveShadow = true; floor.userData.follow = o.period || 4; root.add(floor);
    if (o.ceiling) {
      const ceil = new T.Mesh(new T.PlaneGeometry(L, D + 1), o.ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, o.ceiling, (D + 1) / 2 - 1);
      ceil.userData.follow = o.ceilPeriod || o.period || 4; root.add(ceil);
    }
    if (o.front) {
      const fw = new T.Mesh(new T.PlaneGeometry(L, o.ceiling || 10), o.frontMat); fw.rotation.y = Math.PI; fw.position.set(0, (o.ceiling || 10) / 2, o.front);
      fw.userData.follow = o.frontPeriod || o.period || 4; root.add(fw);
    }
    return root;
  }
  function stdMats() {
    return {
      iron: new T.MeshStandardMaterial({ color: '#2a2724', roughness: 0.55, metalness: 0.7 }),
      steel: new T.MeshStandardMaterial({ color: '#dfe4ea', roughness: 0.22, metalness: 0.95 }),
      gold: new T.MeshStandardMaterial({ color: '#c79a3a', roughness: 0.32, metalness: 0.88 }),
      leather: new T.MeshStandardMaterial({ color: '#4a2c1a', roughness: 0.8 }),
      wood: new T.MeshStandardMaterial({ color: '#5a3b22', roughness: 0.8 }),
      darkWood: new T.MeshStandardMaterial({ color: '#33231a', roughness: 0.75 }),
      white: new T.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.6 }),
      flame: new T.MeshBasicMaterial({ color: '#ffb347' }),
      bulb: new T.MeshBasicMaterial({ color: '#fff1c8' }),
    };
  }

  // ------------------------------------------------------------------ the manager
  function create(scene, renderer, opts = {}) {
    const SHADOW = opts.shadow || 2048;
    const hemi = new T.HemisphereLight('#ffffff', '#333333', 0.4); scene.add(hemi);
    const key = new T.DirectionalLight('#ffffff', 1), fill = new T.DirectionalLight('#ffffff', 1);
    for (const L of [key, fill]) {
      L.castShadow = true; L.shadow.mapSize.set(SHADOW, SHADOW); L.shadow.bias = -0.0004; L.shadow.camera.near = 1; L.shadow.camera.far = 120;
      L.shadow.blurSamples = 14; scene.add(L, L.target);
    }
    const points = []; for (let k = 0; k < 4; k++) { const p = new T.PointLight('#ffffff', 0, 12, 2); scene.add(p); points.push(p); }
    const ctx = { T, mulberry, canvasTex, repeatTex, glow, glowTex, windowPath, wallWithHoles, glassGeo, shaftGeo, shaftMat, painting, heraldry, banner,
      sword, shieldAndSwords, frame, chain, room, mats: stdMats(), renderer, TAU };
    const envs = (global.CT55Scenes || []).map(def => ({ def, built: null }));
    let cur = null, curIdx = -1;
    const _v = new T.Vector3();

    function build(e) {
      const d = e.def, b = d.build(ctx);
      b.root.visible = false; scene.add(b.root);
      const bays = [];
      for (let j = 0; j < NSETS; j++) { const bay = b.makeBay(j); bay.group.visible = false; scene.add(bay.group); bays.push(bay); }
      e.built = { ...b, bays };
    }
    function set(i) {
      i = ((i % envs.length) + envs.length) % envs.length;
      if (i === curIdx) return cur.def;
      if (cur) { cur.built.root.visible = false; for (const b of cur.built.bays) b.group.visible = false; }
      const e = envs[i]; if (!e.built) build(e);
      cur = e; curIdx = i;
      e.built.root.visible = true; for (const b of e.built.bays) b.group.visible = true;
      const L = e.def.light;
      hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
      key.color.set(L.key.color); key.intensity = L.key.int; key.shadow.radius = L.key.radius ?? 5;
      fill.color.set(L.fill.color); fill.intensity = L.fill.int; fill.shadow.radius = L.fill.radius ?? 9;
      key.userData.dir = new T.Vector3(...L.key.dir).normalize(); fill.userData.dir = new T.Vector3(...L.fill.dir).normalize();
      for (const p of points) { p.color.set(L.points.color); p.distance = L.points.dist ?? 12; }
      scene.background = new T.Color(L.bg); scene.fog.color.set(L.bg);
      renderer.toneMappingExposure = L.exposure ?? 1;
      return e.def;
    }
    function update(cx, cz, t, dist) {
      if (!cur) return;
      const d = cur.def, B = d.bay, bays = cur.built.bays;
      const first = Math.floor(cx / B) - Math.floor(NSETS / 2);
      for (let b = first; b < first + NSETS; b++) { const j = ((b % NSETS) + NSETS) % NSETS; bays[j].group.position.x = b * B + B / 2; }
      for (const o of cur.built.root.children) if (o.userData.follow) o.position.x = Math.round(cx / o.userData.follow) * o.userData.follow;
      // shadow boxes
      const half = Math.max(14, Math.min(42, dist * 1.25));
      key.target.position.set(cx, 1.5, d.trackZ ?? 3.2); key.position.copy(key.target.position).addScaledVector(key.userData.dir, -50);
      fill.target.position.set(cx, 0, cz + 3); fill.position.copy(fill.target.position).addScaledVector(fill.userData.dir, -45);
      for (const L of [key, fill]) { const c = L.shadow.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.updateProjectionMatrix(); }
      // fixtures: animate, and put the four point lights on the nearest ones
      const cand = [];
      for (const bay of bays) {
        for (const f of bay.anim) f(t);
        for (const a of bay.anchors) { _v.copy(a.p).add(bay.group.position); cand.push({ x: _v.x, y: _v.y, z: _v.z, d: Math.abs(_v.x - cx) + Math.abs(_v.z - cz) * 0.3, a }); }
      }
      cand.sort((a, b) => a.d - b.d);
      const P = d.light.points;
      for (let k = 0; k < points.length; k++) {
        const c = cand[k];
        if (!c) { points[k].intensity = 0; continue; }
        points[k].position.set(c.x, c.y, c.z);
        const flick = c.a.level ? c.a.level(t) : 1;
        points[k].intensity = P.int * flick;
      }
      if (cur.built.update) cur.built.update(t, cx);
    }
    return {
      set, update, ctx,
      get index() { return curIdx; }, get def() { return cur && cur.def; }, get count() { return envs.length; },
      names: envs.map(e => e.def.name), ids: envs.map(e => e.def.id),
      wallZ: (x) => cur ? cur.def.wallZ(x) : 0.02, floorY: (x, z) => (cur && cur.def.floorY) ? cur.def.floorY(x, z) : 0,
      key, fill, hemi, points,
    };
  }
  global.CT55World = { create, helpers: { mulberry, canvasTex } };
  global.CT55Scenes = global.CT55Scenes || [];
})(window);
