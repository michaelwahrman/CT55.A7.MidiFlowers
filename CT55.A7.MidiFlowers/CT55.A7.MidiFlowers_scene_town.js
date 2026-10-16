/* CT55.A5 environment 1 (the first one): a SMALL TOWN AT NIGHT, by moonlight.
 * A cobbled street; along the far side a row of old town houses (shutters, a few windows lit, a shop with an awning),
 * a raised pavement, iron street lamps on both kerbs, and strings of festoon lights zig-zagging across the street at
 * 4.5-5.5 m - below the camera, so you look down past them onto the flowers. Moon and stars overhead (look up).
 */
(window.CT55Scenes = window.CT55Scenes || []).push({
  id: 'town', name: 'Town at night',
  bay: 9, trackZ: 5.2, ceiling: null, front: null,
  wallZ: () => 0.02,
  floorY: (x, z) => (z < 1.8 ? 0.14 : 0),                       // the pavement in front of the houses
  camBox: { zmin: 0.6, zmax: 60, ymax: 60 },
  palette: [[0.72,0.55,0.80],[0.62,0.6,0.80],[0.45,0.5,0.78],[0.92,0.6,0.84],[0.13,0.6,0.86],[0.80,0.5,0.82]],   // CT55.A5: [hue, saturation, lightness] picks for the flowers
  light: {
    hemi: ['#30406e', '#0c0c14', 0.45],
    key: { dir: [0.32, -0.78, -0.55], color: '#b8c8ff', int: 1.5, radius: 5 },     // the moon, from over our shoulder
    fill: { dir: [-0.1, -1, -0.25], color: '#7f8fc8', int: 0.28, radius: 10 },
    points: { color: '#ffb065', int: 16, dist: 14 },
    bg: '#070b18', exposure: 1.15,
  },
  build(c) {
    const { T, mulberry, canvasTex, repeatTex, glow, mats, TAU } = c;
    const root = new T.Group();
    // cobbles
    const cob = repeatTex(canvasTex(1024, 1024, (g, n) => {
      const r = mulberry(9); g.fillStyle = '#16181d'; g.fillRect(0, 0, n, n);
      for (let j = 0; j < 22; j++) for (let i = 0; i < 16; i++) {
        const x = (i + (j % 2) * 0.5) * n / 16, y = j * n / 22, l = 22 + r() * 16;
        g.fillStyle = `hsl(${215 + r() * 25},${8 + r() * 8}%,${l}%)`;
        g.beginPath(); g.ellipse(x + (r() - 0.5) * 6, y + n / 44, n / 34 + r() * 3, n / 50 + r() * 2, (r() - 0.5) * 0.3, 0, TAU); g.fill();
        g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`; g.beginPath(); g.ellipse(x - 4, y + n / 44 - 3, n / 70, n / 120, 0, 0, TAU); g.fill();
      }
    }), 220 / 4, 80 / 4);
    const street = new T.Mesh(new T.PlaneGeometry(220, 80), new T.MeshStandardMaterial({ map: cob, roughness: 0.5, metalness: 0.05 }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, 0, 40); street.receiveShadow = true; street.userData.follow = 4; root.add(street);
    const paveTex = repeatTex(canvasTex(512, 256, (g, w, h) => { const r = mulberry(4); g.fillStyle = '#3d3c40'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `hsl(220,5%,${30 + r() * 10}%)`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } }), 220 / 2, 1);
    const pave = new T.Mesh(new T.BoxGeometry(220, 0.14, 1.8), new T.MeshStandardMaterial({ map: paveTex, roughness: 0.8 }));
    pave.position.set(0, 0.07, 0.9); pave.receiveShadow = true; pave.userData.follow = 2; root.add(pave);
    const kerb = new T.Mesh(new T.BoxGeometry(220, 0.16, 0.18), new T.MeshStandardMaterial({ color: '#55545a', roughness: 0.7 }));
    kerb.position.set(0, 0.08, 1.8); kerb.receiveShadow = true; kerb.userData.follow = 2; root.add(kerb);
    // sky: moon and stars (seen when you look up)
    const stars = new T.BufferGeometry(); { const r = mulberry(3), p = []; for (let i = 0; i < 1600; i++) { const a = r() * TAU, e = 0.05 + r() * 1.4, R = 300; p.push(R * Math.cos(e) * Math.cos(a), R * Math.sin(e), R * Math.cos(e) * Math.sin(a)); } stars.setAttribute('position', new T.Float32BufferAttribute(p, 3)); }
    const sky = new T.Group(); sky.userData.follow = 1; root.add(sky);
    sky.add(new T.Points(stars, new T.PointsMaterial({ color: '#dfe6ff', size: 1.3, sizeAttenuation: false, fog: false })));
    const moonTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, '#fffdf2'); gr.addColorStop(0.36, '#f1efe2'); gr.addColorStop(0.42, 'rgba(200,215,255,0.35)'); gr.addColorStop(1, 'rgba(160,180,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(150,150,140,0.25)'; for (const [x, y, rr] of [[110, 100, 14], [150, 140, 10], [120, 150, 8], [140, 105, 6]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); } });
    const moon = new T.Sprite(new T.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false }));
    moon.scale.setScalar(70); moon.position.set(-0.32 * 260, 0.78 * 260, 0.55 * 260); sky.add(moon);

    // houses
    const FACADES = ['#b8a27a', '#8d6f5a', '#7d8a78', '#6f7f95', '#c2b59a', '#9a6e5e', '#8f8aa0', '#a89870', '#7a8f8a'];
    const plaster = canvasTex(256, 256, (g, n) => { const r = mulberry(12); g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * n, r() * n, 2 + r() * 6, 2 + r() * 6); } });
    repeatTex(plaster, 1, 1);
    const roofMat = new T.MeshStandardMaterial({ color: '#2b2d36', roughness: 0.65 });
    const frameMat = new T.MeshStandardMaterial({ color: '#e8e2d4', roughness: 0.7 });
    const shutterMats = ['#2f5a46', '#3a4c6e', '#6b3434', '#4d4a3a'].map(col => new T.MeshStandardMaterial({ color: col, roughness: 0.75 }));
    const litMat = new T.MeshBasicMaterial({ color: '#ffcf86' }), darkMat = new T.MeshStandardMaterial({ color: '#141824', roughness: 0.2, metalness: 0.4 });
    const lampMat = new T.MeshStandardMaterial({ color: '#1f2a24', roughness: 0.5, metalness: 0.6 });
    const bulbCols = ['#ffd27a', '#ff9e7a', '#ffe9a8', '#ffb3c8', '#bfe3ff', '#c8ffbf'].map(col => new T.MeshBasicMaterial({ color: col }));
    const wireMat = new T.LineBasicMaterial({ color: '#1a1a1a' });
    const boxFlowerGeo = new T.SphereGeometry(0.07, 6, 4), boxFlowerMats = ['#e86a8a', '#f2c94c', '#ffffff', '#c78be0'].map(col => new T.MeshStandardMaterial({ color: col, roughness: 0.8 }));

    function lamp(x, z) {
      const g = new T.Group(); g.position.set(x, 0, z);
      const post = new T.Mesh(new T.CylinderGeometry(0.07, 0.11, 4.2, 10), lampMat); post.position.y = 2.1; post.castShadow = true; g.add(post);
      const base = new T.Mesh(new T.CylinderGeometry(0.18, 0.22, 0.5, 10), lampMat); base.position.y = 0.25; g.add(base);
      const head = new T.Mesh(new T.CylinderGeometry(0.22, 0.12, 0.5, 6), new T.MeshBasicMaterial({ color: '#ffd9a0' })); head.position.y = 4.45; g.add(head);
      const cap = new T.Mesh(new T.ConeGeometry(0.3, 0.25, 6), lampMat); cap.position.y = 4.82; cap.castShadow = true; g.add(cap);
      const gl = glow('#ffbf70', 2.6, 0.75); gl.position.y = 4.45; g.add(gl);
      return g;
    }
    function festoon(group, a, b, sag, seed) {        // a sagging string of bulbs from a to b
      const r = mulberry(seed), pts = [], n = 18;
      for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new T.Vector3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u), a.z + (b.z - a.z) * u)); }
      group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), wireMat));
      const geo = new T.SphereGeometry(0.06, 8, 6);
      for (let i = 1; i < n; i++) {
        const m = new T.Mesh(geo, bulbCols[Math.floor(r() * bulbCols.length)]); m.position.copy(pts[i]); m.position.y -= 0.07; group.add(m);
        const gl = glow(m.material.color, 0.55, 0.6); gl.position.copy(m.position); group.add(gl);
      }
    }
    function makeBay(j) {
      const r = mulberry(70 + j * 13), group = new T.Group(), anchors = [], anim = [];
      const W = 9, floors = 2 + (j % 3 === 1 ? 1 : 0) + (r() < 0.3 ? 1 : 0), FH = 3.1, H = floors * FH + 0.6;
      const facade = new T.MeshStandardMaterial({ color: FACADES[j % FACADES.length], map: plaster, roughness: 0.92 });
      const body = new T.Mesh(new T.BoxGeometry(W - 0.15, H, 7), facade); body.position.set(0, H / 2, -3.5); body.castShadow = true; body.receiveShadow = true; group.add(body);
      const cornice = new T.Mesh(new T.BoxGeometry(W, 0.3, 0.35), frameMat); cornice.position.set(0, H - 0.1, 0.1); cornice.castShadow = true; group.add(cornice);
      // pitched roof (a triangular prism) and a chimney
      const rs = new T.Shape(); rs.moveTo(-3.8, 0); rs.lineTo(3.8, 0); rs.lineTo(0, 3.2); rs.lineTo(-3.8, 0);
      const roof = new T.Mesh(new T.ExtrudeGeometry(rs, { depth: W - 0.1, bevelEnabled: false }), roofMat);
      roof.rotation.y = Math.PI / 2; roof.position.set(-(W - 0.1) / 2, H, -3.5); roof.castShadow = true; group.add(roof);
      const ch = new T.Mesh(new T.BoxGeometry(0.6, 1.6, 0.6), facade); ch.position.set(-2 + r() * 4, H + 2.2, -4.5); ch.castShadow = true; group.add(ch);
      // windows: frames, shutters, lit or dark panes
      const cols = 3;
      for (let f = 0; f < floors; f++) for (let k = 0; k < cols; k++) {
        const x = (k - 1) * 2.6, y = 0.9 + f * FH + 0.6;
        if (f === 0 && k === 1) continue;                          // the door goes here
        const shop = (j % 4 === 2) && f === 0;
        const lit = shop || r() < 0.38;
        const ww = shop ? 1.9 : 1.0, wh = shop ? 1.9 : 1.6;
        const pane = new T.Mesh(new T.PlaneGeometry(ww, wh), lit ? litMat : darkMat); pane.position.set(x, y + wh / 2 - 0.2, 0.02); group.add(pane);
        if (lit) { const gl = glow('#ffbf70', ww * 2.2, 0.35); gl.position.set(x, y + wh / 2 - 0.2, 0.4); group.add(gl); }
        for (const [bw, bh, bx, by] of [[ww + 0.16, 0.1, 0, wh + 0.03], [ww + 0.16, 0.12, 0, -0.06], [0.08, wh, -ww / 2 - 0.04, wh / 2], [0.08, wh, ww / 2 + 0.04, wh / 2], [0.05, wh, 0, wh / 2], [ww, 0.05, 0, wh * 0.6]]) {
          const b = new T.Mesh(new T.BoxGeometry(bw, bh, 0.08), frameMat); b.position.set(x + bx, y - 0.2 + by, 0.05); group.add(b);
        }
        if (!shop) {
          const sm = shutterMats[(j + f) % shutterMats.length];
          for (const s of [-1, 1]) { const sh = new T.Mesh(new T.BoxGeometry(0.5, wh, 0.05), sm); sh.position.set(x + s * (ww / 2 + 0.3), y + wh / 2 - 0.2, 0.08); sh.rotation.y = s * 0.25; sh.castShadow = true; group.add(sh); }
          const box = new T.Mesh(new T.BoxGeometry(ww + 0.1, 0.18, 0.25), mats.darkWood); box.position.set(x, y - 0.32, 0.16); group.add(box);   // a window box
          if (r() < 0.7) for (let q = 0; q < 5; q++) { const fl = new T.Mesh(boxFlowerGeo, boxFlowerMats[(q + j) % 4]); fl.position.set(x - ww / 2 + 0.12 + q * (ww - 0.24) / 4, y - 0.18, 0.2); group.add(fl); }
        } else {                                                    // shop: an awning
          const aw = new T.Mesh(new T.BoxGeometry(ww + 0.6, 0.06, 1.1), new T.MeshStandardMaterial({ color: ['#7a2e3a', '#2e5a7a', '#3e6a3a'][j % 3], roughness: 0.8 }));
          aw.position.set(x, y + wh + 0.05, 0.55); aw.rotation.x = 0.35; aw.castShadow = true; group.add(aw);
        }
      }
      // the door, a step and a little lamp over it
      const door = new T.Mesh(new T.BoxGeometry(1.1, 2.3, 0.1), shutterMats[(j + 1) % shutterMats.length]); door.position.set(0, 0.14 + 1.15, 0.03); door.castShadow = true; group.add(door);
      const dfr = new T.Mesh(new T.BoxGeometry(1.4, 0.14, 0.14), frameMat); dfr.position.set(0, 2.62, 0.07); group.add(dfr);
      const knob = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), mats.gold); knob.position.set(0.38, 1.25, 0.1); group.add(knob);
      const wl = new T.Mesh(new T.BoxGeometry(0.16, 0.24, 0.16), new T.MeshBasicMaterial({ color: '#ffd28a' })); wl.position.set(0.9, 2.75, 0.2); group.add(wl);
      const wgl = glow('#ffb46a', 1.4, 0.6); wgl.position.copy(wl.position); group.add(wgl);
      // street lamps on both kerbs and the festoon strings that cross between them
      const back = lamp(-W / 2, 1.55), front = lamp(-W / 2 + 4.5, 9.4); group.add(back, front);
      anchors.push({ p: new T.Vector3(-W / 2, 4.45, 1.55), level: (t) => 0.95 + 0.05 * Math.sin(t * 7 + j) });
      anchors.push({ p: new T.Vector3(-W / 2 + 4.5, 4.45, 9.4), level: (t) => 0.95 + 0.05 * Math.sin(t * 6 + j * 2) });
      festoon(group, new T.Vector3(-W / 2, 4.75, 1.55), new T.Vector3(-W / 2 + 4.5, 4.75, 9.4), 0.7, j * 3 + 1);
      festoon(group, new T.Vector3(-W / 2 + 4.5, 4.75, 9.4), new T.Vector3(W / 2, 4.75, 1.55), 0.7, j * 3 + 2);
      return { group, anchors, anim };
    }
    return { root, makeBay };
  },
});
