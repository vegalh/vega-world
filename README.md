# vegalh.github.io

Vega Guo's personal website, published with GitHub Pages as plain static files. There's no build step.

## Pages

| Page | File |
| --- | --- |
| Home: the Threshold, an interactive 3D scene | `index.html`, `assets/js/threshold.js`, `assets/css/home.css` |
| The Atlas: a hall of five little worlds; the door leads here | `atlas.html`, `assets/js/atlas.js`, `assets/css/atlas.css` |
| The Observatory: observations as stars | `observatory.html`, `assets/js/observatory.js`, `assets/data/observations.json` |
| The Greenhouse: RootMap, Montessori, ideas about learning | `greenhouse.html`, `assets/js/greenhouse.js`, `assets/data/greenhouse.json` |
| The Workshop: projects as objects | `workshop.html`, `assets/js/workshop.js`, `assets/data/projects.json` |
| The Memory Room: photographs, driven by `assets/data/photos.json` | `memory.html`, `assets/js/memory.js`, `assets/css/memory.css` |
| The Sketchbook: artwork in a book | `sketchbook-world.html`, `assets/js/sketchbook-world.js`, `assets/data/artworks.json` |
| Work | `work.html` |
| About | `about.html` |
| Notes | `notes.html` |
| Sketchbook | `sketchbook.html` |
| Contact | `contact.html` |
| Truvit (project page) | `truvit.html` (unchanged; uses `css/styles.css` and `css/truvit.css`) |

**How the worlds are wired, and how to add photographs, observations, projects, Greenhouse entries and artwork:** see [`docs/LITTLE-WORLDS.md`](docs/LITTLE-WORLDS.md).

The shared styles and page transitions for the inner pages are in `assets/css/site.css` and `assets/js/site.js`.

## The homepage scene

The environment is called "The Threshold": a still lake at dusk with stepping stones that lead to a lit doorway. It's modelled in Blender by `blender/build_threshold.py`, exported to `assets/3d/threshold.glb`, and rendered in the browser with three.js. GSAP drives the camera: the opening tilt-down and the flight across the stones and through the door.

three.js 0.170.0 loads from jsDelivr and GSAP 3.12.5 from cdnjs. If WebGL isn't available, the page shows `assets/3d/threshold-poster.jpg`, a still frame of the same scene.

### Project screenshots

`assets/img/work/*.jpg` are phone-sized captures (390×1048 at 2×, resized to 600×1612) of each live project, framed to the doorway's proportions. Cookie Bytes was captured from its local `dist/` build, because the live page currently renders blank (see below). Truvit uses its existing logo.

> **Note:** https://vegalh.github.io/juliacook/ serves the unbuilt Vite `index.html` (it loads `/src/main.tsx`), so it renders an empty page. Deploying the `dist/` build in the `juliacook` repo would fix it.

### Rebuilding the 3D asset

```sh
# 1. Build the scene, bake ambient occlusion, and export the GLB (optionally render a preview)
/Applications/Blender.app/Contents/MacOS/Blender -b -P blender/build_threshold.py -- --preview /tmp/threshold-preview.png

# 2. Compress it for the web (quantization + meshopt)
npx @gltf-transform/cli@4.1.1 optimize assets/3d/threshold.glb assets/3d/threshold.glb \
  --compress meshopt --texture-compress false --simplify false --flatten false --join false
```

The mesh names (`Terrain`, `Gate`, `GateLight`, `Platform`, `Stones`, `Forest`, `Reeds`, `Ridges`, `Water`) are what `threshold.js` uses to assign materials, so keep them stable.

## Preview locally

The GLB and the ES modules need an HTTP server; opening the file directly won't load them.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```
