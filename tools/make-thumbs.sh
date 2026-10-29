#!/bin/sh
# Make 640px-wide thumbnails for every photo in pictures/ (and the portrait)
# that doesn't have one yet. macOS only (uses sips). Originals are never touched.
#   sh tools/make-thumbs.sh
cd "$(dirname "$0")/.." || exit 1
out=assets/img/photos/thumbs
mkdir -p "$out"
for f in pictures/*.jpg pictures/*.jpeg vega.jpg; do
  [ -f "$f" ] || continue
  name=$(basename "$f"); name="${name%.*}.jpg"
  [ -f "$out/$name" ] && continue
  sips -s format jpeg -s formatOptions low --resampleWidth 640 "$f" --out "$out/$name" >/dev/null && echo "made $out/$name"
done
