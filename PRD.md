# Product Requirements Document

## Who this site is for

People who meet Vega through school, work, or shared interests, including classmates, potential collaborators, and people interested in education, technology, and entrepreneurship.

## The one thing a visitor should do

Visit Vega's GitHub profile to explore her projects and contributions.

## The sections you need

The site is "Vega's Little Worlds": a set of separate pages with one shared navigation (Atlas / Work / About / Notes / Sketchbook / Contact; the name mark returns to the lake):

- **Home (the Threshold):** An interactive 3D scene (a lake at dusk and a lit doorway, built in Blender and rendered with three.js), Vega's name, a one-line introduction, and one invitation to explore. The doorway leads into the Atlas.
- **The Atlas:** A quiet hall holding five sculptural worlds, the hub for exploring in any order. Each world has its own page and remembers itself, so returning to the Atlas faces the world you left.
- **Each world has one job.** The Memory Room is what I remember (photographs and a Markdown journal). The Greenhouse is what I've learned about education (school observations, Montessori experiences, research, teaching philosophy). The Workshop is everything I've built (every project, with an archive cabinet). The Observatory, as the Dream House, is what I dream about and believe (five constellations). The Sketchbook is what I draw and imagine. Objects in each world open content in a shared reading viewer with back/forward history. Worlds link to one another instead of duplicating content.
- **Content is data-driven** (`assets/data/*.json`, `journal/*.md`) and shows clear placeholders until it's written. Journal drafts and private notes live in git-ignored folders and never reach the public site. No child is identified, and classroom photographs appear only when marked as authorised. See `docs/LITTLE-WORLDS.md`.
- **The Memory Room:** Photographs suspended at different depths; scrolling walks through them, the room's light follows the nearest photograph, and each opens full-screen within its collection. Data lives in `assets/data/photos.json`.
- **Work:** RootMap (emphasized as the current focus) and the other projects, each with its description and live/code links. While you scroll, the camera circles the doorway and the doorway shows a real screenshot of each project.
- **About, Notes, Sketchbook, Contact:** The same lake from other vantage points, with the words in front of it. About uses the portrait and the Truvit work photo.
- **Notes:** Story titles marked as drafts until they're written.
- **Sketchbook:** Empty pages for each creative category until real artwork is added.
- **Contact:** The GitHub call to action.

## What content you have, and what is missing

**Available:** Vega's name and introduction, Babson College studies, about text, three interest areas, portrait (`vega.jpg`), GitHub callout, and closing message. The Projects section lists each project with a short intro and links to its live site and/or GitHub repository: RootMap (current focus), Peninsula Montessori Lessons (Mini Project 1), Lesson Prep Planner (Mini Project 2), Cookie Bytes by Julia (a collaboration with Julia Cook), and Truvit (2023–2027, with its own page, logo, work photo, and description).

**Missing or needs confirmation:** Titles, locations and years for the photographs (only the portrait is known to be Paris); more photographs; dream destinations and future dreams (placeholder stars in the Observatory); journal entries; written Montessori and learning pieces (titles exist as drafts); questions raised by school visits; RootMap's role, problem, process and outcome; each project's problem, process, outcome and role; artwork for the Sketchbook; A direct contact method; whether `https://github.com/vegalh` (now used for the GitHub call to action, replacing the `.git` repository URL) is the intended profile link; written Notes; Sketchbook artwork; and whether to add RootMap Play to the Projects section.

## Two or three sites you like, and what you like about each

These are proposed references, not confirmed personal favorites:

- [Brittany Chiang](https://brittanychiang.com/): Clear hierarchy and focused navigation for a personal portfolio.
- [Maggie Appleton](https://maggieappleton.com/): Distinctive personal voice and an editorial approach to presenting interests and work.
- [Lee Robinson](https://leerob.io/): Concise introduction and direct routes to projects and other work.