/* ============================================================
   INNER PAGES — the same lake, seen from somewhere else
   Each page has its own vantages; scrolling walks the camera
   between them. On Work, the doorway holds each project.
============================================================ */

import { THREE, GATE, createWorld } from "./world.js";

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector(".world");
const view = document.body.dataset.world;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = GATE;

// Each vantage: where the camera stands, what it looks at, and how wide it sees.
// "shift" slides the picture sideways on wide screens so text can sit on the left.
const VANTAGES = {
  work: [
    { pos: V(D.x, 2.05, -16.5), look: V(D.x, 2.4, D.z), fov: 40 },               // still at the threshold
    { pos: V(D.x + 3.2, 1.9, D.z + 7.4), look: V(D.x, 2.35, D.z), fov: 40 },     // RootMap
    { pos: V(D.x - 3.4, 1.5, D.z + 7.2), look: V(D.x, 2.45, D.z), fov: 40 },     // Peninsula
    { pos: V(D.x + 3.6, 2.6, D.z + 7.6), look: V(D.x, 2.25, D.z), fov: 40 },     // Lesson Prep Planner
    { pos: V(D.x - 2.2, 1.15, D.z + 8.2), look: V(D.x, 2.6, D.z), fov: 40 },     // Cookie Bytes
    { pos: V(D.x + 1.2, 2.5, D.z + 8.8), look: V(D.x, 2.3, D.z), fov: 40 },      // Truvit
  ],
  about: [
    { pos: V(-16, 2.6, -6), look: V(8, 3.4, -34), fov: 46 },                     // the left shore, across the water
    { pos: V(-13, 2.2, -14), look: V(10, 2.8, -38), fov: 44 },
    { pos: V(-9, 3.4, -20), look: V(D.x, 2.6, D.z), fov: 42 },
  ],
  notes: [
    { pos: V(0.5, 4.5, 4), look: V(3, 18, -60), fov: 48 },                       // up among the moon and stars
    { pos: V(0.5, 3.2, 2), look: V(D.x, 6, -40), fov: 46 },
  ],
  sketchbook: [
    { pos: V(-8.2, 0.85, -1.2), look: V(D.x, 2.0, D.z), fov: 44 },               // low, through the reeds
    { pos: V(-5.6, 0.75, -6), look: V(D.x + 3, 2.2, D.z - 4), fov: 42 },
  ],
  contact: [
    { pos: V(D.x, 2.0, D.z + 8.5), look: V(D.x, 2.45, D.z), fov: 40 },           // standing before the door
  ],
}[view] || [{ pos: V(0, 1.75, 3), look: V(-2.6, 4.1, -24), fov: 40 }];

// which scroll landmarks map to which vantage
const marks = Array.from(document.querySelectorAll("[data-vantage]"));
const projects = Array.from(document.querySelectorAll("[data-picture]"));

// ------------------------------------------------------------------ world
const world = createWorld({
  canvas,
  quality: 0.9,
  onLoad: start,
  onFail: fail,
});
if (!world) { fail(); throw new Error("WebGL unavailable"); }
const { camera } = world;

function fail() {
  root.classList.add("no-webgl");
  root.classList.remove("from-door");
}

// arriving from the homepage flight: the light fades to reveal the doorway
setTimeout(() => root.classList.remove("from-door"), 4000);   // fallback if the world is slow

// ------------------------------------------------------------------ pictures for the doorway
const pictures = [];          // index -> texture (projects only)
let picA = -1, picB = -1;

async function loadPictures() {
  await Promise.all(projects.map(async (el, i) => { pictures[i] = await world.loadPicture(el.dataset.picture); }));
}

// ------------------------------------------------------------------ framing
let wide = true;
function frame() {
  world.resize();
  wide = innerWidth / innerHeight > 1.05;
  // wide: subject to the right of centre; tall: subject in the upper half
  const w = innerWidth, h = innerHeight;
  if (wide) camera.setViewOffset(w, h, -w * (view === "notes" ? 0.08 : 0.2), 0, w, h);
  else camera.setViewOffset(w, h, 0, h * (view === "notes" ? 0 : view === "work" || view === "contact" ? 0.26 : 0.16), w, h);
}

// ------------------------------------------------------------------ scroll → camera
const cur = { pos: VANTAGES[0].pos.clone(), look: VANTAGES[0].look.clone(), fov: VANTAGES[0].fov };
const goal = { pos: cur.pos.clone(), look: cur.look.clone(), fov: cur.fov };
let progress = 0;            // continuous index along the vantages

function measure() {
  if (!marks.length) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    return (scrollY / max) * (VANTAGES.length - 1);
  }
  // viewport centre against the centres of the marked sections
  const mid = innerHeight * 0.5;
  const centres = marks.map((m) => { const r = m.getBoundingClientRect(); return r.top + r.height / 2; });
  if (mid <= centres[0]) return 0;
  for (let i = 0; i < centres.length - 1; i++) {
    if (mid <= centres[i + 1]) {
      const f = (mid - centres[i]) / (centres[i + 1] - centres[i]);
      return i + f;
    }
  }
  return centres.length - 1;
}

const ease = (x) => x * x * (3 - 2 * x);
function aimFor(p) {
  const n = VANTAGES.length - 1;
  const i = Math.min(Math.floor(p), n), j = Math.min(i + 1, n);
  // hold still around each landmark, travel between them
  const f = ease(THREE.MathUtils.clamp(((p - i) - 0.2) / 0.6, 0, 1));
  goal.pos.lerpVectors(VANTAGES[i].pos, VANTAGES[j].pos, f);
  goal.look.lerpVectors(VANTAGES[i].look, VANTAGES[j].look, f);
  goal.fov = THREE.MathUtils.lerp(VANTAGES[i].fov, VANTAGES[j].fov, f);
  // tall screens: step back so the doorway sits above the words, not behind them
  if (!wide && (view === "work" || view === "contact")) {
    goal.pos.sub(goal.look).multiplyScalar(1.9).add(goal.look);
    goal.pos.y = Math.max(goal.pos.y, 1.7);   // and never below the surface of the lake
  }

  if (view === "work") {
    // vantage 0 is the bare threshold; vantage k (k ≥ 1) holds project k − 1
    const a = i - 1, b = j - 1;
    const fade = THREE.MathUtils.smoothstep(p - i, 0.4, 0.6);
    const u = world.lightMaterial.uniforms;
    if (a !== picA && pictures[a]) { u.mapA.value = pictures[a]; picA = a; }
    if (b !== picB && pictures[b]) { u.mapB.value = pictures[b]; picB = b; }
    const pa = a >= 0 && pictures[a] ? 1 : 0, pb = b >= 0 && pictures[b] ? 1 : 0;
    if (!pa && pb) { u.mapA.value = pictures[b]; }
    u.mixAB.value = pa && pb ? fade : 0;
    u.picture.value = THREE.MathUtils.lerp(pa, pb, fade);
    // name the project currently in the doorway
    const active = Math.round(p) - 1;
    projects.forEach((el, k) => el.classList.toggle("is-in-door", k === active));
  }
}

// ------------------------------------------------------------------ pointer: a gentle lean
const pointer = new THREE.Vector2(), aim = new THREE.Vector2();
addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
}, { passive: true });

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
const look = new THREE.Vector3(), offset = new THREE.Vector3();
let started = false, dirty = true;

function draw(dt, t) {
  progress = measure();
  aimFor(progress);
  const k = reduceMotion ? 1 : 1 - Math.pow(0.03, dt);
  cur.pos.lerp(goal.pos, k);
  cur.look.lerp(goal.look, k);
  cur.fov += (goal.fov - cur.fov) * k;

  aim.lerp(reduceMotion ? aim.set(0, 0) : pointer, 1 - Math.pow(0.05, dt || 1));
  const breathe = reduceMotion ? 0 : Math.sin(t * 0.3) * 0.04;
  offset.set(aim.x * 0.35, aim.y * 0.15 + breathe, 0);
  camera.position.copy(cur.pos).add(offset);
  look.copy(cur.look).add(offset.multiplyScalar(1.6));
  camera.lookAt(look);
  if (Math.abs(camera.fov - cur.fov) > 0.01) { camera.fov = cur.fov; camera.updateProjectionMatrix(); }

  const pic = world.lightMaterial.uniforms.picture.value;
  world.update(dt, t, { light: 1, fog: view === "notes" ? 0.016 : 0.0125, animate: !reduceMotion, glowScale: 1 - pic * 0.7 });
}

function loop() {
  if (!document.hidden) draw(Math.min(clock.getDelta(), 0.05), clock.elapsedTime);
  requestAnimationFrame(loop);
}

// reduced motion: draw only when something changes, and jump rather than glide
function requestDraw() {
  if (!started || dirty) return;
  dirty = true;
  requestAnimationFrame(() => { dirty = false; draw(1, clock.elapsedTime); });
}

async function start() {
  frame();
  world.motes.material.opacity = 0.8;
  if (view === "work") await loadPictures();
  progress = measure();
  aimFor(progress);
  cur.pos.copy(goal.pos); cur.look.copy(goal.look); cur.fov = goal.fov;
  started = true;
  root.classList.add("world-ready");
  // the light we arrived through lifts once there is something to see
  setTimeout(() => root.classList.remove("from-door"), 250);
  if (reduceMotion) {
    dirty = false;
    draw(1, 0);
    addEventListener("scroll", requestDraw, { passive: true });
  } else {
    requestAnimationFrame(loop);
  }
}

addEventListener("resize", () => { frame(); if (reduceMotion) requestDraw(); });

window.__world = { get loaded() { return world.loaded; }, get progress() { return progress; }, camera, world };
