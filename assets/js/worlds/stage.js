/* ============================================================
   STAGE — the 3D room every world is built in
   Renderer, camera, a gentle pointer drift, things you can
   point at and open, the label that names them, the arrival
   move, and the quiet version for reduced motion. A world
   builds its scene and tells the stage which objects open what.
============================================================ */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { showLabel, reduceMotion } from "./ui.js";

export { THREE };
export * from "./craft.js";   // worlds get their materials and textures from the same place

const root = document.documentElement;
const gsap = window.gsap;

export function portrait() {
  return THREE.MathUtils.clamp((1.25 - innerWidth / innerHeight) / 0.75, 0, 1);
}

export function fovFor(hfovDeg) {
  return THREE.MathUtils.clamp(2 * Math.atan(Math.tan(hfovDeg * Math.PI / 360) / (innerWidth / innerHeight)) * 180 / Math.PI, 30, 80);
}

/*
  createStage({ canvas, background, fog, exposure, rest, drift, environment })
  rest() → { pos, target, fov } for the current screen shape.
  Returns null when WebGL isn't available.
*/
export function createStage({ canvas, background = "#111", fog = 0.02, exposure = 1, rest, drift = 1, environment = 0 }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    if (!renderer.getContext()) throw new Error("no context");
  } catch (e) {
    return null;
  }
  const small = matchMedia("(max-width: 760px)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  const scene = new THREE.Scene();
  const bg = new THREE.Color(background);
  scene.background = bg;
  if (fog) scene.fog = new THREE.FogExp2(bg, fog);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);

  // soft reflections for metal, glass and varnish: a studio environment, baked once
  if (environment > 0) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = environment;
    pmrem.dispose();
  }

  const pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 45, inter: 0 };
  const spots = new Map();
  let hovered = null, highlighted = null, focused = null;
  let mode = "intro";
  let update = null, pickHandler = null, hoverHandler = null;

  // ---------------------------------------------------------------- things to open

  // id: what it opens; object: what you point at; item: { title, sub } for the label
  function add(id, object, item, { anchor, hit, onState } = {}) {
    const target = hit || object;
    target.traverse((o) => { o.userData.spot = id; });
    if (anchor === undefined) {
      const box = new THREE.Box3().setFromObject(object);
      const c = box.getCenter(new THREE.Vector3());
      anchor = object.worldToLocal(new THREE.Vector3(c.x, box.max.y, c.z));
    }
    spots.set(id, { id, object, target, item, anchor, s: 0, onState, at: new THREE.Vector3() });
  }

  function anchorOf(spot) {
    return spot.object.localToWorld(spot.at.copy(spot.anchor));
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(x, y) {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(Array.from(spots.values(), (s) => s.target), true);
    for (const hit of hits) {
      let o = hit.object;
      while (o && o.userData.spot === undefined) o = o.parent;
      if (o && o.visible !== false) return o.userData.spot;
    }
    return null;
  }

  // ---------------------------------------------------------------- the camera

  function flyTo(to, duration = 1.6, ease = "power3.inOut") {
    if (reduceMotion || !gsap || duration === 0) {
      pose.pos.copy(to.pos); pose.target.copy(to.target); pose.fov = to.fov;
      requestRender();
      return;
    }
    gsap.killTweensOf([pose.pos, pose.target]);
    gsap.to(pose.pos, { x: to.pos.x, y: to.pos.y, z: to.pos.z, duration, ease });
    gsap.to(pose.target, { x: to.target.x, y: to.target.y, z: to.target.z, duration, ease });
    gsap.to(pose, { fov: to.fov, duration, ease, overwrite: "auto" });
  }

  // step towards something that's been opened; on wide screens it settles to
  // the left of the reading sheet, which takes the right of the screen
  function focus(id) {
    const spot = spots.get(id);
    focused = id;
    if (!spot) return;
    const r = rest();
    const at = anchorOf(spot).clone();
    const pos = r.pos.clone().lerp(at, 0.3);
    pos.y = Math.max(pos.y, at.y + 0.4);
    const fwd = at.clone().sub(pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const dist = pos.distanceTo(at);
    const target = at.clone().addScaledVector(right, innerWidth > 900 ? dist * 0.32 : 0);
    if (innerWidth <= 900) target.y -= dist * 0.12;
    mode = "focus";
    flyTo({ pos, target, fov: r.fov }, 1.4);
  }

  function unfocus() {
    focused = null;
    if (mode === "intro") return;
    mode = "rest";
    flyTo(rest(), 1.4);
  }

  // ---------------------------------------------------------------- pointer and touch

  const pointer = new THREE.Vector2(), aim = new THREE.Vector2();
  let yaw = 0, yawAim = 0, down = null;

  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      const id = e.target === canvas && mode !== "intro" ? pick(e.clientX, e.clientY) : null;
      setHover(id);
      canvas.style.cursor = id ? "pointer" : "";
    } else if (down && down.drag) {
      // dragging looks around a little
      yawAim = THREE.MathUtils.clamp(down.yaw - (e.clientX - down.x) / innerWidth * 1.2, -0.5, 0.5);
    }
    requestRender();
  }, { passive: true });

  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, yaw: yawAim, drag: e.pointerType !== "mouse" };
  });
  addEventListener("pointerup", () => { if (down) down.up = true; });
  // open on click, not pointerup: on touch screens the browser sends a click after the
  // finger lifts, and it would land on whatever just opened under the finger
  canvas.addEventListener("click", (e) => {
    const start = down;
    down = null;
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
    const id = pick(e.clientX, e.clientY);
    if (id && pickHandler) pickHandler(id);
  });

  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    hoverHandler && hoverHandler(id);
  }

  // ---------------------------------------------------------------- frame loop

  const clock = new THREE.Clock();
  const look = new THREE.Vector3(), lift = new THREE.Vector3(), v = new THREE.Vector3();
  let queued = false;

  function draw(dt, t) {
    const animate = !reduceMotion;
    const ease = (rate) => (reduceMotion ? 1 : 1 - Math.pow(rate, dt || 1));
    aim.lerp(pointer, ease(0.05));
    yaw += (yawAim - yaw) * ease(0.04);
    const breathe = animate ? Math.sin(t * 0.3) * 0.04 : 0;

    // look around: turn the gaze about the camera, then drift with the pointer
    look.copy(pose.target).sub(pose.pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw * pose.inter).add(pose.pos);
    camera.position.copy(pose.pos).add(lift.set(aim.x * 0.5 * drift, aim.y * 0.25 * drift + breathe, 0).multiplyScalar(pose.inter));
    camera.lookAt(look.add(lift.set(aim.x * 0.8 * drift, aim.y * 0.4 * drift, 0).multiplyScalar(pose.inter)));
    if (Math.abs(camera.fov - pose.fov) > 0.01) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }

    const lit = hovered || highlighted;
    spots.forEach((s) => {
      const want = s.id === lit || s.id === focused ? 1 : 0;
      s.s += (want - s.s) * ease(0.02);
      s.onState && s.onState(s.s, animate);
    });
    update && update(dt, t, animate);

    // name what's pointed at, just above it
    const spot = lit && spots.get(lit);
    if (spot && !focused) {
      v.copy(anchorOf(spot)).project(camera);
      if (v.z < 1) showLabel(spot.item, (v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight);
      else showLabel(null);
    } else showLabel(null);

    renderer.render(scene, camera);
  }

  function requestRender() {
    if (!reduceMotion || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(0, clock.elapsedTime); });
  }

  function loop() {
    if (!document.hidden) draw(Math.min(clock.getDelta(), 0.05), clock.elapsedTime);
    else clock.getDelta();
    requestAnimationFrame(loop);
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (mode === "rest") flyTo(rest(), 0);
    else if (mode === "focus" && focused) focus(focused);
    requestRender();
  }

  // arrival: a slow move in from further back
  function start(fn) {
    update = fn;
    addEventListener("resize", resize);
    resize();
    const r = rest();
    const done = () => { mode = focused ? "focus" : "rest"; root.classList.add("stage-ready"); };
    if (reduceMotion || !gsap) {
      pose.pos.copy(r.pos); pose.target.copy(r.target); pose.fov = r.fov;
      done();
      requestRender();
      return;
    }
    pose.pos.copy(r.pos).add(new THREE.Vector3(0, 1.6, 6)); pose.target.copy(r.target); pose.fov = r.fov + 6;
    root.classList.add("stage-ready");
    gsap.timeline()
      .to(pose.pos, { x: r.pos.x, y: r.pos.y, z: r.pos.z, duration: 2.6, ease: "power3.inOut" }, 0)
      .to(pose, { fov: r.fov, duration: 2.6, ease: "power3.inOut" }, 0)
      .to(pose, { inter: 1, duration: 1.4, ease: "power1.out" }, 1.8)
      .call(() => { if (mode === "intro") done(); if (focused) focus(focused); }, null, 2.6);
    requestAnimationFrame(loop);
  }

  // back/forward cache: come back at rest
  addEventListener("pageshow", (e) => { if (e.persisted && !focused) { mode = "rest"; flyTo(rest(), 0); } });

  return {
    THREE, scene, camera, renderer, small, pose,
    add, focus, unfocus, start, requestRender,
    highlight(id) { highlighted = id; requestRender(); },
    onPick(fn) { pickHandler = fn; },
    onHover(fn) { hoverHandler = fn; },
    get hovered() { return hovered; },
    // where an object is on screen (for automated checks)
    screenOf(id) {
      const spot = spots.get(id);
      if (!spot) return null;
      const p = anchorOf(spot).clone().project(camera);
      return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
    },
    // the middle of the object itself, where a tap would land
    centreOf(id) {
      const spot = spots.get(id);
      if (!spot) return null;
      const box = new THREE.Box3().setFromObject(spot.target === spot.object ? spot.object : spot.target);
      const p = box.getCenter(new THREE.Vector3()).project(camera);
      return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
    },
  };
}
