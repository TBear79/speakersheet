import { BaseComponent } from '/js/BaseComponent.js';

class AppViewSpeakersheet extends BaseComponent {
  static get observedAttributes() {
    return [];
  }

  async render() {
    const [html, css] = await Promise.all([
      fetch('/components/pages/view-speakersheet/view-speakersheet-markup').then(res => res.text()),
      fetch('/components/pages/view-speakersheet/view-speakersheet-styles').then(res => res.text()).catch(() => '')
    ]);

    // 1) Indsæt DOM først
    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    // 2) Gem evt. initial data i sessionStorage
    this.#saveInitialLoadToSessionStorage();

    // 3) Og SÅ populate kortene (nu findes noderne)
    this.#setHtmlFromSessionStorage();
  }

  // Helpers
  #jaNej = v => (v ? 'Ja' : 'Nej');

  #formatPhone(phone) {
    if (!phone) return '';
    // Tillad både string og { countryCode, number }
    if (typeof phone === 'string') return phone;
    const cc = phone.countryCode ?? '';
    const nr = phone.number ?? '';
    if (!cc && !nr) return '';
    return `${cc}${cc && nr ? ' ' : ''}${nr}`;
  }

  #isNonEmptyObject(obj) {
    return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
  }

  #safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  #saveInitialLoadToSessionStorage() {
    const initAttr = this.getAttribute('initialload');
    if (!initAttr) return;

    try {
      const jsonData = JSON.parse(initAttr);
      sessionStorage.setItem('speakersheetData', JSON.stringify(jsonData));
      this.removeAttribute('initialload');
    } catch (err) {
      console.error('[app-view-speakersheet] Kunne ikke parse initialload JSON:', err);
    }
  }

  #setHtmlFromSessionStorage() {
    const dataString = sessionStorage.getItem('speakersheetData');
    if (!dataString) return;

    let jsonData;
    try {
      jsonData = JSON.parse(dataString);
    } catch {
      console.warn('[app-view-speakersheet] speakersheetData indeholder ikke gyldig JSON.');
      return;
    }

    this.#setCongregationHtml(jsonData?.congregation);
    this.#setElderCoordinatorHtml(jsonData?.elderCoordinator);
    this.#setTalkCoordinatorHtml(jsonData?.talkCoordinator);
    this.#setSpeakersHtml(jsonData?.speakers);
  }

  // Sektion: Menighed
  #setCongregationHtml(congregation) {
    if (!this.#isNonEmptyObject(congregation)) return; // behold default tom-tekst

    const card = this.requireElement('app-card[name="congregation"]');
    const contentSlot = this.requireElement('[slot="card-content-slot"]', card);

    const {
      officialName = '',
      nickname = '',
      number = '',
      address = '',
      circuit = '',
      meetingTime = ''
    } = congregation ?? {};

    contentSlot.innerHTML = `
      <div class="display-rows">
        <div class="row"><span class="label">Navn:</span><span class="value">${officialName}</span></div>
        <div class="row"><span class="label">Kaldenavn:</span><span class="value">${nickname}</span></div>
        <div class="row"><span class="label">Menighedsnr.:</span><span class="value">${number}</span></div>
        <div class="row"><span class="label">Adresse:</span><span class="value">${address}</span></div>
        <div class="row"><span class="label">Kreds:</span><span class="value">${circuit}</span></div>
        <div class="row"><span class="label">Mødetid:</span><span class="value">${meetingTime}</span></div>
      </div>
    `;
  }

  // Sektion: Koordinator for ældsterådet
  #setElderCoordinatorHtml(elderCoordinator) {
    if (!this.#isNonEmptyObject(elderCoordinator)) return;

    const card = this.requireElement('app-card[name="elder-coordinator"]');
    const contentSlot = this.requireElement('[slot="card-content-slot"]', card);

    const {
      name = '',
      email = '',
      phone = '',
      address = '',
    } = elderCoordinator ?? {};

    const phoneText = this.#formatPhone(phone);

    contentSlot.innerHTML = `
      <div class="display-rows">
        <div class="row"><span class="label">Navn:</span><span class="value">${name}</span></div>
        <div class="row"><span class="label">Telefonnr.:</span><span class="value">${phoneText}</span></div>
        <div class="row"><span class="label">Email:</span><span class="value">${email}</span></div>
        <div class="row"><span class="label">Adresse:</span><span class="value">${address}</span></div>
      </div>
    `;
  }

  // Sektion: Foredragskoordinator
  #setTalkCoordinatorHtml(talkCoordinator) {
    if (!this.#isNonEmptyObject(talkCoordinator)) return;

    const card = this.requireElement('app-card[name="talk-coordinator"]');
    const contentSlot = this.requireElement('[slot="card-content-slot"]', card);

    const {
      name = '',
      email = '',
      phone = '',
    } = talkCoordinator ?? {};

    const phoneText = this.#formatPhone(phone);

    contentSlot.innerHTML = `
      <div class="display-rows">
        <div class="row"><span class="label">Navn:</span><span class="value">${name}</span></div>
        <div class="row"><span class="label">Telefonnr.:</span><span class="value">${phoneText}</span></div>
        <div class="row"><span class="label">Email:</span><span class="value">${email}</span></div>
      </div>
    `;
  }

  // Sektion: Foredragsholdere
  #setSpeakersHtml(speakers) {
    const list = this.#safeArray(speakers);
    if (list.length === 0) return;

    const card = this.requireElement('app-card[name="speakers"]');
    const contentSlot = this.requireElement('[slot="card-content-slot"]', card);

    // Sortér talere på navn (da-DK)
    const sorted = [...list].sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? '', 'da'));

    contentSlot.innerHTML = sorted.map((s, index) => this.#getSpeakerHtml(s, index)).join('');
  }

  #getSpeakerHtml(speaker, index) {
    const {
      name = '',
      email = '',
      phone = '',
      funeralTalk = false,
      weddingTalk = false,
      memorialTalk = false,
      talks = []
    } = speaker ?? {};

    const phoneText = this.#formatPhone(phone);
    const emailHtml = !email ? '' : `<div class="row"><span class="label">Email:</span><span class="value">${email}</span></div>`;

    const talksHtml = this.#getTalksHtml(this.#safeArray(talks));

    const html = `<h3>${name}</h3>
      <div class="display-rows">
        <div class="row"><span class="label">Telefonnr.:</span><span class="value">${phoneText}</span></div>
        ${emailHtml}
        <div class="row"><span class="label">Begravelsesforedrag:</span><span class="value">${this.#jaNej(funeralTalk)}</span></div>
        <div class="row"><span class="label">Bryllupsforedrag:</span><span class="value">${this.#jaNej(weddingTalk)}</span></div>
        <div class="row"><span class="label">Mindehøjtidsforedrag:</span><span class="value">${this.#jaNej(memorialTalk)}</span></div>
        <div class="talks">
          <h4>Foredrag:</h4>
          ${talksHtml}
        </div>
      </div>`;

    return index === 0 ? html : `<app-card-section>${html}</app-card-section>`;
  }

  #getTalksHtml(talks) {
    if (!Array.isArray(talks) || talks.length === 0) {
      return `<div class="display-rows"><div class="row"><span class="label">—</span><span class="value">Ingen foredrag</span></div></div>`;
    }

    const languages = [...new Set(
      talks
        .map(t => t?.language)
        .filter(Boolean)
    )];

    const talkLines = languages
      .sort((a, b) => a.localeCompare(b, 'da'))
      .map(lang => {
        const nums = talks
          .filter(t => t?.language === lang && typeof t?.talkNumber === 'number')
          .sort((a, b) => a.talkNumber - b.talkNumber)
          .map(t => t.talkNumber)
          .join(', ');

        return [lang, nums];
      });

    return talkLines.map(([language, numbers]) => `
      <div class="display-rows">
        <div class="row"><span class="label">${language}:</span><span class="value">${numbers || '—'}</span></div>
      </div>
    `).join('');
  }
}

customElements.define('app-view-speakersheet', AppViewSpeakersheet);
