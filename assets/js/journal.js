/* ============================================================
   JOURNAL — memories written in Markdown
   Entries are text files in journal/, listed in
   journal/index.json. Each starts with a few lines of details
   between --- marks (title, date, location, photos…), then the
   writing itself, in plain Markdown.
   Drafts live in journal/drafts/, which git ignores: they're
   never committed, so they never reach the public site. On
   your own machine, memory.html?drafts shows them too.
   No dependencies: a small Markdown reader is below.
============================================================ */

window.VGJournal = (function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // only ordinary links: no javascript: or data: tricks in a public page
  function safeUrl(u) {
    const url = String(u).trim();
    if (/^(https?:|mailto:|#|\.{0,2}\/|[\w-]+[\w./-]*$)/i.test(url) && !/^(javascript|data|vbscript):/i.test(url)) return url;
    return "#";
  }

  // ---------------------------------------------------------------- the details at the top

  function parseValue(v) {
    v = v.trim();
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(",").map((x) => parseValue(x)).filter((x) => x !== "");
    if (/^".*"$|^'.*'$/.test(v)) return v.slice(1, -1);
    if (v === "true") return true;
    if (v === "false") return false;
    return v;
  }

  function frontMatter(text) {
    const m = text.replace(/^﻿/, "").match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    let lastKey = null;
    m[1].split(/\r?\n/).forEach((line) => {
      const item = line.match(/^\s+-\s+(.*)$/);
      if (item && lastKey) { if (!Array.isArray(meta[lastKey])) meta[lastKey] = []; meta[lastKey].push(parseValue(item[1])); return; }
      const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      if (kv) { lastKey = kv[1]; meta[lastKey] = kv[2] === "" ? [] : parseValue(kv[2]); }
    });
    return { meta, body: text.slice(m[0].length) };
  }

  // ---------------------------------------------------------------- Markdown, the useful part of it

  function figure(src, alt, caption) {
    return `<figure class="j-figure"><img src="${esc(safeUrl(src))}" alt="${esc(alt || "")}" loading="lazy" decoding="async">${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}</figure>`;
  }

  function inline(s) {
    let out = esc(s);
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${esc(safeUrl(u.replace(/&amp;/g, "&")))}">${t}</a>`);
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    out = out.replace(/(^|[^_\w])_([^_]+)_(?=$|[^_\w])/g, "$1<em>$2</em>");
    return out;
  }

  // photos: Map of photos.json entries, so {{photo ID}} can embed one
  function markdown(text, photos = new Map()) {
    const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
    return blocks.map((block) => {
      const b = block.trim();
      if (!b) return "";
      const shortcode = b.match(/^\{\{\s*photos?\s+([^}]+)\}\}$/);
      if (shortcode) {
        const ids = shortcode[1].trim().split(/[\s,]+/);
        const figs = ids.map((id) => { const p = photos.get(id); return p ? figure(p.src, p.alt, [p.title, p.location].filter(Boolean).join(" · ")) : `<p class="j-missing">Photograph “${esc(id)}” isn’t in photos.json.</p>`; }).join("");
        return ids.length > 1 ? `<div class="j-pair">${figs}</div>` : figs;
      }
      const img = b.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
      if (img) return figure(img[2], img[1], img[3]);
      const heading = b.match(/^(#{1,3})\s+(.*)$/);
      if (heading) return `<h${heading[1].length + 2}>${inline(heading[2])}</h${heading[1].length + 2}>`;
      if (/^(-{3,}|\*{3,})$/.test(b)) return "<hr>";
      if (/^>\s?/.test(b)) return `<blockquote><p>${inline(b.replace(/^>\s?/gm, "")).replace(/\n/g, "<br>")}</p></blockquote>`;
      if (/^[-*]\s+/.test(b)) return `<ul>${b.split(/\n(?=[-*]\s+)/).map((li) => `<li>${inline(li.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      if (/^\d+\.\s+/.test(b)) return `<ol>${b.split(/\n(?=\d+\.\s+)/).map((li) => `<li>${inline(li.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
      return `<p>${inline(b).replace(/\n/g, " ")}</p>`;
    }).join("\n");
  }

  // ---------------------------------------------------------------- loading

  async function fetchText(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.text();
  }

  async function loadFolder(folder, draft) {
    let index;
    try { index = JSON.parse(await fetchText(`${folder}/index.json`)); } catch (e) { return []; }
    const slugs = (index.entries || []).filter((s) => typeof s === "string" && /^[\w-]+$/.test(s));
    const loaded = await Promise.all(slugs.map(async (slug) => {
      try {
        const { meta, body } = frontMatter(await fetchText(`${folder}/${slug}.md`));
        return { slug, draft: draft || meta.draft === true, ...meta, body, title: meta.title || slug };
      } catch (e) {
        console.warn("Journal entry couldn't be read:", slug, e.message);
        return null;
      }
    }));
    return loaded.filter(Boolean);
  }

  // drafts appear only when asked for, and only where the drafts folder exists (your machine)
  async function load({ drafts = false } = {}) {
    const published = (await loadFolder("journal", false)).filter((e) => !e.draft || drafts);
    const local = drafts ? await loadFolder("journal/drafts", true) : [];
    return published.concat(local);
  }

  return { load, markdown, frontMatter, esc };
})();
