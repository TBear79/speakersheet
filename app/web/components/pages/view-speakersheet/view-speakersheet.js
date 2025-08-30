import { BaseComponent } from '/js/BaseComponent.js';

class AppViewSpeakersheet extends BaseComponent {
  static get observedAttributes() { return []; }

  #onCongregationEditClick = 'viewspeakersheet:congregationedit:click';
  #onElderCoordinatorEditClick = 'viewspeakersheet:eldercoordinatoredit:click';
  #onTalkCoordinatorEditClick = 'viewspeakersheet:talkcoordinatoredit:click';
  #onSpeakerAddClick = 'viewspeakersheet:speakeradd:click'
  #onSpeakerEditClick = 'viewspeakersheet:speakeredit:click';

  async render() {
    const query = new URLSearchParams({ 
      onCongregationEditClick: this.#onCongregationEditClick, 
      onElderCoordinatorEditClick: this.#onElderCoordinatorEditClick, 
      onTalkCoordinatorEditClick: this.#onTalkCoordinatorEditClick,
      onSpeakerAddClick: this.#onSpeakerAddClick,
      onSpeakerEditClick: this.#onSpeakerEditClick
      
    }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/pages/view-speakersheet/view-speakersheet-markup?${query}`).then(res => res.text()),
      fetch('/components/pages/view-speakersheet/view-speakersheet-styles').then(res => res.text()).catch(() => '')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#saveInitialLoadToSessionStorage();

    this.#setHtmlFromSessionStorage();

    this.#bindEvents();
  }

  // --------- Helpers / utils ---------
  #yesNo = v => (v ? 'Ja' : 'Nej');

  #formatPhone(phone) {
    if (!phone) return '';
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

    this.#setCongregation(jsonData?.congregation);
    this.#setElderCoordinator(jsonData?.elderCoordinator);
    this.#setTalkCoordinator(jsonData?.talkCoordinator);
    this.#setSpeakers(jsonData?.speakers);
  }

  #cardContent(cardName) {
    const card = this.requireElement(`app-card[name="${cardName}"]`);
    return this.requireElement('.replace-content', card);
  }

  // --------- Render sections via templates ---------

  #setCongregation(congregation) {
    if (!this.#isNonEmptyObject(congregation)) return;
    const host = this.#cardContent('congregation');
    host.innerHTML = '';
    const node = this.cloneTpl('tpl-congregation');
    this.setBindings(node, congregation);
    host.appendChild(node);
  }

  #setElderCoordinator(elderCoordinator) {
    if (!this.#isNonEmptyObject(elderCoordinator)) return;
    const host = this.#cardContent('elder-coordinator');
    host.innerHTML = '';
    const node = this.cloneTpl('tpl-person');

    const data = {
      ...elderCoordinator,
      phoneText: this.#formatPhone(elderCoordinator.phone)
    };

    this.setBindings(node, data);

    this.pruneIf(node, data);

    host.appendChild(node);
  }

  #setTalkCoordinator(talkCoordinator) {
    if (!this.#isNonEmptyObject(talkCoordinator)) return;
    const host = this.#cardContent('talk-coordinator');
    host.innerHTML = '';
    const node = this.cloneTpl('tpl-person');

    const data = {
      ...talkCoordinator,
      phoneText: this.#formatPhone(talkCoordinator.phone)
    };

    this.setBindings(node, data);
    this.pruneIf(node, data);

    host.appendChild(node);
  }

  #setSpeakers(speakers) {
    const list = this.#safeArray(speakers);
    if (list.length === 0) return;

    const host = this.#cardContent('speakers');
    host.innerHTML = '';

    // Sortér talere på navn (da-DK)
    const sorted = [...list].sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? '', 'da'));

    sorted.forEach((s, index) => {
      const node = this.#renderSpeaker(s);

      if (index === 0) {
        host.appendChild(node);
        return;
      } 
      
      const wrap = document.createElement('app-card-section');
      wrap.appendChild(node);
      host.appendChild(wrap);
    });
  }

  #renderSpeaker(speaker) {
    const node = this.cloneTpl('tpl-speaker');

    const data = {
      ...speaker,
      phoneText: this.#formatPhone(speaker.phone),
      funeralTalkText: this.#yesNo(!!speaker.funeralTalk),
      weddingTalkText: this.#yesNo(!!speaker.weddingTalk),
      memorialTalkText: this.#yesNo(!!speaker.memorialTalk)
    };

    this.setBindings(node, data);
    this.pruneIf(node, data);

    // Talks
    const talksFrag = this.#renderTalks(this.#safeArray(speaker.talks));
    this.appendToSlot(node, 'talks', talksFrag);

    return node;
  }

  #renderTalks(talks) {
    if (!Array.isArray(talks) || talks.length === 0) {
      const empty = this.cloneTpl('tpl-talkline');
      this.setBindings(empty, { language: '—', numbers: 'Ingen foredrag' });
      return empty;
    }

    // Grupér pr. sprog
    const byLang = talks.reduce((m, t) => {
      const lang = t?.language;

      if (!lang) return m;
      
      (m[lang] ||= []).push(t?.talkNumber);
      return m;
    }, {});

    const frag = document.createDocumentFragment();

    Object.entries(byLang)
      .sort(([a],[b]) => a.localeCompare(b, 'da'))
      .forEach(([language, nums]) => {
        const numbers = (nums || [])
          .filter(n => typeof n === 'number')
          .sort((a, b) => a - b)
          .join(', ');

        const line = this.cloneTpl('tpl-talkline');
        this.setBindings(line, { language: `${language}:`, numbers: numbers || '—' });
        frag.appendChild(line);
      });

    return frag;
  }

  // --------- Bind events ---------

  #bindEvents() {
    this.#bindCongregationEdit();
    this.#bindElderCoordinatorEdit();
    this.#bindTalkCoordinatorEdit();
    this.#bindSpeakerCoordinatorAdd();
    this.#bindSpeakerCoordinatorEdit();
  }

  #bindCongregationEdit() {
    this.addEventListener(this.#onCongregationEditClick, e => {
      console.log('[congragationEdit]', e);
    });
  }

  #bindElderCoordinatorEdit() {
    this.addEventListener(this.#onElderCoordinatorEditClick, e => {
      console.log('[elderCoordinatorEdit]', e);
    });
  }

  #bindTalkCoordinatorEdit() {
    this.addEventListener(this.#onTalkCoordinatorEditClick, e => {
      console.log('[talkCoordinatorEdit]', e);
    });
  }

  #bindSpeakerCoordinatorAdd() {
    this.addEventListener(this.#onSpeakerAddClick, e => {
      console.log('[speakerCoordinatorAdd]', e);
    });
  }

  #bindSpeakerCoordinatorEdit() {
    this.addEventListener(this.#onSpeakerEditClick, e => {
      const id = e.composedPath()
        .find(n => n instanceof Element && n.hasAttribute?.('data-speaker-id'))
        ?.getAttribute('data-speaker-id');

      if (!id) {
        console.warn('[speakerCoordinatorEdit] no speaker-id found', e);
        return;
      }

      console.log('[speakerCoordinatorEdit]', id, e.composedPath());
    });
  }
}

customElements.define('app-view-speakersheet', AppViewSpeakersheet);
