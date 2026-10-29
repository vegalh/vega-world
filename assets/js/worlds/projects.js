/* ============================================================
   PROJECTS — how a project reads in the viewer
   Shared by the Workshop (every project) and the Greenhouse
   (RootMap). Empty fields are left out; the parts of the
   story not yet written say so instead of disappearing.
============================================================ */

import { h, list, titleBlock, gallery, mediaFrom, facts, prose, section, linkRow } from "./ui.js";

export async function loadProjects(loadJSON) {
  const data = await loadJSON("assets/data/projects.json", { projects: [] });
  return list(data && data.projects).filter((p) => p && p.id && p.name);
}

export function timeline(items) {
  const rows = list(items).filter((t) => t && (t.text || t.title));
  if (!rows.length) return null;
  return h("ol", { class: "timeline" }, rows.map((t) => h("li", null, h("time", { text: t.date || "" }), h("span", { text: t.text || t.title }))));
}

// extra: more sections after the project's own (the Greenhouse adds its own)
export function renderProject(p, { extra = [], kicker } = {}) {
  const story = ["problem", "process", "outcome"].map((k) =>
    section(k[0].toUpperCase() + k.slice(1), prose(p[k], `The ${k} hasn’t been written yet.`)));
  const lede = p.summary && p.summary !== p.description ? h("p", { class: "detail-lede", text: p.summary }) : null;
  return [
    titleBlock({ kicker: kicker || [p.label, p.year].filter(Boolean).join(" · "), title: p.name }),
    lede,
    gallery(mediaFrom(p), { emptyLabel: "Images to come" }),
    facts([["Role", p.role], ["Year", p.year], ["Status", p.label]]),
    prose(p.description, "A description hasn’t been written yet."),
    ...story,
    p.timeline && list(p.timeline).length ? section("Timeline", timeline(p.timeline)) : null,
    ...extra,
    linkRow(p.links),
  ];
}

