/* CT55.A5 environment 6: a KALI SHRINE HALL built from the user's own "kali *.webp" pictures (in
 * CT55.A7.MidiFlowers_kali_images.js). Their look sets the room: black, vermilion and parchment with gold - walls
 * painted with radiating vermilion sunbursts, the pictures hung as great temple panels in carved brass frames between
 * black basalt pillars with gold bands, a vermilion floor with a cream kolam pattern, brass oil lamps (diyas) along
 * the wall, garlands of marigolds swagged across the hall, and tiered brass temple lamps hanging on chains below the
 * camera. The flowers are offering colours: hibiscus red, marigold orange, saffron, jasmine white, lotus pink.
 */
(window.CT55Scenes = window.CT55Scenes || []).push({
  id: 'kali', name: 'Kali shrine',
  bay: 7, trackZ: 4.4, ceiling: 9.5, front: 14,
  wallZ: (x) => { const r = ((x % 7) + 7) % 7; return (r < 0.5 || r > 6.5) ? 0.45 : 0.12; },
  camBox: { zmin: 0.7, zmax: 13.5, ymax: 9.0 },
  palette: [[0.99, 0.85, 0.62], [0.07, 0.95, 0.62], [0.11, 0.95, 0.66], [0.0, 0.0, 0.95], [0.93, 0.7, 0.78], [0.03, 0.8, 0.70]],
  light: {
    hemi: ['#d9a070', '#200a06', 0.45],
    key: { dir: [0.1, -1, 0.25], color: '#ffd9b0', int: 0.85, radius: 6 },
    fill: { dir: [-0.15, -1, -0.35], color: '#ffc89a', int: 0.75, radius: 9 },
    points: { color: '#ffa64a', int: 14, dist: 12 },
    bg: '#120604', exposure: 1.1,
  },
  build(c) {
    const { T, mulberry, canvasTex, repeatTex, glow, mats, TAU } = c;
    const root = new T.Group();
    const IMGS = (window.CT55_KALI || []).map(k => { const t = new T.TextureLoader().load(k.src); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; });
    const kolam = repeatTex(canvasTex(1024, 1024, (g, n) => {        // 3.5 m: vermilion floor, cream kolam (a lotus in dotted rings)
      g.fillStyle = '#7a1a10'; g.fillRect(0, 0, n, n);
      const r = mulberry(3); for (let k = 0; k < 2000; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,200,160'},${r() * 0.05})`; g.fillRect(r() * n, r() * n, 3, 3); }
      g.strokeStyle = '#efe0c0'; g.fillStyle = '#efe0c0'; g.lineWidth = 6; const c0 = n / 2;
      for (let k = 0; k < 8; k++) { g.save(); g.translate(c0, c0); g.rotate(k * Math.PI / 4); g.beginPath(); g.ellipse(0, -150, 55, 130, 0, 0, TAU); g.stroke(); g.restore(); }
      for (const R of [300, 380, 460]) for (let k = 0; k < Math.round(R / 9); k++) { const a = k / Math.round(R / 9) * TAU; g.beginPath(); g.arc(c0 + R * Math.cos(a), c0 + R * Math.sin(a), 5, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(c0, c0, 40, 0, TAU); g.fill();
      g.strokeStyle = '#d4a63a'; g.lineWidth = 10; g.strokeRect(6, 6, n - 12, n - 12);
    }), 240 / 3.5, 15 / 3.5);
    const sunburst = repeatTex(canvasTex(1024, 1024, (g, n) => {     // 7 m x 9.5 m of painted wall: black with vermilion rays
      g.fillStyle = '#140807'; g.fillRect(0, 0, n, n);
      const r = mulberry(11), cx = n / 2, cy = n * 0.42;
      for (let k = 0; k < 220; k++) { const a = k / 220 * TAU, L = n * (0.35 + r() * 0.4); g.strokeStyle = `rgba(${200 + r() * 40},${40 + r() * 30},${30},${0.25 + r() * 0.35})`; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * 80, cy + Math.sin(a) * 80); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke(); }
      for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(${r() < 0.3 ? '220,190,150' : '0,0,0'},${r() * 0.12})`; g.fillRect(r() * n, r() * n, 2 + r() * 4, 2 + r() * 4); }
      g.fillStyle = '#2a0c08'; g.fillRect(0, n * 0.9, n, n * 0.1);
      g.strokeStyle = '#c99a3a'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, n * 0.9); g.lineTo(n, n * 0.9); g.stroke();
      for (let x = 0; x < n; x += 32) { g.fillStyle = '#c99a3a'; g.beginPath(); g.moveTo(x, n * 0.9); g.lineTo(x + 16, n * 0.93); g.lineTo(x + 32, n * 0.9); g.fill(); }
    }), 1 / 7, 1 / 9.5);
    const ceilTex = repeatTex(canvasTex(512, 512, (g, n) => { g.fillStyle = '#2a0c08'; g.fillRect(0, 0, n, n); g.strokeStyle = '#a07a30'; g.lineWidth = 6; g.strokeRect(20, 20, n - 40, n - 40); g.beginPath(); g.arc(n / 2, n / 2, 120, 0, TAU); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.beginPath(); g.ellipse(n / 2 + Math.cos(a) * 160, n / 2 + Math.sin(a) * 160, 20, 40, a + Math.PI / 2, 0, TAU); g.stroke(); } }), 240 / 3.5, 15 / 3.5);
    const wallMat = new T.MeshStandardMaterial({ map: sunburst, roughness: 0.85 });
    c.room(root, { floorMat: new T.MeshStandardMaterial({ map: kolam, roughness: 0.4, metalness: 0.05 }), period: 3.5,
      ceiling: 9.5, ceilMat: new T.MeshStandardMaterial({ map: ceilTex, roughness: 0.9 }), front: 14, frontMat: wallMat, frontPeriod: 7 });
    const B = 7;
    const wallGeo = new T.BoxGeometry(B, 9.5, 0.5); wallGeo.translate(0, 4.75, -0.25 + 0.12);
    { const p = wallGeo.attributes.position, uv = wallGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + B / 2, p.getY(i)); }
    const basalt = new T.MeshStandardMaterial({ color: '#1c1816', roughness: 0.45, metalness: 0.1 });
    const brass = new T.MeshStandardMaterial({ color: '#c8963a', roughness: 0.3, metalness: 0.9 });
    const clay = new T.MeshStandardMaterial({ color: '#8a4a2a', roughness: 0.9 });
    const marigold = ['#ff8a00', '#ffb000', '#ff6a00', '#ffd23a'].map(col => new T.MeshStandardMaterial({ color: col, roughness: 0.85 }));
    const vermilion = new T.MeshStandardMaterial({ color: '#b3200f', roughness: 0.8 });
    const flameM = mats.flame;

    function templeFrame(tex, w, h, x, y) {                    // a picture in a stepped brass temple frame with a pointed crest
      const g = c.frame(tex, w, h, x, y, brass, 0.14, 0.14);
      g.position.z = 0.16;                                     // the painted wall's face is at z = 0.12
      const pic = g.children[0].material; pic.emissive = new T.Color('#ffffff'); pic.emissiveMap = tex; pic.emissiveIntensity = 0.3;   // lamp-lit, readable
      const crest = new T.Shape(); crest.moveTo(-w / 2 - 0.14, 0); crest.quadraticCurveTo(-w / 4, 0.25, 0, 0.75); crest.quadraticCurveTo(w / 4, 0.25, w / 2 + 0.14, 0); crest.lineTo(-w / 2 - 0.14, 0);
      const cm = new T.Mesh(new T.ExtrudeGeometry(crest, { depth: 0.08, bevelEnabled: false }), brass); cm.position.set(0, h / 2 + 0.14, 0.02); cm.castShadow = true; g.add(cm);
      const bindi = new T.Mesh(new T.CircleGeometry(0.1, 16), vermilion); bindi.position.set(0, h / 2 + 0.45, 0.11); g.add(bindi);
      return g;
    }
    function garland(group, a, b, sag, seed) {                 // marigold strings: a swag of orange and yellow blooms
      const r = mulberry(seed), n = 34, geo = new T.IcosahedronGeometry(0.07, 0);
      for (let i = 0; i <= n; i++) { const u = i / n, m = new T.Mesh(geo, marigold[Math.floor(r() * 4)]); m.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u), a.z + (b.z - a.z) * u); m.rotation.set(r() * 6, r() * 6, 0); group.add(m); }
    }
    function hangingLamp(x, y, z) {                            // tiered brass temple lamp with oil flames, on a chain
      const g = new T.Group(); g.position.set(x, y, z);
      const ch = c.chain(9.5 - y - 0.9, brass); ch.position.y += 0.9; g.add(ch);
      const flames = [];
      for (const [R, yy, n] of [[0.42, 0, 8], [0.28, 0.38, 6], [0.15, 0.68, 4]]) {
        const dish = new T.Mesh(new T.CylinderGeometry(R, R * 0.7, 0.07, 20), brass); dish.position.y = yy; dish.castShadow = true; g.add(dish);
        for (let k = 0; k < n; k++) { const a = k / n * TAU, f = new T.Mesh(new T.ConeGeometry(0.03, 0.1, 6), flameM); f.position.set(Math.cos(a) * R * 0.85, yy + 0.08, Math.sin(a) * R * 0.85); g.add(f); flames.push(f); const gl = glow('#ffb050', 0.32, 0.8); gl.position.copy(f.position); g.add(gl); }
      }
      const stem = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.9, 8), brass); stem.position.y = 0.45; g.add(stem);
      const top = new T.Mesh(new T.SphereGeometry(0.08, 12, 8), brass); top.position.y = 0.92; g.add(top);
      const bell = new T.Mesh(new T.ConeGeometry(0.09, 0.18, 12, 1, true), brass); bell.position.y = -0.2; g.add(bell);
      const big = glow('#ff9a3a', 2.8, 0.35); big.position.y = 0.3; g.add(big);
      return { g, flames };
    }

    // CT55.A7: hanging incense holders - brass censers (thuribles) on long chains, gently swinging, with glowing
    // embers inside and thin smoke curling up from them.
    const smokeTex = c.glowTex();
    function censer(group, anim, x, y, z, seed) {
      const L = 9.5 - y, pivot = new T.Group(); pivot.position.set(x, 9.5, z); group.add(pivot);
      const ch = c.chain(L - 0.32, brass); ch.position.y = -L + 0.32; pivot.add(ch);
      const body = new T.Group(); body.position.y = -L; pivot.add(body);
      const bowl = new T.Mesh(new T.SphereGeometry(0.17, 18, 10, 0, TAU, Math.PI / 2, Math.PI / 2), brass); bowl.castShadow = true; body.add(bowl);
      const lid = new T.Mesh(new T.SphereGeometry(0.165, 18, 8, 0, TAU, 0, Math.PI / 2), brass); lid.scale.y = 1.25; lid.position.y = 0.02; lid.castShadow = true; body.add(lid);
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, slot = new T.Mesh(new T.BoxGeometry(0.03, 0.09, 0.02), new T.MeshBasicMaterial({ color: '#ff7a20' })); slot.position.set(Math.cos(a) * 0.15, 0.09, Math.sin(a) * 0.15); slot.rotation.y = -a + Math.PI / 2; body.add(slot); }
      const spire = new T.Mesh(new T.ConeGeometry(0.05, 0.22, 10), brass); spire.position.y = 0.32; body.add(spire);
      const foot = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 0.06, 14), brass); foot.position.y = -0.18; body.add(foot);
      for (const a of [0, TAU / 3, 2 * TAU / 3]) { const c3 = c.chain(0.36, brass); c3.position.set(Math.cos(a) * 0.15, 0.0, Math.sin(a) * 0.15); c3.rotation.z = -Math.cos(a) * 0.35; c3.rotation.x = Math.sin(a) * 0.35; body.add(c3); }
      const ember = glow('#ff6a1a', 0.9, 0.55); ember.position.y = 0.08; body.add(ember);
      const NS = 18, puffs = [];
      for (let k = 0; k < NS; k++) {
        const m = new T.SpriteMaterial({ map: smokeTex, color: '#cfc2b4', transparent: true, depthWrite: false, opacity: 0 });
        const sp = new T.Sprite(m); group.add(sp); puffs.push({ sp, u: k / NS });
      }
      const r = mulberry(seed), ph = r() * 6, amp = 0.10 + 0.06 * r(), w = Math.sqrt(9.81 / L);
      let lastT = null;
      anim.push((t) => {
        const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
        const a = amp * Math.sin(w * t + ph), b = 0.4 * amp * Math.sin(w * 0.93 * t + ph * 1.7);
        pivot.rotation.z = a; pivot.rotation.x = b; ember.material.opacity = 0.45 + 0.15 * Math.sin(t * 9 + ph);
        const ex = x + Math.sin(a) * L, ey = 9.5 - Math.cos(a) * L + 0.36, ez = z - Math.sin(b) * L;
        for (const p of puffs) {
          p.u += dt * 0.27; if (p.u >= 1) { p.u -= 1; p.ox = ex; p.oz = ez; }
          const u = p.u; if (p.ox === undefined) { p.ox = ex; p.oz = ez; }
          p.sp.position.set(p.ox + 0.25 * u * Math.sin(t * 0.7 + u * 7 + ph), ey + u * 2.4, p.oz + 0.2 * u * Math.cos(t * 0.5 + u * 5));
          p.sp.scale.setScalar(0.12 + 0.9 * u);
          p.sp.material.opacity = 0.22 * Math.sin(Math.PI * u) * (1 - 0.4 * u);
        }
      });
    }

    function makeBay(j) {
      const group = new T.Group(), anchors = [], anim = [], r = mulberry(1300 + j);
      const wall = new T.Mesh(wallGeo, wallMat); wall.receiveShadow = true; wall.castShadow = true; group.add(wall);
      // basalt pillar with gold bands and a lotus capital
      const pil = new T.Mesh(new T.BoxGeometry(0.9, 9.5, 0.4), basalt); pil.position.set(-B / 2, 4.75, 0.25); pil.castShadow = true; pil.receiveShadow = true; group.add(pil);
      for (const y of [0.4, 1.2, 4.6, 8.4]) { const band = new T.Mesh(new T.BoxGeometry(0.98, 0.12, 0.46), brass); band.position.set(-B / 2, y, 0.26); group.add(band); }
      const cap = new T.Mesh(new T.CylinderGeometry(0.75, 0.45, 0.5, 8), basalt); cap.position.set(-B / 2, 8.9, 0.45); group.add(cap);
      // the pictures: one great panel per bay, two smaller beside it (all thirteen go round the hall)
      const N = Math.max(1, IMGS.length);
      if (IMGS.length) {
        group.add(templeFrame(IMGS[(j * 3) % N], 2.4, 2.4, 0, 2.75));
        group.add(templeFrame(IMGS[(j * 3 + 1) % N], 1.15, 1.15, -2.3, 2.2));
        group.add(templeFrame(IMGS[(j * 3 + 2) % N], 1.15, 1.15, 2.3, 2.2));
      }
      // vermilion cloth hangings from the pillar top
      const cloth = new T.Mesh(new T.PlaneGeometry(0.7, 2.6, 1, 10), new T.MeshStandardMaterial({ color: '#a8180c', roughness: 0.9, side: T.DoubleSide }));
      { const p = cloth.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.05 * Math.sin(p.getY(i) * 2.5 + j)); cloth.geometry.computeVertexNormals(); }
      cloth.position.set(-B / 2, 7.2, 0.5); group.add(cloth);
      // diyas along the wall: little clay lamps with flames
      for (let k = 0; k < 6; k++) {
        const x = -2.8 + k * 1.1, d = new T.Mesh(new T.SphereGeometry(0.07, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2), clay); d.position.set(x, 0.07, 0.35); d.scale.y = 0.6; d.rotation.x = Math.PI; group.add(d);
        const f = new T.Mesh(new T.ConeGeometry(0.022, 0.08, 6), flameM); f.position.set(x + 0.03, 0.12, 0.35); group.add(f);
        const gl = glow('#ffb050', 0.35, 0.85); gl.position.copy(f.position); group.add(gl);
        anim.push((t) => { f.scale.y = 0.8 + 0.25 * Math.sin(t * 17 + k * 1.9 + j); });
      }
      // marigold garlands: one along the wall under the panel, one swagged across the hall from the pillar
      garland(group, new T.Vector3(-1.5, 5.0, 0.3), new T.Vector3(1.5, 5.0, 0.3), 0.3, j * 7 + 1);
      garland(group, new T.Vector3(-B / 2, 6.0, 0.5), new T.Vector3(0, 6.0, 9.0), 0.9, j * 7 + 2);
      garland(group, new T.Vector3(0, 6.0, 9.0), new T.Vector3(B / 2, 6.0, 0.5), 0.9, j * 7 + 3);
      const hl = hangingLamp(0, 4.7, 4.8); group.add(hl.g);
      anim.push((t) => { for (let k = 0; k < hl.flames.length; k++) hl.flames[k].scale.y = 0.8 + 0.2 * Math.sin(t * 14 + k * 1.3 + j); hl.g.rotation.y = 0.15 * Math.sin(t * 0.25 + j); });
      censer(group, anim, -2.3, 3.4, 2.6, 900 + j);
      censer(group, anim, 2.6, 4.2, 7.0, 950 + j);
      anchors.push({ p: new T.Vector3(0, 5.0, 4.8), level: (t) => 0.88 + 0.07 * Math.sin(t * 10 + j) + 0.05 * Math.sin(t * 23 + j * 2) });
      anchors.push({ p: new T.Vector3(0, 0.4, 0.8), level: (t) => 0.35 + 0.05 * Math.sin(t * 15 + j) });   // the diyas' glow on the wall
      return { group, anchors, anim };
    }
    return { root, makeBay };
  },
});
