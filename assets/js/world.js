/* ============================================================
   THE WORLD — the lake at dusk, shared by every page
   Environment modelled in Blender (blender/build_threshold.py),
   rendered with three.js. Pages direct the camera; this module
   builds the place and keeps it alive.
============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Reflector } from "three/addons/objects/Reflector.js";

export { THREE };

// Blender (x, y, z) arrives in three.js as (x, z, -y)
export const GATE = new THREE.Vector3(3.4, 2.2, -24.0);
export const STONES = [[0.29, 2.6], [-0.04, 5.07], [-0.14, 8.3], [-0.12, 10.96], [0.72, 14.0], [1.49, 17.23], [2.48, 19.7]]
  .map(([x, y]) => new THREE.Vector3(x, 1.55, -y));
export const MOON_WIDE = new THREE.Vector3(0.105, 0.3, -0.95).normalize();   // above the door
export const MOON_TALL = new THREE.Vector3(0.27, 0.33, -0.9).normalize();     // clear of a stacked title

const COLORS = {
  fog: new THREE.Color("#5e4b6e"),
  water: new THREE.Color("#0f0b16"),
  warm: new THREE.Color("#ffc887"),
};

export function createWorld({ canvas, quality = 1, onLoad, onProgress, onFail }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    onFail && onFail(e);
    return null;
  }
  const mobile = matchMedia("(max-width: 700px)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, (mobile ? 1.5 : 1.75) * quality));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.0125);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 900);

  // ---------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight("#a593c9", "#1d1528", 1.0));
  const moonLight = new THREE.DirectionalLight("#cdd5ff", 0.55);
  moonLight.position.set(30, 40, -60);
  scene.add(moonLight);
  const gateLight = new THREE.PointLight(COLORS.warm, 0, 26, 1.6);
  gateLight.position.copy(GATE).add(new THREE.Vector3(0, 0, 1.2));
  scene.add(gateLight);

  // ---------------------------------------------------------------- sky
  const moonDir = MOON_WIDE.clone();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { moonDir: { value: moonDir }, time: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 moonDir;
        uniform float time;
        varying vec3 vDir;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 zenith  = vec3(0.010, 0.008, 0.026);
          vec3 high    = vec3(0.030, 0.022, 0.065);
          vec3 mid     = vec3(0.10, 0.068, 0.15);
          vec3 horizon = vec3(0.34, 0.20, 0.24);
          vec3 c = mix(horizon, mid, smoothstep(-0.02, 0.10, h));
          c = mix(c, high, smoothstep(0.08, 0.32, h));
          c = mix(c, zenith, smoothstep(0.3, 0.85, h));
          // warm afterglow low on the horizon, gathered behind the doorway
          c += vec3(0.22, 0.10, 0.05) * pow(max(0.0, 1.0 - abs(h) * 7.0), 2.0) * smoothstep(-0.6, 0.4, d.x * 0.6 - d.z * 0.4);
          // moon: a soft disc and a wide halo
          float m = max(dot(d, moonDir), 0.0);
          c += vec3(1.0, 0.9, 0.72) * smoothstep(0.99988, 0.99993, m) * 1.2;
          c += vec3(0.7, 0.58, 0.72) * (pow(m, 2500.0) * 0.22 + pow(m, 60.0) * 0.035);
          // sparse stars, only high up
          vec3 g = d * 220.0;
          float s = hash(floor(g));
          float r = length(fract(g) - 0.5);
          float tw = 0.65 + 0.35 * sin(time * (0.6 + s * 2.0) + s * 40.0);
          c += vec3(0.9, 0.88, 1.0) * step(0.9975, s) * smoothstep(0.22, 0.0, r) * smoothstep(0.12, 0.45, h) * tw;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // ---------------------------------------------------------------- water
  const waterShader = {
    uniforms: {
      color: { value: COLORS.water },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      time: { value: 0 },
      fogColor: { value: COLORS.fog },
      fogDensity: { value: scene.fog.density },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform sampler2D tDiffuse;
      uniform float time;
      uniform vec3 fogColor;
      uniform float fogDensity;
      varying vec4 vUv;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz;
        float n = sin(p.x * 1.1 + time * 0.55) * 0.5
                + sin(p.y * 1.9 - time * 0.8 + p.x * 0.35) * 0.35
                + sin((p.x + p.y) * 4.1 + time * 1.4) * 0.15;
        float dist = length(vWorld - cameraPosition);
        vec4 uv = vUv;
        uv.xy += vec2(n * 0.004, n * 0.012) * uv.w * smoothstep(120.0, 4.0, dist);
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
        vec3 c = mix(color, refl * 0.6, 0.38 + 0.5 * fres);
        // fine glints where the surface catches the sky
        c += vec3(0.6, 0.5, 0.7) * pow(max(n, 0.0), 6.0) * 0.05 * smoothstep(60.0, 5.0, dist);
        float f = 1.0 - exp(-fogDensity * fogDensity * dist * dist);
        gl_FragColor = vec4(mix(c, fogColor * 0.8, f * 0.75), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  const reflScale = (mobile ? 0.4 : 0.55) * quality;
  const water = new Reflector(new THREE.PlaneGeometry(320, 320), {
    shader: waterShader,
    clipBias: 0.002,
    textureWidth: innerWidth * renderer.getPixelRatio() * reflScale,
    textureHeight: innerHeight * renderer.getPixelRatio() * reflScale,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, -60);
  scene.add(water);

  // ---------------------------------------------------------------- glow, mist, motes
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, "rgba(255,214,160,0.9)"], [0.25, "rgba(255,190,140,0.35)"], [1, "rgba(255,170,140,0)"]]),
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0,
  }));
  glow.position.copy(GATE).add(new THREE.Vector3(0, 0, 0.4));
  glow.scale.set(12, 12, 1);
  scene.add(glow);

  const mists = [-6, -15, -27, -42, -62].map((z, i) => {
    const tex = mistTexture(i + 1);
    tex.repeat.set(2, 1);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 5 + i * 1.6),
      new THREE.MeshBasicMaterial({ map: tex, color: "#b6a2c8", transparent: true, opacity: 0.16 + i * 0.03, depthWrite: false })
    );
    m.position.set(0, 0.9 + i * 0.45, z);
    m.userData.speed = (i % 2 ? 1 : -1) * (0.0025 + i * 0.0008);
    scene.add(m);
    return m;
  });

  const MOTES = 36;
  const motePos = new Float32Array(MOTES * 3);
  const moteSeed = [];
  for (let i = 0; i < MOTES; i++) {
    motePos.set([GATE.x + (Math.random() - 0.5) * 7, Math.random() * 4.2, GATE.z + 2 + (Math.random() - 0.5) * 8], i * 3);
    moteSeed.push(Math.random() * 10);
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    size: 0.07, map: radialTexture([[0, "rgba(255,230,190,1)"], [1, "rgba(255,230,190,0)"]]),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#ffe2b0", opacity: 0,
  }));
  scene.add(motes);

  // ---------------------------------------------------------------- the doorway's light
  // Pure warm light by default; on Work it can hold a picture (two, crossfading).
  const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  blank.needsUpdate = true;
  const lightMaterial = new THREE.ShaderMaterial({
    uniforms: {
      intensity: { value: 0 }, time: { value: 0 },
      mapA: { value: blank }, mapB: { value: blank }, mixAB: { value: 0 }, picture: { value: 0 },
    },
    toneMapped: false,
    fog: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float intensity; uniform float time; uniform float mixAB; uniform float picture;
      uniform sampler2D mapA; uniform sampler2D mapB;
      varying vec2 vUv;
      void main() {
        float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x) * smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float core = 1.0 - abs(vUv.x - 0.5) * 1.6;
        vec3 warm = vec3(1.0, 0.70, 0.42), white = vec3(1.0, 0.95, 0.86);
        vec3 c = mix(warm, white, clamp(core * core * (1.15 - vUv.y * 0.5), 0.0, 1.0));
        float breathe = 0.96 + 0.04 * sin(time * 1.3) * sin(time * 0.7 + 1.0);
        vec3 base = vec3(0.16, 0.10, 0.18);
        vec3 lit = mix(base, c * 1.25 * breathe, intensity * (0.35 + 0.65 * edge));

        // a picture inside the doorway, held in a thin rim of warm light
        vec2 inner = (vUv - vec2(0.045, 0.02)) / vec2(0.91, 0.96);
        float inside = step(0.0, inner.x) * step(inner.x, 1.0) * step(0.0, inner.y) * step(inner.y, 1.0);
        vec3 img = mix(texture2D(mapA, inner).rgb, texture2D(mapB, inner).rgb, mixAB);
        img = img * vec3(1.0, 0.97, 0.92) * (0.92 + 0.08 * breathe);
        float rim = 1.0 - smoothstep(0.0, 0.035, min(min(inner.x, 1.0 - inner.x), min(inner.y, 1.0 - inner.y)));
        vec3 pic = mix(img, white * 1.2, rim * 0.6) * min(intensity, 1.0);
        gl_FragColor = vec4(mix(lit, pic, picture * inside), 1.0);
        #include <colorspace_fragment>
      }`,
  });

  const textureLoader = new THREE.TextureLoader();
  function loadPicture(url) {
    return new Promise((resolve) => {
      textureLoader.load(url, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        t.generateMipmaps = true;
        resolve(t);
      }, undefined, () => resolve(null));
    });
  }

  // ---------------------------------------------------------------- the Blender environment
  const doorHit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5.2, 1.6), new THREE.MeshBasicMaterial());
  doorHit.position.copy(GATE).add(new THREE.Vector3(0, 0.3, 0));
  doorHit.visible = false;
  scene.add(doorHit);
  const hoverTargets = [doorHit];

  const world = {
    renderer, scene, camera, water, sky, glow, gateLight, lightMaterial, motes, moteGeo, mists,
    moonDir, hoverTargets, reflScale, loaded: false, loadPicture,
  };

  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load("assets/3d/threshold.glb", (gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      switch (o.name) {
        case "Water":
          o.visible = false; // replaced by the reflector
          break;
        case "GateLight":
          o.material = lightMaterial;
          planeUVs(o.geometry);
          hoverTargets.push(o);
          break;
        case "Ridges":
          o.material = new THREE.MeshBasicMaterial({ color: "#3e3150" });
          break;
        case "Gate":
        case "Platform":
          o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
          hoverTargets.push(o);
          break;
        default:
          o.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: o.name === "Reeds" ? THREE.DoubleSide : THREE.FrontSide });
      }
    });
    scene.add(gltf.scene);
    world.loaded = true;
    onLoad && onLoad(world);
  }, (e) => { onProgress && e.total && onProgress(e.loaded / e.total); }, (e) => { onFail && onFail(e); });

  world.resize = function () {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    water.getRenderTarget().setSize(w * renderer.getPixelRatio() * reflScale, h * renderer.getPixelRatio() * reflScale);
  };

  // light: 0..1.4 brightness of the doorway; fog: density; animate: drift mist and motes
  world.update = function (dt, t, { light, fog, hover = 0, animate = true, glowScale = 1 }) {
    lightMaterial.uniforms.intensity.value = Math.min(light, 1.4);
    lightMaterial.uniforms.time.value = t;
    gateLight.intensity = light * 28;
    glow.material.opacity = light * 0.55 * glowScale;
    glow.scale.setScalar(11 + hover * 3);

    scene.fog.density = fog;
    water.material.uniforms.fogDensity.value = fog;
    water.material.uniforms.time.value = t;
    sky.material.uniforms.time.value = t;
    sky.position.copy(camera.position);

    if (animate) {
      mists.forEach((m) => { m.material.map.offset.x += m.userData.speed * dt * 4; });
      const p = moteGeo.attributes.position;
      for (let i = 0; i < MOTES; i++) {
        let y = p.getY(i) + dt * 0.12;
        if (y > 4.6) y = 0.1;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.4 + moteSeed[i]) * dt * 0.05);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };

  return world;
}

// the doorway is a flat quad standing upright: map u across its width, v up its height
function planeUVs(geometry) {
  const pos = geometry.attributes.position;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - min.x) / (max.x - min.x || 1);
    uv[i * 2 + 1] = (pos.getY(i) - min.y) / (max.y - min.y || 1);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// ------------------------------------------------------------------ soft textures
function radialTexture(stops) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mistTexture(seed) {
  const w = 512, h = 64;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const r = (i) => { const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
  const val = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return r(i) * (1 - u) + r(i + 1) * u; };
  for (let x = 0; x < w; x++) {
    // tileable horizontally: blend the two ends
    const nx = (x / w) * 10;
    const n = val(nx) * 0.6 + val(nx * 2.3 + 7) * 0.3 + val(nx * 5.1 + 3) * 0.1;
    const n2 = val(nx + 10) * 0.6 + val((nx + 10) * 2.3 + 7) * 0.3 + val((nx + 10) * 5.1 + 3) * 0.1;
    const k = x / w;
    const band = n * (1 - k) + n2 * k;
    for (let y = 0; y < h; y++) {
      const v = 1 - Math.abs(y / h - 0.5) * 2;
      const a = Math.pow(v, 1.6) * (0.35 + 0.65 * band);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
