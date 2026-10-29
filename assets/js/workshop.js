/* ============================================================
   THE WORKSHOP — everything I've built
   Projects come from assets/data/projects.json. A project's
   "object" says what it is in the room:
     computer   the screen on the desk (one)
     book       a book standing on the side table (up to five)
     prototype  a model turning on the workbench (up to five)
     sketch     a drawing pinned to the wall (up to four)
   Every project, including any the room has no space for,
   is filed in the archive cabinet (#archive) and on the rail.
============================================================ */

import { loadJSON, openWorld } from "./worlds/ui.js";
import { loadProjects, renderProject, renderArchive } from "./worlds/projects.js";

const projects = await loadProjects(loadJSON);

const items = projects.map((p) => ({ id: p.id, path: p.id, title: p.name, sub: p.label || p.kind || p.year || "" }));
if (projects.length) items.push({ id: "archive", path: "archive", title: "The archive", sub: `All ${projects.length} projects`, num: "··" });

function resolve(path) {
  if (path === "archive") return { context: "The Workshop", render: () => renderArchive(projects) };
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
  const { THREE, std, glow, lines, canvasTexture, interfaceTex, blueprintTex, seeded, portrait, fovFor,
    woodTexture, stoneTexture, roughnessTexture, contactShadow, rbox } = S;
  const stage = S.createStage({
    canvas: document.querySelector(".stage"),
    background: "#17110e",
    fog: 0.028,
    exposure: 1.05,
    environment: 0.28,
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
  const { scene, renderer } = stage;
  const shadows = !stage.small;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const r = seeded(42);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const cast = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = shadows; m.receiveShadow = shadows; } }); return o; };
  const ground = (o, w, d, op = 0.45) => { const c = contactShadow(w, d, op); c.position.x = o.position.x; c.position.z = o.position.z; c.rotation.z = -o.rotation.y; scene.add(c); };

  // ---------------------------------------------------------------- materials: oak, walnut, plaster, aged brass
  const oakTex = woodTexture(5, { base: "#9a6f4b", dark: "#5e3f28" });
  const walnutTex = woodTexture(6, { base: "#5c3f2c", dark: "#2e1d12" });
  const woodRough = roughnessTexture(7, { lo: 0.45, hi: 0.8, streak: true });
  const oak = std("#ffffff", { map: oakTex, roughnessMap: woodRough, roughness: 1 });
  const walnut = std("#ffffff", { map: walnutTex, roughnessMap: woodRough, roughness: 1 });
  const floorTex = woodTexture(8, { base: "#7a573d", dark: "#3e2818", planks: 8 });
  floorTex.repeat.set(3, 3);
  const plaster = std("#ffffff", { map: stoneTexture(9, { base: "#8b7663", speck: 0.06, clouds: 0.3 }), roughness: 0.95 });
  plaster.map.repeat.set(3, 2);
  const metal = std("#2b2420", { metalness: 0.6, roughness: 0.45, roughnessMap: roughnessTexture(10, { lo: 0.3, hi: 0.6, streak: true }) });
  const brass = std("#b8955c", { metalness: 0.9, roughness: 0.38, roughnessMap: roughnessTexture(11, { lo: 0.25, hi: 0.6 }) });
  const paper = std("#efe6d6", { roughness: 0.95 });
  const amber = "#eaa978";

  // ---------------------------------------------------------------- the room
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), std("#ffffff", { map: floorTex, roughnessMap: woodRough, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2);
  floor.receiveShadow = shadows;
  const back = at(new THREE.Mesh(new THREE.PlaneGeometry(16, 8), plaster), 0, 4, -8);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), plaster);
  left.rotation.y = Math.PI / 2; left.position.set(-6, 4, -1);
  back.receiveShadow = left.receiveShadow = shadows;
  scene.add(floor, back, left);
  // skirting and a picture rail, the small lines that make a wall read as built
  scene.add(at(rbox(16, 0.2, 0.07, walnut, 0.02), 0, 0.1, -7.96), at(rbox(16, 0.06, 0.05, walnut, 0.015), 0, 5.6, -7.97));
  const skirtL = at(rbox(0.07, 0.2, 14, walnut, 0.02), -5.96, 0.1, -1); scene.add(skirtL);

  // evening light from a window just out of view, falling across the floor
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: S.glowTex, color: "#ffb070", transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending }));
  patch.rotation.x = -Math.PI / 2; patch.position.set(-3.2, 0.02, -0.6); patch.scale.set(6, 3.2, 1);
  scene.add(patch);

  // light: a low warm key from the window, the pendant over the desk, and a cool rim from the open side
  scene.add(new THREE.HemisphereLight("#ffe6cc", "#2a1a12", 0.28));
  const sun = new THREE.DirectionalLight("#ffc999", 0.9);
  sun.position.set(-12, 7, -1); sun.target.position.set(2, 0, -4);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 8, bottom: -4, near: 1, far: 30 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight("#8fa2c8", 0.35);
  rim.position.set(10, 5, 2);
  scene.add(rim);
  const lamp = new THREE.PointLight("#ffcf98", 30, 14, 1.6);
  lamp.position.set(0.2, 4.1, -5.6);
  scene.add(lamp);

  // ---------------------------------------------------------------- the desk, the lamps, the stool
  const desk = new THREE.Group();
  desk.add(at(rbox(3.4, 0.1, 1.4, oak, 0.03), 0, 1.5, 0));
  for (const [x, z] of [[-1.58, -0.6], [1.58, -0.6], [-1.58, 0.6], [1.58, 0.6]]) desk.add(at(rbox(0.09, 1.45, 0.09, walnut, 0.02), x, 0.73, z));
  // a drawer unit under one end
  const drawers = new THREE.Group();
  drawers.add(at(rbox(0.8, 1.2, 1.2, oak, 0.03), 0, 0.6, 0));
  for (let k = 0; k < 3; k++) {
    drawers.add(at(rbox(0.72, 0.34, 0.04, oak, 0.015), 0, 0.25 + k * 0.38, 0.61));
    drawers.add(at(rbox(0.18, 0.03, 0.04, brass, 0.01), 0, 0.3 + k * 0.38, 0.64));
  }
  drawers.position.set(1.1, 0, 0); desk.add(drawers);
  desk.add(at(rbox(0.92, 0.035, 0.32, metal, 0.01), 0.1, 1.57, 0.35));                // keyboard
  desk.add(at(rbox(0.36, 0.05, 0.26, std("#d9c7a0", { roughness: 0.9 }), 0.01), -1.1, 1.58, 0.25));   // notebook
  // a pencil cup
  const cup = at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.2, 20, 1, true), std("#3c5a64", { side: THREE.DoubleSide })), -1.45, 1.65, -0.3);
  desk.add(cup);
  for (let k = 0; k < 4; k++) { const pen = at(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), std(["#d9a441", "#2b2420", "#b8574a", "#efe6d6"][k])), -1.45 + (k - 1.5) * 0.025, 1.75, -0.3); pen.rotation.z = (k - 1.5) * 0.12; desk.add(pen); }
  // an articulated desk lamp
  const desklamp = new THREE.Group();
  desklamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 24), metal));
  const arm1 = at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8), brass), 0.12, 0.33, 0); arm1.rotation.z = -0.35; desklamp.add(arm1);
  const arm2 = at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), brass), 0.42, 0.7, 0); arm2.rotation.z = 1.1; desklamp.add(arm2);
  const head = at(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 20, 1, true), std("#2b2420", { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide })), 0.68, 0.62, 0); head.rotation.z = 2.4; desklamp.add(head);
  const dlGlow = glow("#ffd9a8", 0.9, 0.5); dlGlow.position.set(0.72, 0.55, 0); desklamp.add(dlGlow);
  desklamp.position.set(-1.45, 1.55, -0.35); desk.add(desklamp);
  desk.position.set(0.2, 0, -6.4);
  scene.add(cast(desk));
  ground(desk, 4.4, 2.2, 0.5);

  const pendant = new THREE.Group();
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 40, 1, true), std("#2b2420", { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }));
  const rimRing = at(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 8, 48), brass), 0, -0.25, 0); rimRing.rotation.x = Math.PI / 2;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff1d8", toneMapped: false }));
  bulb.position.y = -0.2;
  const halo = glow("#ffcf98", 2.2, 0.55); halo.position.y = -0.25;
  pendant.add(shade, rimRing, bulb, halo, lines([V(0, 0.25, 0), V(0, 4, 0)], "#120c08", 1));
  pendant.position.set(0.2, 4.4, -5.6);
  scene.add(pendant);

  const stool = new THREE.Group();
  stool.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.08, 32), oak), 0, 1.05, 0));
  stool.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 32), brass), 0, 0.45, 0)).children.at(-1).rotation.x = Math.PI / 2;
  for (let k = 0; k < 3; k++) {
    const leg = at(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.05, 8), walnut), Math.cos(k * 2.09) * 0.28, 0.52, Math.sin(k * 2.09) * 0.28);
    leg.rotation.set(Math.sin(k * 2.09) * 0.12, 0, -Math.cos(k * 2.09) * 0.12);
    stool.add(leg);
  }
  stool.position.set(0.6, 0, -4.7);
  scene.add(cast(stool));
  ground(stool, 1.2, 1.2, 0.4);

  // ---------------------------------------------------------------- the bookshelf along the left wall
  const shelf = new THREE.Group();
  for (let k = 0; k < 5; k++) shelf.add(at(rbox(0.5, 0.06, 3.0, walnut, 0.015), 0, 0.4 + k * 1.0, 0));
  shelf.add(at(rbox(0.5, 4.5, 0.07, walnut, 0.02), 0, 2.25, -1.5), at(rbox(0.5, 4.5, 0.07, walnut, 0.02), 0, 2.25, 1.5), at(rbox(0.04, 4.5, 3.0, walnut, 0.01), -0.24, 2.25, 0));
  const spines = ["#6c5b8e", "#b8574a", "#3c5a64", "#d9c7a0", "#4b5d3a", "#8a6446", "#2f3b5c", "#c49a6c"].map((c) => std(c, { roughness: 0.8 }));
  for (let k = 0; k < 4; k++) {
    let z = -1.38;
    while (z < 1.3) {
      const t = 0.07 + r() * 0.08, hgt = 0.55 + r() * 0.3;
      if (r() < 0.12) { z += 0.2; continue; }
      const b = at(rbox(0.36, hgt, t, spines[Math.floor(r() * spines.length)], 0.012), 0, 0.43 + k * 1.0 + hgt / 2, z + t / 2);
      if (r() < 0.08) { b.rotation.x = 0.18; }
      shelf.add(b);
      z += t + 0.01;
    }
  }
  shelf.position.set(-5.7, 0, -5.4);
  scene.add(cast(shelf));

  // pinned sketches, a pegboard of tools, and a train of gears turning on the wall
  for (const [x, y, rot] of [[-2.7, 3.3, 0.05], [-1.7, 3.6, -0.04]]) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.06), std("#ffffff", { map: blueprintTex, roughness: 0.95 }));
    sheet.position.set(x, y, -7.96); sheet.rotation.z = rot;
    scene.add(sheet, at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std("#b8574a")), x, y + 0.48, -7.93));
  }
  const peg = new THREE.Group();
  peg.add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), std("#ffffff", {
    map: canvasTexture(360, 240, (g, w, h) => { g.fillStyle = "#b99a76"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(40,25,15,.55)"; for (let y = 12; y < h; y += 20) for (let x = 12; x < w; x += 20) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); } }),
    roughness: 0.9,
  })));
  const ruler = at(rbox(0.06, 0.9, 0.02, std("#d9c49a"), 0.01), -0.65, 0, 0.03);
  const triangle = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.5)])), std("#3c5a64", { transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  triangle.position.set(-0.35, -0.3, 0.03);
  const ringTool = at(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 32), brass), 0.25, 0.2, 0.04);
  const hammer = new THREE.Group();
  hammer.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), oak), 0, 0, 0), at(rbox(0.22, 0.08, 0.08, metal, 0.015), 0, 0.3, 0));
  hammer.position.set(0.65, -0.05, 0.05);
  peg.add(ruler, triangle, ringTool, hammer);
  peg.position.set(2.6, 3.5, -7.97);
  scene.add(peg);
  function gear(radius, teeth) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.16, 10, 64), brass));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, 0.12, 24).rotateX(Math.PI / 2), brass));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.07, radius * 0.07, 0.18, 12).rotateX(Math.PI / 2), metal));
    for (let k = 0; k < 4; k++) { const spoke = rbox(radius * 1.8, radius * 0.09, 0.05, brass, 0.01); spoke.rotation.z = k * Math.PI / 4; g.add(spoke); }
    for (let k = 0; k < teeth; k++) {
      const a = k / teeth * Math.PI * 2;
      const tooth = at(rbox(radius * 0.2, radius * 0.25, 0.09, brass, 0.012), Math.cos(a) * radius * 1.17, Math.sin(a) * radius * 1.17, 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }
    return g;
  }
  const gears = [[0.62, 14, 3.9, 5.9], [0.38, 9, 4.95, 5.5], [0.5, 12, 4.85, 6.65]].map(([rad, teeth, x, y]) => {
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
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: S.glowTex, color: "#ffdcb0", size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(p);
    return p;
  })();

  // ================================================================ the projects, as objects
  const slots = { computer: [], book: [], prototype: [], sketch: [] };
  const cap = { computer: 1, book: 5, prototype: 5, sketch: 4 };
  projects.forEach((p) => {
    const kind = slots[p.object] ? p.object : "prototype";
    if (slots[kind].length < cap[kind]) slots[kind].push(p);
    else if (kind !== "prototype" && slots.prototype.length < cap.prototype) slots.prototype.push(p);
    // anything else lives only in the archive cabinet
  });
  const hover = (group, fn) => (s, animate) => fn(group, s, animate);

  // the computer: its screen shows the project's first image
  {
    const p = slots.computer[0];
    const monitor = new THREE.Group();
    monitor.add(at(rbox(0.12, 0.5, 0.12, metal, 0.02), 0, 0.25, -0.1), at(rbox(0.6, 0.04, 0.36, metal, 0.015), 0, 0.02, -0.1));
    monitor.add(at(rbox(2.0, 1.22, 0.08, std("#1b1512", { roughness: 0.4, metalness: 0.3 }), 0.03), 0, 0.98, -0.12));
    const screenTex = canvasTexture(1024, 620, (g, w, h) => { g.fillStyle = "#1d1620"; g.fillRect(0, 0, w, h); });
    const screen = at(new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.12), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })), 0, 0.98, -0.075);
    monitor.add(screen);
    monitor.position.set(0.2, 1.55, -6.75);
    scene.add(cast(monitor));
    const glowScreen = glow("#ffd9a8", 3.2, 0.12); glowScreen.position.set(0.2, 2.6, -6.5); scene.add(glowScreen);
    const g = screenTex.image.getContext("2d");
    const paint = (img) => {
      g.fillStyle = "#1d1620"; g.fillRect(0, 0, 1024, 620);
      g.strokeStyle = "rgba(255,214,168,.6)"; g.lineWidth = 2; g.strokeRect(14, 14, 996, 592);
      g.fillStyle = "rgba(255,214,168,.6)"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(34 + k * 18, 32, 5, 0, 7); g.fill(); }
      if (img) { const hgt = 540, w = hgt * img.width / img.height; g.drawImage(img, 512 - w / 2, 56, w, hgt); }
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

  // books standing on a side table, covers lettered with their names
  {
    const table = new THREE.Group();
    table.add(at(rbox(2.6, 0.08, 1.1, oak, 0.025), 0, 1.1, 0));
    for (const [x, z] of [[-1.2, -0.45], [1.2, -0.45], [-1.2, 0.45], [1.2, 0.45]]) table.add(at(rbox(0.08, 1.08, 0.08, walnut, 0.02), x, 0.54, z));
    table.add(at(rbox(2.4, 0.06, 0.04, walnut, 0.01), 0, 0.3, -0.45));
    table.position.set(-3.2, 0, -3.0); table.rotation.y = 0.35;
    scene.add(cast(table));
    ground(table, 3.2, 1.8, 0.45);
    const covers = ["#6c5b8e", "#b8574a", "#3c5a64", "#4b5d3a", "#8a6446"];
    const n = slots.book.length;
    slots.book.forEach((p, k) => {
      const cover = canvasTexture(320, 440, (g, w, h) => {
        g.fillStyle = covers[k % covers.length]; g.fillRect(0, 0, w, h);
        const sheen = g.createLinearGradient(0, 0, w, h); sheen.addColorStop(0, "rgba(255,255,255,.08)"); sheen.addColorStop(1, "rgba(0,0,0,.12)"); g.fillStyle = sheen; g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(232,205,150,.7)"; g.lineWidth = 2; g.strokeRect(18, 18, w - 36, h - 36); g.strokeRect(24, 24, w - 48, h - 48);
        g.fillStyle = "#f3dfb8"; g.font = "300 38px Outfit, sans-serif"; g.textAlign = "center";
        const words = p.name.split(" "); let line = "", y = 140;
        words.forEach((wd) => { const test = line ? `${line} ${wd}` : wd; if (g.measureText(test).width > w - 80) { g.fillText(line, w / 2, y); line = wd; y += 44; } else line = test; });
        g.fillText(line, w / 2, y);
        g.font = "600 15px Manrope, sans-serif"; g.fillText((p.year || p.label || "").toUpperCase(), w / 2, h - 50);
      });
      const side = std(covers[k % covers.length], { roughness: 0.75 });
      const pagesMat = std("#efe6d6", { map: canvasTexture(64, 256, (g, w, h) => { g.fillStyle = "#efe6d6"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(120,100,80,.25)"; for (let x = 0; x < w; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }), roughness: 0.95 });
      const coverMat = std("#ffffff", { map: cover, roughness: 0.7 });
      // the cover boards overhang the block of pages a little, like a real hardback
      const book = new THREE.Group();
      book.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.96, 0.13), [pagesMat, side, pagesMat, pagesMat, pagesMat, pagesMat]), 0.01, 0.5, 0));
      book.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 0.018), [side, side, side, side, coverMat, side]), 0, 0.5, 0.072));
      book.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 0.018), side), 0, 0.5, -0.072));
      book.add(at(rbox(0.035, 1.0, 0.16, side, 0.012), -0.36, 0.5, 0));
      const holder = new THREE.Group();
      holder.add(book);
      holder.position.set((k - (n - 1) / 2) * 0.82, 1.14, (k % 2) * 0.12 - 0.1);
      holder.rotation.set(-0.08, (k - (n - 1) / 2) * -0.08, 0);
      table.add(cast(holder));
      stage.add(p.id, holder, { title: p.name, sub: "A book on the table" }, {
        onState: hover(holder, (o, s) => { o.position.y = 1.14 + s * 0.22; o.rotation.x = -0.08 - s * 0.18; }),
      });
    });
  }

  // prototypes turning on the workbench, each under a glass dome with a paper tag
  const protos = [];
  {
    const bench = new THREE.Group();
    const n = slots.prototype.length;
    const len = Math.max(3.6, n * 1.1);
    bench.add(at(rbox(len, 0.12, 1.2, oak, 0.03), 0, 1.3, 0));
    for (const [x, z] of [[-len / 2 + 0.12, -0.5], [len / 2 - 0.12, -0.5], [-len / 2 + 0.12, 0.5], [len / 2 - 0.12, 0.5]]) bench.add(at(rbox(0.1, 1.26, 0.1, walnut, 0.02), x, 0.63, z));
    bench.add(at(rbox(len - 0.3, 0.05, 1.0, walnut, 0.015), 0, 0.35, 0));
    // a camera at the end of the bench
    const cam = new THREE.Group();
    cam.add(rbox(0.36, 0.22, 0.14, metal, 0.03), at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 24).rotateX(Math.PI / 2), brass), 0, 0, 0.12), at(rbox(0.08, 0.05, 0.06, metal, 0.01), 0.1, 0.13, 0));
    cam.position.set(len / 2 - 0.35, 1.48, 0.3); cam.rotation.y = -0.4;
    bench.add(cam);
    bench.position.set(3.4, 0, -5.0); bench.rotation.y = -0.38;
    scene.add(cast(bench));
    ground(bench, len + 1, 1.8, 0.45);
    const shapes = [
      () => new THREE.IcosahedronGeometry(0.32, 0),
      () => new THREE.TorusKnotGeometry(0.2, 0.06, 64, 8),
      () => new THREE.OctahedronGeometry(0.34, 0),
      () => new THREE.BoxGeometry(0.42, 0.42, 0.42),
      () => new THREE.DodecahedronGeometry(0.3, 0),
    ];
    const glassMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false });
    slots.prototype.forEach((p, k) => {
      const holder = new THREE.Group();
      holder.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.16, 32), walnut), 0, 0.08, 0));
      holder.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 40).rotateX(Math.PI / 2), brass), 0, 0.16, 0));
      const geo = shapes[k % shapes.length]();
      const model = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0.9 }));
      const core = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#2a1d14", emissive: new THREE.Color(amber), emissiveIntensity: 0.15, transparent: true, opacity: 0.5, metalness: 0.3, roughness: 0.4 }));
      const spin = new THREE.Group();
      spin.add(model, core);
      spin.position.y = 0.62;
      holder.add(spin);
      // a glass dome over it
      holder.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat), 0, 0.82, 0));
      holder.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.66, 32, 1, true), glassMat), 0, 0.49, 0));
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshStandardMaterial({
        roughness: 0.95,
        map: canvasTexture(400, 100, (g, w, h) => {
          g.fillStyle = "#efe6d6"; g.fillRect(0, 0, w, h);
          g.fillStyle = "#2b2420"; g.font = "500 28px Manrope, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
          let t = p.name; while (g.measureText(t).width > w - 24 && t.length > 4) t = `${t.slice(0, -2)}…`;
          g.fillText(t, w / 2, h / 2);
        }),
      }));
      tag.position.set(0, 0.03, 0.45); tag.rotation.x = -Math.PI / 2 + 0.3;
      holder.add(tag);
      holder.position.set(n > 1 ? -len / 2 + 0.7 + k * (len - 1.4) / (n - 1) : 0, 1.36, -0.05);
      bench.add(holder);
      const me = { spin, core, speed: 0.4 + k * 0.07, s: 0 };
      protos.push(me);
      stage.add(p.id, holder, { title: p.name, sub: "A prototype on the bench" }, {
        onState: (s) => { me.s = s; spin.position.y = 0.62 + s * 0.08; core.material.emissiveIntensity = 0.15 + s * 0.9; },
      });
    });
  }

  // drawings pinned to the wall
  slots.sketch.forEach((p, k) => {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), std("#ffffff", { map: blueprintTex }));
    const pin = at(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std("#b8574a")), 0, 0.52, 0.02);
    const holder = new THREE.Group();
    holder.add(sheet, pin);
    holder.position.set(-0.9 + k * 1.1, 4.4, -7.96); holder.rotation.z = (k % 2 ? 1 : -1) * 0.04;
    scene.add(holder);
    stage.add(p.id, holder, { title: p.name, sub: "A drawing on the wall" }, {
      onState: hover(holder, (o, s) => { o.position.z = -7.96 + s * 0.25; }),
    });
  });

  // the archive cabinet: a flat-file chest whose drawers hold every project
  if (projects.length) {
    const cabinet = new THREE.Group();
    cabinet.add(at(rbox(1.6, 1.25, 0.9, walnut, 0.04), 0, 0.68, 0));
    cabinet.add(at(rbox(1.7, 0.06, 1.0, walnut, 0.02), 0, 1.32, 0));
    for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) cabinet.add(at(rbox(0.08, 0.06, 0.08, walnut, 0.02), x, 0.03, z));
    const drawersOut = [];
    for (let k = 0; k < 5; k++) {
      const d = new THREE.Group();
      d.add(rbox(1.48, 0.2, 0.05, oak, 0.015));
      d.add(at(rbox(0.3, 0.035, 0.05, brass, 0.012), 0, 0.02, 0.04));
      d.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), paper), -0.45, 0.02, 0.028));
      d.position.set(0, 0.2 + k * 0.23, 0.45);
      cabinet.add(d);
      drawersOut.push(d);
    }
    // a few index cards waiting on top
    for (let k = 0; k < 3; k++) { const c = at(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.006, 0.28), paper), -0.3 + k * 0.08, 1.36 + k * 0.007, 0.05 - k * 0.05); c.rotation.y = 0.2 - k * 0.25; cabinet.add(c); }
    cabinet.position.set(-4.3, 0, -0.9); cabinet.rotation.y = 0.95;
    scene.add(cast(cabinet));
    ground(cabinet, 2.2, 1.5, 0.5);
    stage.add("archive", cabinet, { title: "The archive", sub: `All ${projects.length} projects` }, {
      onState: (s) => { drawersOut[3].position.z = 0.45 + s * 0.28; },
    });
  }

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
    lamp.intensity = 30 + Math.sin(t * 2.1) * 0.5;
  });
  return stage;
}
