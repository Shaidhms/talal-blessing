# For Talal

A regal, interactive blessing page for my nephew Talal.

> ما شاء الله تبارك الله
> May Allah grant Talal a long, blessed, and righteous life. Ameen.

**Live:** https://shaidhms.github.io/talal-blessing/

## How it works

When you open the page, you see a **locked entry**: an ornate gold keyhole plate centered, with a 3D gold key floating just below it. The prompt reads *"Drag the key into the keyhole."*

**Drag the key upward into the keyhole.** Get close enough and it snaps in, rotates 90° (the lock turn), lifts off, dissolves — fireworks burst and confetti rains.

Then the experience opens:

- 🎬 **Background:** the full-screen video of Talal plays on loop with a soft vignette
- ✨ **Foreground:** a full-page auto-scrolling stream of duaas
  - Header card with "FOR OUR BELOVED · TALAL"
  - 7 duaas — each one takes the full viewport
  - Auto-scrolls continuously upward (looping seamlessly)
  - Closing card with "آمين" and the family footer
- 🎵 **Mute toggle** top-right for the nasheed

### Duaas included

1. ما شاء الله تبارك الله · MashaAllah Tabarakallah
2. بارك الله لك · Barakallahu Lak
3. اللهم بارك · Allahumma Baarik
4. اللهم احفظه · Allahumma ahfazhu
5. رب اجعله من الصالحين · Rabbi-jʿalhu mina al-saaliheen
6. اللهم اجعله قرة عين · Allahumma-jʿalhu qurrata ʿayn
7. آمين · Ameen — full duaa for a long, blessed, righteous life

## Stack

- **three.js** (r161) — animated 3D gold key with PBR materials
- Vanilla JS, no build step — runs straight from GitHub Pages
- Native HTML5 `<video>` for the looping background
- 2D canvas overlay for fireworks, confetti, cursor sparkle trail, click bursts

## Swapping the video

Drop your new video in as `talal-video.mp4` in the project root:

```bash
cp /path/to/new-video.mp4 ./talal-video.mp4
git add talal-video.mp4
git commit -m "update video"
git push
```

## Swapping / adding duaas

Edit the `DUAAS` array in [`src/duaa-cycler.js`](src/duaa-cycler.js) — each duaa has `arabic`, `translit`, and `english`. Add as many as you like, they all rotate in.

## Adding the nasheed

Drop your `nasheed.mp3` into `assets/audio/nasheed.mp3` and push. The mute toggle handles autoplay restrictions gracefully — it'll be paused until the user taps it.

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

```
talal-blessing/
├── index.html
├── style.css
├── src/
│   ├── main.js              # boot
│   ├── key-scene.js         # 3D gold key (entry)
│   ├── duaa-cycler.js       # left panel duaa cycling
│   ├── effects.js           # fireworks, confetti, cursor trail
│   └── audio.js             # nasheed + creak SFX
├── talal-video.mp4          # background video (looped)
├── assets/audio/            # nasheed.mp3 (optional)
└── .nojekyll
```

---

Made with love by Shaid Hakkeem · [@shaidhms](https://linkedin.com/in/shaidhms) · [@shaid.hakkeem](https://instagram.com/shaid.hakkeem)
