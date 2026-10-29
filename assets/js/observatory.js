/* ============================================================
   THE OBSERVATORY — the Dream House
   Dreams, beliefs, plans and questions, hung as stars in the
   dome. They come from assets/data/dreams.json: each
   constellation is one category, each star one dream, idea,
   place or question. A star's "status" sets its light:
   places visited glow gold, dreams blue, things being built
   amber, questions a slow violet pulse.
============================================================ */

import { loadJSON, openWorld, list, h, pad, titleBlock, gallery, mediaFrom, prose, section, crossLinks, linkRow, placeholderNote } from "./worlds/ui.js";

const [data, photoData] = await Promise.all([
  loadJSON("assets/data/dreams.json", { constellations: [], stars: [] }),
  loadJSON("assets/data/photos.json", { photos: [] }),
]);

const constellations = list(data && data.constellations).filter((c) => c && c.id && c.title);
const allStars = list(data && data.stars).filter((s) => s && s.id && s.title);
// stars in a constellation the file doesn't list still get a place in the sky
allStars.forEach((s) => { if (!constellations.some((c) => c.id === (s.constellation || "other"))) constellations.push({ id: s.constellation || "other", title: s.constellation || "Elsewhere" }); });
const used = constellations.filter((c) => allStars.some((s) => (s.constellation || "other") === c.id));
const starsOf = (c) => allStars.filter((s) => (s.constellation || "other") === c.id);
const photosById = new Map(list(photoData && photoData.photos).map((p) => [p.id, p]));

// the colour of a star's light, by what it is
const LIGHT = {
  visited: "#f2cf8a", dream: "#a9c4f2", building: "#f0a970", "building now": "#f0a970", asking: "#c6b2f0", carrying: "#c6b2f0",
  believing: "#f4f1ff", forming: "#c9cbe0", "working towards": "#f6d9a8", "in progress": "#f0a970",
};
const lightOf = (s) => LIGHT[(s.status || "").toLowerCase()] || (s.kind === "question" ? LIGHT.asking : "#e6eeff");

const items = [
  ...used.map((c) => ({ id: `c:${c.id}`, path: c.id, title: c.title, sub: `${starsOf(c).length} star${starsOf(c).length === 1 ? "" : "s"}` })),
  ...allStars.map((s) => ({ id: s.id, path: s.id, title: s.title, rail: false })),
];

// ------------------------------------------------------------------ how a star reads

function quotes(qs) {
  const l = list(qs).filter((q) => q && q.text);
  return l.map((q) => h("figure", { class: "pullquote is-large" }, h("blockquote", null, h("p", { text: q.text })), q.source ? h("figcaption", { text: q.source }) : null));
}

function renderStar(s) {
  const c = constellations.find((x) => x.id === (s.constellation || "other"));
  const question = s.kind === "question";
  const media = mediaFrom(s, photosById);
  return [
    titleBlock({
      kicker: [c && c.title, s.status, s.location, s.date].filter(Boolean).join(" · "),
      title: s.title,
      badge: s.placeholder ? "Placeholder · still to be named" : null,
    }),
    media.length ? gallery(media) : null,
    ...quotes(s.quotes),
    prose(s.body, s.placeholder ? "This star is waiting for its words." : null),
    question && !s.body && !list(s.quotes).length ? h("p", { class: "dream-open", text: "An open question. I don’t have an answer yet." }) : null,
    linkRow(s.links),
    crossLinks(s.related, "Elsewhere in the universe"),
    c ? h("p", { class: "link-row" }, h("a", { class: "pill", href: `#${c.id}` }, `← ${c.title}`)) : null,
  ];
}

function renderConstellation(c) {
  const stars = starsOf(c);
  return [
    titleBlock({ kicker: `Constellation · ${pad(stars.length)} stars`, title: c.title }),
    prose(c.intro),
    section("Its stars", stars.length
      ? h("ol", { class: "entry-list star-list" }, stars.map((s) => h("li", null, h("a", { href: `#${s.id}`, style: { "--star": lightOf(s) } },
        h("span", { class: "star-dot", "aria-hidden": "true" }),
        h("span", { class: "entry-title", text: s.title }),
        h("span", { class: "entry-state", text: s.placeholder ? "To be named" : s.status || "" })))))
      : placeholderNote("No stars here yet.")),
  ];
}

function resolve(path) {
  const c = used.find((x) => x.id === path);
  if (c) return { context: "The Dream House", siblings: used.map((x) => x.id), render: () => renderConstellation(c) };
  const s = allStars.find((x) => x.id === path);
  if (!s) return null;
  const home = constellations.find((x) => x.id === (s.constellation || "other"));
  return { context: `The Dream House · ${home ? home.title : ""}`, siblings: starsOf(home).map((x) => x.id), render: () => renderStar(s) };
}

openWorld({
  items,
  resolve,
  empty: { title: "A clear sky", text: "No dreams have been hung here yet." },
  scene: buildDome,
});

// ================================================================== the dome

const lerp = (a, b, k) => a + (b - a) * k;
function hash(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967296; }

function buildDome(S) {
  const { THREE, std, glow, glowTex, lines, seeded, portrait, fovFor, canvasTexture, stoneTexture, woodTexture, roughnessTexture, contactShadow, rbox } = S;
  const stage = S.createStage({
    canvas: document.querySelector(".stage"),
    background: "#070912",
    fog: 0.011,
    exposure: 1.12,
    drift: 1.2,
    environment: 0.22,
    rest: () => {
      const k = portrait();
      return {
        pos: new THREE.Vector3(lerp(0.4, -0.6, k), lerp(2.4, 2.8, k), lerp(9, 13, k)),
        target: new THREE.Vector3(lerp(0.2, -0.9, k), lerp(6.2, 6.4, k), -10),
        fov: fovFor(lerp(76, 88, k)),
      };
    },
  });
  if (!stage) return null;
  const { scene } = stage;
  const r = seeded(17);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  // aged brass: polished where hands would touch it, duller elsewhere
  const brass = std("#c2a066", { metalness: 0.9, roughness: 0.32, roughnessMap: roughnessTexture(41, { lo: 0.2, hi: 0.6 }) });
  const iron = std("#22263a", { metalness: 0.7, roughness: 0.42, roughnessMap: roughnessTexture(42, { lo: 0.3, hi: 0.6, streak: true }) });
  const enamel = std("#d8c49a", { metalness: 0.6, roughness: 0.3 });

  // ---------------------------------------------------------------- the sky beyond the slit
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(vec3(0.05, 0.07, 0.15), vec3(0.008, 0.01, 0.03), smoothstep(0.0, 0.7, d.y));
        vec3 cell = floor(d * 380.0);
        float s = hash(cell);
        col += vec3(0.85, 0.9, 1.0) * step(0.9965, s) * (0.4 + 0.6 * hash(cell + 3.1));
        float band = exp(-pow(dot(d, normalize(vec3(0.7, 0.2, 0.68))) * 5.0, 2.0));
        col += vec3(0.11, 0.1, 0.2) * band * 0.7;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);

  // ---------------------------------------------------------------- the dome, split along the meridian
  const R = 18, gap = 0.6;
  const plaster = stoneTexture(43, { base: "#1a1e2e", speck: 0.08, clouds: 0.6 });
  plaster.repeat.set(6, 3);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 48, Math.PI * 1.5 + gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2),
    std("#ffffff", { map: plaster, roughness: 0.92, side: THREE.BackSide })
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
  for (const side of [-1, 1]) {
    const phi = Math.PI * 1.5 + side * gap / 2;
    const pts = [];
    for (let t = 0; t <= 32; t++) {
      const a = t / 32 * Math.PI / 2;
      pts.push(V(-R * Math.cos(phi) * Math.sin(a), R * Math.cos(a), R * Math.sin(phi) * Math.sin(a)));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.1, 8), brass));
  }
  // a brass ring where the dome meets the floor
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.12, 8, 160), brass);
  baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.12;
  scene.add(baseRing);

  // moonlight falling through the slit
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 4.2, 22, 32, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `varying float vFace; varying float vH;
      void main() { vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFace = abs(dot(n, normalize(-mv.xyz))); vH = uv.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying float vFace; varying float vH;
      void main() { float a = pow(vFace, 2.4) * smoothstep(0.0, 0.4, vH) * smoothstep(1.0, 0.7, vH);
        gl_FragColor = vec4(vec3(0.62, 0.72, 1.0) * a * 0.09, 1.0); }`,
  }));
  beam.position.set(0, 9, -9); beam.rotation.x = 0.42;
  scene.add(beam);

  // ---------------------------------------------------------------- the floor: dark stone, a brass compass rose
  const floorTex = canvasTexture(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = "#181b27"; g.fillRect(0, 0, w, w);
    for (let k = 0; k < 5000; k++) { const v = r() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${r() * 0.06})`; g.fillRect(r() * w, r() * w, 2, 2); }
    g.strokeStyle = "rgba(194,160,102,.85)"; g.fillStyle = "rgba(194,160,102,.85)";
    for (const [rad, lw] of [[c * 0.98, 4], [c * 0.72, 3], [c * 0.5, 2], [c * 0.2, 2]]) { g.lineWidth = lw; g.beginPath(); g.arc(c, c, rad, 0, 7); g.stroke(); }
    // the points of the rose
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, len = k % 4 === 0 ? 0.7 : k % 2 === 0 ? 0.48 : 0.34, wid = k % 4 === 0 ? 0.06 : 0.035;
      g.globalAlpha = k % 4 === 0 ? 0.85 : 0.55;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * c * len, c + Math.sin(a) * c * len);
      g.lineTo(c + Math.cos(a + Math.PI / 2) * c * wid, c + Math.sin(a + Math.PI / 2) * c * wid);
      g.lineTo(c - Math.cos(a) * c * 0.04, c - Math.sin(a) * c * 0.04);
      g.lineTo(c + Math.cos(a - Math.PI / 2) * c * wid, c + Math.sin(a - Math.PI / 2) * c * wid);
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, l = k % 6 === 0 ? 0.05 : 0.025; g.lineWidth = 2; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.98, c + Math.sin(a) * c * 0.98); g.lineTo(c + Math.cos(a) * c * (0.98 - l), c + Math.sin(a) * c * (0.98 - l)); g.stroke(); }
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 128), std("#ffffff", { map: floorTex, roughness: 0.5, metalness: 0.15, roughnessMap: roughnessTexture(44, { lo: 0.35, hi: 0.7 }) }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  // the outer rings of the rose, raised in real brass so they catch the light
  for (const rad of [R * 0.98, R * 0.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.03, 6, 200), brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  }

  // ---------------------------------------------------------------- the telescope, in profile, aimed up through the slit
  const scope = new THREE.Group();
  // a pier on three splayed feet
  scope.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 2.4, 40), iron), 0, 1.2, 0));
  for (const y of [0.3, 2.3]) scope.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.4 - y * 0.05, 0.04, 8, 40).rotateX(Math.PI / 2), brass), 0, y, 0));
  for (let k = 0; k < 3; k++) {
    const foot = at(rbox(1.3, 0.14, 0.22, iron, 0.05), Math.cos(k * 2.09) * 0.55, 0.07, Math.sin(k * 2.09) * 0.55);
    foot.rotation.y = -k * 2.09;
    scope.add(foot);
  }
  // the mount head, turning slowly on its axis
  const head = new THREE.Group();
  head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 32), iron));
  head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 48), brass), 0, 0.16, 0));
  head.position.y = 2.5;
  scope.add(head);
  const tilt = new THREE.Group();
  tilt.position.y = 0.45;
  head.add(tilt);
  // the tube: body, dew shield, brass bands, focuser, finder, counterweight
  const tube = new THREE.Group();
  tube.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 5.2, 48), enamel));
  tube.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.5, 1.4, 48, 1, true), std("#c8b48a", { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })), 0, 3.2, 0));
  for (const y of [-2.2, -0.6, 1.0, 2.5, 3.88]) tube.add(at(new THREE.Mesh(new THREE.TorusGeometry(y > 2.6 ? 0.52 : 0.46, 0.05, 10, 48).rotateX(Math.PI / 2), brass), 0, y, 0));
  const lens = at(new THREE.Mesh(new THREE.CircleGeometry(0.44, 40), new THREE.MeshStandardMaterial({ color: "#20305a", metalness: 0.9, roughness: 0.05, emissive: new THREE.Color("#3a5aa0"), emissiveIntensity: 0.35 })), 0, 3.85, 0);
  lens.rotation.x = -Math.PI / 2;
  tube.add(lens);
  const focuser = new THREE.Group();
  focuser.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 20), brass));
  focuser.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 16), iron), 0, -0.42, 0));
  focuser.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16).rotateZ(Math.PI / 2), brass), 0.16, 0.05, 0));
  focuser.position.set(0, -2.85, 0);
  tube.add(focuser);
  const finder = new THREE.Group();
  finder.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 20), enamel));
  for (const y of [-0.4, 0.4]) finder.add(at(rbox(0.06, 0.06, 0.4, brass, 0.015), 0, y, -0.22));
  finder.position.set(0, 0.6, 0.62);
  tube.add(finder);
  const counter = new THREE.Group();
  counter.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 12).rotateZ(Math.PI / 2), iron), -0.75, 0, 0));
  counter.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.26, 32).rotateZ(Math.PI / 2), iron), -1.35, 0, 0));
  tube.add(counter);
  tube.position.y = 0.4;
  tilt.add(tube);
  tilt.rotation.z = -0.78;          // in profile: the tube leans up and to the right, towards the slit
  tilt.rotation.x = -0.18;
  scope.position.set(-4.4, 0, -3.2);
  scope.rotation.y = 0.1;
  scene.add(scope);
  const scopeShadow = contactShadow(2.6, 2.6, 0.55); scopeShadow.position.set(-4.4, 0.012, -3.2); scene.add(scopeShadow);
  const lensGlow = glow("#a9bde6", 1.8, 0.35);
  scene.add(lensGlow);

  // ---------------------------------------------------------------- a small writing desk: an open notebook, a lamp
  const desk = new THREE.Group();
  const walnut = std("#ffffff", { map: woodTexture(45, { base: "#4f3524", dark: "#26170e" }), roughness: 0.6 });
  desk.add(at(rbox(1.8, 0.07, 0.9, walnut, 0.025), 0, 1.25, 0));
  for (const [x, z] of [[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]]) desk.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 1.25, 10), walnut), x, 0.62, z));
  const paper = std("#f1eadb", { roughness: 1 });
  desk.add(at(rbox(0.86, 0.02, 0.6, std("#2f3b5c"), 0.01), 0, 1.28, 0.05));
  for (const side of [-1, 1]) { const page = at(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), paper), side * 0.21, 1.295, 0.05); page.rotation.set(-Math.PI / 2, side * 0.06, 0); desk.add(page); }
  const deskLamp = new THREE.Group();
  deskLamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 20), brass));
  deskLamp.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), brass), 0, 0.26, 0));
  deskLamp.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffe6b8", toneMapped: false })), 0, 0.55, 0));
  const deskGlow = glow("#ffcf8a", 1.6, 0.5); deskGlow.position.y = 0.55; deskLamp.add(deskGlow);
  deskLamp.position.set(0.66, 1.29, -0.22);
  desk.add(deskLamp);
  desk.position.set(4.6, 0, -1.4); desk.rotation.y = -0.6;
  scene.add(desk);
  const deskShadow = contactShadow(2.6, 1.6, 0.5); deskShadow.position.set(4.6, 0.012, -1.4); deskShadow.rotation.z = 0.6; scene.add(deskShadow);
  const warm = new THREE.PointLight("#ffcf8a", 7, 7, 1.7);
  warm.position.set(4.9, 1.95, -1.6);
  scene.add(warm);

  // light: cool night from the slit, a faint blue rim, and the desk lamp's warmth
  scene.add(new THREE.HemisphereLight("#7d8ec0", "#0a0c14", 0.4));
  const moon = new THREE.DirectionalLight("#c9d6ff", 1.25);
  moon.position.set(2, 30, -40);
  scene.add(moon);
  const rim = new THREE.DirectionalLight("#9fb2ff", 0.5);
  rim.position.set(12, 6, 6);
  scene.add(rim);

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

  // ================================================================ dreams, as constellations
  const stars = [];
  const groups = used.map((c, k) => {
    const n = used.length;
    const a = n > 1 ? lerp(-0.85, 0.85, k / (n - 1)) : 0;
    const center = V(Math.sin(a) * 9.5, 5.6 + (k % 2) * 2.4, -Math.cos(a) * 9.5);
    const members = starsOf(c);
    const pts = [];
    members.forEach((s) => {
      const u = hash(s.id), w = hash(`${s.id}*`);
      const spread = members.length > 1 ? 1.2 + Math.min(members.length, 8) * 0.2 : 0;
      const p = center.clone().add(V(Math.cos(u * 6.283) * spread, (w - 0.5) * spread * 1.4, Math.sin(u * 6.283) * spread * 0.4));
      const color = new THREE.Color(lightOf(s));
      const star = new THREE.Group();
      star.position.copy(p);
      const core = new THREE.Mesh(new THREE.SphereGeometry(s.placeholder ? 0.09 : 0.13, 16, 12), new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color("#ffffff"), 0.5), toneMapped: false, transparent: true, opacity: s.placeholder ? 0.55 : 1 }));
      const halo = glow(color, 1.5, s.placeholder ? 0.25 : 0.55);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
      star.add(core, halo, hit);
      scene.add(star);
      pts.push(p);
      const me = { star, core, halo, group: c.id, s: 0, ph: u * 6, question: s.kind === "question", dim: s.placeholder ? 0.45 : 1 };
      stars.push(me);
      stage.add(s.id, star, { title: s.title, sub: s.placeholder ? `${c.title} · to be named` : [c.title, s.status].filter(Boolean).join(" · ") }, {
        hit, anchor: V(0, 0.35, 0),
        onState: (st) => { me.s = st; },
      });
    });
    // the constellation's lines, joining its stars in order
    const seg = [];
    pts.forEach((p, j) => { if (j) seg.push(pts[j - 1], p); });
    const l = seg.length ? lines(seg, "#a9bde6", 0.24) : null;
    if (l) scene.add(l);
    // its name, written faintly in the sky beneath it
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: canvasTexture(1024, 128, (g, w, hgt) => {
        g.font = "300 64px Outfit, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = "rgba(230,236,255,.92)"; g.fillText(c.title, w / 2, hgt / 2);
      }),
      transparent: true, opacity: 0.32, depthWrite: false,
    }));
    label.scale.set(4.6, 0.58, 1);
    const low = pts.reduce((m, p) => Math.min(m, p.y), Infinity);
    label.position.set(center.x, Math.min(center.y, low) - 1.0, center.z);
    scene.add(label);
    stage.add(`c:${c.id}`, label, { title: c.title, sub: "Constellation" }, { anchor: V(0, 0.5, 0), onState: (st) => { label.material.opacity = 0.32 + st * 0.5; } });
    return { id: c.id, lines: l, label };
  });

  // ================================================================ alive
  const head3 = new THREE.Vector3();
  stage.start((dt, t, animate) => {
    lens.getWorldPosition(head3);
    lensGlow.position.copy(head3);
    if (animate) {
      head.rotation.y = Math.sin(t * 0.07) * 0.08;
      dust.rotation.y += dt * 0.006;
    }
    const lit = new Set(stars.filter((s) => s.s > 0.05).map((s) => s.group));
    groups.forEach((g) => { if (g.label.material.opacity > 0.4) lit.add(g.id); });
    stars.forEach((s) => {
      const twinkle = animate ? 0.08 * Math.sin(t * 1.3 + s.ph * 7) : 0;
      const pulse = animate && s.question ? 0.18 * (0.5 + 0.5 * Math.sin(t * 0.9 + s.ph)) : 0;
      s.core.scale.setScalar(1 + s.s * 0.9 + pulse);
      s.halo.material.opacity = (0.5 + twinkle + pulse) * s.dim + s.s * 0.45;
      s.halo.scale.setScalar(1.5 + s.s * 1.4 + pulse * 2);
    });
    groups.forEach((g) => { if (g.lines) g.lines.material.opacity += ((lit.has(g.id) ? 0.75 : 0.24) - g.lines.material.opacity) * 0.1; });
  });
  return stage;
}
