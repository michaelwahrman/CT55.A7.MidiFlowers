/* CT55.A5 environment 5: a RUSTIC TOWN ON AN AUTUMN NIGHT, at Halloween (replaces A3's medieval hall).
 * A muddy cobbled lane strewn with fallen leaves; along the far side clapboard and half-timbered cottages with
 * porches, crooked shutters and warm-lit windows; jack-o'-lanterns grinning on the steps and along the lane (they
 * flicker and light the street), plain pumpkins and gourds, hay bales, a scarecrow, a picket fence, bare autumn trees,
 * and strings of orange and purple bulbs plus tin lanterns crossing over the lane below the camera. A big low harvest
 * moon and drifting mist.
 */
(window.CT55Scenes = window.CT55Scenes || []).push({
  id: 'halloween', name: 'Autumn town, Halloween',
  bay: 9, trackZ: 5.2, ceiling: null, front: null,
  wallZ: () => 0.02,
  floorY: (x, z) => (z < 1.6 ? 0.12 : 0),
  camBox: { zmin: 0.6, zmax: 60, ymax: 60 },
  palette: [[0.07, 0.95, 0.70], [0.10, 0.95, 0.74], [0.78, 0.55, 0.72], [0.25, 0.65, 0.70], [0.13, 0.55, 0.86], [0.02, 0.75, 0.70]],
  light: {
    hemi: ['#3a3058', '#120d0a', 0.45],
    key: { dir: [0.35, -0.7, -0.6], color: '#ffd6a8', int: 1.2, radius: 5 },      // the harvest moon, low and warm
    fill: { dir: [-0.1, -1, -0.25], color: '#8a78b8', int: 0.3, radius: 10 },
    points: { color: '#ff8a2a', int: 14, dist: 12 },
    bg: '#120c16', exposure: 1.15,
  },
  build(c) {
    const { T, mulberry, canvasTex, repeatTex, glow, mats, TAU } = c;
    const root = new T.Group();
    const lane = repeatTex(canvasTex(1024, 1024, (g, n) => {             // 4 m: cobbles with fallen leaves
      const r = mulberry(19); g.fillStyle = '#17120e'; g.fillRect(0, 0, n, n);
      for (let j = 0; j < 20; j++) for (let i = 0; i < 15; i++) { const x = (i + (j % 2) * 0.5) * n / 15, y = j * n / 20; g.fillStyle = `hsl(${25 + r() * 15},${10 + r() * 10}%,${20 + r() * 12}%)`; g.beginPath(); g.ellipse(x + (r() - 0.5) * 8, y + n / 40, n / 32 + r() * 4, n / 46 + r() * 3, (r() - 0.5) * 0.4, 0, TAU); g.fill(); }
      for (let k = 0; k < 340; k++) {                                     // leaves: maple-ish, oak-ish
        const x = r() * n, y = r() * n, s = 8 + r() * 14, hue = [8, 18, 30, 42, 0][Math.floor(r() * 5)];
        g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = `hsl(${hue},${60 + r() * 30}%,${28 + r() * 22}%)`;
        g.beginPath(); for (let q = 0; q < 10; q++) { const a = q / 10 * TAU, rr = s * (q % 2 ? 0.45 : 1); g.lineTo(rr * Math.cos(a), rr * Math.sin(a) * 0.8); } g.fill();
        g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore();
      }
    }), 220 / 4, 80 / 4);
    const street = new T.Mesh(new T.PlaneGeometry(220, 80), new T.MeshStandardMaterial({ map: lane, roughness: 0.7 }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, 0, 40); street.receiveShadow = true; street.userData.follow = 4; root.add(street);
    const boards = repeatTex(canvasTex(512, 128, (g, w, h) => { const r = mulberry(4); for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${25 + r() * 10}%,${18 + r() * 8}%)`; g.fillRect(i * 64, 0, 62, h); } }), 220 / 4, 1);
    const walk = new T.Mesh(new T.BoxGeometry(220, 0.12, 1.6), new T.MeshStandardMaterial({ map: boards, roughness: 0.85 }));   // a boardwalk
    walk.position.set(0, 0.06, 0.8); walk.receiveShadow = true; walk.userData.follow = 4; root.add(walk);
    // sky: harvest moon, stars, mist
    const sky = new T.Group(); sky.userData.follow = 1; root.add(sky);
    const stars = new T.BufferGeometry(); { const r = mulberry(8), p = []; for (let i = 0; i < 900; i++) { const a = r() * TAU, e = 0.1 + r() * 1.3, R = 300; p.push(R * Math.cos(e) * Math.cos(a), R * Math.sin(e), R * Math.cos(e) * Math.sin(a)); } stars.setAttribute('position', new T.Float32BufferAttribute(p, 3)); }
    sky.add(new T.Points(stars, new T.PointsMaterial({ color: '#ffe9d0', size: 1.2, sizeAttenuation: false, fog: false })));
    const moonTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(0.38, '#ffc070'); gr.addColorStop(0.44, 'rgba(255,150,60,0.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(160,90,40,0.25)'; for (const [x, y, rr] of [[110, 100, 14], [150, 140, 10], [120, 150, 8]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); } });
    const moon = new T.Sprite(new T.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false })); moon.scale.setScalar(110); moon.position.set(-0.35 * 260, 0.45 * 260, 0.6 * 260); sky.add(moon);
    const mistTex = canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(200,190,220,0)'); gr.addColorStop(0.6, 'rgba(200,190,220,0.25)'); gr.addColorStop(1, 'rgba(200,190,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const mists = [];
    for (let k = 0; k < 5; k++) { const m = new T.Mesh(new T.PlaneGeometry(60, 1.4), new T.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5 })); m.position.set(0, 0.5, 3 + k * 2.6); m.rotation.x = -0.25; m.userData.follow = 1; root.add(m); mists.push(m); }

    const siding = (col) => new T.MeshStandardMaterial({ color: col, roughness: 0.9, map: repeatTex(canvasTex(256, 256, (g, n) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, i * 16 + 13, n, 3); } const r = mulberry(n); for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * n, r() * n, 6 + r() * 20, 2); } }), 1 / 2, 1 / 2) });
    const HOUSE = ['#5a3a2a', '#3e4a52', '#6b5a3a', '#4a3a4e', '#7a4a32', '#3a4a3a', '#5e5048', '#704030', '#40444e'].map(siding);
    const trim = new T.MeshStandardMaterial({ color: '#d6c7a8', roughness: 0.8 }), roof = new T.MeshStandardMaterial({ color: '#241c1a', roughness: 0.8 });
    const timber = new T.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.85 });
    const litMat = new T.MeshBasicMaterial({ color: '#ffb35a' }), darkMat = new T.MeshStandardMaterial({ color: '#10101a', roughness: 0.3, metalness: 0.3 });
    const pumpkinMats = ['#e8761c', '#f08a24', '#d9631a', '#f0a030'].map(col => new T.MeshStandardMaterial({ color: col, roughness: 0.55 }));
    const gourdMats = ['#e9dfc2', '#c9b23a', '#6a8a3a'].map(col => new T.MeshStandardMaterial({ color: col, roughness: 0.6 }));
    const stemMat = new T.MeshStandardMaterial({ color: '#4a5a22', roughness: 0.8 }), hay = new T.MeshStandardMaterial({ color: '#c9a24a', roughness: 1 });
    const bark = new T.MeshStandardMaterial({ color: '#1e1612', roughness: 0.95 });
    const wireMat = new T.LineBasicMaterial({ color: '#0e0a08' });
    const bulbM = ['#ff8a1e', '#ffb03a', '#a35cff', '#ff8a1e', '#7ae05a'].map(col => new T.MeshBasicMaterial({ color: col }));
    // a ribbed pumpkin
    const pumpGeo = (() => { const g = new T.SphereGeometry(1, 28, 18), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), rib = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 5)), 0.6); p.setXYZ(i, x * rib, y * 0.78 * (1 - 0.08 * (y > 0.85 ? 1 : 0)), z * rib); } g.computeVertexNormals(); return g; })();
    const faceTex = (seed) => canvasTex(256, 256, (g, w, h) => {      // a carved face: glowing holes on transparent
      const r = mulberry(seed); g.clearRect(0, 0, w, h); g.fillStyle = '#ffd25a';
      const eye = (cx) => { g.beginPath(); if (r() < 0.5) { g.moveTo(cx - 28, 110); g.lineTo(cx, 60); g.lineTo(cx + 28, 110); } else { g.ellipse(cx, 92, 24, 30, 0, 0, TAU); } g.fill(); };
      eye(80); eye(176);
      g.beginPath(); g.moveTo(118, 132); g.lineTo(128, 112); g.lineTo(138, 132); g.fill();     // nose
      g.beginPath(); g.moveTo(52, 160); const teeth = 3 + Math.floor(r() * 3);
      for (let k = 0; k <= teeth * 2; k++) { const x = 52 + k * (152 / (teeth * 2)); g.lineTo(x, k % 2 ? 182 : 160 + Math.sin(k) * 4); }
      g.quadraticCurveTo(128, 236, 52, 160); g.fill();
    });
    const faces = [0, 1, 2, 3].map(k => new T.MeshBasicMaterial({ map: faceTex(30 + k), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));

    function pumpkin(x, y, z, s, lit, seed, group, anim, anchors) {
      const g = new T.Group(); g.position.set(x, y + s * 0.78, z);
      const m = new T.Mesh(pumpGeo, pumpkinMats[seed % pumpkinMats.length]); m.scale.setScalar(s); m.castShadow = true; m.receiveShadow = true; g.add(m);
      const st = new T.Mesh(new T.CylinderGeometry(s * 0.08, s * 0.12, s * 0.3, 6), stemMat); st.position.y = s * 0.85; st.rotation.z = 0.25; g.add(st);
      if (lit) {
        const f = new T.Mesh(new T.PlaneGeometry(s * 1.5, s * 1.5), faces[seed % faces.length]); f.position.set(0, -s * 0.05, s * 1.0); g.add(f);
        const gl = glow('#ff8a2a', s * 4.5, 0.55); gl.position.set(0, 0, s * 0.9); g.add(gl);
        anim.push((t) => { const k = 0.8 + 0.12 * Math.sin(t * 11 + seed) + 0.08 * Math.sin(t * 23 + seed * 3); f.material.opacity = k; gl.material.opacity = 0.5 * k; });
        if (anchors) anchors.push({ p: new T.Vector3(x, y + s, z + s * 1.2), level: (t) => 0.8 + 0.12 * Math.sin(t * 11 + seed) + 0.08 * Math.sin(t * 23 + seed * 3) });
      }
      g.rotation.y = (seed * 0.7) % 1 - 0.5;
      group.add(g);
      return g;
    }
    function festoon(group, a, b, sag, seed, lanterns) {
      const r = mulberry(seed), pts = [], n = 16;
      for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new T.Vector3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u), a.z + (b.z - a.z) * u)); }
      group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), wireMat));
      const geo = new T.SphereGeometry(0.065, 8, 6);
      for (let i = 1; i < n; i++) {
        if (lanterns && i % 5 === 0) {                                     // a little tin lantern on the string
          const L = new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 0.26, 6), new T.MeshBasicMaterial({ color: '#ffb050' })); L.position.copy(pts[i]); L.position.y -= 0.2; group.add(L);
          const cap = new T.Mesh(new T.ConeGeometry(0.14, 0.12, 6), mats.iron); cap.position.copy(L.position); cap.position.y += 0.18; group.add(cap);
          const gl = glow('#ff9a40', 1.2, 0.6); gl.position.copy(L.position); group.add(gl);
          continue;
        }
        const m = new T.Mesh(geo, bulbM[Math.floor(r() * bulbM.length)]); m.position.copy(pts[i]); m.position.y -= 0.07; group.add(m);
        const gl = glow(m.material.color, 0.6, 0.6); gl.position.copy(m.position); group.add(gl);
      }
    }
    function tree(x, z, h, seed, group) {                          // a bare autumn tree with a few clinging leaves
      const r = mulberry(seed), g = new T.Group(); g.position.set(x, 0, z);
      const branch = (len, rad, depth, parent) => {
        const m = new T.Mesh(new T.CylinderGeometry(rad * 0.65, rad, len, 6), bark); m.position.y = len / 2; m.castShadow = true; parent.add(m);
        const tip = new T.Group(); tip.position.y = len; parent.add(tip);
        if (depth > 0) for (let k = 0; k < 2 + (r() < 0.4 ? 1 : 0); k++) { const b = new T.Group(); b.rotation.z = (r() - 0.5) * 1.6; b.rotation.y = r() * TAU; tip.add(b); branch(len * (0.6 + r() * 0.15), rad * 0.62, depth - 1, b); }
        else if (r() < 0.7) { const lf = new T.Mesh(new T.SphereGeometry(0.18, 5, 4), pumpkinMats[Math.floor(r() * 4)]); lf.scale.y = 0.4; tip.add(lf); }
      };
      branch(h * 0.42, 0.16, 4, g); group.add(g);
    }

    function makeBay(j) {
      const r = mulberry(170 + j * 13), group = new T.Group(), anchors = [], anim = [];
      const W = 9, floors = 1 + (j % 3 === 1 ? 1 : 0) + (r() < 0.45 ? 1 : 0), FH = 3.0, H = floors * FH + 0.5, wood = HOUSE[j % HOUSE.length];
      const body = new T.Mesh(new T.BoxGeometry(W - 0.4, H, 7), wood); body.position.set(0, H / 2, -3.5); body.castShadow = true; body.receiveShadow = true;
      body.rotation.z = (r() - 0.5) * 0.012; group.add(body);                         // a little crooked
      // steep gabled roof facing the lane, with a gable window
      const rs = new T.Shape(); rs.moveTo(-(W - 0.1) / 2, 0); rs.lineTo((W - 0.1) / 2, 0); rs.lineTo(0, 3.6 + r()); rs.lineTo(-(W - 0.1) / 2, 0);
      const gable = new T.Mesh(new T.ExtrudeGeometry(rs, { depth: 7.4, bevelEnabled: false }), roof); gable.position.set(0, H, -7.2); gable.castShadow = true; group.add(gable);
      const gw = new T.Mesh(new T.CircleGeometry(0.42, 18), r() < 0.6 ? litMat : darkMat); gw.position.set(0, H + 1.3, 0.22); group.add(gw);
      if (j % 2 === 0) for (const [bx, by, bw, bh, rot] of [[-W / 2 + 0.6, H / 2, 0.16, H, 0], [W / 2 - 0.6, H / 2, 0.16, H, 0], [0, FH, W - 0.4, 0.16, 0], [-2.2, FH * 0.5, 0.14, FH * 1.1, 0.6], [2.2, FH * 0.5, 0.14, FH * 1.1, -0.6]]) {   // half-timbering
        const b = new T.Mesh(new T.BoxGeometry(bw, bh, 0.06), timber); b.position.set(bx, by, 0.03); b.rotation.z = rot; group.add(b);
      }
      for (let f = 0; f < floors; f++) for (let k = 0; k < 3; k++) {
        if (f === 0 && k === 1) continue;
        const x = (k - 1) * 2.7, y = 0.8 + f * FH + 0.5, lit = r() < 0.5, ww = 0.95, wh = 1.3;
        const pane = new T.Mesh(new T.PlaneGeometry(ww, wh), lit ? litMat : darkMat); pane.position.set(x, y + wh / 2 - 0.2, 0.02); group.add(pane);
        if (lit) { const gl = glow('#ff9a40', 2.2, 0.35); gl.position.set(x, y + wh / 2 - 0.2, 0.4); group.add(gl); }
        for (const [bw, bh, bx, by] of [[ww + 0.16, 0.1, 0, wh + 0.03], [ww + 0.16, 0.12, 0, -0.06], [0.08, wh, -ww / 2 - 0.04, wh / 2], [0.08, wh, ww / 2 + 0.04, wh / 2], [0.05, wh, 0, wh / 2], [ww, 0.05, 0, wh * 0.55]]) {
          const b = new T.Mesh(new T.BoxGeometry(bw, bh, 0.07), trim); b.position.set(x + bx, y - 0.2 + by, 0.05); group.add(b);
        }
        const sh = new T.Mesh(new T.BoxGeometry(0.45, wh, 0.05), timber); sh.position.set(x + ww / 2 + 0.28, y + wh / 2 - 0.25, 0.1); sh.rotation.z = (r() - 0.5) * 0.25; sh.rotation.y = 0.3; group.add(sh);   // one crooked shutter
      }
      // porch: posts, a little roof, a door, steps with jack-o'-lanterns
      const door = new T.Mesh(new T.BoxGeometry(1.05, 2.2, 0.08), timber); door.position.set(0, 0.12 + 1.1, 0.04); door.castShadow = true; group.add(door);
      const pr = new T.Mesh(new T.BoxGeometry(2.6, 0.08, 1.3), roof); pr.position.set(0, 2.75, 0.65); pr.rotation.x = 0.18; pr.castShadow = true; group.add(pr);
      for (const s of [-1, 1]) { const post = new T.Mesh(new T.BoxGeometry(0.1, 2.65, 0.1), trim); post.position.set(s * 1.2, 1.4, 1.25); post.castShadow = true; group.add(post); }
      const step = new T.Mesh(new T.BoxGeometry(1.6, 0.12, 0.5), timber); step.position.set(0, 0.18, 1.45); step.receiveShadow = true; group.add(step);
      pumpkin(-0.9, 0.12, 1.3, 0.22, true, j * 3 + 1, group, anim, anchors);
      pumpkin(0.85, 0.24, 1.45, 0.16, true, j * 3 + 2, group, anim, null);
      pumpkin(1.15, 0.12, 1.05, 0.28, false, j * 3, group, anim, null);
      // along the lane: hay bale with pumpkins and gourds, or a scarecrow, or a tree; a picket fence
      const kind = j % 3;
      if (kind === 0) {
        const bale = new T.Mesh(new T.BoxGeometry(1.2, 0.55, 0.7), hay); bale.position.set(3.0, 0.4, 1.0); bale.castShadow = true; bale.receiveShadow = true; group.add(bale);
        pumpkin(2.75, 0.67, 1.0, 0.24, true, j * 3 + 7, group, anim, anchors);
        pumpkin(3.35, 0.67, 1.05, 0.14, false, j + 5, group, anim, null);
        for (let k = 0; k < 5; k++) { const gd = new T.Mesh(new T.SphereGeometry(0.08, 10, 8), gourdMats[k % 3]); gd.scale.y = 0.8 + r() * 0.6; gd.position.set(2.3 + k * 0.32, 0.2, 1.65 + (r() - 0.5) * 0.2); gd.castShadow = true; group.add(gd); }
      } else if (kind === 1) {                                        // a scarecrow
        const sc = new T.Group(); sc.position.set(-3.0, 0.12, 1.1);
        const pole = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2.3, 6), mats.wood); pole.position.y = 1.15; sc.add(pole);
        const arms = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.6, 6), mats.wood); arms.rotation.z = Math.PI / 2; arms.position.y = 1.65; sc.add(arms);
        const coat = new T.Mesh(new T.CylinderGeometry(0.22, 0.32, 0.9, 8), new T.MeshStandardMaterial({ color: '#5a4a6a', roughness: 1 })); coat.position.y = 1.4; sc.add(coat);
        const headP = new T.Mesh(pumpGeo, pumpkinMats[1]); headP.scale.setScalar(0.2); headP.position.y = 2.1; sc.add(headP);
        const hat = new T.Mesh(new T.ConeGeometry(0.25, 0.42, 10), new T.MeshStandardMaterial({ color: '#1a1414', roughness: 0.9 })); hat.position.y = 2.42; hat.rotation.z = 0.2; sc.add(hat);
        const brim = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.03, 16), hat.material); brim.position.y = 2.24; sc.add(brim);
        sc.traverse(o => { if (o.isMesh) o.castShadow = true; }); sc.rotation.y = 0.3; group.add(sc);
        pumpkin(-2.4, 0, 1.6, 0.26, true, j * 3 + 9, group, anim, anchors);
      } else tree(3.2, 1.0, 7 + r() * 2, j * 11 + 3, group);
      for (let k = 0; k < 14; k++) { const pk = new T.Mesh(new T.BoxGeometry(0.08, 0.7 + (k % 2) * 0.06, 0.03), trim); pk.position.set(-W / 2 + 0.3 + k * 0.62, 0.47, 1.62); pk.castShadow = true; group.add(pk); }
      // lantern posts on both sides and the strings of bulbs and tin lanterns over the lane
      const post = (x, z) => { const g = new T.Group(); g.position.set(x, 0, z); const p = new T.Mesh(new T.CylinderGeometry(0.06, 0.09, 4.4, 8), bark); p.position.y = 2.2; p.castShadow = true; g.add(p); const L = new T.Mesh(new T.BoxGeometry(0.28, 0.4, 0.28), new T.MeshBasicMaterial({ color: '#ffb35a' })); L.position.y = 4.1; g.add(L); const cap = new T.Mesh(new T.ConeGeometry(0.26, 0.2, 4), mats.iron); cap.position.y = 4.42; cap.rotation.y = Math.PI / 4; g.add(cap); const gl = glow('#ff9a40', 2.4, 0.7); gl.position.y = 4.1; g.add(gl); return g; };
      group.add(post(-W / 2, 1.7), post(-W / 2 + 4.5, 9.6));
      anchors.push({ p: new T.Vector3(-W / 2, 4.1, 1.7), level: (t) => 0.9 + 0.1 * Math.sin(t * 8 + j) });
      festoon(group, new T.Vector3(-W / 2, 4.5, 1.7), new T.Vector3(-W / 2 + 4.5, 4.5, 9.6), 0.75, j * 3 + 1, true);
      festoon(group, new T.Vector3(-W / 2 + 4.5, 4.5, 9.6), new T.Vector3(W / 2, 4.5, 1.7), 0.75, j * 3 + 2, true);
      // jack-o'-lanterns along the far kerb of the lane too
      pumpkin(-1.8, 0, 9.2, 0.2, true, j * 5 + 11, group, anim, null);
      return { group, anchors, anim };
    }
    return { root, makeBay, update: (t) => { for (let k = 0; k < mists.length; k++) mists[k].position.x += Math.sin(t * 0.1 + k) * 0.002; } };
  },
});
