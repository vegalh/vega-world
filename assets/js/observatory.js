/* ============================================================
   THE OBSERVATORY — observations hung as stars
   Observations come from assets/data/observations.json; each
   category becomes one constellation inside the dome. An
   observation's photographs can name photos.json ids
   ("photos") or give files directly ("images"); "project"
   links it to a project in the Workshop.
============================================================ */

import { loadJSON, openWorld, list, titleBlock, gallery, mediaFrom, prose, section, h } from "./worlds/ui.js";

const [data, photoData, projectData] = await Promise.all([
  loadJSON("assets/data/observations.json", { categories: [], observations: [] }),
  loadJSON("assets/data/photos.json", { photos: [] }),
  loadJSON("assets/data/projects.json", { projects: [] }),
]);

const categories = list(data && data.categories);
const catTitle = (id) => (categories.find((c) => c.id === id) || {}).title || "";
const order = (o) => { const i = categories.findIndex((c) => c.id === o.category); return i < 0 ? categories.length : i; };
const observations = list(data && data.observations)
  .filter((o) => o && o.id && o.title)
  .map((o, k) => ({ ...o, k }))
  .sort((a, b) => order(a) - order(b) || a.k - b.k);
const photosById = new Map(list(photoData && photoData.photos).map((p) => [p.id, p]));
const projectsById = new Map(list(projectData && projectData.projects).map((p) => [p.id, p]));

const items = observations.map((o) => ({ id: o.id, path: o.id, title: o.title, sub: catTitle(o.category) }));

function render(o) {
  const project = o.project && projectsById.get(o.project);
  return [
    titleBlock({
      kicker: [catTitle(o.category), o.location, o.date || o.year].filter(Boolean).join(" · "),
      title: o.title,
      badge: o.placeholder ? "Placeholder · story to come" : null,
    }),
    gallery(mediaFrom(o, photosById), { emptyLabel: "Photographs to come" }),
    prose(o.story, "This observation hasn’t been written yet."),
    o.project ? section("Related project", project
      ? h("p", null, h("a", { class: "pill", href: `workshop.html#${o.project}` }, `${project.name} in the Workshop →`))
      : h("p", { class: "meta-line", text: `Project “${o.project}” isn’t in projects.json yet.` })) : null,
  ];
}

function resolve(path) {
  const o = observations.find((x) => x.id === path);
  if (!o) return null;
  return { context: ["The Observatory", catTitle(o.category)].filter(Boolean).join(" · "), siblings: observations.map((x) => x.id), render: () => render(o) };
}

openWorld({
  items,
  resolve,
  empty: { title: "A clear sky", text: "No observations have been recorded yet." },
  scene: buildDome,
});

// ================================================================== the dome

const lerp = (a, b, k) => a + (b - a) * k;
function hash(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967296; }

function buildDome(S) {
  const { THREE, std, glow, glowTex, lines, seeded, portrait, fovFor } = S;
  const stage = S.createStage({
    canvas: document.querySelector(".stage"),
    background: "#070912",
    fog: 0.011,
    exposure: 1.1,
    drift: 1.2,
    rest: () => {
      const k = portrait();
      return {
        pos: new THREE.Vector3(0, lerp(2.3, 2.6, k), lerp(9, 12.5, k)),
        target: new THREE.Vector3(0, lerp(6.4, 6.8, k), -10),
        fov: fovFor(lerp(74, 84, k)),
      };
    },
  });
  if (!stage) return null;
  const { scene } = stage;
  const r = seeded(17);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const brass = std("#c8a56a", { metalness: 0.85, roughness: 0.3 });
  const iron = std("#262a38", { metalness: 0.6, roughness: 0.45 });

  // ---------------------------------------------------------------- the sky beyond the slit
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(vec3(0.05, 0.07, 0.14), vec3(0.008, 0.01, 0.03), smoothstep(0.0, 0.7, d.y));
        vec3 cell = floor(d * 380.0);
        float s = hash(cell);
        col += vec3(0.85, 0.9, 1.0) * step(0.9965, s) * (0.4 + 0.6 * hash(cell + 3.1));
        // a faint band of the galaxy across the slit
        float band = exp(-pow(dot(d, normalize(vec3(0.7, 0.2, 0.68))) * 5.0, 2.0));
        col += vec3(0.1, 0.1, 0.18) * band * 0.6;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);

  // ---------------------------------------------------------------- the dome, split along the meridian
  const R = 18, gap = 0.6;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 48, Math.PI * 1.5 + gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2),
    std("#151927", { roughness: 0.92, side: THREE.BackSide })
  );
  scene.add(dome);
  const ribs = [];
  for (let k = 0; k <= 28; k++) {
    const phi = Math.PI * 1.5 + gap / 2 + k / 28 * (Math.PI * 2 - gap);
    for (let t = 0; t < 16; t++) {
      const a0 = t / 16 * Math.PI / 2, a1 = (t + 1) / 16 * Math.PI / 2;
      const p = (a) => V(-R * 0.995 * Math.cos(phi) * Math.sin(a), R * 0.995 * Math.cos(a), R * 0.995 * Math.sin(phi) * Math.sin(a));
      ribs.push(p(a0), p(a1));
    }
  }
  for (const lat of [0.42, 0.85, 1.22]) {
    for (let k = 0; k < 96; k++) {
      const p0 = Math.PI * 1.5 + gap / 2 + k / 96 * (Math.PI * 2 - gap), p1 = Math.PI * 1.5 + gap / 2 + (k + 1) / 96 * (Math.PI * 2 - gap);
      const p = (phi) => V(-R * 0.995 * Math.cos(phi) * Math.sin(lat), R * 0.995 * Math.cos(lat), R * 0.995 * Math.sin(phi) * Math.sin(lat));
      ribs.push(p(p0), p(p1));
    }
  }
  scene.add(lines(ribs, "#3a425e", 0.55));
  // brass edges along the slit
  for (const side of [-1, 1]) {
    const phi = Math.PI * 1.5 + side * gap / 2;
    const pts = [];
    for (let t = 0; t <= 32; t++) {
      const a = t / 32 * Math.PI / 2;
      pts.push(V(-R * Math.cos(phi) * Math.sin(a), R * Math.cos(a), R * Math.sin(phi) * Math.sin(a)));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.09, 6), brass));
  }

  // ---------------------------------------------------------------- the floor: a stone disc inlaid with brass
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.3, 128), std("#1a1d29", { roughness: 0.55, metalness: 0.2 }));
  floor.position.y = -0.15;
  scene.add(floor);
  for (const rad of [3, 6.5, 10, 14]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.03, 6, 160), brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01;
    scene.add(ring);
  }
  const meridian = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, R * 2), brass);
  meridian.position.y = 0.01;
  scene.add(meridian);

  // ---------------------------------------------------------------- the telescope, aimed through the slit
  const scope = new THREE.Group();
  scope.add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 2.6, 32), iron));
  scope.children[0].position.y = 1.3;
  const fork = new THREE.Group();
  for (const x of [-0.7, 0.7]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 0.4), iron); arm.position.set(x, 0.7, 0); fork.add(arm); }
  fork.position.y = 2.6;
  const tube = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 7.2, 40), std("#d9c49a", { metalness: 0.7, roughness: 0.35 }));
  tube.add(body);
  for (const y of [-2.6, -0.4, 1.8, 3.5]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 40), brass); ring.rotation.x = Math.PI / 2; ring.position.y = y; tube.add(ring); }
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: "#9fb4e8", toneMapped: false }));
  lens.rotation.x = -Math.PI / 2; lens.position.y = 3.61;
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.6, 16), brass);
  eyepiece.position.set(0.5, -3.1, 0); eyepiece.rotation.z = 0.9;
  tube.add(lens, eyepiece);
  tube.position.y = 1.0;
  const tilt = new THREE.Group();
  tilt.add(tube);
  tilt.rotation.x = -0.75;          // up and towards the slit
  tilt.position.y = 3.3;
  fork.add(tilt);
  scope.add(fork);
  scope.position.set(-4.4, 0, -3.6);
  const aim = -0.36;              // turned towards the slit
  scope.rotation.y = aim;
  scene.add(scope);
  const lensGlow = glow("#a9bde6", 2.2, 0.4);
  scene.add(lensGlow);

  // light
  scene.add(new THREE.HemisphereLight("#7d8ec0", "#0a0c14", 0.42));
  const moon = new THREE.DirectionalLight("#c9d6ff", 1.1);
  moon.position.set(0, 30, -40);
  scene.add(moon);
  const lamp = new THREE.PointLight("#ffcf98", 6, 8, 1.8);
  lamp.position.set(-2.6, 1.6, -1.6);
  scene.add(lamp);

  // ---------------------------------------------------------------- dust like distant stars, inside the dome
  let dust;
  {
    const n = 700, pos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, t = Math.acos(r()), rad = 4 + r() * 12;
      pos[k * 3] = Math.sin(t) * Math.cos(a) * rad; pos[k * 3 + 1] = 1 + Math.cos(t) * rad; pos[k * 3 + 2] = Math.sin(t) * Math.sin(a) * rad;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: "#cfdaff", size: 0.12, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);
  }

  // ================================================================ observations, as constellations
  const used = categories.filter((c) => observations.some((o) => o.category === c.id));
  const loose = observations.filter((o) => !categories.some((c) => c.id === o.category));
  const groups = used.map((c) => ({ id: c.id, members: observations.filter((o) => o.category === c.id) }));
  if (loose.length) groups.push({ id: "other", members: loose });

  const stars = [];
  groups.forEach((grp, k) => {
    const n = groups.length;
    const a = n > 1 ? lerp(-0.85, 0.85, k / (n - 1)) : 0;
    const center = V(Math.sin(a) * 9.5, 5.6 + (k % 2) * 2.2, -Math.cos(a) * 9.5);
    const pts = [];
    grp.members.forEach((o, j) => {
      // members of a constellation scatter around its centre, the same way every time
      const u = hash(o.id), w = hash(`${o.id}*`);
      const spread = grp.members.length > 1 ? 1.2 + Math.min(grp.members.length, 8) * 0.18 : 0;
      const p = center.clone().add(V(Math.cos(u * 6.283) * spread, (w - 0.5) * spread * 1.4, Math.sin(u * 6.283) * spread * 0.4));
      const star = new THREE.Group();
      star.position.copy(p);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: "#f4f7ff", toneMapped: false }));
      const halo = glow("#a9bde6", 1.5, 0.55);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
      star.add(core, halo, hit);
      scene.add(star);
      pts.push(p);
      const me = { star, core, halo, group: grp.id, s: 0, ph: u * 6 };
      stars.push(me);
      stage.add(o.id, star, { title: o.title, sub: catTitle(o.category) || "Observation" }, {
        hit, anchor: V(0, 0.35, 0),
        onState: (s) => { me.s = s; },
      });
    });
    if (pts.length > 1) {
      const seg = [];
      pts.forEach((p, j) => { if (j) seg.push(pts[j - 1], p); });
      const l = lines(seg, "#a9bde6", 0.28);
      l.userData.group = grp.id;
      scene.add(l);
      grp.lines = l;
    }
  });

  // ================================================================ alive
  stage.start((dt, t, animate) => {
    const head = new THREE.Vector3(0, 3.61, 0);
    tube.localToWorld(head);
    lensGlow.position.copy(head);
    if (animate) {
      scope.rotation.y = aim + Math.sin(t * 0.08) * 0.06;
      dust.rotation.y += dt * 0.006;
    }
    const lit = new Set(stars.filter((s) => s.s > 0.05).map((s) => s.group));
    stars.forEach((s) => {
      const twinkle = animate ? 0.08 * Math.sin(t * 1.3 + s.ph * 7) : 0;
      s.core.scale.setScalar(1 + s.s * 0.9);
      s.halo.material.opacity = 0.5 + twinkle + s.s * 0.45;
      s.halo.scale.setScalar(1.5 + s.s * 1.4);
    });
    groups.forEach((g) => { if (g.lines) g.lines.material.opacity += ((lit.has(g.id) ? 0.75 : 0.28) - g.lines.material.opacity) * 0.1; });
  });
  return stage;
}
