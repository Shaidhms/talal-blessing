// Cycles through duaa cards on the left panel — one at a time, auto-fade.

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

export class DuaaCycler {
  constructor(stage, dotsContainer, { intervalMs = 5500 } = {}) {
    this.stage = stage;
    this.dotsContainer = dotsContainer;
    this.intervalMs = intervalMs;
    this.idx = 0;
    this.timer = null;
    this.cards = [];
    this.dots = [];

    this._build();
  }

  _build() {
    // Build a card per duaa, all stacked absolutely
    DUAAS.forEach((d, i) => {
      const card = document.createElement('div');
      card.className = 'duaa-card';
      card.innerHTML = `
        <div class="duaa-arabic">${d.arabic}</div>
        <div class="duaa-translit">${d.translit}</div>
        <div class="duaa-divider"></div>
        <div class="duaa-english">${d.english}</div>
      `;
      this.stage.appendChild(card);
      this.cards.push(card);

      const dot = document.createElement('button');
      dot.className = 'panel-dot';
      dot.setAttribute('aria-label', `Duaa ${i + 1}`);
      dot.addEventListener('click', () => this.show(i, true));
      this.dotsContainer.appendChild(dot);
      this.dots.push(dot);
    });

    this.show(0, false);
  }

  start() {
    this._scheduleNext();
  }

  pause() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  _scheduleNext() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const next = (this.idx + 1) % this.cards.length;
      this.show(next, true);
    }, this.intervalMs);
  }

  show(i, schedule) {
    this.idx = i;
    this.cards.forEach((c, ci) => {
      c.classList.toggle('active', ci === i);
    });
    this.dots.forEach((d, di) => {
      d.classList.toggle('active', di === i);
    });
    if (schedule) this._scheduleNext();
  }
}
