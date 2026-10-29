# Vega's Little Worlds: audit, plan, and how to maintain it

## Phase 1: audit (October 2026)

**Keep unchanged**
- **The Threshold** (`index.html`, `assets/js/threshold.js`, `assets/js/world.js`, `assets/css/home.css`, `assets/3d/threshold.glb`). This is the lake at dusk, the stepping stones and the lit doorway. The opening descent, pointer steering, door hover and the flight through the door all stay as they are. The only change: the door now leads into the Atlas instead of straight to Work.
- All existing routes: `work.html`, `about.html`, `notes.html`, `sketchbook.html`, `contact.html` and `truvit.html`. Project copy and links on Work are untouched.
- All original photographs (`pictures/`, `vega.jpg`, `PRHworking.jpg`, `assets/img/`). Nothing is deleted or overwritten. Thumbnails are generated beside them.

**Weak spots this pass addresses**
- After the door, every page is the same lake again with text in front of it. The inner pages repeat one composition.
- Photography appears only twice (the portrait and the Truvit photo). The nine photos in `pictures/` weren't used anywhere.
- Navigation is a linear "Next scene" chain. There's no hub, and no way to explore in any order.

**Technical constraints**
- Static GitHub Pages at `https://vegalh.github.io/vega-world/`. There's no build step, and every path stays relative.
- three.js 0.170.0 (jsDelivr) and GSAP 3.12.5 (cdnjs) are already in use, so no new dependencies are added.
- No new GLB files. The Atlas sculptures are built procedurally, so they cost no download.

## Architecture

| Scene | File | State |
| --- | --- | --- |
| 01 The Threshold | `index.html` | Preserved. The door now flies into the Atlas. |
| 02 The Atlas | `atlas.html`, `assets/js/atlas.js`, `assets/css/atlas.css` | Built. This is the hub of the five worlds. |
| World: The Observatory | sculpture in the Atlas, opens `notes.html` for now | Prototype |
| World: The Greenhouse | sculpture in the Atlas, opens `about.html` for now | Prototype |
| World: The Workshop | sculpture in the Atlas, opens `work.html` | Prototype (it uses the existing Work page) |
| World: The Memory Room | `memory.html`, `assets/js/memory.js`, `assets/css/memory.css` | Built. It's driven by `assets/data/photos.json`. |
| World: The Sketchbook | sculpture in the Atlas, opens `sketchbook.html` | Prototype (it uses the existing Sketchbook page) |

The world list lives in **one place**: the `<ol class="atlas-index">` in `atlas.html`. Each link carries
`data-world` (which sculpture), `data-accent` (its light colour) and an optional `data-note`.
The 3D scene reads those links. Without WebGL, the same list is the page.

To point a world at a new page once it's built, change that link's `href` and remove its `data-note`.

## Adding photographs

1. Put the original in `pictures/` (JPEG, long edge about 1600–2000px is plenty).
2. Make its thumbnail:
   ```sh
   sh tools/make-thumbs.sh            # makes any thumbnails that are missing (macOS, uses sips)
   ```
3. Add an entry to `assets/data/photos.json`:
   ```json
   {
     "id": "kyoto-gate",
     "src": "pictures/kyoto-gate.jpg",
     "thumb": "assets/img/photos/thumbs/kyoto-gate.jpg",
     "width": 1600, "height": 2133,
     "alt": "What the photograph shows, for people who can't see it",
     "collection": "architecture",
     "title": "Optional",
     "location": "Optional",
     "year": "Optional",
     "category": "Optional",
     "description": "Optional: a sentence or two",
     "tone": "#optional — the room's light colour; measured from the photo if left out"
   }
   ```
   `id`, `src`, `thumb`, `width`, `height`, `alt` and `collection` are required. Leave out any field you don't know; empty fields are never shown.
   Order in the file is the order you walk past them.
4. To start a new collection, add it to `collections` (`id`, `title`, optional `description`).

You never need to edit HTML to add photos.

## Previewing

```sh
python3 -m http.server 8000
# http://localhost:8000          (the Threshold; the door leads to the Atlas)
# http://localhost:8000/atlas.html
# http://localhost:8000/memory.html
```
