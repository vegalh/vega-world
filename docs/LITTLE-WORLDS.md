# Vega's Little Worlds: how the universe is built, and how to fill it

```
The Threshold (index.html)
  → The Atlas (atlas.html)
    → a world
      → something opened in it (#its-id in the address)
    ← back to the world (Esc, ✕, or the browser's Back)
  ← back to the Atlas (“← The Atlas”), which turns to face the world you left
```

Everything is static files for GitHub Pages (`.nojekyll` makes Pages serve them exactly as they are). There's no build step. **Content lives in `assets/data/*.json` and `journal/*.md`**, so adding content never means editing HTML.

## Each world has one job

| World | Holds | Page | Content |
| --- | --- | --- | --- |
| 04 The Memory Room | **What I remember**: photographs and the journal | `memory.html` | `assets/data/photos.json`, `journal/` |
| 02 The Greenhouse | **What I've learned about education**: school visits, Montessori practice, research, teaching philosophy | `greenhouse.html` | `assets/data/greenhouse.json` |
| 03 The Workshop | **Everything I've built**: every project, education-related or not | `workshop.html` | `assets/data/projects.json` |
| 01 The Observatory (the Dream House) | **What I dream about and believe** | `observatory.html` | `assets/data/dreams.json` |
| 05 The Sketchbook | **What I draw and imagine** | `sketchbook-world.html` | `assets/data/artworks.json` |

**One home per thing.** RootMap's project page lives in the Workshop. The Greenhouse and the Observatory *link* to it with `related` instead of repeating it:

```json
"related": [{ "world": "workshop", "path": "rootmap", "label": "RootMap, in the Workshop" }]
```

`world` is one of `observatory`, `greenhouse`, `workshop`, `memory` or `sketchbook`. `path` is what goes after `#` on that world's page.

The original pages are unchanged and still in the menu: `work.html`, `about.html`, `notes.html`, `sketchbook.html`, `contact.html` and `truvit.html`.

## Shared pieces (`assets/js/worlds/`)

- **`ui.js`**: the reading viewer and its history (Back and Forward work), the rail, galleries (images, video files, YouTube/Vimeo), placeholders, empty states, cross-world links, and `openWorld()`, which wires a world together.
- **`stage.js`**: the 3D room: camera, things you can point at and open, hover labels, the arrival move, reflections, reduced motion, and the WebGL fallback.
- **`craft.js`**: shared materials, made in code. Wood grain, stone, paper, roughness variation, soft contact shadows and rounded (bevelled) boxes.
- **`projects.js`**: how a project reads (the Workshop, and links from other worlds).

**Without WebGL** (or if three.js can't load), a 3D world becomes its list of contents and everything still opens. **With reduced motion**, scenes hold still and the Memory Room becomes a still grid.

## Writing content

JSON can't contain comments; the `// notes` below are explanation only. Leave out any field you don't know, and empty fields are never shown. A file with a mistake in it is treated as empty (the world shows its empty state); paste it into any JSON validator to find the error. Images can live anywhere in the repo; use paths with no leading slash, and keep images under ~2000px on the long edge.

### The journal (Memory Room): `journal/`

Each entry is a Markdown file. Details go between the `---` lines at the top; the writing follows.

```markdown
---
title: Morning at the market
date: 2026-07-14              # or 2026-07 for a month
location: Kyoto
type: Travel journal          # Journal · Travel journal · Memory · Photo essay
cover: BL1                    # a photos.json id, or a path to an image
photos: [BL1, BLGJY]          # shown as a small contact sheet after the writing
tags: [markets, mornings]
collection: facades           # a photos.json collection; adds “Walk through…” at the end
---

Plain paragraphs, with an empty line between them. *Italics*, **bold**, [links](https://…).

## A heading

> A line set apart.

{{photo BL1}}             ← a photograph from photos.json, with its caption
{{photos BL1 BLGJY}}      ← two side by side
![Alt text](assets/img/journal/x.jpg "A caption")
```

**To publish:** save the file as `journal/<name>.md`, add `"<name>"` to `journal/index.json` (the order there is the order in the room), then commit and push.

**Drafts stay private.** Write drafts in `journal/drafts/`, with their own `journal/drafts/index.json`. That folder is in `.gitignore`, so drafts are never committed and never reach GitHub or the live site. Preview them on your computer at `memory.html?drafts`. (A `draft: true` line in a *published* file hides it from the room, but the file itself would still be public. Use the drafts folder.)

### Photographs: `assets/data/photos.json`
1. Put the original in `pictures/`.
2. Run `sh tools/make-thumbs.sh` (macOS).
3. Add an entry with `id`, `src`, `thumb`, `width`, `height`, `alt` and `collection` (all required), plus `title`, `location`, `year`, `category`, `description` and `tone` (all optional).

### The Greenhouse: `assets/data/greenhouse.json`

Four areas, one per object: `notebooks` (School Observations), `shelf` (Montessori Experiences), `table` (Educational Research) and `tree` (Teaching Philosophy). Each area has `title`, `subtitle`, `intro`, `related` and `entries`. An entry uses whichever of these fields it needs:

```json
{
  "id": "shanghai-kindergarten",          // greenhouse.html#observations/shanghai-kindergarten
  "title": "A kindergarten in Shanghai",
  "type": "School visit",                  // School visit · Practicum teaching · Field study · Reading notes · Philosophy …
  "status": "draft",                       // shows “In draft”; leave out once written
  "school": "Only if the school agreed to be named",
  "country": "China", "location": "Shanghai", "date": "June 2026",
  "ageGroup": "Ages 3–6", "approach": "Montessori", "setting": "24 children, 3 teachers",
  "areas": ["Practical Life", "Sensorial"],
  "context": "One line on why you were there.",
  "body": ["Paragraphs…"],
  "noticed": ["…"], "practices": ["…"], "reflections": ["…"], "questions": ["…"],
  "quotes": [{ "text": "Your own words", "source": "Where they come from" }],
  "images": [{ "src": "…", "alt": "…", "consent": true }],
  "tags": ["…"],
  "related": [{ "world": "workshop", "path": "rootmap", "label": "…" }]
}
```

**Children's privacy:** never put a child's name, or anything that identifies a child, in this file. In areas marked `"requireConsent": true` (School Observations and Montessori), an image appears **only** with `"consent": true`, meaning you have confirmed permission to publish it. Unpublished or sensitive notes belong in the git-ignored `content-drafts/` folder, never in `assets/`.

### The Workshop: `assets/data/projects.json`

```json
{
  "id": "rootmap", "name": "RootMap",
  "object": "computer",          // computer (1) · book (up to 5) · prototype (up to 5) · sketch (up to 4)
  "kind": "Software",            // groups the archive: Software · Venture · Collaboration · Experiment · Design …
  "label": "Current focus", "year": "2025–", "role": "Founder", "collaborators": "…", "status": "Active",
  "summary": "One line.", "description": "…",
  "idea": "…", "problem": "…", "process": ["…"], "challenges": "…", "outcome": "…", "lessons": "…",
  "images": [{ "src": "…", "width": 600, "height": 1612, "alt": "…" }],
  "videos": ["assets/video/demo.mp4", { "src": "https://www.youtube.com/embed/ID", "title": "Demo" }],
  "links": [{ "label": "Try it", "url": "https://…" }],
  "timeline": [{ "date": "2026-01", "text": "First version" }],
  "related": [{ "world": "greenhouse", "path": "philosophy", "label": "…" }]
}
```

The **archive cabinet** (`workshop.html#archive`) lists every project by kind. A project the room has no object for still lives there and on the rail.

### The Dream House (Observatory): `assets/data/dreams.json`

```json
{
  "constellations": [{ "id": "places", "title": "Places I Dream Of", "intro": "…" }],
  "stars": [{
    "id": "kyoto",                       // observatory.html#kyoto
    "constellation": "places",
    "title": "Kyoto in autumn",
    "kind": "place",                     // statement · reflection · question · goal · place · photo · sketch
    "status": "Dream",                   // Dream · Visited · Building now · In progress · Believing · Asking · Carrying · Working towards
    "date": "…", "location": "…",
    "body": "…", "quotes": [{ "text": "…", "source": "…" }],
    "photos": ["BL1"], "images": ["…"], "links": [{ "label": "…", "url": "…" }],
    "related": [{ "world": "memory", "path": "BL1", "label": "…" }],
    "placeholder": true                  // remove once it's real
  }]
}
```

A star's status sets its light: **Visited** glows gold, **Dream** blue, things being built amber, and questions pulse violet. Keep places you've been (`Visited`) and places you hope to go (`Dream`) distinct.

### The Sketchbook: `assets/data/artworks.json`

```json
{
  "collections": [{ "id": "watercolor", "title": "Watercolor", "description": "…" }],
  "artworks": [{
    "id": "harbour-morning", "title": "Harbour, morning", "collection": "watercolor",
    "year": "2026", "medium": "Watercolour on cotton paper",
    "image": "assets/img/art/harbour.jpg", "thumb": "assets/img/art/harbour-640.jpg", "width": 1600, "height": 2000,
    "alt": "…", "description": "…",
    "process": ["assets/img/art/harbour-sketch.jpg", { "src": "…", "caption": "Underdrawing" }]
  }]
}
```

Four pieces fit on a spread; more continue onto the next.

## The Atlas
The world list is the `<ol class="atlas-index">` in `atlas.html`, and the 3D hall reads it. `data-note` is the line under a world's name.

## Previewing and testing
```sh
python3 -m http.server 8001
# http://localhost:8001/                     the Threshold
# http://localhost:8001/memory.html?drafts   the Memory Room with your journal drafts
```
Opening files directly (`file://`) won't work: the 3D and the data need a server. Add `#id` to a world's address (for example `workshop.html#truvit`) to jump straight to that item.
