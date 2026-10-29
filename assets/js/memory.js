/* ============================================================
   THE MEMORY ROOM
   Reads assets/data/photos.json, hangs each photograph at its
   own depth, and turns scrolling into walking forward through
   them. The room's light takes the colour of the photograph
   you're nearest. Clicking one opens it full-screen, where its
   collection can be leafed through; closing returns you to
   the same spot in the room.
============================================================ */

(function () {
  const root = document.documentElement;
  const body = document.body;
  if (!CSS.supports("transform-style", "preserve-3d")) root.classList.add("calm");
  const calm = root.classList.contains("calm");

  const space = document.querySelector(".room-space");
  const list = document.querySelector(".prints");
  const walk = document.querySelector(".walk");
  const title = document.querySelector(".room-title");
  const end = document.querySelector(".room-end");
  const chips = document.querySelector(".collections");
  const countNow = document.querySelector(".count-now");
  const countOf = document.querySelector(".count-of");

  const pad = (n) => String(n).padStart(2, "0");

  let photos = [];
  let collections = new Map();
  let items = [];          // every photograph's element, in file order
  let shown = [];          // the ones hanging under the current filter
  let filter = "all";
  let near = null;         // the photograph you're closest to

  // ---------------------------------------------------------------- load

  fetch("assets/data/photos.json")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(() => {
      list.innerHTML = '<li class="print-item"><p class="print-missing">The photographs couldn&rsquo;t be loaded.</p></li>';
    });

  function init(data) {
    (data.collections || []).forEach((c) => collections.set(c.id, c));
    photos = (data.photos || []).filter((p) => p.id && p.src && p.thumb && p.width && p.height);
    photos.forEach((p, k) => { p.number = k + 1; });
    items = photos.map(makeItem);

    // chips for each collection that has photographs
    const used = new Set(photos.map((p) => p.collection));
    const options = [{ id: "all", title: "All" }].concat(Array.from(collections.values()).filter((c) => used.has(c.id)));
    options.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = c.title;
      b.dataset.collection = c.id;
      b.addEventListener("click", () => setFilter(c.id));
      chips.appendChild(b);
    });

    const asked = new URLSearchParams(location.search).get("c");
    setFilter(asked && collections.has(asked) ? asked : "all", { keepScroll: true });
    if (!calm) requestAnimationFrame(frame);

    // a link straight to one photograph opens it
    const id = decodeURIComponent(location.hash.slice(1));
    const linked = photos.find((p) => p.id === id);
    if (linked) openViewer(linked, null, { push: false });
  }

  function collectionTitle(id) {
    const c = collections.get(id);
    return c ? c.title : "";
  }

  function label(p) {
    return [`No. ${pad(p.number)}`, p.title, p.location].filter(Boolean).join(" · ");
  }

  function makeItem(p) {
    const li = document.createElement("li");
    li.className = "print-item";
    li.style.setProperty("--ratio", `${p.width} / ${p.height}`);
    if (p.tone) li.style.setProperty("--tone-of", p.tone);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "print";
    const img = new Image();
    img.src = p.thumb;
    img.alt = p.alt || "";
    img.width = p.width;
    img.height = p.height;
    img.decoding = "async";
    const tag = document.createElement("span");
    tag.className = "print-label";
    tag.textContent = label(p);
    btn.append(img, tag);
    li.appendChild(btn);
    list.appendChild(li);

    const item = { photo: p, li, btn, img, ratio: p.width / p.height, z: 0, sharp: false };
    img.addEventListener("load", () => {
      if (!p.tone) { p.tone = toneOf(img); li.style.setProperty("--tone-of", p.tone); if (near === item) setTone(p.tone); }
    }, { once: true });
    img.addEventListener("error", () => {
      if (item.sharp) return;
      btn.classList.add("is-missing");
      btn.disabled = true;
      const note = document.createElement("span");
      note.className = "print-missing";
      note.textContent = `Photograph missing: ${p.thumb}`;
      btn.appendChild(note);
    }, { once: true });
    btn.addEventListener("click", () => openViewer(p, btn));
    btn.addEventListener("focus", () => { if (!calm) walkTo(item); });
    btn.addEventListener("mouseenter", () => { if (calm) setTone(p.tone); });
    return item;
  }

  // the light a photograph would cast: its average colour, held to a quiet brightness
  function toneOf(img) {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 10;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, 10, 10);
      const d = g.getImageData(0, 0, 10, 10).data;
      let r = 0, gr = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      r /= n; gr /= n; b /= n;
      // push the colour away from grey a little, then hold it dim
      const mean = (r + gr + b) / 3;
      const lift = (v) => mean + (v - mean) * 1.6;
      const max = Math.max(lift(r), lift(gr), lift(b), 1);
      const k = 120 / max;
      const clamp = (v) => Math.max(18, Math.min(150, Math.round(v * k)));
      return `rgb(${clamp(lift(r))}, ${clamp(lift(gr))}, ${clamp(lift(b))})`;
    } catch (e) {
      return "#3a2a2e";
    }
  }

  function setTone(tone) {
    if (tone) root.style.setProperty("--tone", tone);
  }

  // ---------------------------------------------------------------- filter and layout

  function setFilter(id, { keepScroll = false } = {}) {
    filter = id;
    chips.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.collection === id)));
    const url = new URL(location.href);
    if (id === "all") url.searchParams.delete("c"); else url.searchParams.set("c", id);
    history.replaceState(history.state, "", url);
    layout();
    if (!keepScroll) { scrollTo({ top: 0, behavior: "instant" }); cam = 0; }
    update(true);
  }

  // depth between photographs, and how far you scroll to walk it
  let GAP = 1000, STEP = 600, W = innerWidth, H = innerHeight, DEPTH = 1000;

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000;
  }

  function layout() {
    W = innerWidth; H = innerHeight;
    const small = W < 760;
    DEPTH = small ? 700 : 1000;
    GAP = small ? 720 : 1000;
    STEP = H * (small ? 0.6 : 0.68);
    shown = items.filter((it) => filter === "all" || it.photo.collection === filter);
    items.forEach((it) => { it.li.hidden = !shown.includes(it); });
    countOf.textContent = ` / ${pad(shown.length)}`;
    if (calm) return;

    shown.forEach((it, k) => {
      const side = k % 2 ? 1 : -1;
      const r1 = hash(it.photo.id), r2 = hash(it.photo.id + "y"), r3 = hash(it.photo.id + "r");
      const landscape = it.ratio > 1.05;
      const w = small ? (landscape ? 0.78 : 0.56) * W : Math.min(landscape ? 600 : 420, (landscape ? 0.38 : 0.27) * W);
      const x = side * (small ? 0.17 * W : (0.2 + r1 * 0.05) * W);
      const y = (r2 - 0.5) * H * (small ? 0.1 : 0.16) - H * 0.02;
      const z = -(k + 1) * GAP;
      const ry = -side * (6 + r3 * 10);
      it.z = z;
      it.li.style.setProperty("--w", `${Math.round(w)}px`);
      it.li.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z}px) rotateY(${ry.toFixed(1)}deg)`;
    });
    const endZ = -(shown.length + 1.6) * GAP;
    end.style.transform = `translate(-50%, -50%) translateZ(${endZ}px)`;
    end.dataset.z = endZ;
    walk.style.height = `${Math.round((shown.length + 0.6) * STEP + H)}px`;
    space.style.setProperty("--floor-len", `${(shown.length + 4) * GAP}px`);
  }

  // ---------------------------------------------------------------- walking

  let cam = 0, aimX = 0, aimY = 0, px = 0, py = 0;
  let viewing = false;

  function targetCam() { return scrollY / STEP * GAP; }

  // bring a photograph (focused by keyboard) to where you'd stand to look at it
  function walkTo(item) {
    const top = Math.max(0, (-item.z - GAP * 0.62) / GAP * STEP);
    if (Math.abs(scrollY - top) > 4) scrollTo({ top, behavior: "instant" });
  }

  function update(force) {
    const t = targetCam();
    const moved = Math.abs(t - cam) > 0.3 || Math.abs(aimX - px) > 0.002 || Math.abs(aimY - py) > 0.002;
    if (!moved && !force) return;
    cam += (t - cam) * 0.12;
    px += (aimX - px) * 0.06;
    py += (aimY - py) * 0.06;
    space.style.transform = `translate3d(${(-px * 40).toFixed(2)}px, ${(-py * 26).toFixed(2)}px, ${cam.toFixed(1)}px)`;

    // the entrance words recede as you walk in
    const welcome = Math.max(0, 1 - cam / (GAP * 0.55));
    title.style.opacity = welcome.toFixed(3);
    title.style.visibility = cam > GAP * 0.6 ? "hidden" : "";

    let best = null, bestD = Infinity;
    shown.forEach((it) => {
      const rel = it.z + cam;                      // 0 = where you stand; negative is ahead
      const far = 1 - (-rel - 2.4 * GAP) / (1.6 * GAP);
      const close = (DEPTH * 0.5 - rel) / (DEPTH * 0.35);
      // while the entrance words hang there, what's beyond stays dim behind them
      const o = Math.max(0, Math.min(1, far, close)) * (1 - welcome * 0.8);
      it.li.style.opacity = o.toFixed(3);
      it.li.style.visibility = o < 0.01 ? "hidden" : "";
      const d = Math.abs(rel + GAP * 0.62);
      if (rel < DEPTH * 0.45 && d < bestD) { bestD = d; best = it; }
    });
    const endRel = Number(end.dataset.z || 0) + cam;
    end.style.opacity = Math.max(0, Math.min(1, 1 - (-endRel - 2.4 * GAP) / (1.6 * GAP))).toFixed(3);

    if (best !== near) {
      if (near) near.li.classList.remove("is-near");
      near = best;
      if (near) {
        near.li.classList.add("is-near");
        countNow.textContent = pad(shown.indexOf(near) + 1);
        if (!viewing) setTone(near.photo.tone);
        sharpen(near);
        const next = shown[shown.indexOf(near) + 1];
        if (next) sharpen(next);
      }
    }
  }

  // a photograph close enough to fill your view gets its full-size file
  function sharpen(item) {
    if (item.sharp || W < 500 && devicePixelRatio < 2) return;
    item.sharp = true;
    const full = new Image();
    full.onload = () => { item.img.src = item.photo.src; };
    full.src = item.photo.src;
  }

  function frame() {
    if (!viewing) update(false);
    requestAnimationFrame(frame);
  }

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    aimX = e.clientX / innerWidth * 2 - 1;
    aimY = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  addEventListener("resize", () => { if (!photos.length) return; layout(); update(true); });

  // ---------------------------------------------------------------- the viewer

  const viewer = document.querySelector(".viewer");
  const vImg = viewer.querySelector(".viewer-img");
  const vCollection = viewer.querySelector(".viewer-collection");
  const vTitle = viewer.querySelector(".viewer-title");
  const vMeta = viewer.querySelector(".viewer-meta");
  const vDesc = viewer.querySelector(".viewer-desc");
  const vCount = viewer.querySelector(".viewer-count");
  const vPrev = viewer.querySelector(".viewer-prev");
  const vNext = viewer.querySelector(".viewer-next");
  const vClose = viewer.querySelector(".viewer-close");
  let vList = [], vIndex = 0, opener = null, pushed = false;

  function openViewer(photo, fromBtn, { push = true } = {}) {
    vList = photos.filter((p) => p.collection === photo.collection);
    if (!vList.length) vList = [photo];
    vIndex = Math.max(0, vList.indexOf(photo));
    opener = fromBtn;
    viewing = true;
    show(0);
    viewer.hidden = false;
    body.classList.add("viewing");
    if (push) { history.pushState({ photo: photo.id }, "", `#${encodeURIComponent(photo.id)}`); pushed = true; }
    else pushed = false;
    if (fromBtn && !calm && fromBtn.animate) fly(fromBtn);
    vClose.focus({ preventScroll: true });
  }

  // the print flies from its place in the room to the full view
  function fly(fromBtn) {
    const from = fromBtn.querySelector("img").getBoundingClientRect();
    viewer.classList.add("is-opening");
    requestAnimationFrame(() => {
      const to = vImg.getBoundingClientRect();
      const ghost = new Image();
      ghost.src = fromBtn.querySelector("img").currentSrc;
      ghost.className = "viewer-ghost";
      ghost.alt = "";
      Object.assign(ghost.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
      body.appendChild(ghost);
      const sx = from.width / to.width, sy = from.height / to.height;
      const anim = ghost.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`, transformOrigin: "0 0" },
        { transform: "none", transformOrigin: "0 0" },
      ], { duration: 720, easing: "cubic-bezier(.22,.61,.21,1)" });
      const finish = () => { ghost.remove(); viewer.classList.remove("is-opening"); };
      anim.onfinish = finish;
      anim.oncancel = finish;
    });
  }

  function show(dir) {
    const p = vList[vIndex];
    const set = () => {
      vImg.width = p.width;
      vImg.height = p.height;
      vImg.alt = p.alt || "";
      vImg.src = p.thumb;
      const full = new Image();
      full.onload = () => { if (vList[vIndex] === p) vImg.src = p.src; };
      full.src = p.src;
      vCollection.textContent = collectionTitle(p.collection);
      vTitle.textContent = p.title || `No. ${pad(p.number)}`;
      vMeta.textContent = [p.location, p.year, p.category].filter(Boolean).join(" · ");
      vDesc.textContent = p.description || "";
      vCount.textContent = `${pad(vIndex + 1)} / ${pad(vList.length)}`;
      vPrev.disabled = vNext.disabled = vList.length < 2;
      setTone(p.tone);
    };
    if (!dir || calm) { set(); return; }
    vImg.style.setProperty("--swap", `${dir * -24}px`);
    vImg.classList.add("is-swapping");
    setTimeout(() => {
      set();
      vImg.style.setProperty("--swap", `${dir * 24}px`);
      requestAnimationFrame(() => requestAnimationFrame(() => vImg.classList.remove("is-swapping")));
    }, 260);
  }

  function go(dir) {
    if (vList.length < 2) return;
    vIndex = (vIndex + dir + vList.length) % vList.length;
    show(dir);
    history.replaceState(history.state, "", `#${encodeURIComponent(vList[vIndex].id)}`);
  }

  function closeViewer(fromHistory) {
    if (viewer.hidden) return;
    if (pushed && !fromHistory) { history.back(); return; }   // popstate closes it
    if (!fromHistory) history.replaceState(history.state, "", location.pathname + location.search);
    viewer.hidden = true;
    body.classList.remove("viewing");
    viewing = false;
    pushed = false;
    if (near) setTone(near.photo.tone);
    if (opener) opener.focus({ preventScroll: true });
  }

  addEventListener("popstate", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const p = photos.find((x) => x.id === id);
    if (p && viewer.hidden) openViewer(p, null, { push: false });
    else if (!p) closeViewer(true);
  });

  vPrev.addEventListener("click", () => go(-1));
  vNext.addEventListener("click", () => go(1));
  vClose.addEventListener("click", () => closeViewer(false));

  viewer.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "Escape") { e.preventDefault(); closeViewer(false); }
    else if (e.key === "Tab") {
      // keep the keyboard inside the viewer
      const f = [vPrev, vNext, vClose].filter((b) => !b.disabled);
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // swipe between photographs
  let downX = null;
  viewer.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") downX = e.clientX; });
  viewer.addEventListener("pointerup", (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  });

  // a hook for automated checks
  window.__memory = { get near() { return near && near.photo.id; }, get shown() { return shown.length; }, openViewer: (id) => openViewer(photos.find((p) => p.id === id), items.find((i) => i.photo.id === id).btn) };
})();
