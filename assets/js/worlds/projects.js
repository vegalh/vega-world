/* ============================================================
   PROJECTS — how a project reads in the viewer
   Every project lives in the Workshop (assets/data/projects.json);
   other worlds link to it rather than copying it. Empty fields
   are left out; the core of the story (problem, process,
   outcome) says so when it hasn't been written yet.
============================================================ */

import { h, list, pad, titleBlock, gallery, mediaFrom, facts, prose, section, linkRow, crossLinks, placeholderNote } from "./ui.js";

export async function loadProjects(loadJSON) {
  const data = await loadJSON("assets/data/projects.json", { projects: [] });
  return list(data && data.projects).filter((p) => p && p.id && p.name);
}

export function timeline(items) {
  const rows = list(items).filter((t) => t && (t.text || t.title));
  if (!rows.length) return null;
  return h("ol", { class: "timeline" }, rows.map((t) => h("li", null, h("time", { text: t.date || "" }), h("span", { text: t.text || t.title }))));
}

// the story of a project, in the order it happened; the first three are always shown
const STORY = [
  ["idea", "The idea"],
  ["problem", "The problem", true],
  ["process", "Development process", true],
  ["challenges", "Challenges"],
  ["outcome", "Outcome", true],
  ["lessons", "What I learned"],
];

export function renderProject(p, { extra = [], kicker } = {}) {
  const story = STORY.map(([key, title, always]) =>
    p[key] || always ? section(title, prose(p[key], `${title} — not written yet.`)) : null);
  const lede = p.summary && p.summary !== p.description ? h("p", { class: "detail-lede", text: p.summary }) : null;
  return [
    titleBlock({ kicker: kicker || [p.kind, p.label, p.year].filter(Boolean).join(" · "), title: p.name }),
    lede,
    gallery(mediaFrom(p), { emptyLabel: "Images to come" }),
    facts([["Role", p.role], ["Year", p.year], ["Collaborators", p.collaborators], ["Status", p.status]]),
    prose(p.description, "A description hasn’t been written yet."),
    ...story,
    list(p.timeline).length ? section("Timeline", timeline(p.timeline)) : null,
    ...extra,
    linkRow(p.links),
    crossLinks(p.related),
  ];
}

// every project in one place: the drawers of the archive cabinet
export function renderArchive(projects) {
  const kinds = [];
  projects.forEach((p) => { const k = p.kind || "Other"; if (!kinds.includes(k)) kinds.push(k); });
  return [
    titleBlock({ kicker: `${pad(projects.length)} projects`, title: "The archive" }),
    h("p", { class: "detail-lede", text: "Everything I’ve built, drawer by drawer." }),
    projects.length ? null : placeholderNote("Nothing has been filed yet."),
    ...kinds.map((k) => section(k, h("ol", { class: "entry-list" }, projects.filter((p) => (p.kind || "Other") === k).map((p, i) =>
      h("li", null, h("a", { href: `#${p.id}` },
        h("span", { class: "entry-num", text: pad(projects.indexOf(p) + 1) }),
        h("span", { class: "entry-title", text: p.name }),
        h("span", { class: "entry-state", text: [p.year, p.status].filter(Boolean).join(" · ") }))))))),
  ];
}
