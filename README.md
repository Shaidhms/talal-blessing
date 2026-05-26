# For Talal — A Duaa

A cinematic, scroll-driven blessing page for my nephew Talal.

> ما شاء الله تبارك الله
> May Allah grant Talal a long, blessed, and righteous life. Ameen.

**Live:** https://shaidhms.github.io/talal-blessing/

## What it is

A single-page web experience. As you scroll:

1. A warm wooden door stands in dim light
2. It opens, light pours out
3. A video of Talal plays frame-by-frame inside the doorway
4. Arabic calligraphy of *MashaAllah Tabarakallah* appears
5. The duaa is written in English with the family footer

Built with **three.js**, **GSAP ScrollTrigger**, and vanilla JS — no build step.

## Replacing the sample video

The repo ships with a placeholder video (`sample-video.mp4`). To use the real one:

```bash
# 1. Drop the real video into the project root
cp /path/to/talal-crawling.mp4 ./talal-crawling.mp4

# 2. Re-extract frames (200 frames spread across the video duration)
./extract-frames.sh talal-crawling.mp4

# 3. Commit & push — GitHub Pages will update
git add assets/frames talal-crawling.mp4
git commit -m "use real video"
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
