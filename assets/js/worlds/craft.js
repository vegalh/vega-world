/* ============================================================
   CRAFT — the small tools every world is built with
   Seeded randomness, textures drawn on canvas, glows, lines
   and the standard material. Shared by the Atlas and the
   worlds so they're made of the same stuff.
============================================================ */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// a fixed seed, so the hall is the same hall every visit
export function seeded(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ================================================================== textures drawn on canvas

export function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export const glowTex = canvasTexture(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,.45)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, w, w);
}, false);

// watercolour washes on paper: abstract pigment, not artwork
export function wash(seed, tints) {
  const r = seeded(seed);
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#f4ede1"; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "multiply";
    for (let k = 0; k < 4; k++) {
      const tint = tints[k % tints.length];
      const cx = w * (0.2 + r() * 0.6), cy = h * (0.2 + r() * 0.6), rad = w * (0.14 + r() * 0.2);
      for (let s = 0; s < 46; s++) {
        const a = r() * Math.PI * 2, d = rad * Math.sqrt(r());
        const rr = rad * (0.25 + r() * 0.45);
        const grad = g.createRadialGradient(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0, cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr);
        grad.addColorStop(0, tint.replace("A", (0.05 + r() * 0.06).toFixed(3)));
        grad.addColorStop(0.85, tint.replace("A", "0.02"));
        grad.addColorStop(1, tint.replace("A", "0"));
        g.fillStyle = grad;
        g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, Math.PI * 2); g.fill();
      }
    }
    // a few pencil lines
    g.strokeStyle = "rgba(60,52,70,.22)"; g.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      let x = w * r(), y = h * r();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (r() - 0.5) * 160; y += (r() - 0.5) * 160; g.quadraticCurveTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 80, x, y); }
      g.stroke();
    }
    // paper tooth
    g.globalCompositeOperation = "source-over";
    const img = g.getImageData(0, 0, w, h);
    for (let p = 0; p < img.data.length; p += 4) { const n = (r() - 0.5) * 10; img.data[p] += n; img.data[p + 1] += n; img.data[p + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}

// a screen, a sketch, an interface fragment: thin amber lines
export function interfaceTex(seed, { dark = true, frame = true } = {}) {
  const r = seeded(seed);
  return canvasTexture(384, 256, (g, w, h) => {
    if (dark) { g.fillStyle = "#1d1620"; g.fillRect(0, 0, w, h); }
    g.strokeStyle = "rgba(255,214,168,.85)"; g.fillStyle = "rgba(255,214,168,.85)"; g.lineWidth = 2;
    if (frame) { g.strokeRect(6, 6, w - 12, h - 12); g.beginPath(); g.moveTo(6, 30); g.lineTo(w - 6, 30); g.stroke(); }
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(20 + k * 14, 18, 3.5, 0, Math.PI * 2); g.fill(); }
    let y = 52;
    while (y < h - 30) {
      const kind = r();
      g.globalAlpha = 0.45 + r() * 0.5;
      if (kind < 0.55) { g.fillRect(24, y, (w - 60) * (0.3 + r() * 0.7), 5); y += 18; }
      else if (kind < 0.8) { g.strokeRect(24, y, 70 + r() * 90, 46); g.strokeRect(120 + r() * 60, y, 90 + r() * 80, 46); y += 62; }
      else { g.beginPath(); g.arc(60, y + 26, 24, 0, Math.PI * 2); g.stroke(); g.fillRect(100, y + 18, 160 + r() * 60, 5); y += 64; }
    }
    g.globalAlpha = 1;
  });
}

export const blueprintTex = canvasTexture(384, 512, (g, w, h) => {
  g.fillStyle = "#efe7da"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(70,62,90,.5)"; g.lineWidth = 1.4;
  g.strokeRect(40, 60, w - 80, 190);
  g.beginPath(); g.arc(w / 2, 155, 62, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(40, 300); g.lineTo(w - 40, 300); g.moveTo(40, 340); g.lineTo(w - 120, 340); g.moveTo(40, 380); g.lineTo(w - 160, 380); g.stroke();
  g.setLineDash([5, 6]); g.strokeRect(60, 410, 120, 70); g.strokeRect(200, 410, 120, 70);
});

// ================================================================== shared pieces

export function glow(color, size, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

export function lines(points, color, opacity) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
}

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });

// ================================================================== surfaces with a little life in them
// Small canvas textures, drawn once: wood that has grain, stone with speckle,
// paper with tooth, metal with brushing. Each tiles, so one texture covers a lot.

function tiling(tex, repeat = 1) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

export function woodTexture(seed, { base = "#8a6446", dark = "#5a3d29", planks = 0 } = {}) {
  const r = seeded(seed);
  return tiling(canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // long grain lines that wander
    for (let k = 0; k < 140; k++) {
      const y0 = r() * h, amp = 2 + r() * 6, freq = 0.004 + r() * 0.01, ph = r() * 6;
      g.strokeStyle = dark; g.globalAlpha = 0.05 + r() * 0.12; g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * freq + ph) * amp; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    // a knot or two
    for (let k = 0; k < 2; k++) {
      const cx = r() * w, cy = r() * h;
      for (let ring = 1; ring < 6; ring++) { g.globalAlpha = 0.08; g.beginPath(); g.ellipse(cx, cy, ring * 5, ring * 2.4, 0, 0, 7); g.stroke(); }
    }
    g.globalAlpha = 1;
    if (planks) {
      for (let k = 0; k < planks; k++) {
        const y = k * h / planks;
        g.fillStyle = `rgba(255,240,220,${(r() - 0.5) * 0.12 + 0.04})`; g.fillRect(0, y, w, h / planks);
        g.fillStyle = "rgba(25,14,8,.55)"; g.fillRect(0, y, w, 2);
        g.fillRect(r() * w, y, 2, h / planks);
      }
    }
  }));
}

export function stoneTexture(seed, { base = "#8c8578", speck = 0.18, clouds = 1 } = {}) {
  const r = seeded(seed);
  return tiling(canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 60; k++) {
      const grad = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 40 + r() * 120);
      const v = r() > 0.5 ? 255 : 0;
      grad.addColorStop(0, `rgba(${v},${v},${v},${(0.03 + r() * 0.04) * clouds})`); grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    }
    for (let k = 0; k < 2600; k++) {
      const v = r() > 0.5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},${r() * speck})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
    }
  }));
}

export function paperTexture(seed, { base = "#f4ede1" } = {}) {
  const r = seeded(seed);
  return tiling(canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let p = 0; p < img.data.length; p += 4) { const n = (r() - 0.5) * 9; img.data[p] += n; img.data[p + 1] += n; img.data[p + 2] += n; }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(120,100,80,.05)";
    for (let k = 0; k < 90; k++) { g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20); g.stroke(); }
  }));
}

// greyscale variation for roughnessMap: surfaces that are matte here and polished there
export function roughnessTexture(seed, { lo = 0.45, hi = 0.85, streak = false } = {}) {
  const r = seeded(seed);
  return tiling(canvasTexture(256, 256, (g, w, h) => {
    const mid = Math.round((lo + hi) / 2 * 255);
    g.fillStyle = `rgb(${mid},${mid},${mid})`; g.fillRect(0, 0, w, h);
    for (let k = 0; k < (streak ? 400 : 120); k++) {
      const v = Math.round((lo + r() * (hi - lo)) * 255);
      g.fillStyle = `rgba(${v},${v},${v},${streak ? 0.35 : 0.25})`;
      if (streak) g.fillRect(0, r() * h, w, 1 + r() * 2);
      else { g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 30, 0, 7); g.fill(); }
    }
  }, false));
}

// a soft dark patch under an object, so it sits on the floor instead of hovering
const shadowTex = canvasTexture(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, "rgba(0,0,0,.75)"); r.addColorStop(0.5, "rgba(0,0,0,.35)"); r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, w, w);
}, false);
export function contactShadow(width, depth, opacity = 0.5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: shadowTex, color: "#000", transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 1;
  return m;
}

// boxes with softened edges: furniture and blocks look made rather than cut
export function rbox(w, h, d, material, radius = Math.min(w, h, d) * 0.12) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, Math.min(w, h, d) / 2 - 1e-4)), material);
}
