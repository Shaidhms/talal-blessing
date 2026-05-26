#!/usr/bin/env bash
# Extract exactly 200 frames from a video into assets/frames/
# Usage: ./extract-frames.sh <video-file>
set -euo pipefail

VIDEO="${1:-sample-video.mp4}"
TARGET_FRAMES=200
OUT_DIR="assets/frames"

if [ ! -f "$VIDEO" ]; then
  echo "Video not found: $VIDEO"
  exit 1
fi

DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO")
FPS=$(python3 -c "print($TARGET_FRAMES / $DURATION)")

echo "Video: $VIDEO"
echo "Duration: ${DURATION}s"
echo "Sampling at $FPS fps to get $TARGET_FRAMES frames"

rm -f "$OUT_DIR"/*.jpg
ffmpeg -y -i "$VIDEO" -vf "scale=720:-1,fps=$FPS" -q:v 3 "$OUT_DIR/frame-%03d.jpg" -loglevel error

# Trim if ffmpeg overshoots
COUNT=$(ls "$OUT_DIR"/frame-*.jpg 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt "$TARGET_FRAMES" ]; then
  for f in $(ls "$OUT_DIR"/frame-*.jpg | tail -n +$((TARGET_FRAMES + 1))); do
    rm "$f"
  done
fi

FINAL=$(ls "$OUT_DIR"/frame-*.jpg | wc -l | tr -d ' ')
echo "Extracted $FINAL frames into $OUT_DIR/"
