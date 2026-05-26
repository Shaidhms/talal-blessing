// Full-page auto-scrolling duaa stream. Renders all duaas stacked vertically,
// each filling the viewport, and continuously scrolls upward. A duplicate stack
// is appended so the scroll loops seamlessly.

const DUAAS = [
  {
    arabic: 'ما شاء الله تبارك الله',
    translit: 'MashaAllah · Tabarakallah',
    english: 'What Allah has willed has happened — and may He bless you abundantly.',
  },
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
  {
    arabic: 'آمين',
    translit: 'Ameen',
    english: 'May Allah grant you a long, blessed, and righteous life. Ameen ya Rabb al-ʿalameen.',
  },
];

export class DuaaStream {
  constructor(container, { speed = 35 } = {}) {
    this.container = container;
    this.speed = speed;          // px/sec
    this.started = false;
    this.y = 0;
    this._build();
  }

  _build() {
    // Two copies of every duaa back-to-back, with header + footer surrounding.
    const buildBlock = (key) => {
      const wrap = document.createElement('div');
      wrap.className = 'stream-track';
      wrap.dataset.key = key;

      // Header (first block only)
      const header = document.createElement('section');
      header.className = 'stream-card stream-header';
      header.innerHTML = `
        <div class="stream-ornament-top">
          <span class="orn-line"></span><span class="orn-diamond">✦</span><span class="orn-line"></span>
        </div>
        <div class="stream-eyebrow">For Our Beloved</div>
        <h1 class="stream-name">TALAL</h1>
        <div class="stream-eyebrow stream-sub">A Royal Blessing</div>
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

      // Closing card
      const closing = document.createElement('section');
      closing.className = 'stream-card stream-closing';
      closing.innerHTML = `
        <div class="stream-ameen-large">آمين</div>
        <div class="stream-divider"></div>
        <div class="stream-closing-text">With love, from your uncle</div>
        <div class="stream-closing-name">Shaid Hakkeem</div>
        <div class="stream-closing-handles">
          <a href="https://linkedin.com/in/shaidhms" target="_blank" rel="noopener">@shaidhms</a>
          <span class="dot">·</span>
          <a href="https://instagram.com/shaid.hakkeem" target="_blank" rel="noopener">@shaid.hakkeem</a>
        </div>
      `;
      wrap.appendChild(closing);

      return wrap;
    };

    this.trackA = buildBlock('a');
    this.trackB = buildBlock('b');
    this.container.appendChild(this.trackA);
    this.container.appendChild(this.trackB);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this._last = performance.now();
    this._loop();
  }

  pause() {
    this.started = false;
  }

  _loop() {
    if (!this.started) return;
    const now = performance.now();
    const dt = (now - this._last) / 1000;
    this._last = now;
    this.y -= this.speed * dt;
    // Loop when first copy fully scrolled past
    const blockHeight = this.trackA.offsetHeight;
    if (Math.abs(this.y) >= blockHeight) {
      this.y += blockHeight;  // jump back by exactly one block — seamless because B is identical
    }
    this.container.style.transform = `translate3d(0, ${this.y}px, 0)`;
    requestAnimationFrame(() => this._loop());
  }
}
