/* ============================================================
   THE WORKSHOP — a studio where each object is a project
   Projects come from assets/data/projects.json. A project's
   "object" says what it is in the room:
     computer   the screen on the desk (the first one)
     book       a book standing on the side table (up to five)
     prototype  a model turning on the workbench
     sketch     a drawing pinned to the wall (up to four)
   Anything else, or more than the room holds, becomes a
   prototype on the bench.
============================================================ */

import { loadJSON, openWorld } from "./worlds/ui.js";
import { loadProjects, renderProject } from "./worlds/projects.js";

const projects = await loadProjects(loadJSON);

const items = projects.map((p) => ({ id: p.id, path: p.id, title: p.name, sub: p.label || p.year || "" }));

function resolve(path) {
  const p = projects.find((x) => x.id === path);
  if (!p) return null;
  return { context: "The Workshop · Projects", siblings: projects.map((x) => x.id), render: () => renderProject(p) };
}

openWorld({
  items,
  resolve,
  empty: { title: "The bench is clear", text: "No projects have been added yet." },
  scene: buildRoom,
});

// ================================================================== the room

const lerp = (a, b, k) => a + (b - a) * k;

function buildRoom(S) {
  const { THREE, std, glow, lines, canvasTexture, interfaceTex, blueprintTex, seeded, portrait, fovFor } = S;
  const stage = S.createStage({
    canvas: document.querySelector(".stage"),
    background: "#17110e",
    fog: 0.028,
    exposure: 1.05,
    rest: () => {
      const k = portrait();
      return {
        pos: new THREE.Vector3(lerp(3.8, 1.6, k), lerp(3.8, 5.4, k), lerp(7.4, 11.5, k)),
        target: new THREE.Vector3(lerp(-0.6, -0.4, k), lerp(2.0, 1.5, k), -4.2),
        fov: fovFor(lerp(66, 74, k)),
      };
    },
  });
  if (!stage) return null;
  const { scene } = stage;
  const r = seeded(42);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

  // ---------------------------------------------------------------- materials
  const planks = canvasTexture(512, 512, (g, w, h) => {
    for (let k = 0; k < 8; k++) {
      const shade = 88 + Math.round(r() * 26);
      g.fillStyle = `rgb(${shade + 20}, ${shade - 8}, ${shade - 34})`;
      g.fillRect(0, k * h / 8, w, h / 8);
      g.fillStyle = "rgba(30,18,10,.55)";
      g.fillRect(0, k * h / 8, w, 2);
      g.fillRect(r() * w, k * h / 8, 2, h / 8);
      for (let s = 0; s < 30; s++) { g.fillStyle = `rgba(40,24,14,${r() * 0.08})`; g.fillRect(0, k * h / 8 + r() * h / 8, w, 1); }
    }
  });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  planks.repeat.set(3, 3);
  const plaster = std("#8c7764", { roughness: 0.95 });
  const wood = std("#7a563c", { roughness: 0.7 });
  const darkWood = std("#4a3326", { roughness: 0.75 });
  const metal = std("#2b2420", { metalness: 0.6, roughness: 0.45 });
  const brass = std("#c8a56a", { metalness: 0.85, roughness: 0.32 });
  const amber = "#eaa978";

  // ---------------------------------------------------------------- the room
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), std("#ffffff", { map: planks, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2);
  const back = at(new THREE.Mesh(new THREE.PlaneGeometry(16, 8), plaster), 0, 4, -8);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), plaster);
  left.rotation.y = Math.PI / 2; left.position.set(-6, 4, -1);
  const skirting = at(box(16, 0.18, 0.06, darkWood), 0, 0.09, -7.97);
  scene.add(floor, back, left, skirting);

  // evening light from a window just out of view, falling across the floor
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: S.glowTex, color: "#ffb070", transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
  patch.rotation.x = -Math.PI / 2; patch.position.set(-3.2, 0.02, -0.6); patch.scale.set(6, 3.2, 1);
  scene.add(patch);

  // light
  scene.add(new THREE.HemisphereLight("#ffe6cc", "#2a1a12", 0.32));
  const sun = new THREE.DirectionalLight("#ffd9b0", 0.85);
  sun.position.set(-12, 7, -1); sun.target.position.set(2, 0, -4);
  scene.add(sun, sun.target);
  const lamp = new THREE.PointLight("#ffcf98", 34, 14, 1.6);
  lamp.position.set(0.2, 4.1, -5.6);
  scene.add(lamp);

  // ---------------------------------------------------------------- the desk, the lamp, the stool
  const desk = new THREE.Group();
  desk.add(at(box(3.4, 0.1, 1.4, wood), 0, 1.5, 0));
  for (const [x, z] of [[-1.6, -0.6], [1.6, -0.6], [-1.6, 0.6], [1.6, 0.6]]) desk.add(at(box(0.08, 1.5, 0.08, darkWood), x, 0.75, z));
  desk.add(at(box(0.9, 0.04, 0.32, metal), 0.1, 1.57, 0.35));                // keyboard
  desk.add(at(box(0.36, 0.05, 0.26, std("#d9c7a0")), -1.1, 1.58, 0.25));     // notebook
  desk.position.set(0.2, 0, -6.4);
  scene.add(desk);

  const pendant = new THREE.Group();
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 32, 1, true), std("#2b2420", { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff1d8", toneMapped: false }));
  bulb.position.y = -0.2;
  const halo = glow("#ffcf98", 2.2, 0.55); halo.position.y = -0.25;
  pendant.add(shade, bulb, halo, lines([V(0, 0.25, 0), V(0, 4, 0)], "#120c08", 1));
  pendant.position.set(0.2, 4.4, -5.6);
  scene.add(pendant);

  const stool = new THREE.Group();
  stool.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 28), wood), 0, 1.05, 0));
  for (let k = 0; k < 3; k++) {
    const leg = at(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.05, 6), darkWood), Math.cos(k * 2.09) * 0.28, 0.52, Math.sin(k * 2.09) * 0.28);
    leg.rotation.set(Math.sin(k * 2.09) * 0.12, 0, -Math.cos(k * 2.09) * 0.12);
    stool.add(leg);
  }
  stool.position.set(0.6, 0, -4.7);
  scene.add(stool);

  // ---------------------------------------------------------------- the bookshelf along the left wall
  const shelf = new THREE.Group();
  for (let k = 0; k < 5; k++) shelf.add(at(box(0.5, 0.06, 3.0, darkWood), 0, 0.4 + k * 1.0, 0));
  shelf.add(at(box(0.5, 4.5, 0.06, darkWood), 0, 2.25, -1.5), at(box(0.5, 4.5, 0.06, darkWood), 0, 2.25, 1.5));
  const spines = ["#6c5b8e", "#b8574a", "#3c5a64", "#d9c7a0", "#4b5d3a", "#8a6446", "#2f3b5c", "#c49a6c"].map((c) => std(c, { roughness: 0.8 }));
  for (let k = 0; k < 4; k++) {
    let z = -1.38;
    while (z < 1.3) {
      const t = 0.07 + r() * 0.08, hgt = 0.55 + r() * 0.3;
      if (r() < 0.12) { z += 0.2; continue; }
      shelf.add(at(box(0.36, hgt, t, spines[Math.floor(r() * spines.length)]), 0, 0.43 + k * 1.0 + hgt / 2, z + t / 2));
      z += t + 0.01;
    }
  }
  shelf.position.set(-5.7, 0, -5.4);
  scene.add(shelf);

  // pinned sketches, and a train of gears turning on the wall
  for (const [x, y, rot] of [[-2.7, 3.3, 0.05], [-1.7, 3.6, -0.04]]) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.06), std("#ffffff", { map: blueprintTex }));
    sheet.position.set(x, y, -7.97); sheet.rotation.z = rot;
    scene.add(sheet);
  }
  function gear(radius, teeth) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.16, 8, 48), brass));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, 0.1, 16).rotateX(Math.PI / 2), brass));
    for (let k = 0; k < 4; k++) { const spoke = box(radius * 1.8, radius * 0.08, 0.04, brass); spoke.rotation.z = k * Math.PI / 4; g.add(spoke); }
    for (let k = 0; k < teeth; k++) {
      const a = k / teeth * Math.PI * 2;
      const tooth = at(box(radius * 0.2, radius * 0.24, 0.08, brass), Math.cos(a) * radius * 1.17, Math.sin(a) * radius * 1.17, 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }
    return g;
  }
  const gears = [[0.62, 14, 3.3, 5.6], [0.38, 9, 4.35, 5.2], [0.5, 12, 4.25, 6.35]].map(([rad, teeth, x, y]) => {
    const g = gear(rad, teeth); g.position.set(x, y, -7.85); g.userData.rate = 1 / rad; scene.add(g); return g;
  });

  // pieces of interface drifting out of the open side of the room
  const fragments = [];
  for (let k = 0; k < 7; k++) {
    const w = 0.7 + r() * 0.6;
    const frag = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.66),
      new THREE.MeshBasicMaterial({ map: interfaceTex(60 + k, { dark: false, frame: r() > 0.3 }), transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    frag.userData = { x: 5.2 + r() * 2.4, y: 1.8 + r() * 3.6, z: -7 + k * 1.1, sp: 0.4 + r() * 0.5, ph: r() * 6 };
    frag.rotation.y = -0.7;
    scene.add(frag);
    fragments.push(frag);
  }

  // dust in the lamplight
  const dust = (() => {
    const n = 220, pos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { pos[k * 3] = -5 + r() * 12; pos[k * 3 + 1] = r() * 7; pos[k * 3 + 2] = -8 + r() * 9; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#ffdcb0", size: 0.03, transparent: true, opacity: 0.6, depthWrite: false }));
    scene.add(p);
    return p;
  })();

  // ================================================================ the projects, as objects
  const slots = { computer: [], book: [], prototype: [], sketch: [] };
  projects.forEach((p) => {
    const kind = slots[p.object] ? p.object : "prototype";
    const max = { computer: 1, book: 5, prototype: Infinity, sketch: 4 }[kind];
    (slots[kind].length < max ? slots[kind] : slots.prototype).push(p);
  });
  const hover = (group, fn) => (s, animate) => fn(group, s, animate);

  // the computer: its screen shows the project's first image
  {
    const p = slots.computer[0];
    const monitor = new THREE.Group();
    monitor.add(at(box(0.12, 0.5, 0.12, metal), 0, 0.25, -0.1), at(box(0.6, 0.04, 0.36, metal), 0, 0.02, -0.1));
    monitor.add(at(box(2.0, 1.22, 0.07, std("#1b1512", { roughness: 0.5 })), 0, 0.98, -0.12));
    const screenTex = canvasTexture(1024, 620, (g, w, h) => { g.fillStyle = "#1d1620"; g.fillRect(0, 0, w, h); });
    const screen = at(new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.12), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })), 0, 0.98, -0.08);
    monitor.add(screen);
    monitor.position.set(0.2, 1.55, -6.75);
    scene.add(monitor);
    const glowScreen = glow("#ffd9a8", 3.2, 0.12); glowScreen.position.set(0.2, 2.6, -6.5); scene.add(glowScreen);

    // draw the screen: a window with the project's picture, and interface lines beside it
    const g = screenTex.image.getContext("2d");
    const paint = (img) => {
      g.fillStyle = "#1d1620"; g.fillRect(0, 0, 1024, 620);
      g.strokeStyle = "rgba(255,214,168,.6)"; g.lineWidth = 2; g.strokeRect(14, 14, 996, 592);
      g.fillStyle = "rgba(255,214,168,.6)"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(34 + k * 18, 32, 5, 0, 7); g.fill(); }
      if (img) {
        const hgt = 540, w = hgt * img.width / img.height;
        g.drawImage(img, 512 - w / 2, 56, w, hgt);
      }
      g.fillStyle = "rgba(255,214,168,.45)";
      for (let k = 0; k < 9; k++) { g.fillRect(60, 90 + k * 46, 120 + (k * 37 % 140), 8); g.fillRect(1024 - 300, 90 + k * 46, 90 + (k * 53 % 150), 8); }
      if (p) { g.font = "300 34px Outfit, sans-serif"; g.fillStyle = "#ffe8cc"; g.fillText(p.name, 60, 560); }
      screenTex.needsUpdate = true;
      stage.requestRender();
    };
    paint(null);
    const first = p && p.images && p.images[0] && (p.images[0].src || p.images[0]);
    if (first) { const img = new Image(); img.onload = () => paint(img); img.src = first; }
    if (p) {
      stage.add(p.id, monitor, { title: p.name, sub: "On the screen" }, {
        onState: hover(monitor, (o, s) => { o.position.y = 1.55 + s * 0.08; glowScreen.material.opacity = 0.12 + s * 0.3; }),
      });
    }
  }

  // books standing on a side table
  {
    const table = new THREE.Group();
    table.add(at(box(2.4, 0.08, 1.1, wood), 0, 1.1, 0));
    for (const [x, z] of [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]]) table.add(at(box(0.07, 1.1, 0.07, darkWood), x, 0.55, z));
    table.position.set(-3.2, 0, -3.0); table.rotation.y = 0.35;
    scene.add(table);
    const covers = ["#6c5b8e", "#b8574a", "#3c5a64", "#4b5d3a", "#8a6446"];
    slots.book.forEach((p, k) => {
      const cover = canvasTexture(320, 440, (g, w, h) => {
        g.fillStyle = covers[k % covers.length]; g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(255,240,220,.55)"; g.lineWidth = 2; g.strokeRect(18, 18, w - 36, h - 36);
        g.fillStyle = "#fbefe0"; g.font = "300 40px Outfit, sans-serif"; g.textAlign = "center";
        const words = p.name.split(" "); let line = "", y = 150;
        words.forEach((wd) => { const test = line ? `${line} ${wd}` : wd; if (g.measureText(test).width > w - 70) { g.fillText(line, w / 2, y); line = wd; y += 46; } else line = test; });
        g.fillText(line, w / 2, y);
        g.font = "600 15px Manrope, sans-serif"; g.fillText((p.year || p.label || "").toUpperCase(), w / 2, h - 50);
      });
      const side = std(covers[k % covers.length], { roughness: 0.8 });
      const pages = std("#efe6d6", { roughness: 0.9 });
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 0.16), [side, pages, pages, pages, std("#ffffff", { map: cover, roughness: 0.75 }), side]);
      const holder = new THREE.Group();
      holder.add(book);
      book.position.y = 0.5;
      const n = slots.book.length;
      holder.position.set((k - (n - 1) / 2) * 0.78, 1.14, (k % 2) * 0.12 - 0.1);
      holder.rotation.set(-0.08, (k - (n - 1) / 2) * -0.08, 0);
      table.add(holder);
      stage.add(p.id, holder, { title: p.name, sub: "A book on the table" }, {
        onState: hover(holder, (o, s) => { o.position.y = 1.14 + s * 0.22; o.rotation.x = -0.08 - s * 0.18; }),
      });
    });
  }

  // prototypes turning on the workbench
  const protos = [];
  {
    const bench = new THREE.Group();
    const n = slots.prototype.length;
    const len = Math.max(3.6, n * 1.1);
    bench.add(at(box(len, 0.1, 1.2, wood), 0, 1.3, 0));
    for (const [x, z] of [[-len / 2 + 0.1, -0.5], [len / 2 - 0.1, -0.5], [-len / 2 + 0.1, 0.5], [len / 2 - 0.1, 0.5]]) bench.add(at(box(0.08, 1.3, 0.08, darkWood), x, 0.65, z));
    // a camera at the end of the bench
    const cam = new THREE.Group();
    cam.add(box(0.36, 0.22, 0.14, metal), at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 20).rotateX(Math.PI / 2), brass), 0, 0, 0.12));
    cam.position.set(len / 2 - 0.35, 1.47, 0.25); cam.rotation.y = -0.4;
    bench.add(cam);
    bench.position.set(3.4, 0, -5.0); bench.rotation.y = -0.38;
    scene.add(bench);
    const shapes = [
      () => new THREE.IcosahedronGeometry(0.32, 0),
      () => new THREE.TorusKnotGeometry(0.2, 0.06, 48, 6),
      () => new THREE.OctahedronGeometry(0.34, 0),
      () => new THREE.BoxGeometry(0.42, 0.42, 0.42),
      () => new THREE.DodecahedronGeometry(0.3, 0),
    ];
    slots.prototype.forEach((p, k) => {
      const holder = new THREE.Group();
      holder.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.22, 24), darkWood), 0, 0.11, 0));
      const geo = shapes[k % shapes.length]();
      const model = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0.9 }));
      const core = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#2a1d14", emissive: new THREE.Color(amber), emissiveIntensity: 0.15, transparent: true, opacity: 0.5 }));
      const spin = new THREE.Group();
      spin.add(model, core);
      spin.position.y = 0.66;
      holder.add(spin);
      // a paper tag with its name
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.2), new THREE.MeshBasicMaterial({
        map: canvasTexture(390, 100, (g, w, h) => {
          g.fillStyle = "#efe6d6"; g.fillRect(0, 0, w, h);
          g.fillStyle = "#2b2420"; g.font = "500 30px Manrope, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
          let t = p.name; while (g.measureText(t).width > w - 20 && t.length > 4) t = `${t.slice(0, -2)}…`;
          g.fillText(t, w / 2, h / 2);
        }),
      }));
      tag.position.set(0, 0.03, 0.42); tag.rotation.x = -Math.PI / 2 + 0.3;
      holder.add(tag);
      holder.position.set(n > 1 ? -len / 2 + 0.7 + k * (len - 1.4) / (n - 1) : 0, 1.35, -0.05);
      bench.add(holder);
      protos.push({ spin, core, speed: 0.4 + k * 0.07, s: 0 });
      const me = protos[protos.length - 1];
      stage.add(p.id, holder, { title: p.name, sub: "A prototype on the bench" }, {
        onState: (s) => { me.s = s; spin.position.y = 0.66 + s * 0.18; core.material.emissiveIntensity = 0.15 + s * 0.9; },
      });
    });
  }

  // drawings pinned to the wall
  slots.sketch.forEach((p, k) => {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), std("#ffffff", { map: blueprintTex }));
    const pin = at(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std("#b8574a")), 0, 0.52, 0.02);
    const holder = new THREE.Group();
    holder.add(sheet, pin);
    holder.position.set(2.2 + k * 1.1, 3.3, -7.96); holder.rotation.z = (k % 2 ? 1 : -1) * 0.04;
    scene.add(holder);
    stage.add(p.id, holder, { title: p.name, sub: "A drawing on the wall" }, {
      onState: hover(holder, (o, s) => { o.position.z = -7.96 + s * 0.25; }),
    });
  });

  // ================================================================ alive
  stage.start((dt, t, animate) => {
    if (!animate) return;
    gears.forEach((g, k) => { g.rotation.z += dt * 0.25 * g.userData.rate * (k % 2 ? -1 : 1); });
    protos.forEach((p) => { p.spin.rotation.y += dt * p.speed * (1 + p.s * 2); p.spin.rotation.x = Math.sin(t * 0.4) * 0.2; });
    fragments.forEach((f) => {
      const u = f.userData;
      f.position.set(u.x + Math.sin(t * 0.2 * u.sp + u.ph) * 0.4, u.y + Math.sin(t * u.sp + u.ph) * 0.12, u.z);
    });
    dust.rotation.y = Math.sin(t * 0.05) * 0.05;
    lamp.intensity = 34 + Math.sin(t * 2.1) * 0.5;
  });
  return stage;
}
