// Preloads the extracted video frames and exposes the current frame image
// for the door-scene to paint onto the frame plane.

export class FrameScrubber {
  constructor({ count = 200, basePath = 'assets/frames/', onProgress = () => {} } = {}) {
    this.count = count;
    this.basePath = basePath;
    this.images = new Array(count);
    this.loaded = 0;
    this.onProgress = onProgress;
    this.ready = false;
    this._currentIndex = 0;
  }

  async load() {
    const promises = [];
    for (let i = 0; i < this.count; i++) {
      promises.push(this._loadOne(i));
    }
    await Promise.all(promises);
    this.ready = true;
  }

  _loadOne(i) {
    return new Promise((resolve) => {
      const img = new Image();
      const num = String(i + 1).padStart(3, '0');
      img.onload = () => {
        this.images[i] = img;
        this.loaded++;
        this.onProgress(this.loaded / this.count);
        resolve();
      };
      img.onerror = () => {
        // Even on error, resolve so we don't hang the loader
        this.loaded++;
        this.onProgress(this.loaded / this.count);
        resolve();
      };
      img.src = `${this.basePath}frame-${num}.jpg`;
    });
  }

  // progress: 0..1 across the video frames
  getFrameAt(progress) {
    const idx = Math.max(0, Math.min(this.count - 1, Math.floor(progress * (this.count - 1))));
    this._currentIndex = idx;
    return this.images[idx] || null;
  }

  get currentIndex() { return this._currentIndex; }
}
