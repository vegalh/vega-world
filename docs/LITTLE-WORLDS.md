# Vega's Little Worlds: how the universe is built, and how to fill it

The site is one connected journey:

```
The Threshold (index.html)
  → The Atlas (atlas.html)
    → a world (observatory · greenhouse · workshop · memory · sketchbook-world)
      → something opened in it (#its-id in the address)
    ← back to the world (Esc, ✕, or the browser's Back)
  ← back to the Atlas (“← The Atlas”), which turns to face the world you left
```

Everything is static files for GitHub Pages. There's no build step. **All content lives in `assets/data/*.json`**, so adding content never means editing HTML.

## The worlds

| World | Page | Built with | Content file | What opens things |
| --- | --- | --- | --- | --- |
| 01 The Observatory | `observatory.html` | three.js dome | `observations.json` | stars (one constellation per category) |
| 02 The Greenhouse | `greenhouse.html` | three.js glasshouse | `greenhouse.json` (+ `projects.json` for RootMap) | the tree, the Montessori shelf, the reading table |
| 03 The Workshop | `workshop.html` | three.js studio | `projects.json` | the computer, books, prototypes, pinned drawings |
| 04 The Memory Room | `memory.html` | CSS 3D | `photos.json` | photographs |
| 05 The Sketchbook | `sketchbook-world.html` | paper book (HTML/CSS) | `artworks.json` | tabs, page turns, tipped-in pieces |

The original pages are unchanged and still in the menu: `work.html`, `about.html`, `notes.html`, `sketchbook.html`, `contact.html`, `truvit.html`.

### Shared pieces (`assets/js/worlds/`)

- **`ui.js`**: what every world shares.
  - The **detail viewer**. Each opened item is a history entry (`#path`), so Back and Forward work and closing returns you to the world as you left it.
  - The **rail**: the same entry points as the 3D objects, for keyboard, touch, screen readers and no-WebGL.
  - The **gallery** (images, video files, YouTube/Vimeo embeds) and the **placeholders** for missing images and unwritten text.
  - **Empty and loading states**, and **remembering the world** for the Atlas.
  - `openWorld()` wires all of this together for a world.
- **`stage.js`**: the 3D room every 3D world is built in. It handles the renderer, the camera drift, objects you can point at and open, hover labels, the arrival move, reduced motion, and the WebGL fallback.
- **`craft.js`**: the textures and materials shared by the Atlas and the worlds.
- **`projects.js`**: how a project reads. The Workshop and the Greenhouse's RootMap area both use it.

**Without WebGL** (or if three.js can't load), a 3D world becomes its list of contents, and everything still opens.
**With reduced motion**, scenes hold still, transitions are instant, and the Memory Room becomes a still grid.

## Adding content

Every field not marked *required* is optional; leave out what you don't know. Empty fields are never shown. Unwritten text shows a "Placeholder" note, and a missing image shows a labelled "Missing image" box rather than a broken layout. Order in the file is the order on the page.

The examples below include `// comments` to explain each field. Real JSON can't contain comments, so leave them out of the files. A file with a mistake in it is treated as empty (the world shows its empty state); paste it into any JSON validator to find the error.

Images: keep them under ~2000px on the long edge. Put them anywhere in the repo, for example `assets/img/observatory/`, `assets/img/greenhouse/`, `assets/img/workshop/` or `assets/img/art/`. Paths are relative to the site root, with no leading slash.

### Photographs: `assets/data/photos.json`
See "Adding photographs" below. Other worlds can use a photograph by its `id`.

### Observations: `assets/data/observations.json`
```json
{
  "categories": [ { "id": "places", "title": "Places" } ],
  "observations": [
    {
      "id": "kyoto-shadows",                 // required, unique, used in the link: observatory.html#kyoto-shadows
      "title": "Shadows in the courtyard",   // required
      "category": "architecture",            // one of the categories; each category is a constellation
      "date": "2026-04-12",                  // or "year": "2026"
      "location": "Kyoto",
      "photos": ["BL1", "BLGJY"],            // ids from photos.json
      "images": [{ "src": "assets/img/observatory/x.jpg", "alt": "…", "caption": "…" }],
      "story": ["First paragraph.", "Second paragraph."],
      "project": "rootmap"                   // links to a project in the Workshop
    }
  ]
}
```
The five entries there now are **placeholders** (`"placeholder": true`), shown with a "Placeholder · story to come" badge. Replace them, or delete the `placeholder` line once an entry is real.

### Projects: `assets/data/projects.json` (the Workshop, and RootMap in the Greenhouse)
```json
{
  "id": "rootmap",                          // required; workshop.html#rootmap
  "name": "RootMap",                        // required
  "object": "computer",                     // computer | book | prototype | sketch: what it is in the room
  "label": "Current focus", "year": "2025–", "role": "Founder",
  "summary": "One line.",
  "description": "A paragraph, or a list of paragraphs.",
  "problem": "…", "process": ["…", "…"], "outcome": "…",
  "images": [{ "src": "…", "width": 600, "height": 1612, "alt": "…", "caption": "…" }],
  "videos": ["assets/video/demo.mp4", { "src": "https://www.youtube.com/embed/ID", "title": "Demo" }],
  "links": [{ "label": "Try it", "url": "https://…" }],
  "timeline": [{ "date": "2026-01", "text": "First version" }]
}
```
The room holds 1 computer, up to 5 books and up to 4 pinned drawings. Anything else becomes another prototype on the bench, which grows to fit.

### The Greenhouse: `assets/data/greenhouse.json`
Three areas (`object`: `tree`, `shelf`, `table`):
- **RootMap** (`"project": "rootmap"`) reads the project from `projects.json` and adds its own `sections`. Fill a section with `"body"` (text) or `"timeline"` (milestones).
- **Montessori** and **Ideas About Learning** each have an `intro` and a list of `entries`:
```json
{
  "id": "pouring-water",                 // greenhouse.html#montessori/pouring-water
  "title": "…",
  "type": "Lesson design",               // e.g. Classroom observation, Lesson design, Reflection, Essay, Reading notes, Question
  "status": "draft",                     // shows "In draft"; leave out once it's written
  "date": "2026-03",
  "body": ["Paragraph…"],
  "images": [{ "src": "…", "alt": "…", "consent": true }],
  "tags": ["practical life"]
}
```
**Children's privacy:** the Montessori area has `"requireConsent": true`. An image there appears **only** if it has `"consent": true`; others are held back, with a note. Never put children's names or identifying details in the text.

### Artwork: `assets/data/artworks.json` (the Sketchbook)
```json
{
  "collections": [{ "id": "watercolor", "title": "Watercolor", "description": "Optional line on the left page" }],
  "artworks": [
    {
      "id": "harbour-morning",              // required; sketchbook-world.html#art/harbour-morning
      "title": "Harbour, morning",
      "collection": "watercolor",
      "year": "2026", "medium": "Watercolour on cotton paper",
      "image": "assets/img/art/harbour.jpg", "thumb": "assets/img/art/harbour-640.jpg",
      "width": 1600, "height": 2000, "alt": "…",
      "description": "…",
      "process": ["assets/img/art/harbour-sketch.jpg", { "src": "…", "caption": "Underdrawing" }]
    }
  ]
}
```
Four pieces fit on a spread; a collection with more continues onto the next spread. An empty collection shows an empty page that says so.

## Adding photographs

1. Put the original in `pictures/` (JPEG, long edge about 1600–2000px is plenty).
2. Make its thumbnail with `sh tools/make-thumbs.sh` (macOS; it uses `sips`).
3. Add an entry to `assets/data/photos.json` with `id`, `src`, `thumb`, `width`, `height`, `alt` and `collection` (all required), plus `title`, `location`, `year`, `category`, `description` and `tone` (all optional).
4. A new collection goes in `collections` (`id`, `title`, optional `description`).

## The Atlas

The world list is the `<ol class="atlas-index">` in `atlas.html`. Each link's `href` is the world's page, and the 3D hall reads the list. `data-note` is the optional line under a world's name.

## Previewing and testing

```sh
python3 -m http.server 8001      # any free port
# http://localhost:8001/          the Threshold
# http://localhost:8001/atlas.html, observatory.html, greenhouse.html, workshop.html, memory.html, sketchbook-world.html
```
Opening the files directly (`file://`) won't work: the 3D and the data need a server.

To try a content change quickly, open the world with `#id` in the address (for example `workshop.html#truvit`) to jump straight to that item.
