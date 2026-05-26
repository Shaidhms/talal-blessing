# For Talal — A Royal Blessing

A cinematic, scroll-driven blessing page for my nephew Talal.

> ما شاء الله تبارك الله
> May Allah grant Talal a long, blessed, and righteous life. Ameen.

**Live:** https://shaidhms.github.io/talal-blessing/

## What it is

A single-page royal-themed web experience. As you scroll through 6 scenes:

1. **Royal arch** — ornate Islamic mihrab arch with gold filigree, side motif panels, crown medallion. Talal's name appears in gold royal type.
2. **The reveal** — a gold veil dissolves, warm light pours out, a celebratory firework bursts.
3. **The portrait** — the camera dollies in. A video of Talal plays frame-by-frame, framed regally inside the gold arch.
4. **Balloons & confetti** — gold balloons rise (click to pop them for a tiny duaa surprise), confetti rains down.
5. **Fireworks** — continuous fireworks fill the sky as Arabic calligraphy of *ما شاء الله تبارك الله* fades in.
6. **The duaa** — English blessing with the family footer.

Interactive throughout:
- ✨ Cursor leaves a trail of gold sparkles
- 🎆 Click anywhere → gold burst
- 🎈 Click balloons → pop with a duaa note
- 🎵 Mute toggle in the corner for the nasheed

Built with **three.js**, **GSAP ScrollTrigger**, and vanilla JS — no build step.

## Replacing the video

To swap the video used in the page:

```bash
# 1. Drop the new video into the project root
cp /path/to/new-video.mp4 ./talal-video.mp4

# 2. Re-extract frames (200 frames spread across the video duration)
./extract-frames.sh talal-video.mp4

# 3. Commit & push — GitHub Pages will update
git add assets/frames talal-video.mp4
git commit -m "update video"
git push
```

## Replacing the nasheed

Drop your `nasheed.mp3` into `assets/audio/nasheed.mp3` and push.

## Running locally

```bash
# Any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

## Stack

- [three.js](https://threejs.org/) r161 (CDN, ES modules + importmap)
- [GSAP](https://gsap.com/) 3 + ScrollTrigger (CDN)
- Vanilla HTML/CSS/JS — no bundler

## Files

```
talal-blessing/
├── index.html
├── style.css
├── src/
│   ├── main.js                # boot
│   ├── door-scene.js          # three.js door + lighting + particles
│   ├── frame-scrubber.js      # preloads frames, exposes current frame
│   ├── scroll-choreography.js # GSAP ScrollTrigger choreography
│   ├── audio.js               # nasheed loop + mute toggle
│   └── textures.js            # procedural wood + brass canvas textures
├── assets/
│   ├── frames/                # frame-001.jpg ... frame-200.jpg
│   └── audio/                 # nasheed.mp3, creak.mp3 (optional)
├── extract-frames.sh          # video -> 200 frames helper
├── sample-video.mp4           # placeholder video (replace)
└── .nojekyll                  # tell GH Pages not to use Jekyll
```

---

Made with love by Shaid Hakkeem · [@shaidhms](https://linkedin.com/in/shaidhms) · [@shaid.hakkeem](https://instagram.com/shaid.hakkeem)
