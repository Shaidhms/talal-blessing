// Full-page auto-scrolling duaa stream. Renders all duaas stacked vertically,
// each filling the viewport, and continuously scrolls upward. A duplicate stack
// is appended so the scroll loops seamlessly.

const DUAAS = [
  {
    arabic: 'بارك الله لك',
    translit: 'Barakallahu Lak',
    english: 'May Allah bless you in every step, in every breath, and in every choice ahead.',
  },
  {
    arabic: 'اللهم بارك',
    translit: 'Allahumma Baarik',
    english: 'O Allah, place barakah in his time, his rizq, his health, and his heart.',
  },
  {
    arabic: 'اللهم احفظه',
    translit: 'Allahumma ahfazhu',
    english: 'O Allah, protect him from harm, from envy, from the evil eye — and shelter him under Your mercy.',
  },
  {
    arabic: 'رب اجعله من الصالحين',
    translit: 'Rabbi-jʿalhu mina al-saaliheen',
    english: 'My Lord, make him among the righteous — let his footsteps be ones You love.',
  },
  {
    arabic: 'اللهم اجعله قرة عين',
    translit: 'Allahumma-jʿalhu qurrata ʿayn',
    english: 'May Allah make him the coolness of his parents’ eyes — and a source of duaa for them in dunya and akhirah.',
  },
];

export class DuaaStream {
  constructor(container, { speed = 35, onEnd = () => {}, holdAtEndMs = 0 } = {}) {
    this.container = container;
    this.speed = speed;          // px/sec
    this.onEnd = onEnd;
    this.holdAtEndMs = holdAtEndMs;
    this.started = false;
    this.finished = false;
    this.y = 0;
    this._build();
  }

  // Total scroll distance needed to push the last card off-screen
  get scrollDistance() {
    return Math.max(0, this.trackA.offsetHeight - window.innerHeight * 0.4);
  }

  setSpeed(speed) { this.speed = speed; }

  reset() {
    this.y = 0;
    this.finished = false;
    this.started = false;     // allow start() to re-enter the rAF loop
    this.container.style.transition = 'none';
    this.container.style.transform = `translate3d(0, 0, 0)`;
  }

  _build() {
    // Single stack — plays through once and ends (no infinite loop)
    const buildBlock = (key) => {
      const wrap = document.createElement('div');
      wrap.className = 'stream-track';
      wrap.dataset.key = key;

      // Header
      const header = document.createElement('section');
      header.className = 'stream-card stream-header';
      header.innerHTML = `
        <div class="stream-ornament-top">
          <span class="orn-line"></span><span class="orn-diamond">✦</span><span class="orn-line"></span>
        </div>
        <div class="stream-eyebrow">For Our Beloved</div>
        <h1 class="stream-name">TALAL</h1>
      `;
      wrap.appendChild(header);

      DUAAS.forEach((d) => {
        const card = document.createElement('section');
        card.className = 'stream-card';
        card.innerHTML = `
          <div class="stream-arabic">${d.arabic}</div>
          <div class="stream-translit">${d.translit}</div>
          <div class="stream-divider"></div>
          <div class="stream-english">${d.english}</div>
        `;
        wrap.appendChild(card);
      });

      return wrap;
    };

    // Just one stack — plays once and then ends
    this.trackA = buildBlock('a');
    this.container.appendChild(this.trackA);
  }

  start() {
    if (this.started && !this.finished) return;
    this.started = true;
    this.finished = false;
    this._last = performance.now();
    this._loop();
  }

  pause() {
    this.started = false;
  }

  _loop() {
    if (!this.started || this.finished) return;
    const now = performance.now();
    const dt = (now - this._last) / 1000;
    this._last = now;
    this.y -= this.speed * dt;
    const blockHeight = this.trackA.offsetHeight;
    // End when the bottom of the track aligns with the bottom of the viewport
    // — closing card is fully visible in the lower portion of the column
    const endPoint = -(blockHeight - window.innerHeight);
    if (this.y <= endPoint) {
      this.y = endPoint;
      this.container.style.transform = `translate3d(0, ${this.y}px, 0)`;
      setTimeout(() => {
        this.finished = true;
        this.onEnd();
      }, this.holdAtEndMs);
      return;
    }
    this.container.style.transform = `translate3d(0, ${this.y}px, 0)`;
    requestAnimationFrame(() => this._loop());
  }
}
