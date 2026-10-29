/* ============================================================
   WORLDS — what every little world shares
   Loading data, the detail viewer and its place in history,
   the rail of things to open, the hover label, and the small
   blocks that content is built from. A world supplies its own
   data and how each item reads; the behaviour lives here.
   Plain DOM: this works with or without WebGL.
============================================================ */

const root = document.documentElement;
export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const pad = (n) => String(n).padStart(2, "0");

// ------------------------------------------------------------------ a tiny element builder

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

// ------------------------------------------------------------------ data

// a missing or broken file is treated as an empty collection, never a broken page
export async function loadJSON(url, fallback = null) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return await r.json();
  } catch (e) {
    console.warn("Couldn't load", url, e.message);
    return fallback;
  }
}

export const list = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);

// photographs can be named by id from photos.json, or given directly
export function mediaFrom(entry, photosById = new Map()) {
  const out = [];
  list(entry.photos).forEach((id) => {
    const p = photosById.get(id);
    if (p) out.push({ src: p.src, thumb: p.thumb, alt: p.alt, width: p.width, height: p.height });
    else out.push({ src: null, missing: `photo "${id}" in photos.json` });
  });
  list(entry.images).forEach((m) => out.push(typeof m === "string" ? { src: m } : m));
  // a video is a file ("type": "video") or a YouTube/Vimeo player ("type": "embed")
  list(entry.videos).forEach((m) => {
    const v = typeof m === "string" ? { src: m } : m;
    out.push({ ...v, type: v.type || (/youtube\.com|youtu\.be|vimeo\.com/.test(v.url || v.src || "") ? "embed" : "video") });
  });
  return out;
}

// ------------------------------------------------------------------ the world remembers you

// the Atlas reads this to face the world you came back from
export function rememberWorld() {
  try { sessionStorage.setItem("vg-atlas", document.body.dataset.worldIndex || "-1"); } catch (e) {}
}

// leaving for another page: the world's light closes over it (site.js does the rest)
export function arrive() {
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("from-world")));
}

export function setLoading(on) {
  root.classList.toggle("world-loading", on);
}

// ------------------------------------------------------------------ content blocks

export function placeholderNote(text) {
  return h("p", { class: "placeholder-note" }, h("span", { class: "placeholder-tag", text: "Placeholder" }), " ", text);
}

export function prose(value, placeholder) {
  const paras = list(value).filter(Boolean);
  if (!paras.length) return placeholder ? placeholderNote(placeholder) : null;
  return h("div", { class: "prose" }, paras.map((p) => h("p", { text: p })));
}

export function metaLine(parts) {
  const text = parts.filter(Boolean).join(" · ");
  return text ? h("p", { class: "meta-line", text }) : null;
}

export function facts(pairs) {
  const rows = pairs.filter(([, v]) => v != null && v !== "");
  if (!rows.length) return null;
  return h("dl", { class: "facts" }, rows.map(([k, v]) => h("div", null, h("dt", { text: k }), h("dd", { text: v }))));
}

export function section(title, ...content) {
  const kids = content.flat().filter(Boolean);
  if (!kids.length) return null;
  return h("section", { class: "detail-section" }, h("h3", { text: title }), kids);
}

const EXT = '<svg class="ext" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9 9 3M4 3h5v5"/></svg>';

export function linkRow(links) {
  const items = list(links).filter((l) => l && l.url);
  if (!items.length) return null;
  return h("p", { class: "link-row" }, items.map((l, k) => {
    const external = /^https?:/.test(l.url);
    const a = h("a", { class: `pill${k === 0 ? " pill-primary" : ""}`, href: l.url }, l.label || l.url);
    if (external) { a.target = "_blank"; a.rel = "noopener"; a.insertAdjacentHTML("beforeend", EXT); }
    return a;
  }));
}

export function titleBlock({ kicker, title, badge }) {
  return h("header", { class: "detail-head" },
    kicker ? h("p", { class: "eyebrow detail-kicker", text: kicker }) : null,
    h("h2", { class: "detail-title", text: title || "Untitled" }),
    badge ? h("p", { class: "detail-badge", text: badge }) : null);
}

export function emptyState({ title, text }) {
  return h("div", { class: "empty-state" }, h("p", { class: "eyebrow", text: title }), text ? h("p", { class: "empty-text", text }) : null);
}

// a missing image says so in words, plainly, instead of breaking the layout
function missingFigure(what) {
  return h("div", { class: "media-missing" }, h("span", { class: "placeholder-tag", text: "Missing image" }), h("span", { text: what }));
}

function mediaEl(m, { eager = false } = {}) {
  if (!m || (!m.src && !m.url)) return missingFigure(m && m.missing ? m.missing : "No file given");
  if (m.type === "video" || /\.(mp4|webm|mov)$/i.test(m.src || "")) {
    return h("video", { class: "media-video", src: m.src, controls: true, preload: "metadata", playsinline: true, poster: m.poster, "aria-label": m.alt || m.title });
  }
  if (m.type === "embed" || /youtube\.com|youtu\.be|vimeo\.com/.test(m.url || m.src || "")) {
    return h("iframe", { class: "media-embed", src: m.url || m.src, title: m.title || m.alt || "Video", loading: "lazy", allow: "fullscreen; picture-in-picture", allowfullscreen: true });
  }
  const img = h("img", { src: m.src, alt: m.alt || "", width: m.width, height: m.height, loading: eager ? "eager" : "lazy", decoding: "async" });
  img.addEventListener("error", () => img.replaceWith(missingFigure(m.src)), { once: true });
  return img;
}

// one large piece and a strip of the rest; captions under the large one
export function gallery(media, { emptyLabel } = {}) {
  const items = list(media);
  if (!items.length) return emptyLabel ? h("div", { class: "gallery is-empty" }, missingFigure(emptyLabel)) : null;
  const stage = h("figure", { class: "gallery-stage" });
  const cap = h("figcaption", { class: "gallery-caption" });
  const show = (k) => {
    const m = items[k];
    stage.replaceChildren(mediaEl(m, { eager: true }), cap);
    cap.textContent = m.caption || "";
    cap.hidden = !m.caption;
    stage.style.setProperty("--ratio", m.width && m.height ? `${m.width} / ${m.height}` : "auto");
    strip && strip.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-current", String(i === k)));
  };
  let strip = null;
  if (items.length > 1) {
    strip = h("div", { class: "gallery-strip", role: "group", "aria-label": "More images" },
      items.map((m, k) => h("button", { type: "button", class: "gallery-thumb", "aria-label": `Show image ${k + 1} of ${items.length}`, onclick: () => show(k) },
        m.type === "video" || m.type === "embed" ? h("span", { class: "gallery-play", text: "▶" }) : mediaEl({ ...m, src: m.thumb || m.src }))));
  }
  const el = h("div", { class: "gallery" }, stage, strip);
  show(0);
  return el;
}

// ------------------------------------------------------------------ the hover label

const label = h("div", { class: "world-label", "aria-hidden": "true" }, h("span", { class: "world-label-title" }), h("span", { class: "world-label-sub" }));
document.body.appendChild(label);

export function showLabel(item, x, y) {
  if (!item) { label.classList.remove("is-on"); return; }
  label.children[0].textContent = item.title;
  label.children[1].textContent = item.sub || "";
  label.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  label.classList.add("is-on");
}

// ------------------------------------------------------------------ the rail: every openable thing, as a list

// the same entry points as the objects in the scene, for keyboards, screen
// readers, touch, and browsers without WebGL
export function createRail(el, items, { onHover, onOpen } = {}) {
  el.replaceChildren();
  if (!items.length) return [];
  const ol = h("ol");
  const links = items.map((it, k) => {
    const a = h("a", { class: "rail-link", href: `#${it.path}`, style: it.accent ? { "--accent-of": it.accent } : null },
      h("span", { class: "rail-num", text: it.num || pad(k + 1) }),
      h("span", { class: "rail-title", text: it.title }),
      it.sub ? h("span", { class: "rail-sub", text: it.sub }) : null);
    a.addEventListener("mouseenter", () => onHover && onHover(it.id));
    a.addEventListener("mouseleave", () => onHover && onHover(null));
    a.addEventListener("focus", () => onHover && onHover(it.id));
    a.addEventListener("blur", () => onHover && onHover(null));
    a.addEventListener("click", (e) => { if (onOpen) { e.preventDefault(); onOpen(it.path); } });
    ol.appendChild(h("li", null, a));
    return a;
  });
  el.appendChild(ol);
  return links;
}

// ------------------------------------------------------------------ the detail viewer

/*
  createDetail({ resolve, onChange })
  resolve(path) → null, or a view:
    { context, siblings: [path…], layout: "reading" | "media", render() → Node | Node[] }
  Each open view is a history entry (#path), so back and forward work,
  and closing returns to the world exactly as it was left.
*/
export function createDetail({ resolve, onChange, closeLabel = "Return to the world" }) {
  const count = h("span", { class: "detail-count" });
  const prev = h("button", { type: "button", class: "detail-btn", "aria-label": "Previous" });
  const next = h("button", { type: "button", class: "detail-btn", "aria-label": "Next" });
  const close = h("button", { type: "button", class: "detail-btn detail-close", "aria-label": closeLabel });
  prev.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M16 9H3M8 4 3 9l5 5"/></svg>';
  next.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2 9h13M10 4l5 5-5 5"/></svg>';
  close.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4 4 14"/></svg>';
  const context = h("p", { class: "eyebrow detail-context" });
  const body = h("div", { class: "detail-body" });
  const scroll = h("div", { class: "detail-scroll", tabindex: "-1" }, body);
  const sheet = h("article", { class: "detail-sheet" },
    h("div", { class: "detail-bar" }, context, h("div", { class: "detail-nav" }, count, prev, next, close)),
    scroll);
  const scrim = h("div", { class: "detail-scrim" });
  const el = h("div", { class: "detail", role: "dialog", "aria-modal": "true", hidden: true }, scrim, sheet);
  document.body.appendChild(el);

  let current = null, view = null, opener = null;

  function show(path) {
    const v = resolve(path);
    if (!v) { hide(); return false; }
    const opening = el.hidden;
    if (opening) opener = document.activeElement;
    current = path; view = v;
    context.textContent = v.context || "";
    el.dataset.layout = v.layout || "reading";
    body.replaceChildren(...list(v.render()).filter(Boolean));
    const heading = body.querySelector("h2");
    if (heading) { heading.id = "detail-title"; el.setAttribute("aria-labelledby", "detail-title"); }
    const sibs = v.siblings || [];
    const i = sibs.indexOf(path);
    const many = sibs.length > 1 && i >= 0;
    prev.hidden = next.hidden = count.hidden = !many;
    if (many) count.textContent = `${pad(i + 1)} / ${pad(sibs.length)}`;
    scroll.scrollTop = 0;
    el.hidden = false;
    root.classList.add("detail-open");
    if (opening) {
      el.classList.add("is-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-entering")));
      close.focus({ preventScroll: true });
    } else scroll.focus({ preventScroll: true });
    onChange && onChange(path, v);
    return true;
  }

  function hide() {
    if (el.hidden) return;
    current = null; view = null;
    el.hidden = true;
    root.classList.remove("detail-open");
    onChange && onChange(null, null);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  const depth = () => (history.state && history.state.vgDepth) || 0;

  function open(path) {
    if (path === current) return;
    if (!resolve(path)) return;
    history.pushState({ vgDepth: depth() + 1 }, "", `#${path}`);
    show(path);
  }

  function step(dir) {
    const sibs = (view && view.siblings) || [];
    const i = sibs.indexOf(current);
    if (sibs.length < 2 || i < 0) return;
    const path = sibs[(i + dir + sibs.length) % sibs.length];
    history.replaceState(history.state, "", `#${path}`);
    show(path);
  }

  function closeAll() {
    const d = depth();
    if (d > 0) history.go(-d);   // back to the world as it was; popstate hides the viewer
    else { history.replaceState(history.state, "", location.pathname + location.search); hide(); }
  }

  addEventListener("popstate", () => {
    const path = decodeURIComponent(location.hash.slice(1));
    if (!path || !show(path)) hide();
  });

  // any link to "#something" that this world can show opens in the viewer
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const path = decodeURIComponent(a.getAttribute("href").slice(1));
    if (!path || !resolve(path)) return;
    e.preventDefault();
    open(path);
  });

  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  close.addEventListener("click", closeAll);
  scrim.addEventListener("click", closeAll);

  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); closeAll(); }
    else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !/INPUT|TEXTAREA|VIDEO/.test(e.target.tagName)) {
      e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1);
    } else if (e.key === "Tab") {
      // keep the keyboard inside the viewer
      const f = Array.from(sheet.querySelectorAll('a[href], button:not([hidden]):not([disabled]), video, iframe, [tabindex="0"]')).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // swipe sideways between siblings
  let down = null;
  sheet.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") down = { x: e.clientX, y: e.clientY }; });
  sheet.addEventListener("pointerup", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    down = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });

  // arriving with a #path opens it directly
  function start() {
    const path = decodeURIComponent(location.hash.slice(1));
    if (path && resolve(path)) { history.replaceState({ vgDepth: 0 }, "", location.href); show(path); }
  }

  return { open, close: closeAll, start, get current() { return current; } };
}

// ------------------------------------------------------------------ putting a world together

/*
  openWorld({ items, resolve, empty, scene })
  items: what can be opened — [{ id, path, title, sub, accent, rail }]; id names
         the object in the scene, path is what the viewer shows (#path);
         rail: false keeps it off the list (it's reached from another item)
  scene(stageModule): builds the 3D room (async is fine) and returns its stage,
         or null; the module is stage.js, which also carries craft.js
  The rail, the viewer and the room all answer one another; without WebGL
  (or if three.js can't load) the rail and the viewer are the whole world.
*/
export async function openWorld({ items, resolve, empty, scene }) {
  rememberWorld();
  let stage = null;
  const owner = (path) => path && items.find((i) => path === i.path || path.startsWith(`${i.path}/`));
  const detail = createDetail({
    resolve,
    onChange(path) {
      if (!stage) return;
      const it = owner(path);
      if (it) stage.focus(it.id); else stage.unfocus();
    },
  });
  const railItems = items.filter((i) => i.rail !== false);
  const links = createRail(document.querySelector(".world-rail"), railItems, {
    onHover: (id) => stage && stage.highlight(id),
    onOpen: (path) => detail.open(path),
  });
  if (!items.length && empty) {
    const box = document.querySelector(".world-empty");
    box.hidden = false;
    box.replaceChildren(emptyState(empty));
  }
  setLoading(false);

  if (scene) {
    try {
      stage = await scene(await import("./stage.js"));
    } catch (e) {
      console.warn("The room couldn't be built:", e);
    }
  }
  if (!stage) root.classList.add("no-webgl");
  else {
    stage.onPick((id) => { const it = items.find((i) => i.id === id); if (it) detail.open(it.path); });
    stage.onHover((id) => links.forEach((a, k) => a.classList.toggle("is-lit", railItems[k].id === id)));
  }
  arrive();
  detail.start();
  window.__world = { detail, stage, items };
  return { detail, stage };
}

// ------------------------------------------------------------------ links between worlds

const WORLD_FILES = { observatory: "observatory.html", greenhouse: "greenhouse.html", workshop: "workshop.html", memory: "memory.html", sketchbook: "sketchbook-world.html" };

// related: [{ world, path, label }] → links to that thing in its own world (one home per thing)
export function crossLinks(related, title = "Elsewhere in the universe") {
  const items = list(related).filter((r) => r && r.world && WORLD_FILES[r.world]);
  if (!items.length) return null;
  const here = location.pathname.split("/").pop() || "index.html";
  return section(title, h("p", { class: "link-row" }, items.map((r) => {
    const file = WORLD_FILES[r.world];
    const href = file === here ? `#${r.path || ""}` : `${file}${r.path ? `#${r.path}` : ""}`;
    return h("a", { class: "pill", href }, `${r.label || r.path} →`);
  })));
}
