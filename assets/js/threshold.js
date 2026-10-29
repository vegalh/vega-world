/* ============================================================
   THE THRESHOLD — homepage scene
   Environment modelled in Blender (blender/build_threshold.py),
   rendered here with three.js; camera direction with GSAP.
============================================================ */

import { THREE, GATE, STONES, MOON_WIDE, MOON_TALL, createWorld } from "./world.js";

const root = document.documentElement;
const gsap = window.gsap;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector(".world");

const world = createWorld({
  canvas,
  onLoad: () => { root.classList.add("world-ready"); begin(); },
  onProgress: (f) => { document.querySelector(".loading span").style.transform = `scaleX(${f})`; },
  onFail: fail,
});
if (!world) throw new Error("WebGL unavailable");
const { camera, motes, hoverTargets } = world;
const MOON_DIR = world.moonDir;

function fail() {
  root.classList.remove("scene-pending");
  root.classList.add("no-webgl", "title-on", "foot-on");
}

// ------------------------------------------------------------------ camera direction
const pose = {
  pos: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 38,
  inter: 0,        // how much the pointer may steer (0 during set pieces)
  gate: 0,         // light in the doorway, 0..1
  hover: 0,
  fog: 0.0125,
};
const rest = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };

function frameRest() {
  const aspect = innerWidth / innerHeight;
  // wide screens: the door sits in the right third, leaving sky for the title
  // tall screens: the door moves to the centre and the camera steps back
  const portrait = THREE.MathUtils.clamp((1.25 - aspect) / 0.75, 0, 1);
  rest.pos.set(THREE.MathUtils.lerp(0, 1.2, portrait), THREE.MathUtils.lerp(1.75, 2.2, portrait), THREE.MathUtils.lerp(3, 0.2, portrait));
  rest.target.set(THREE.MathUtils.lerp(-2.6, GATE.x - 0.6, portrait), THREE.MathUtils.lerp(4.1, 6.4, portrait), -24);
  // hold a usable horizontal field of view whatever the shape of the screen
  const hfov = THREE.MathUtils.lerp(62, 54, portrait) * Math.PI / 180;
  rest.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(hfov / 2) / aspect) * 180 / Math.PI, 30, 78);
  MOON_DIR.lerpVectors(MOON_WIDE, MOON_TALL, portrait).normalize();
}

function resize() {
  world.resize();
  frameRest();
  if (mode === "idle") { pose.pos.copy(rest.pos); pose.target.copy(rest.target); pose.fov = rest.fov; }
  if (reduceMotion) requestRender();
}

let mode = "intro";

function begin() {
  root.classList.remove("no-webgl");
  resize();
  if (reduceMotion || !gsap) {
    mode = "idle";
    pose.pos.copy(rest.pos); pose.target.copy(rest.target); pose.fov = rest.fov;
    pose.gate = 1; pose.inter = reduceMotion ? 0 : 1; pose.fog = 0.0125;
    root.classList.remove("scene-pending");
    root.classList.add("scene-on", "title-on", "foot-on");
    requestRender();
    return;
  }

  // opening: high in the fog, looking down at the water; then the descent
  // opening: gazing up at the moon through thick fog, then lowering the gaze to the water
  pose.pos.set(rest.pos.x - 0.6, rest.pos.y + 0.5, rest.pos.z + 7);
  pose.target.set(GATE.x - 1.2, 34, -24);
  pose.fov = rest.fov + 4;
  pose.fog = 0.06;

  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
  tl.call(() => root.classList.add("scene-on"))
    .to(pose, { fog: 0.0125, duration: 4.2, ease: "power2.out" }, 0)
    .to(pose.pos, { x: rest.pos.x, y: rest.pos.y, z: rest.pos.z, duration: 5.2, ease: "power3.inOut" }, 0)
    .to(pose.target, { x: rest.target.x, y: rest.target.y, z: rest.target.z, duration: 5.2, ease: "power3.inOut" }, 0)
    .to(pose, { fov: rest.fov, duration: 5.2, ease: "power3.inOut" }, 0)
    .to(pose, { gate: 1, duration: 2.6, ease: "power1.inOut" }, 2.3)        // the door lights
    .to(motes.material, { opacity: 0.85, duration: 3 }, 3.2)
    .call(() => root.classList.add("title-on"), null, 3.1)
    .call(() => root.classList.add("foot-on"), null, 4.1)
    .call(() => { mode = "idle"; root.classList.remove("scene-pending"); }, null, 5.2)
    .to(pose, { inter: 1, duration: 1.6, ease: "power1.out" }, 4.6);

  // a click or key during the opening skips straight to the end of it
  const skip = () => { if (mode === "intro") tl.progress(1); };
  addEventListener("keydown", skip, { once: true });
  canvas.addEventListener("pointerdown", skip, { once: true });
}

// cross the stones and pass through the doorway
function enterTheDoor(href) {
  if (mode === "flight") return;
  if (reduceMotion || !gsap || !world.loaded) { location.href = href; return; }
  mode = "flight";
  // the next page opens out of the same light
  try { sessionStorage.setItem("vg-door", "1"); } catch (e) {}
  const path = new THREE.CatmullRomCurve3([
    camera.position.clone(),
    ...STONES.filter((s) => s.z < camera.position.z - 2),
    new THREE.Vector3(GATE.x, 2.0, GATE.z + 3.2),
    new THREE.Vector3(GATE.x, 2.1, GATE.z + 0.5),
  ], false, "centripetal");
  const look = new THREE.Vector3();
  const travel = { p: 0 };
  let flooded = false;
  const startTarget = pose.target.clone();
  gsap.timeline()
    .to(pose, { inter: 0, duration: 0.6 }, 0)
    .to(pose, { hover: 1, gate: 1.5, duration: 2.6, ease: "power1.in" }, 0)
    .to(travel, {
      p: 1, duration: 5, ease: "sine.inOut",
      onUpdate: () => {
        pose.pos.copy(path.getPointAt(travel.p));
        path.getPointAt(Math.min(travel.p + 0.12, 1), look);
        look.set(GATE.x, GATE.y, GATE.z - 4);  // keep the gaze on the doorway
        pose.target.copy(startTarget).lerp(look, Math.min(travel.p * 3, 1));
        // the light takes over just before the threshold is crossed
        if (!flooded && pose.pos.z - GATE.z < 4.5) {
          flooded = true;
          root.classList.add("is-flooding");
          setTimeout(() => { location.href = href; }, 820);
        }
      },
    }, 0.15)
    .to(pose, { fov: rest.fov - 6, duration: 5, ease: "sine.inOut" }, 0.15);
}

// leaving by the navigation: rise back into the fog
function riseAway(href) {
  mode = "flight";
  try { sessionStorage.setItem("vg-scene", "1"); } catch (e) {}
  gsap.timeline()
    .to(pose, { inter: 0, duration: 0.3 }, 0)
    .to(pose.pos, { y: "+=4", z: "+=6", duration: 0.9, ease: "power2.in" }, 0)
    .to(pose, { fog: 0.045, duration: 0.9, ease: "power2.in" }, 0)
    .call(() => root.classList.add("is-leaving"), null, 0.25)
    .call(() => { location.href = href; }, null, 0.8);
}

// capture phase: runs before the shared page-transition handler
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || reduceMotion || !gsap || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return;
  event.preventDefault();
  event.stopPropagation();
  if (link.classList.contains("enter")) enterTheDoor(link.href);
  else riseAway(link.href);
}, true);

// ------------------------------------------------------------------ pointer, touch, hover
const pointer = new THREE.Vector2(), aim = new THREE.Vector2(), ndc = new THREE.Vector2(-9, -9);
const raycaster = new THREE.Raycaster();
let hovering = false, dragging = false, dragStart = null;

addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") {
    pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  } else if (dragging && dragStart) {
    pointer.set(
      THREE.MathUtils.clamp((e.clientX - dragStart.x) / innerWidth * -2.5, -1, 1),
      THREE.MathUtils.clamp((e.clientY - dragStart.y) / innerHeight * 2.5, -1, 1)
    );
  }
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (reduceMotion) { updateHover(); requestRender(); }
}, { passive: true });

canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") { dragging = true; dragStart = { x: e.clientX, y: e.clientY }; }
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  canvas.dataset.downAt = `${e.clientX},${e.clientY}`;
});
addEventListener("pointerup", (e) => {
  if (dragging) { dragging = false; pointer.set(0, 0); }
  const [x, y] = (canvas.dataset.downAt || "").split(",").map(Number);
  delete canvas.dataset.downAt;
  if (e.target !== canvas || Math.hypot(e.clientX - x, e.clientY - y) > 8 || mode !== "idle") return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  updateHover();
  if (hovering) enterTheDoor(document.querySelector(".enter").href);
});

function updateHover() {
  if (!world.loaded) return;
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(hoverTargets, false).length > 0;
  if (hit !== hovering) {
    hovering = hit;
    root.classList.toggle("door-hover", hit);
    if (reduceMotion) pose.hover = hit ? 1 : 0;
  }
}

// keyboard focus on Explore lights the door too
const enter = document.querySelector(".enter");
enter.addEventListener("focus", () => root.classList.add("door-hover"));
enter.addEventListener("blur", () => root.classList.remove("door-hover"));
enter.addEventListener("mouseenter", () => root.classList.add("door-hover"));
enter.addEventListener("mouseleave", () => { if (!hovering) root.classList.remove("door-hover"); });

// ------------------------------------------------------------------ frame loop
const clock = new THREE.Clock();
const offset = new THREE.Vector3(), look = new THREE.Vector3();
let renderQueued = false;

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; draw(0, clock.elapsedTime); });
}

function draw(dt, t) {
  // steering: the near world moves more than the far, so the scene feels deep
  aim.lerp(pointer, 1 - Math.pow(0.04, dt || 1));
  const breathe = reduceMotion ? 0 : Math.sin(t * 0.32) * 0.06;
  offset.set(aim.x * 0.9, aim.y * 0.32 + breathe, 0).multiplyScalar(pose.inter);
  camera.position.copy(pose.pos).add(offset);
  look.copy(pose.target).add(offset.set(aim.x * 2.2, aim.y * 0.9, 0).multiplyScalar(pose.inter));
  camera.lookAt(look);
  if (Math.abs(camera.fov - pose.fov) > 0.01) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }

  if (mode === "idle" && !reduceMotion) updateHover();
  const target = root.classList.contains("door-hover") ? 1 : 0;
  if (!reduceMotion && mode !== "flight") pose.hover += (target - pose.hover) * (1 - Math.pow(0.02, dt || 1));
  else if (reduceMotion) pose.hover = target;

  canvas.style.cursor = hovering && mode === "idle" ? "pointer" : "";
  world.update(dt, t, { light: pose.gate * (0.82 + 0.3 * pose.hover), fog: pose.fog, hover: pose.hover, animate: !reduceMotion });
}

function loop() {
  if (!document.hidden) {
    const dt = Math.min(clock.getDelta(), 0.05);
    draw(dt, clock.elapsedTime);
  }
  requestAnimationFrame(loop);
}

addEventListener("resize", resize);
resize();
if (reduceMotion) requestRender();
else requestAnimationFrame(loop);

// back/forward cache: return to the resting scene, not the middle of a flight
addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  root.classList.remove("is-flooding", "is-leaving");
  mode = "idle";
  frameRest();
  pose.pos.copy(rest.pos); pose.target.copy(rest.target); pose.fov = rest.fov;
  pose.inter = reduceMotion ? 0 : 1; pose.fog = 0.0125; pose.gate = 1;
});

// expose a tiny hook for automated checks
window.__threshold = { get mode() { return mode; }, get loaded() { return world.loaded; }, camera, pose, scene: world.scene };
