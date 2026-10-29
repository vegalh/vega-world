/* ============================================================
   THE ATLAS — a quiet hall holding five little worlds
   Everything is built here from code; the only downloads are
   the photo thumbnails the Memory Room sculpture wears.
   Which worlds exist, their names and doors, comes from the
   page's .atlas-index list, so the 3D and the list agree.
============================================================ */

import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { seeded, canvasTexture, glowTex, wash, interfaceTex, blueprintTex, glow, lines, std } from "./worlds/craft.js";

const root = document.documentElement;
const gsap = window.gsap;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = matchMedia("(max-width: 760px)").matches;
const canvas = document.querySelector(".hall");
const links = Array.from(document.querySelectorAll(".world-link"));
const caption = {
  theme: document.querySelector(".cap-theme"),
  name: document.querySelector(".cap-name"),
  note: document.querySelector(".cap-note"),
  enter: document.querySelector(".cap-enter"),
  back: document.querySelector(".cap-back"),
};

const WORLDS = links.map((link, i) => ({
  i,
  link,
  kind: link.dataset.world,
  href: link.getAttribute("href"),
  accent: link.dataset.accent || "#e8d3a0",
  note: link.dataset.note || "",
  name: link.querySelector(".w-name").textContent,
  theme: link.querySelector(".w-theme").textContent,
}));
WORLDS.forEach((w) => w.link.style.setProperty("--accent-of", w.accent));

function fail() {
  root.classList.remove("atlas-pending", "from-door");
  root.classList.add("no-webgl");
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  if (!renderer.getContext()) throw new Error("no context");
} catch (e) {
  fail();
  throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const HALL = new THREE.Color("#1b1522");
const scene = new THREE.Scene();
scene.background = HALL;
scene.fog = new THREE.FogExp2(HALL, 0.021);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

// a fixed seed, so the hall is the same hall every visit
const rand = seeded(20261029);

// ================================================================== the hall

// the far wall: a ring of very tall fins against a low dusk glow
const backdrop = new THREE.Mesh(
  new THREE.CylinderGeometry(70, 70, 140, 64, 1, true),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        float h = (vPos.y + 70.0) / 140.0;            // 0.5 at the floor
        float a = atan(vPos.x, -vPos.z);               // 0 straight ahead
        float low = exp(-pow(max(h - 0.5, 0.0) * 9.0, 2.0));
        float ahead = 0.35 + 0.65 * exp(-a * a * 1.6);
        vec3 dark = vec3(0.045, 0.033, 0.06);
        vec3 dusk = vec3(0.17, 0.125, 0.2);
        vec3 col = mix(dark, dusk, low * ahead);
        col += vec3(0.32, 0.22, 0.14) * exp(-pow((h - 0.5) * 60.0, 2.0)) * ahead * 0.5;  // a thin warm horizon
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  })
);
backdrop.position.set(0, 0, -4);
scene.add(backdrop);

{
  const angles = [];
  for (let a = -81; a <= 81; a += 9) if (Math.abs(a) > 5) angles.push(a);
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std("#1d1724", { roughness: 0.95 }), angles.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  angles.forEach((deg, k) => {
    const a = deg * Math.PI / 180;
    p.set(Math.sin(a) * 38, 30, -4 - Math.cos(a) * 38);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    s.set(3.4, 60, 5);
    fins.setMatrixAt(k, m.compose(p, q, s));
  });
  scene.add(fins);
}

// the great door at the far end: the Threshold's doorway, seen again from inside
const door = new THREE.Group();
{
  const slit = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 22),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(8, 256, (g, w, h) => {
        const lg = g.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0, "rgba(232,211,160,0)");
        lg.addColorStop(0.5, "rgba(255,226,180,.7)");
        lg.addColorStop(1, "rgba(255,244,222,1)");
        g.fillStyle = lg; g.fillRect(0, 0, w, h);
      }),
      transparent: true, fog: false, toneMapped: false, depthWrite: false,
    })
  );
  slit.position.y = 11;
  door.add(slit, glow("#ffd9a0", 26, 0.22));
  door.children[1].position.y = 4;
  door.position.set(0, 0, -52);
  scene.add(door);
}

// the floor: dark stone with a faint reflection
if (!small) {
  const mirror = new Reflector(new THREE.PlaneGeometry(240, 240), {
    textureWidth: Math.round(innerWidth * 0.5),
    textureHeight: Math.round(innerHeight * 0.5),
    color: 0x6a6070,
    clipBias: 0.003,
  });
  mirror.rotation.x = -Math.PI / 2;
  scene.add(mirror);
}
{
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    small ? std("#140f19", { roughness: 0.6 }) : new THREE.MeshBasicMaterial({ color: "#120d17", transparent: true, opacity: 0.86 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  scene.add(floor);

  // the joints between great stone slabs
  const pts = [];
  for (let k = -12; k <= 12; k++) {
    pts.push(new THREE.Vector3(k * 6, 0.02, -60), new THREE.Vector3(k * 6, 0.02, 30));
    pts.push(new THREE.Vector3(-72, 0.02, k * 6 - 15), new THREE.Vector3(72, 0.02, k * 6 - 15));
  }
  scene.add(lines(pts, "#5a4a68", 0.22));
}

// dust in the air
const motes = (() => {
  const n = small ? 260 : 520;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    pos[k * 3] = (rand() - 0.5) * 44; pos[k * 3 + 1] = rand() * 14; pos[k * 3 + 2] = -32 + rand() * 46;
    seed[k] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: "#f2dcc0", size: 0.09, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.userData.seed = seed;
  scene.add(pts);
  return pts;
})();

// light
scene.add(new THREE.HemisphereLight("#8f80b0", "#120d18", 0.55));
const key = new THREE.DirectionalLight("#ffe4c4", 1.0);
key.position.set(-8, 18, 10);
scene.add(key);
const rim = new THREE.DirectionalLight("#9a8cc8", 0.6);
rim.position.set(6, 6, -20);
scene.add(rim);

// one shaft of light falls on whichever world you look at
const shaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 3.2, 26, 48, 1, true),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color("#ffe6c4") }, strength: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vFace; varying float vH;
      void main() {
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFace = abs(dot(n, normalize(-mv.xyz)));
        vH = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float strength;
      varying float vFace; varying float vH;
      void main() {
        float a = pow(vFace, 2.5) * smoothstep(0.0, 0.35, vH) * (1.0 - vH * 0.55) * strength;
        gl_FragColor = vec4(color * a * 0.16, 1.0);
      }`,
  })
);
shaft.position.y = 13;
scene.add(shaft);

// ================================================================== the five worlds

const PLACES = {
  // pos: where it floats on a wide screen; tall: on a tall one, where the worlds
  // recede in a zigzag instead of standing in a row; mid: the height of its
  // visual centre, for framing
  observatory: { pos: [-10.8, 3.0, -3.5], tall: [-3.4, 3.0, -2], scale: 1.05, turn: 0.4, mid: 1.5 },
  greenhouse: { pos: [-5.6, 3.1, -12], tall: [3.4, 3.1, -7.5], scale: 1.15, turn: 0.15, mid: 0.7 },
  workshop: { pos: [0.6, 2.7, -5.5], tall: [-3.2, 2.7, -13], scale: 1.05, turn: -0.1, mid: 1.3 },
  memory: { pos: [6.4, 3.4, -13.5], tall: [3.4, 3.4, -18.5], scale: 1.25, turn: -0.15, mid: 2.3 },
  sketchbook: { pos: [11.2, 2.9, -3.8], tall: [-0.6, 2.9, -25], scale: 1.05, turn: -0.42, mid: 1.6 },
};

const BUILD = {
  // a dome split open, a brass telescope, and the stars it has noticed
  observatory(accent) {
    const g = new THREE.Group();
    const stone = std("#2d2735", { roughness: 0.75 });
    const brass = std("#c8a56a", { metalness: 0.85, roughness: 0.32 });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.7, 0.22, 72), stone);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.025, 8, 120), brass);
    edge.rotation.x = Math.PI / 2; edge.position.y = 0.11;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.45, 64, 24, 0.32, Math.PI * 2 - 0.64, 0, Math.PI / 2),
      std("#5d5262", { metalness: 0.7, roughness: 0.58, side: THREE.DoubleSide })
    );
    dome.rotation.y = Math.PI / 2;               // the opening faces the hall
    dome.position.y = 0.11;
    const scope = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 2.5, 32), brass);
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 32), brass);
    lens.position.y = 1.25; lens.rotation.x = Math.PI / 2;
    scope.add(tube, lens);
    scope.position.set(0, 0.95, 0.25); scope.rotation.x = 0.72;
    // an armillary ring, tilted
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.008, 6, 160), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.35 }));
    ring.rotation.set(1.2, 0.3, 0); ring.position.y = 1.2;

    // stars on a shell above the dome; a few joined into constellations
    const stars = [];
    const r = seeded(7);
    for (let k = 0; k < 70; k++) {
      const th = r() * 1.15, ph = r() * Math.PI * 2, rad = 2.5 + r() * 1.3;
      stars.push(new THREE.Vector3(Math.sin(th) * Math.cos(ph) * rad, 0.6 + Math.cos(th) * rad, Math.sin(th) * Math.sin(ph) * rad));
    }
    const sky = new THREE.Group();
    const starGeo = new THREE.BufferGeometry().setFromPoints(stars);
    const starMat = new THREE.PointsMaterial({ map: glowTex, color: "#e6eeff", size: 0.22, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    sky.add(new THREE.Points(starGeo, starMat));
    const seg = [];
    for (let c = 0; c < 5; c++) {
      let at = stars[(c * 13) % stars.length];
      const used = new Set([at]);
      for (let s = 0; s < 4; s++) {
        let best = null, bd = Infinity;
        for (const p of stars) { const d = p.distanceTo(at); if (!used.has(p) && d < bd) { bd = d; best = p; } }
        seg.push(at, best); used.add(best); at = best;
      }
    }
    const constellations = lines(seg, accent, 0.3);
    sky.add(constellations);
    g.add(platform, edge, dome, scope, ring, sky);
    return {
      group: g,
      update(t, dt, s, animate) {
        if (animate) { sky.rotation.y += dt * (0.025 + 0.06 * s.hover); ring.rotation.z += dt * 0.05; }
        constellations.material.opacity = 0.18 + 0.5 * s.hover;
        starMat.size = 0.2 + 0.06 * s.hover;
      },
    };
  },

  // a glass house over a tree whose roots reach below the floating ground
  greenhouse(accent) {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.24, 2.3), std("#d4c7b1", { roughness: 0.95 }));
    const glass = new THREE.MeshStandardMaterial({ color: "#dff2e8", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.3, 2), glass);
    body.position.y = 0.77;
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 14, 1, true, 0, Math.PI), glass);
    vault.rotation.z = Math.PI / 2; vault.position.y = 1.42;
    // the frame: posts, ribs and ridge in pale bronze
    const pts = [];
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    for (let k = 0; k <= 6; k++) {
      const x = -1.5 + k * 0.5;
      pts.push(V(x, 0.12, 1), V(x, 1.42, 1), V(x, 0.12, -1), V(x, 1.42, -1));
      for (let a = 0; a < 14; a++) {
        const a0 = a / 14 * Math.PI, a1 = (a + 1) / 14 * Math.PI;
        pts.push(V(x, 1.42 + Math.sin(a0), Math.cos(a0)), V(x, 1.42 + Math.sin(a1), Math.cos(a1)));
      }
    }
    for (const z of [1, -1]) pts.push(V(-1.5, 0.12, z), V(1.5, 0.12, z), V(-1.5, 1.42, z), V(1.5, 1.42, z));
    for (let a = 1; a < 14; a += 3) { const y = 1.42 + Math.sin(a / 14 * Math.PI), z = Math.cos(a / 14 * Math.PI); pts.push(V(-1.5, y, z), V(1.5, y, z)); }
    const frame = lines(pts, "#efe1c0", 0.5);

    // the tree
    const tree = new THREE.Group();
    const bark = std("#6b503c");
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 1.2, 10), bark);
    trunk.position.y = 0.72;
    tree.add(trunk);
    const r = seeded(11);
    const leaves = [std("#7f9a63", { flatShading: true }), std("#9cb377", { flatShading: true }), std("#64804f", { flatShading: true })];
    for (let k = 0; k < 9; k++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + r() * 0.22, 0), leaves[k % 3]);
      const a = r() * Math.PI * 2, d = r() * 0.5;
      leaf.position.set(Math.cos(a) * d, 1.45 + r() * 0.55, Math.sin(a) * d * 0.7);
      leaf.rotation.set(r() * 3, r() * 3, r() * 3);
      tree.add(leaf);
    }
    // small plants along the glass
    for (let k = 0; k < 6; k++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + r() * 0.08, 0), leaves[k % 3]);
      p.position.set(-1.2 + k * 0.48, 0.25, (k % 2 ? 0.7 : -0.7));
      tree.add(p);
    }
    // roots, under the ground, faintly lit: a map of what grows
    const rootMat = new THREE.MeshStandardMaterial({ color: "#3a2c22", emissive: new THREE.Color(accent), emissiveIntensity: 0.25, roughness: 0.8 });
    const roots = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + r() * 0.4;
      const reach = 0.9 + r() * 0.8, depth = 1.0 + r() * 1.1;
      const curve = new THREE.CatmullRomCurve3([
        V(0, -0.1, 0),
        V(Math.cos(a) * reach * 0.35, -0.35 - depth * 0.25, Math.sin(a) * reach * 0.35),
        V(Math.cos(a + 0.3) * reach * 0.75, -0.3 - depth * 0.7, Math.sin(a + 0.3) * reach * 0.75),
        V(Math.cos(a + 0.5) * reach, -0.3 - depth, Math.sin(a + 0.5) * reach),
      ]);
      roots.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.022 - k * 0.0012, 5), rootMat));
    }
    g.add(slab, body, vault, frame, tree, roots);
    return {
      group: g,
      update(t, dt, s, animate) {
        const breathe = animate ? Math.sin(t * 0.8) * 0.02 : 0;
        tree.scale.setScalar(1 + breathe + 0.04 * s.hover);
        rootMat.emissiveIntensity = 0.25 + 1.1 * s.hover;
        frame.material.opacity = 0.42 + 0.3 * s.hover;
      },
    };
  },

  // a cut-open studio: a desk, a lit screen, books, a sketch on the wall,
  // and pieces of interface drifting out of the room
  workshop(accent) {
    const g = new THREE.Group();
    const plaster = std("#d6c9b8", { roughness: 0.95 });
    const wood = std("#8a6446", { roughness: 0.7 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 2.8), std("#b9a58e"));
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 0.14), plaster);
    back.position.set(0, 1.27, -1.33);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 2.8), plaster);
    side.position.set(-1.33, 1.27, 0);
    // a window cut into the side wall, as a lit opening
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshBasicMaterial({ color: "#ffe8c8", toneMapped: false }));
    win.position.set(-1.255, 1.5, 0.4); win.rotation.y = Math.PI / 2;

    const desk = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.7), wood);
    top.position.y = 0.8;
    desk.add(top);
    for (const [x, z] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), wood);
      leg.position.set(x, 0.4, z); desk.add(leg);
    }
    const screenMat = new THREE.MeshBasicMaterial({ map: interfaceTex(3), toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.48), screenMat);
    screen.position.set(0.1, 1.15, -0.12);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.54, 0.03), std("#221b26"));
    bezel.position.set(0.1, 1.15, -0.14);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), std("#221b26"));
    stand.position.set(0.1, 0.95, -0.15);
    desk.add(bezel, screen, stand);
    const bookColors = ["#6c5b8e", "#b8574a", "#d9c7a0", "#3c5a64"];
    bookColors.forEach((c, k) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.24), std(c));
      b.position.set(-0.5, 0.86 + k * 0.062, 0.05); b.rotation.y = (k % 2 ? 0.12 : -0.08);
      desk.add(b);
    });
    desk.position.set(0.1, 0.07, -0.55);
    const sketch = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), std("#ffffff", { map: blueprintTex }));
    sketch.position.set(-0.7, 1.75, -1.255); sketch.rotation.z = 0.04;

    // drifting fragments
    const fragments = new THREE.Group();
    const r = seeded(5);
    for (let k = 0; k < 7; k++) {
      const w = 0.45 + r() * 0.4;
      const frag = new THREE.Mesh(
        new THREE.PlaneGeometry(w, w * 0.66),
        new THREE.MeshBasicMaterial({ map: interfaceTex(20 + k, { dark: false, frame: r() > 0.3 }), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
      );
      const a = -0.6 + k * 0.42;
      frag.userData = { a, rad: 2.1 + r() * 0.5, y: 0.6 + r() * 2.4, sp: 0.6 + r() * 0.6 };
      fragments.add(frag);
    }
    // wireframe prototypes and a slow gear
    const proto = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.45, 0.45, 0.45)), new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.8 }));
    proto.position.set(1.7, 2.6, 0.6);
    const proto2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.25, 0)), proto.material);
    proto2.position.set(0.6, 0.35, 0.9);
    const gear = new THREE.Group();
    const brass = std("#c8a56a", { metalness: 0.8, roughness: 0.35 });
    gear.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 40), brass));
    for (let k = 0; k < 10; k++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), brass);
      const a = k / 10 * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.39, Math.sin(a) * 0.39, 0); tooth.rotation.z = a;
      gear.add(tooth);
    }
    gear.position.set(0.9, 2.75, -1.2);
    g.add(floor, back, side, win, desk, sketch, fragments, proto, proto2, gear);
    return {
      group: g,
      update(t, dt, s, animate) {
        const time = animate ? t : 0;
        fragments.children.forEach((f) => {
          const u = f.userData, a = u.a + time * 0.05 * u.sp;
          const out = u.rad + 0.35 * s.hover;
          f.position.set(Math.cos(a) * out + 0.3, u.y + Math.sin(time * u.sp) * 0.08, Math.sin(a) * out * 0.7 + 0.5);
          f.lookAt(f.position.x * 3, f.position.y, f.position.z * 3 + 4);
        });
        if (animate) { gear.rotation.z += dt * (0.25 + s.hover * 0.6); proto.rotation.y += dt * 0.3; proto.rotation.x += dt * 0.18; proto2.rotation.y -= dt * 0.4; }
      },
    };
  },

  // photographs on a slow spiral around a thread of light
  memory(accent) {
    const g = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.12, 64), std("#2a2230", { metalness: 0.4, roughness: 0.3 }));
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.4, 8), new THREE.MeshBasicMaterial({ color: "#fff1e4", toneMapped: false }));
    thread.position.y = 2.25;
    const top = glow(accent, 1.4, 0.7); top.position.y = 4.45;
    const spiral = new THREE.Group();
    const paper = std("#efe7dc", { roughness: 0.9 });
    const frames = [];
    for (let k = 0; k < 10; k++) {
      const a = k * 0.78;
      const frame = new THREE.Group();
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.86, 0.012), paper);
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshBasicMaterial({ color: "#3a3040" }));
      photo.position.z = 0.008;
      // the same print on the back, so the spiral reads from every side
      const verso = new THREE.Mesh(photo.geometry, photo.material);
      verso.position.z = -0.008; verso.rotation.y = Math.PI;
      frame.add(card, photo, verso);
      frame.userData.verso = verso;
      frame.position.set(Math.sin(a) * 1.25, 0.55 + k * 0.36, Math.cos(a) * 1.25);
      frame.rotation.y = a;
      frame.userData.photo = photo;
      spiral.add(frame);
      frames.push(frame);
    }
    g.add(plinth, thread, top, spiral);
    return {
      group: g,
      frames,
      update(t, dt, s, animate) {
        if (animate) spiral.rotation.y += dt * (0.08 + 0.22 * s.hover);
        frames.forEach((f, k) => { f.position.y = 0.55 + k * (0.36 + 0.05 * s.hover); });
      },
    };
  },

  // an open sketchbook; loose pages rise out of it
  sketchbook() {
    const g = new THREE.Group();
    const book = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.07, 2.2), std("#2f3b5c", { roughness: 0.9 }));
    cover.position.y = -0.05;
    book.add(cover);
    const tints = [
      ["rgba(70,90,150,A)", "rgba(200,140,110,A)"],
      ["rgba(190,150,80,A)", "rgba(120,150,130,A)", "rgba(80,90,140,A)"],
    ];
    for (const side of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(1.55, 2.05, 24, 1);
      const p = geo.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const x = p.getX(v), u = Math.abs(x + 0.775 * side) / 1.55; // 0 at the spine
        p.setZ(v, Math.sin(Math.min(u, 1) * Math.PI) * 0.12 + Math.sqrt(u) * 0.06);
      }
      geo.computeVertexNormals();
      const page = new THREE.Mesh(geo, std("#ffffff", { map: wash(side > 0 ? 31 : 32, tints[side > 0 ? 1 : 0]), roughness: 1, side: THREE.DoubleSide }));
      page.rotation.x = -Math.PI / 2;
      page.position.set(side * 0.79, 0.0, 0);
      book.add(page);
    }
    // a pencil resting across the right page
    const pencil = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), std("#d9a441"));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 6), std("#e8d2b0"));
    tip.position.y = 0.61;
    pencil.add(body, tip);
    pencil.rotation.set(Math.PI / 2, 0, 0.9); pencil.position.set(0.8, 0.16, 0.3);
    book.add(pencil);
    book.rotation.x = 0.42;
    book.position.y = 0.6;

    const sheets = new THREE.Group();
    const r = seeded(9);
    const palettes = [["rgba(90,110,170,A)"], ["rgba(210,130,110,A)"], ["rgba(150,170,110,A)"], ["rgba(200,170,90,A)", "rgba(90,110,170,A)"]];
    for (let k = 0; k < 7; k++) {
      const sheet = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.82),
        std("#ffffff", { map: wash(100 + k, palettes[k % palettes.length]), roughness: 1, side: THREE.DoubleSide })
      );
      sheet.userData = { a: r() * Math.PI * 2, rad: 0.7 + r() * 1.4, y: 1.4 + k * 0.42, sp: 0.4 + r() * 0.5, tilt: r() };
      sheets.add(sheet);
    }
    g.add(book, sheets);
    return {
      group: g,
      update(t, dt, s, animate) {
        const time = animate ? t : 0;
        sheets.children.forEach((sh) => {
          const u = sh.userData, a = u.a + time * 0.12 * u.sp;
          const lift = u.y + s.hover * (0.25 + u.tilt * 0.3);
          sh.position.set(Math.cos(a) * u.rad, lift + Math.sin(time * u.sp + u.a) * 0.1, Math.sin(a) * u.rad * 0.6);
          sh.rotation.set(-0.9 + Math.sin(time * 0.5 + u.a) * 0.3, a + u.tilt, Math.sin(time * 0.4 + u.tilt * 6) * 0.25);
        });
      },
    };
  },
};

const worlds = WORLDS.map((w) => {
  const place = PLACES[w.kind] || PLACES.memory;
  const art = (BUILD[w.kind] || BUILD.memory)(w.accent);
  const holder = new THREE.Group();
  holder.position.fromArray(place.pos);
  art.group.scale.setScalar(place.scale);
  // turn each world a little towards the room's centre, plus its own pose
  const turn = Math.atan2(-place.pos[0], 16 - place.pos[2]) * 0.6 + place.turn;
  art.group.rotation.y = turn;
  holder.add(art.group);
  scene.add(holder);

  const color = new THREE.Color(w.accent);
  const light = new THREE.PointLight(color, 0, 9, 1.6);
  light.position.set(0, 1.8, 1.4);
  holder.add(light);

  // its light pooled on the floor beneath it
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(place.pos[0], 0.03, place.pos[2]);
  pool.scale.setScalar(7 * place.scale);
  scene.add(pool);

  // an invisible volume to point at
  const hit = new THREE.Mesh(new THREE.SphereGeometry(2.5 * place.scale, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 1.4;
  hit.userData.index = w.i;
  holder.add(hit);

  return { ...w, art, holder, light, pool, hit, base: new THREE.Vector3().fromArray(place.pos), wide: new THREE.Vector3().fromArray(place.pos), tall: new THREE.Vector3().fromArray(place.tall), turn, mid: place.mid, scale: place.scale, s: { hover: 0 } };
});
const hitTargets = worlds.map((w) => w.hit);

// the Memory Room's spiral wears real photographs (small thumbnails, loaded after the hall is up)
async function dressMemory() {
  const memory = worlds.find((w) => w.kind === "memory");
  if (!memory) return;
  try {
    const data = await (await fetch("assets/data/photos.json")).json();
    const loader = new THREE.TextureLoader();
    memory.art.frames.forEach((frame, k) => {
      const photo = data.photos[k % data.photos.length];
      loader.load(photo.thumb, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const mesh = frame.userData.photo;
        const aspect = photo.width / photo.height;
        const w = aspect >= 1 ? 0.8 : 0.8 * aspect, h = aspect >= 1 ? 0.8 / aspect : 0.8;
        mesh.geometry.dispose();
        mesh.geometry = frame.userData.verso.geometry = new THREE.PlaneGeometry(w, h);
        frame.children[0].scale.set((w + 0.06) / 0.66, (h + 0.06) / 0.86, 1);
        mesh.material.color.set("#ffffff");
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
        requestRender();
      });
    });
  } catch (e) { /* the frames stay as blank paper */ }
}

// ================================================================== camera direction

const pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 45, inter: 0 };
let focused = -1, hovered = -1, railHover = -1;
let mode = "intro";

function aspect() { return innerWidth / innerHeight; }
function portrait() { return THREE.MathUtils.clamp((1.25 - aspect()) / 0.75, 0, 1); }

function fovFor(hfovDeg) {
  return THREE.MathUtils.clamp(2 * Math.atan(Math.tan(hfovDeg * Math.PI / 360) / aspect()) * 180 / Math.PI, 30, 80);
}

function overview() {
  const k = portrait();
  return {
    pos: new THREE.Vector3(THREE.MathUtils.lerp(0.6, 0, k), THREE.MathUtils.lerp(7.4, 13, k), THREE.MathUtils.lerp(16.5, 12, k)),
    target: new THREE.Vector3(THREE.MathUtils.lerp(0.6, 0, k), THREE.MathUtils.lerp(3.3, 2.6, k), THREE.MathUtils.lerp(-8.5, -13, k)),
    fov: fovFor(THREE.MathUtils.lerp(68, 70, k)),
  };
}

// stand in front of one world; on wide screens it sits right of centre (the
// caption takes the left), on tall screens above centre (the caption is below)
function framing(i) {
  const w = worlds[i], k = portrait();
  const at = w.base.clone().add(new THREE.Vector3(0, w.mid * w.scale, 0));
  const toward = new THREE.Vector3(-w.base.x * 0.35, 0, 18 - w.base.z).normalize();
  const dist = THREE.MathUtils.lerp(10.5, 12.5, k) * w.scale;
  // on tall screens the worlds stand one behind another: look down over the nearer ones
  const pos = at.clone().addScaledVector(toward, dist).add(new THREE.Vector3(0, THREE.MathUtils.lerp(1.6, 7, k), 0));
  const fwd = at.clone().sub(pos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const target = at.clone()
    .addScaledVector(right, -dist * 0.2 * (1 - k))
    .add(new THREE.Vector3(0, -dist * 0.2 * k, 0));
  return { pos, target, fov: fovFor(THREE.MathUtils.lerp(56, 50, k)) };
}

function flyTo(to, duration = 2.2, ease = "power3.inOut") {
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

// ================================================================== choosing a world

function focusWorld(i, duration = 2) {
  if (mode === "leaving") return;
  showFocus(i);
  flyTo(i >= 0 ? framing(i) : overview(), duration);
}

// the page's side of focusing: rail, caption, accent colour
function showFocus(i) {
  focused = i;
  const w = worlds[i];
  root.classList.toggle("has-focus", i >= 0);
  links.forEach((l, k) => {
    l.classList.toggle("is-active", k === i);
    if (k === i) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
  });
  if (w) {
    root.style.setProperty("--accent", w.accent);
    caption.theme.textContent = `${String(i + 1).padStart(2, "0")} · ${w.theme}`;
    caption.name.textContent = w.name;
    caption.note.textContent = w.note;
    caption.enter.href = w.href;
    caption.enter.querySelector(".cap-enter-label").innerHTML = `Enter<span class="cap-enter-world"> ${w.name.replace(/^The /, "the ")}</span>`;
  }
  try { sessionStorage.setItem("vg-atlas", String(i)); } catch (e) {}
}

function step(dir) {
  const n = worlds.length;
  focusWorld(focused < 0 ? (dir > 0 ? 0 : n - 1) : (focused + dir + n) % n, 1.8);
}

// enter: the camera moves into the world, and its light fills the view
function enterWorld(i) {
  const w = worlds[i];
  if (!w || mode === "leaving") return;
  if (reduceMotion || !gsap) { location.href = w.href; return; }
  mode = "leaving";
  try { sessionStorage.setItem("vg-scene", "1"); } catch (e) {}
  root.style.setProperty("--accent", w.accent);
  const into = w.base.clone().add(new THREE.Vector3(0, w.mid * w.scale, 0));
  gsap.killTweensOf([pose.pos, pose.target]);
  gsap.timeline()
    .to(pose, { inter: 0, duration: 0.4 }, 0)
    .to(pose.target, { x: into.x, y: into.y, z: into.z, duration: 0.6, ease: "power2.out" }, 0)
    .to(pose.pos, { x: into.x, y: into.y + 0.3, z: into.z + 1.6, duration: 1.3, ease: "power2.in" }, 0.1)
    .to(pose, { fov: pose.fov - 10, duration: 1.3, ease: "power2.in" }, 0.1)
    .to(w.s, { hover: 1.6, duration: 1, ease: "power1.in" }, 0)
    .call(() => root.classList.add("is-entering"), null, 0.7)
    .call(() => { location.href = w.href; }, null, 1.4);
}

// rail: keyboard focus chooses; a click chooses, and a second click enters
links.forEach((link, i) => {
  link.addEventListener("focus", () => { if (link.matches(":focus-visible") && focused !== i) focusWorld(i); });
  link.addEventListener("mouseenter", () => { railHover = i; });
  link.addEventListener("mouseleave", () => { railHover = -1; });
});
document.addEventListener("click", (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  const link = event.target.closest(".world-link, .cap-enter");
  if (!link) return;
  event.preventDefault();
  event.stopPropagation();   // before site.js's page veil
  if (mode === "leaving") return;
  if (link.classList.contains("cap-enter")) { enterWorld(focused); return; }
  const i = links.indexOf(link);
  if (focused === i) enterWorld(i); else focusWorld(i);
}, true);
caption.back.addEventListener("click", () => { focusWorld(-1); links[0].focus({ preventScroll: true }); });

addEventListener("keydown", (e) => {
  if (mode === "leaving" || e.altKey || e.metaKey || e.ctrlKey || root.classList.contains("nav-open")) return;
  const tag = (document.activeElement && document.activeElement.tagName) || "";
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (e.key === "ArrowRight") { e.preventDefault(); step(1); syncFocus(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); syncFocus(); }
  else if (e.key === "Escape" && focused >= 0) { focusWorld(-1); }
});
// arrow keys move the keyboard focus along the rail too, if it was there
function syncFocus() {
  if (links.includes(document.activeElement) && focused >= 0) links[focused].focus({ preventScroll: true });
}

// ================================================================== pointer, touch

const pointer = new THREE.Vector2(), aim = new THREE.Vector2(), ndc = new THREE.Vector2(-9, -9);
const raycaster = new THREE.Raycaster();
let down = null;

function pick() {
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(hitTargets, false)[0];
  return hit ? hit.object.userData.index : -1;
}

addEventListener("pointermove", (e) => {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (e.pointerType === "mouse") pointer.copy(ndc);
  if (e.pointerType === "mouse" && mode === "idle") {
    hovered = e.target === canvas ? pick() : -1;
    canvas.style.cursor = hovered >= 0 ? "pointer" : "";
    root.classList.toggle("world-hover", hovered >= 0 && hovered === focused);
    requestRender();
  }
}, { passive: true });

canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
addEventListener("pointerup", (e) => {
  if (!down || mode !== "idle") { down = null; return; }
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  down = null;
  // a horizontal swipe wanders to the next world
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { step(dx < 0 ? 1 : -1); return; }
  if (Math.hypot(dx, dy) > 10 || e.target !== canvas) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const i = pick();
  if (i < 0) { if (focused >= 0) focusWorld(-1); return; }
  if (i === focused) enterWorld(i); else focusWorld(i);
});

// ================================================================== frame loop

const clock = new THREE.Clock();
const look = new THREE.Vector3(), drift = new THREE.Vector3(), shaftAt = new THREE.Vector3(0, 13, -6);
let shaftStrength = 0, renderQueued = false;

// the worlds stand in a row on wide screens and recede in depth on tall ones
function layout() {
  const k = portrait();
  worlds.forEach((w) => {
    w.base.lerpVectors(w.wide, w.tall, k);
    w.holder.position.x = w.base.x; w.holder.position.z = w.base.z;
    w.pool.position.set(w.base.x, 0.03, w.base.z);
  });
}

function resize() {
  const w = innerWidth, h = innerHeight;
  layout();
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (mode === "idle") flyTo(focused >= 0 ? framing(focused) : overview(), 0);
  requestRender();
}

function draw(dt, t) {
  const animate = !reduceMotion;
  const ease = (rate) => 1 - Math.pow(rate, dt || 1);

  // the pointer steers gently; near things move more than far
  aim.lerp(pointer, ease(0.05));
  const breathe = animate ? Math.sin(t * 0.3) * 0.05 : 0;
  camera.position.copy(pose.pos).add(look.set(aim.x * 0.7, aim.y * 0.3 + breathe, 0).multiplyScalar(pose.inter));
  camera.lookAt(look.copy(pose.target).add(drift.set(aim.x * 0.9, aim.y * 0.45, 0).multiplyScalar(pose.inter)));
  if (Math.abs(camera.fov - pose.fov) > 0.01) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }

  const lit = hovered >= 0 ? hovered : railHover >= 0 ? railHover : focused;
  worlds.forEach((w, k) => {
    const want = k === lit || k === focused ? 1 : 0;
    if (mode !== "leaving") w.s.hover += (want - w.s.hover) * (reduceMotion ? 1 : ease(0.03));
    const h = Math.min(w.s.hover, 1);
    w.holder.position.y = w.base.y + (animate ? Math.sin(t * 0.5 + k * 1.7) * 0.12 : 0) + h * 0.18;
    w.art.group.rotation.y = w.turn + (animate ? Math.sin(t * 0.12 + k * 2) * 0.1 : 0);
    w.light.intensity = 3 + 14 * w.s.hover;
    w.pool.material.opacity = 0.12 + 0.3 * h;
    w.art.update(t, dt, { hover: h }, animate);
  });

  // the shaft of light follows the eye
  const target = worlds[lit];
  if (target) shaftAt.set(target.base.x, 13, target.base.z);
  shaft.position.lerp(shaftAt, reduceMotion ? 1 : ease(0.04));
  shaftStrength += ((target ? 1 : 0) - shaftStrength) * (reduceMotion ? 1 : ease(0.05));
  shaft.material.uniforms.strength.value = shaftStrength;

  if (animate) {
    const p = motes.geometry.attributes.position, seed = motes.userData.seed;
    for (let k = 0; k < p.count; k++) {
      let y = p.getY(k) + dt * (0.05 + seed[k] * 0.12);
      if (y > 14) y = 0;
      p.setY(k, y);
      p.setX(k, p.getX(k) + Math.sin(t * 0.3 + seed[k] * 20) * dt * 0.05);
    }
    p.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

function requestRender() {
  if (!reduceMotion || renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; draw(0, clock.elapsedTime); });
}

function loop() {
  if (!document.hidden) {
    const dt = Math.min(clock.getDelta(), 0.05);
    draw(dt, clock.elapsedTime);
  } else clock.getDelta();
  requestAnimationFrame(loop);
}

// ================================================================== arrival

function ready() {
  root.classList.add("atlas-ready");
  root.classList.remove("atlas-pending");
  mode = "idle";
  pose.inter = reduceMotion ? 0 : 1;
}

function begin() {
  const fromDoor = root.classList.contains("from-door");
  let saved = -1;
  try { saved = parseInt(sessionStorage.getItem("vg-atlas") ?? "-1", 10); } catch (e) {}
  if (!(saved >= 0 && saved < worlds.length) || fromDoor) saved = -1;
  const rest = saved >= 0 ? framing(saved) : overview();

  if (reduceMotion || !gsap) {
    pose.pos.copy(rest.pos); pose.target.copy(rest.target); pose.fov = rest.fov;
    ready();
    if (saved >= 0) showFocus(saved);
    requestRender();
    return;
  }

  if (fromDoor) {
    // through the doorway: low and close, gazing at the far door, then the hall opens
    pose.pos.set(0, 1.4, 6); pose.target.set(0, 7, -52); pose.fov = rest.fov + 10;
    requestAnimationFrame(() => root.classList.remove("from-door"));
  } else {
    pose.pos.copy(rest.pos).add(new THREE.Vector3(0, 2.5, 7)); pose.target.copy(rest.target); pose.fov = rest.fov + 4;
  }
  const d = fromDoor ? 4.6 : 2.4;
  gsap.timeline()
    .to(pose.pos, { x: rest.pos.x, y: rest.pos.y, z: rest.pos.z, duration: d, ease: "power3.inOut" }, 0)
    .to(pose.target, { x: rest.target.x, y: rest.target.y, z: rest.target.z, duration: d, ease: "power3.inOut" }, 0)
    .to(pose, { fov: rest.fov, duration: d, ease: "power3.inOut" }, 0)
    .call(() => {
      root.classList.add("atlas-ready");
      if (saved >= 0) showFocus(saved);
    }, null, 0.05)
    .call(() => root.classList.remove("atlas-pending"), null, d * 0.55)
    .call(() => { mode = "idle"; }, null, d * 0.75)
    .to(pose, { inter: 1, duration: 1.4, ease: "power1.out" }, d * 0.7);
}

addEventListener("resize", resize);
resize();
begin();
dressMemory();
if (reduceMotion) requestRender(); else requestAnimationFrame(loop);

// back/forward cache: come back to the hall at rest, not mid-flight
addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  root.classList.remove("is-entering", "is-leaving");
  mode = "idle";
  pose.inter = reduceMotion ? 0 : 1;
  worlds.forEach((w) => { w.s.hover = 0; });
  focusWorld(focused, 0);
});

// a small hook for automated checks
window.__atlas = { get mode() { return mode; }, get focused() { return focused; }, focusWorld, worlds, camera, scene, pose };
