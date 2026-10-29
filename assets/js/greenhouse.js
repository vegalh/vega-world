/* ============================================================
   THE GREENHOUSE — growth, childhood, and education
   Areas come from assets/data/greenhouse.json. Each area has
   an "object" in the glasshouse:
     tree    the tree at the centre (RootMap: its "project"
             is read from projects.json, shared with the Workshop)
     shelf   the low Montessori shelf
     table   the reading table
   An area holds "entries" (observations, lesson designs,
   essays, reading notes, questions). An area marked
   "requireConsent" shows an entry's images only when each is
   marked "consent": true, so no child's photograph appears
   by accident.
============================================================ */

import { loadJSON, openWorld, list, h, pad, titleBlock, gallery, mediaFrom, prose, section, placeholderNote, metaLine } from "./worlds/ui.js";
import { loadProjects, renderProject, timeline } from "./worlds/projects.js";

const [data, projects, photoData] = await Promise.all([
  loadJSON("assets/data/greenhouse.json", { areas: [] }),
  loadProjects(loadJSON),
  loadJSON("assets/data/photos.json", { photos: [] }),
]);
const areas = list(data && data.areas).filter((a) => a && a.id && a.title);
const projectsById = new Map(projects.map((p) => [p.id, p]));
const photosById = new Map(list(photoData && photoData.photos).map((p) => [p.id, p]));
const entriesOf = (a) => list(a.entries).filter((e) => e && e.id && e.title);

const items = areas.map((a) => ({ id: a.id, path: a.id, title: a.title, sub: a.subtitle || "" }));

// ------------------------------------------------------------------ how each thing reads

function renderArea(a) {
  const project = a.project && projectsById.get(a.project);
  const extra = list(a.sections).map((s) => section(s.title,
    prose(s.body),
    s.timeline && list(s.timeline).length ? timeline(s.timeline) : null,
    !s.body && !list(s.timeline).length ? placeholderNote(`${s.title} — not written yet.`) : null));
  if (project) {
    extra.push(section("Also in the Workshop", h("p", null, h("a", { class: "pill", href: `workshop.html#${project.id}` }, `${project.name} at the workbench →`))));
    return renderProject(project, { extra, kicker: a.subtitle });
  }

  const entries = entriesOf(a);
  const related = list(a.related).map((id) => projectsById.get(id)).filter(Boolean);
  return [
    titleBlock({ kicker: a.subtitle, title: a.title }),
    prose(a.intro),
    section("In this corner", entries.length
      ? h("ol", { class: "entry-list" }, entries.map((e, k) =>
        h("li", null, h("a", { href: `#${a.id}/${e.id}` },
          h("span", { class: "entry-num", text: pad(k + 1) }),
          h("span", { class: "entry-title", text: e.title }),
          h("span", { class: "entry-state", text: e.status === "draft" ? "In draft" : [e.type, e.date].filter(Boolean).join(" · ") })))))
      : placeholderNote("Nothing has been added here yet.")),
    related.length ? section("Related projects", h("p", { class: "link-row" },
      related.map((p) => h("a", { class: "pill", href: `workshop.html#${p.id}` }, `${p.name} →`)))) : null,
  ];
}

function renderEntry(a, e) {
  let media = mediaFrom(e, photosById);
  const withheld = a.requireConsent ? media.filter((m) => !m.consent).length : 0;
  if (a.requireConsent) media = media.filter((m) => m.consent);
  return [
    titleBlock({ kicker: [e.type, e.date || e.year].filter(Boolean).join(" · "), title: e.title, badge: e.status === "draft" ? "In draft" : null }),
    gallery(media),
    withheld ? metaLine([`${withheld} image${withheld > 1 ? "s" : ""} not shown: not marked as authorised.`]) : null,
    prose(e.body, e.status === "draft" ? "This piece is still being written." : "Not written yet."),
    list(e.tags).length ? metaLine(list(e.tags)) : null,
    h("p", { class: "link-row" }, h("a", { class: "pill", href: `#${a.id}` }, `← ${a.title}`)),
  ];
}

function resolve(path) {
  const [areaId, entryId] = path.split("/");
  const a = areas.find((x) => x.id === areaId);
  if (!a) return null;
  if (!entryId) return { context: "The Greenhouse", siblings: areas.map((x) => x.id), render: () => renderArea(a) };
  const entries = entriesOf(a);
  const e = entries.find((x) => x.id === entryId);
  if (!e) return null;
  return { context: `The Greenhouse · ${a.title}`, siblings: entries.map((x) => `${a.id}/${x.id}`), render: () => renderEntry(a, e) };
}

openWorld({
  items,
  resolve,
  empty: { title: "Still a seedbed", text: "Nothing has been planted here yet." },
  scene: buildGlasshouse,
});

// ================================================================== the glasshouse

const lerp = (a, b, k) => a + (b - a) * k;

function buildGlasshouse(S) {
  const { THREE, std, glow, glowTex, canvasTexture, seeded, portrait, fovFor } = S;
  const stage = S.createStage({
    canvas: document.querySelector(".stage"),
    background: "#e8d9b8",
    fog: 0.026,
    exposure: 1.0,
    rest: () => {
      const k = portrait();
      return {
        pos: new THREE.Vector3(lerp(0.6, 0, k), lerp(2.5, 3.2, k), lerp(6.8, 10.5, k)),
        target: new THREE.Vector3(lerp(0.2, 0, k), lerp(3.1, 3.4, k), -10),
        fov: fovFor(lerp(74, 86, k)),
      };
    },
  });
  if (!stage) return null;
  const { scene, renderer } = stage;
  const shadows = !stage.small;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const r = seeded(23);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const cast = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = shadows; m.receiveShadow = shadows; } }); return o; };

  const W = 6, WALL = 4.2, Z0 = 4, Z1 = -24;
  const iron = std("#3b3a2c", { metalness: 0.5, roughness: 0.5 });
  const wood = std("#9a6f4a", { roughness: 0.7 });
  const pale = std("#d8c5a3", { roughness: 0.9 });
  const leaves = ["#6f8a4f", "#8fa860", "#56703f", "#a3b56c"].map((c) => std(c, { flatShading: true, roughness: 0.8 }));
  const terracotta = std("#b8714f", { roughness: 0.9 });

  // ---------------------------------------------------------------- the floor: pale stone in a herringbone of tiles
  const tiles = canvasTexture(512, 512, (g, w) => {
    g.fillStyle = "#cdb995"; g.fillRect(0, 0, w, w);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const t = 196 + Math.round(r() * 30);
      g.fillStyle = `rgb(${t}, ${t - 16}, ${t - 44})`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
  });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(5, 9);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 + 8, Z0 - Z1 + 8), std("#ffffff", { map: tiles, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + Z1) / 2);
  floor.receiveShadow = shadows;
  scene.add(floor);

  // ---------------------------------------------------------------- the glass house: posts, arched ribs, purlins, low walls
  const frame = new THREE.Group();
  for (let z = Z0; z >= Z1; z -= 2.2) {
    for (const x of [-W, W]) frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.1, WALL, 0.1), iron), x, WALL / 2, z));
    const rib = new THREE.Mesh(new THREE.TorusGeometry(W, 0.06, 6, 56, Math.PI), iron);
    rib.position.set(0, WALL, z);
    frame.add(rib);
  }
  for (const a of [0.35, 0.8, 1.2, 1.5708, 1.94, 2.34, 2.79]) {
    frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, Z0 - Z1), iron), Math.cos(a) * W, WALL + Math.sin(a) * W, (Z0 + Z1) / 2));
  }
  for (const x of [-W, W]) {
    frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, Z0 - Z1), pale), x, 0.35, (Z0 + Z1) / 2));
    frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, Z0 - Z1), iron), x, WALL, (Z0 + Z1) / 2));
    frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, Z0 - Z1), iron), x, 2.2, (Z0 + Z1) / 2));
  }
  // the far end: a glazed wall with a door
  for (let x = -W; x <= W; x += 1.5) frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.08, WALL + Math.sqrt(Math.max(0, W * W - x * x)), 0.08), iron), x, (WALL + Math.sqrt(Math.max(0, W * W - x * x))) / 2, Z1));
  scene.add(cast(frame));
  const glass = new THREE.MeshStandardMaterial({ color: "#f4f6e8", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(W, W, Z0 - Z1, 40, 1, true, -Math.PI / 2, Math.PI), glass);
  vault.rotation.x = Math.PI / 2; vault.position.set(0, WALL, (Z0 + Z1) / 2);
  scene.add(vault);

  // ---------------------------------------------------------------- the light: low sun through the glass
  scene.add(new THREE.HemisphereLight("#fff3d8", "#8f8a5c", 1.0));
  const sun = new THREE.DirectionalLight("#ffdcae", 2.6);
  sun.position.set(-11, 13, 4); sun.target.position.set(0, 0, -10);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 18, bottom: -18, near: 1, far: 50 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // beams of sun through the dusty air
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `varying float vFace; varying float vH;
      void main() { vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFace = abs(dot(n, normalize(-mv.xyz))); vH = uv.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying float vFace; varying float vH;
      void main() { float a = pow(vFace, 2.0) * smoothstep(0.0, 0.5, vH) * smoothstep(1.0, 0.6, vH);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a * 0.12, 1.0); }`,
  });
  for (const [x, z] of [[-1.6, -6], [2.2, -12], [-2.4, -16]]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.5, 16, 24, 1, true), beamMat);
    beam.position.set(x + 3, 7, z + 1.5); beam.rotation.set(0.25, 0, -0.62);
    scene.add(beam);
  }

  // ---------------------------------------------------------------- plants along the glass, and hanging from the ribs
  const potGeo = new THREE.CylinderGeometry(0.32, 0.24, 0.5, 16);
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  function plant(x, z, size) {
    const g = new THREE.Group();
    g.add(at(new THREE.Mesh(potGeo, terracotta), 0, 0.25, 0));
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const leaf = new THREE.Mesh(leafGeo, leaves[Math.floor(r() * leaves.length)]);
      const s = size * (0.24 + r() * 0.22);
      leaf.scale.set(s, s * (1 + r() * 0.8), s);
      leaf.position.set((r() - 0.5) * size * 0.6, 0.5 + s * 0.8 + k * size * 0.18, (r() - 0.5) * size * 0.6);
      leaf.rotation.set(r() * 3, r() * 3, r() * 3);
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    return cast(g);
  }
  for (let z = -1; z > Z1 + 1; z -= 1.7) {
    for (const side of [-1, 1]) if (r() > 0.25) scene.add(plant(side * (W - 0.9 - r() * 0.5), z + r() * 0.6, 0.7 + r() * 0.8));
  }
  for (const [x, z] of [[-3.2, -3], [3.4, -9], [-2.8, -14], [2.6, -18]]) {
    const basket = new THREE.Group();
    basket.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), terracotta), 0, 0, 0));
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.Mesh(leafGeo, leaves[k % leaves.length]);
      leaf.scale.setScalar(0.22 + r() * 0.12);
      leaf.position.set((r() - 0.5) * 0.6, -0.2 - r() * 0.7, (r() - 0.5) * 0.6);
      basket.add(leaf);
    }
    const height = WALL + Math.sqrt(W * W - x * x) - 0.1;
    basket.add(S.lines([V(0, 0, 0), V(0, height - 7, 0)], "#3b3a2c", 0.8));
    basket.position.set(x, 7, z);
    scene.add(cast(basket));
  }

  // ================================================================ the three places
  const byObject = new Map(areas.map((a) => [a.object, a]));
  const spot = (area, group, sub, extra = {}) => {
    if (!area) return;
    stage.add(area.id, group, { title: area.title, sub }, extra);
  };

  // ---------------------------------------------------------------- the tree at the centre, and its roots across the floor
  const tree = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.5, 48), pale);
  bed.position.y = 0.25;
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.05, 48), std("#4a3826"));
  soil.position.y = 0.5;
  const bark = std("#6b503c", { roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 3.6, 12), bark);
  trunk.position.y = 2.3;
  tree.add(bed, soil, trunk);
  for (const [a, tilt, y, len] of [[0.4, 0.7, 3.2, 1.6], [2.4, 0.8, 3.5, 1.4], [4.3, 0.6, 3.0, 1.7], [5.6, 0.9, 3.8, 1.2]]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, len, 8), bark);
    branch.position.set(Math.cos(a) * len * 0.35, y + 0.3, Math.sin(a) * len * 0.35);
    branch.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    tree.add(branch);
  }
  const canopy = new THREE.Group();
  for (let k = 0; k < 90; k++) {
    const leaf = new THREE.Mesh(leafGeo, leaves[k % leaves.length]);
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    leaf.position.set(Math.cos(a) * d * 2.6, (r() - 0.4) * 1.7 * (1.2 - d * 0.5), Math.sin(a) * d * 2.6);
    leaf.scale.setScalar(0.3 + r() * 0.36);
    leaf.rotation.set(r() * 3, r() * 3, r() * 3);
    canopy.add(leaf);
  }
  canopy.position.y = 4.9;
  tree.add(canopy);
  // the roots run out across the floor like a map, and glow when you look at them
  const rootMat = new THREE.MeshStandardMaterial({ color: "#8a6a3a", emissive: new THREE.Color("#e8b860"), emissiveIntensity: 0.15, roughness: 0.6 });
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2 + r() * 0.3, reach = 3.2 + r() * 3.5;
    const pts = [V(Math.cos(a) * 1.9, 0.08, Math.sin(a) * 1.9)];
    let x = pts[0].x, z = pts[0].z, dir = a;
    for (let s = 1; s <= 5; s++) {
      dir += (r() - 0.5) * 0.6;
      x += Math.cos(dir) * reach / 5; z += Math.sin(dir) * reach / 5;
      pts.push(V(x, 0.04, z));
    }
    tree.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.05 - k * 0.002, 5), rootMat));
  }
  const treeHit = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.3, 6.4, 12), new THREE.MeshBasicMaterial({ visible: false }));
  treeHit.position.y = 3.2;
  tree.add(treeHit);
  tree.position.set(0, 0, -10.5);
  scene.add(cast(tree));
  spot(byObject.get("tree"), tree, "The tree at the centre", {
    hit: treeHit, anchor: V(0, 6.4, 0),
    onState: (s) => { rootMat.emissiveIntensity = 0.15 + s * 1.4; canopy.scale.setScalar(1 + s * 0.04); },
  });

  // ---------------------------------------------------------------- the Montessori shelf: a tray, a pitcher, a pink tower
  const shelf = new THREE.Group();
  shelf.add(at(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.6), wood), 0, 0.5, 0), at(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.6), wood), 0, 1.05, 0));
  for (const x of [-1.27, 1.27]) shelf.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.08, 0.6), wood), x, 0.54, 0));
  shelf.add(at(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.04), wood), 0, 0.04, -0.28));
  // the pink tower stands on its own rug beside the shelf, as it would in a classroom
  const pink = std("#e8a9a2", { roughness: 0.8 });
  const rug = at(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.8), std("#c9b48c", { roughness: 1 })), 0.2, 0.01, 1.1);
  shelf.add(rug);
  let y = 0.02;
  for (let k = 10; k >= 1; k--) {
    const sz = k * 0.02;
    shelf.add(at(new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), pink), 0.2, y + sz / 2, 1.1));
    y += sz;
  }
  const tray = new THREE.Group();
  tray.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.42), wood));
  const ceramic = std("#f1ece2", { roughness: 0.35 });
  const pitcherProfile = [[0, 0], [0.09, 0], [0.11, 0.04], [0.12, 0.14], [0.09, 0.24], [0.07, 0.3], [0.09, 0.34]].map(([x, yy]) => new THREE.Vector2(x, yy));
  tray.add(at(new THREE.Mesh(new THREE.LatheGeometry(pitcherProfile, 24), ceramic), -0.15, 0.02, 0));
  tray.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 16), glass), 0.12, 0.09, 0.05));
  tray.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 16), glass), 0.24, 0.09, -0.06));
  tray.position.set(0.5, 1.1, 0);
  shelf.add(tray);
  const knobbed = std("#c49a6c");
  for (let k = 0; k < 5; k++) shelf.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.03 + k * 0.012, 0.03 + k * 0.012, 0.12, 12), knobbed), -0.9 + k * 0.32, 0.6, 0.05));
  shelf.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.36), std("#7d8f5c")), 0.6, 0.61, 0));
  shelf.position.set(-3.6, 0, -5.2); shelf.rotation.y = 0.6;
  scene.add(cast(shelf));
  spot(byObject.get("shelf"), shelf, "The Montessori shelf", {
    onState: (s) => { tray.position.y = 1.1 + s * 0.06; },
  });

  // ---------------------------------------------------------------- the reading table: books, an open notebook, a lamp
  const table = new THREE.Group();
  table.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 40), wood), 0, 1.0, 0));
  table.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.0, 12), wood), 0, 0.5, 0));
  table.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), wood), 0, 0.02, 0));
  ["#6c5b8e", "#3c5a64", "#c49a6c"].forEach((c, k) => {
    const b = at(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.3), std(c)), -0.35, 1.07 + k * 0.072, -0.1);
    b.rotation.y = k * 0.2 - 0.2;
    table.add(b);
  });
  const paper = std("#f7f1e4", { roughness: 1 });
  for (const side of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), paper);
    page.rotation.set(-Math.PI / 2, side * 0.12, 0);
    page.position.set(0.2 + side * 0.15, 1.04 + 0.01, 0.15);
    table.add(page);
  }
  const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: "#fff1cf", toneMapped: false }));
  lampGlass.position.set(0.45, 1.5, -0.3);
  table.add(lampGlass, at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), iron), 0.45, 1.24, -0.3));
  const lampHalo = glow("#ffd98f", 1.2, 0.35); lampHalo.position.copy(lampGlass.position);
  table.add(lampHalo);
  const chair = new THREE.Group();
  chair.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), wood), 0, 0.6, 0), at(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.06), wood), 0, 1.0, -0.28));
  for (const [x, z] of [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]]) chair.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), wood), x, 0.3, z));
  chair.position.set(0.3, 0, 1.1); chair.rotation.y = Math.PI + 0.3;
  table.add(chair);
  table.position.set(3.6, 0, -6.4); table.rotation.y = -0.5;
  scene.add(cast(table));
  spot(byObject.get("table"), table, "The reading table", {
    onState: (s) => { lampHalo.material.opacity = 0.35 + s * 0.5; lampHalo.scale.setScalar(1.2 + s * 0.8); },
  });

  // ---------------------------------------------------------------- pollen in the sunlight
  const pollen = (() => {
    const n = 360, pos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { pos[k * 3] = (r() - 0.5) * 11; pos[k * 3 + 1] = r() * 8; pos[k * 3 + 2] = 3 - r() * 24; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: "#fff0c8", size: 0.08, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(p);
    return p;
  })();

  stage.start((dt, t, animate) => {
    if (!animate) return;
    canopy.rotation.y = Math.sin(t * 0.25) * 0.04;
    canopy.rotation.z = Math.sin(t * 0.4) * 0.015;
    pollen.position.y = Math.sin(t * 0.1) * 0.3;
    pollen.rotation.y += dt * 0.01;
  });
  return stage;
}
