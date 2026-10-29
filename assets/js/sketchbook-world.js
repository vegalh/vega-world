/* ============================================================
   THE SKETCHBOOK — a book you leaf through
   Artwork comes from assets/data/artworks.json. Each
   collection is a section of the book with its own tab; its
   pieces are tipped in, four to a spread. A collection with
   nothing in it yet shows an empty page that says so.
   Opening a piece shows it large, with its process images.
============================================================ */

import { loadJSON, list, h, pad, reduceMotion, rememberWorld, arrive, setLoading, createDetail, titleBlock, gallery, facts, prose, section } from "./worlds/ui.js";

const PER_SPREAD = 4;
const root = document.documentElement;
rememberWorld();

const data = await loadJSON("assets/data/artworks.json", { collections: [], artworks: [] });
const artworks = list(data && data.artworks).filter((a) => a && a.id);
const collections = list(data && data.collections).filter((c) => c && c.id);
// pieces in a collection the file doesn't list still get a section
artworks.forEach((a) => { if (a.collection && !collections.some((c) => c.id === a.collection)) collections.push({ id: a.collection, title: a.collection }); });
if (!collections.length) collections.push({ id: "pages", title: "Sketchbook" });
const inCollection = (id) => artworks.filter((a) => a.collection === id);

// the book, spread by spread
const spreads = [];
collections.forEach((c) => {
  const pieces = inCollection(c.id);
  const parts = Math.max(1, Math.ceil(pieces.length / PER_SPREAD));
  for (let p = 0; p < parts; p++) spreads.push({ c, pieces: pieces.slice(p * PER_SPREAD, (p + 1) * PER_SPREAD), part: p, parts });
});

// ------------------------------------------------------------------ the pages

const book = document.querySelector(".book");
const left = book.querySelector(".page-left");
const right = book.querySelector(".page-right");
const leaf = book.querySelector(".leaf");
const tabs = book.querySelector(".book-tabs");
const where = book.querySelector(".book-where");
const prevBtn = book.querySelector(".book-prev");
const nextBtn = book.querySelector(".book-next");

function hashOf(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967296; }

function leftPage(sp) {
  const n = inCollection(sp.c.id).length;
  return [
    h("p", { class: "eyebrow page-eyebrow", text: `${pad(collections.indexOf(sp.c) + 1)} · ${n ? `${n} piece${n > 1 ? "s" : ""}` : "Not started"}` }),
    h("h2", { class: "page-title", text: sp.c.title }),
    sp.c.description ? h("p", { class: "page-text", text: sp.c.description }) : null,
    sp.parts > 1 ? h("p", { class: "page-part", text: `Part ${sp.part + 1} of ${sp.parts}` }) : null,
    h("p", { class: "page-folio", text: pad(spreads.indexOf(sp) * 2 + 1) }),
  ];
}

function rightPage(sp) {
  if (!sp.pieces.length) {
    return [
      h("div", { class: "page-empty" },
        h("span", { class: "placeholder-tag", text: "Empty page" }),
        h("p", { text: `${sp.c.title} will be tipped in here.` })),
      h("p", { class: "page-folio", text: pad(spreads.indexOf(sp) * 2 + 2) }),
    ];
  }
  return [
    h("div", { class: `tipped-in n${sp.pieces.length}` }, sp.pieces.map((a) => {
      const u = hashOf(a.id);
      const img = a.image || a.thumb;
      const btn = h("a", { class: "tipped", href: `#art/${a.id}`, style: { "--tilt": `${((u - 0.5) * 5).toFixed(2)}deg`, "--ratio": a.width && a.height ? `${a.width} / ${a.height}` : "4 / 5" } },
        img ? h("img", { src: a.thumb || a.image, alt: a.alt || a.title || "", loading: "lazy", decoding: "async" }) : h("span", { class: "tipped-missing", text: "Image to come" }),
        h("span", { class: "tipped-label", text: [a.title || "Untitled", a.year].filter(Boolean).join(", ") }));
      const pic = btn.querySelector("img");
      if (pic) pic.addEventListener("error", () => pic.replaceWith(h("span", { class: "tipped-missing", text: `Missing image: ${img}` })), { once: true });
      return btn;
    })),
    h("p", { class: "page-folio", text: pad(spreads.indexOf(sp) * 2 + 2) }),
  ];
}

let at = 0, turning = false;

function paint(i) {
  const sp = spreads[i];
  left.replaceChildren(...leftPage(sp).filter(Boolean));
  right.replaceChildren(...rightPage(sp));
  where.textContent = `${sp.c.title}${sp.parts > 1 ? ` · ${sp.part + 1} / ${sp.parts}` : ""}`;
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === spreads.length - 1;
  tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.c === sp.c.id)));
  const url = new URL(location.href);
  url.searchParams.set("c", sp.c.id);
  if (sp.part) url.searchParams.set("p", String(sp.part + 1)); else url.searchParams.delete("p");
  history.replaceState(history.state, "", url);
}

// a leaf of paper turns over the spine; the pages change beneath it at the halfway point
function turnTo(i) {
  if (i === at || i < 0 || i >= spreads.length || turning) return;
  const forward = i > at;
  at = i;
  if (reduceMotion || !leaf.animate) { paint(i); return; }
  turning = true;
  leaf.classList.add("is-turning", forward ? "forward" : "back");
  const anim = leaf.animate(
    forward ? [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }] : [{ transform: "rotateY(-180deg)" }, { transform: "rotateY(0deg)" }],
    { duration: 820, easing: "cubic-bezier(.45,.05,.3,1)" });
  setTimeout(() => paint(i), 380);
  const done = () => { leaf.classList.remove("is-turning", "forward", "back"); turning = false; };
  anim.onfinish = done;
  anim.oncancel = done;
}

collections.forEach((c) => {
  const b = h("button", { type: "button", class: "book-tab", "data-c": c.id, text: c.title });
  b.addEventListener("click", () => turnTo(spreads.findIndex((s) => s.c.id === c.id)));
  tabs.appendChild(b);
});
prevBtn.addEventListener("click", () => turnTo(at - 1));
nextBtn.addEventListener("click", () => turnTo(at + 1));

addEventListener("keydown", (e) => {
  if (root.classList.contains("detail-open") || root.classList.contains("nav-open") || e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key === "ArrowRight") { e.preventDefault(); turnTo(at + 1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); turnTo(at - 1); }
});

let down = null;
book.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") down = { x: e.clientX, y: e.clientY }; });
book.addEventListener("pointerup", (e) => {
  if (!down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  down = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) turnTo(at + (dx < 0 ? 1 : -1));
});

// open where the address says (?c=watercolor&p=2), or at the beginning
{
  const q = new URLSearchParams(location.search);
  const found = spreads.findIndex((s) => s.c.id === q.get("c") && s.part === Math.max(0, (parseInt(q.get("p"), 10) || 1) - 1));
  at = found >= 0 ? found : 0;
  paint(at);
}

// ------------------------------------------------------------------ a piece, opened

function render(a) {
  const c = collections.find((x) => x.id === a.collection);
  const main = a.image ? [{ src: a.image, alt: a.alt || a.title, width: a.width, height: a.height, caption: a.caption }] : [];
  const process = list(a.process).map((p) => (typeof p === "string" ? { src: p } : p));
  return [
    titleBlock({ kicker: [c && c.title, a.year].filter(Boolean).join(" · "), title: a.title || "Untitled" }),
    gallery(main, { emptyLabel: "Image to come" }),
    facts([["Medium", a.medium], ["Year", a.year], ["Collection", c && c.title]]),
    prose(a.description),
    process.length ? section("Process", gallery(process)) : null,
  ];
}

const detail = createDetail({
  closeLabel: "Close and return to the book",
  resolve(path) {
    const [kind, id] = path.split("/");
    const a = kind === "art" && artworks.find((x) => x.id === id);
    if (!a) return null;
    // opening a piece turns the book to its page
    const k = spreads.findIndex((s) => s.pieces.includes(a));
    if (k >= 0 && k !== at && !turning) { at = k; paint(k); }
    return { context: "The Sketchbook", layout: "media", siblings: inCollection(a.collection).map((x) => `art/${x.id}`), render: () => render(a) };
  },
});

setLoading(false);
root.classList.add("stage-ready");
arrive();
detail.start();
window.__world = { detail, spreads, turnTo };
