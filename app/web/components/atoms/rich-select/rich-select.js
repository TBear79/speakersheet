// components/atoms/rich-select/rich-select.js
// -----------------------------------------------------------------------------
// <app-rich-select
//   name="country"
//   placeholder="Vælg land"
//   no-result-text="Ingen resultater"
//   endpoint="/api/countries/search"
//   min-chars="3"
//   autocomplete="off"
//   typeahead="true"
// ></app-rich-select>
//
// Slots:
// - default: (optional) statiske options som light-DOM <option value="...">Label</option>
//
// Attributes:
// - name                : string identifier used in dispatched events
// - value               : current selected value (reflects)
// - placeholder         : input placeholder text
// - disabled            : boolean; disables control
// - endpoint            : URL to search endpoint returning JSON array of { value, label }
// - min-chars           : number; characters before remote search triggers (default 3)
// - no-result-text      : string; text for non-selectable empty state (default "Ingen resultater")
// - autocomplete        : string; forwarded to inner <input autocomplete="...">
// - typeahead           : boolean; enables inline suggestion completion (default on)
//
// Events:
// - change              : fires when a value is chosen; detail: { value, label, name }
// - input               : fires on each keystroke; detail: { query }
// - open/close          : when popup opens/closes
// - fetch-start/fetch-end/fetch-error : for remote endpoint searches
//
// Keyboard & A11y:
// - ARIA Combobox pattern (input role=combobox, popup role=listbox, items role=option)
// - ArrowDown/ArrowUp to move, Enter to select, Esc/Tab to close
// - Home/End jump, PageUp/PageDown move by 5
// - Results announced via aria-live region
// -----------------------------------------------------------------------------

import { BaseComponent } from "/js/BaseComponent.js";

export class AppRichSelect extends BaseComponent {
  static get observedAttributes() {
    return [
      "name",
      "value",
      "placeholder",
      "disabled",
      "endpoint",
      "min-chars",
      "no-result-text",
      "autocomplete",
      "typeahead"
    ];
  }

  // ----- public props
  get name() { return this.getAttribute("name") || ""; }
  set name(v) { this.setAttribute("name", v ?? ""); }

  get value() { return this.getAttribute("value") || ""; }
  set value(v) { this.setAttribute("value", v ?? ""); }

  get placeholder() { return this.getAttribute("placeholder") || ""; }
  set placeholder(v) { this.setAttribute("placeholder", v ?? ""); }

  get disabled() { return this.hasAttribute("disabled"); }
  set disabled(v) { this.toggleAttribute("disabled", !!v); }

  get endpoint() { return this.getAttribute("endpoint") || ""; }
  set endpoint(v) { this.setAttribute("endpoint", v ?? ""); }

  get minChars() { return +(this.getAttribute("min-chars") || 3); }
  set minChars(v) { this.setAttribute("min-chars", String(v ?? 3)); }

  get noResultText() { return this.getAttribute("no-result-text") || "Ingen resultater"; }
  set noResultText(v) { this.setAttribute("no-result-text", v ?? "Ingen resultater"); }

  get autoComplete() { return this.getAttribute("autocomplete") || "off"; }
  set autoComplete(v) { this.setAttribute("autocomplete", v ?? "off"); }

  get typeaheadEnabled() {
    return !this.hasAttribute("typeahead") || this.getAttribute("typeahead") !== "false";
  }
  set typeaheadEnabled(v) { this.setAttribute("typeahead", v ? "true" : "false"); }

  // ----- internals
  _input = null;         // HTMLInputElement
  _button = null;        // toggle
  _list = null;          // role=listbox
  _live = null;          // aria-live region
  _wrapper = null;       // host container (.rs)
  _popup = null;         // .rs__popup (bliver i shadow)
  _slot = null;

  _open = false;
  _options = [];         // { value, label, el }
  _filtered = [];        // filtered options
  _activeIndex = -1;
  _debounceTimer = 0;
  _lastQuery = "";
  _isRemote = false;
  _suppressTypeahead = false;

  _onDocMouseDown = null;
  _onScrollReposition = null;
  _onResizeReposition = null;

  connectedCallback() {
    super.connectedCallback?.();
  }

  disconnectedCallback() {
    document.removeEventListener('mousedown', this._onDocMouseDown, true);
    window.removeEventListener('scroll', this._onScrollReposition, true);
    window.removeEventListener('resize', this._onResizeReposition);
    super.disconnectedCallback?.();
  }

  async render() {
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/atoms/rich-select/rich-select-markup'),
      this.fetchWithCache('/components/atoms/rich-select/rich-select-styles')
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>` + html;

    // refs
    this._wrapper = this.shadowRoot.querySelector('.rs');
    this._input   = this.shadowRoot.querySelector('input[role="combobox"]');
    this._button  = this.shadowRoot.querySelector('.rs__toggle');
    this._popup   = this.shadowRoot.querySelector('.rs__popup');
    this._list    = this.shadowRoot.querySelector('[role="listbox"]');
    this._live    = this.shadowRoot.querySelector('.rs__live');
    this._slot    = this.shadowRoot.querySelector('slot');

    // apply attrs
    this._input.placeholder = this.placeholder;
    this._input.autocomplete = this.autoComplete;
    this._input.disabled = this.disabled;
    this._input.value = this.value;

    // parse static <option> children
    this.#loadStaticOptions();
    this.#syncList(this._options);

    // bind events
    this.#bindEvents();

    // initial state
    this.#reflectOpen(false);
    this._isRemote = !!this.endpoint;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected || oldVal === newVal) return;
    switch (name) {
      case 'placeholder': if (this._input) this._input.placeholder = this.placeholder; break;
      case 'value': if (this._input && this._input.value !== this.value) this._input.value = this.value; break;
      case 'disabled': if (this._input) this._input.disabled = this.disabled; break;
      case 'autocomplete': if (this._input) this._input.autocomplete = this.autoComplete; break;
      case 'endpoint': this._isRemote = !!this.endpoint; break;
      case 'min-chars':
      case 'no-result-text':
      case 'typeahead':
        break;
    }
  }

  // ----- events
  #bindEvents() {
    // Åben ved klik/fokus i input – så man kan vælge uden at skrive
    this._input?.addEventListener('focus', () => { if (!this._open) this.#open(); });
    this._input?.addEventListener('click', () => { if (!this._open) this.#open(); });

    // toggle button
    this._button?.addEventListener('click', () => {
      if (this.disabled) return;
      this.#toggle();
      if (this._open) this._input.focus();
    });

    // input typing
    this._input?.addEventListener('input', (e) => {
      const q = this._input.value;
      const inputType = e?.inputType || '';
      this.dispatchEvent(new CustomEvent('input', { detail: { query: q }, bubbles: true }));
      this.#filterAndMaybeFetch(q, inputType);
    });

    // keyboard nav
    this._input?.addEventListener('keydown', (e) => this.#onKeyDown(e));

    // click outside
    this._onDocMouseDown = (e) => {
      if (!this._open) return;
      const inHost  = this.contains(e.target) || this.shadowRoot.contains(e.target);
      if (!inHost) this.#close();
    };
    document.addEventListener('mousedown', this._onDocMouseDown, true);

    // option click (event delegation)
    this._list?.addEventListener('click', (e) => {
      const item = e.target?.closest('[role="option"]');
      if (!item || item.getAttribute('aria-disabled') === 'true') return;
      const idx = +item.dataset.index;
      this.#commitByIndex(idx);
    });

    // hold options i sync ved dynamisk slot-indhold
    this._slot?.addEventListener('slotchange', () => {
      this.#loadStaticOptions();
      const q = (this._input?.value || '').trim();
      q ? this.#filterAndMaybeFetch(q) : this.#syncList(this._options);
      if (this._open) this.#positionPopup(); // hvis højde ændres
    });

    // repositionér ved scroll/resize
    this._onScrollReposition = () => { if (this._open) this.#positionPopup(); };
    this._onResizeReposition = () => { if (this._open) this.#positionPopup(); };
    window.addEventListener('scroll', this._onScrollReposition, true);
    window.addEventListener('resize', this._onResizeReposition, { passive: true });
  }

  #onKeyDown(e) {
    // mark delete/backspace så vi ikke autocompleter midt i redigering
    if (e.key === 'Backspace' || e.key === 'Delete') this._suppressTypeahead = true;

    if (!this._open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.#open();
      this.#moveActive(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.#moveActive(1); break;
      case 'ArrowUp': e.preventDefault(); this.#moveActive(-1); break;
      case 'Home': this.#setActive(0); break;
      case 'End': this.#setActive(this._filtered.length - 1); break;
      case 'PageDown': this.#moveActive(5); break;
      case 'PageUp': this.#moveActive(-5); break;
      case 'Enter':
        if (this._open && this._activeIndex >= 0) {
          e.preventDefault();
          this.#commitByIndex(this._activeIndex);
        }
        break;
      case 'Escape': this.#close(); break;
      case 'Tab': this.#close(); break;
    }
  }

  // ----- open/close
  #toggle() { this._open ? this.#close() : this.#open(); }

  #open() {
    if (this._open || this.disabled) return;
    // Hvis remote uden query og ingen statiske options:
    // vis tom liste med "Ingen resultater" (eller en custom tekst hvis du vil)
    if (!this._options.length && this._isRemote && (this._input.value || '').trim().length < this.minChars) {
      this._filtered = [];
      this.#syncList(this._filtered, '');
    } else if (!this._input.value) {
      // tomt input -> vis alle lokale options
      this._filtered = this._options.slice();
      this.#syncList(this._filtered, '');
    }
    this._open = true;
    this.#reflectOpen(true);
    this.#positionPopup();
    this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
  }

  #close() {
    if (!this._open) return;
    this._open = false;
    this.#reflectOpen(false);
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  #reflectOpen(open) {
    this._wrapper?.classList.toggle('rs--open', !!open);
    if (this._input) this._input.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // ----- data ops
  #loadStaticOptions() {
    // Bemærk: option-børn ligger i light-DOM inde i <app-rich-select>, ikke i shadow
    const opts = Array.from(this.children).filter(el => el.tagName === 'OPTION');
    this._options = opts.map(opt => ({
      value: opt.value ?? '',
      label: (opt.textContent || '').trim(),
      el: null
    }));
  }

  #filterAndMaybeFetch(q, inputType = '') {
    const query = (q || '').trim();
    this._lastQuery = query;

    if (this._isRemote && query.length >= this.minChars) {
      this.#debouncedFetch(query);
    } else {
      this.#filterLocal(query);
    }

    if (!this._open) this.#open();
    if (this.typeaheadEnabled && !this.#shouldSuppressTypeahead(inputType)) this.#applyTypeahead(query);
    if (this._open) this.#positionPopup(); // hold placering og max-height korrekt
  }

  #filterLocal(query) {
    const q = query.toLowerCase();
    this._filtered = this._options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
    this.#syncList(this._filtered, query);
  }

  #debouncedFetch(query) {
    window.clearTimeout(this._debounceTimer);
    this._debounceTimer = window.setTimeout(async () => {
      this.dispatchEvent(new CustomEvent('fetch-start', { detail: { query }, bubbles: true }));
      try {
        const url = new URL(this.endpoint, window.location.origin);
        url.searchParams.set('q', query);
        const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json(); // expects [{ value, label }]
        this._filtered = Array.isArray(data)
          ? data.map(d => ({ value: String(d.value ?? ''), label: String(d.label ?? ''), el: null }))
          : [];
        this.#syncList(this._filtered, query);
        this.dispatchEvent(new CustomEvent('fetch-end', { detail: { query, count: this._filtered.length }, bubbles: true }));
      } catch (err) {
        console.error('[app-rich-select] fetch error', err);
        this.dispatchEvent(new CustomEvent('fetch-error', { detail: { query, error: String(err) }, bubbles: true }));
        this._filtered = [];
        this.#syncList(this._filtered, query);
      } finally {
        if (this._open) this.#positionPopup();
      }
    }, 250);
  }

  #syncList(items, query = '') {
    this._list.innerHTML = '';

    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'rs__nores';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-disabled', 'true');
      li.textContent = this.noResultText;
      this._list.appendChild(li);
      this._activeIndex = -1;
      this.#announce(`${this.noResultText}.`);
      // stadig mulighed for at klikke på toggle/input igen; listen er bare tom/disabled item
      return;
    }

    const frag = document.createDocumentFragment();
    items.forEach((it, idx) => {
      const li = document.createElement('li');
      li.className = 'rs__item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = String(idx);
      li.dataset.value = it.value;
      li.textContent = it.label;
      it.el = li;
      frag.appendChild(li);
    });
    this._list.appendChild(frag);

    // pick first by default after filtering (så Enter virker straks)
    this.#setActive(items.length ? 0 : -1);
    this.#wireActiveDescendant();
    this.#announce(`${items.length} resultater.`);
  }

  #wireActiveDescendant() {
    const activeEl = this._list.querySelector('.rs__item.rs__item--active');
    if (activeEl) this._input.setAttribute('aria-activedescendant', activeEl.id || (activeEl.id = `${this.name || 'rs'}-opt-${this._activeIndex}`));
    else this._input.removeAttribute('aria-activedescendant');
  }

  #setActive(index) {
    const max = this._filtered.length - 1;
    if (index < 0 || max < 0) {
      this._activeIndex = -1;
      this.#updateActiveStyles();
      this.#wireActiveDescendant();
      return;
    }
    this._activeIndex = Math.max(0, Math.min(index, max));
    this.#updateActiveStyles();
    this.#ensureInView();
    this.#wireActiveDescendant();
  }

  #moveActive(delta) { this.#setActive(this._activeIndex + delta); }

  #updateActiveStyles() {
    this._list.querySelectorAll('.rs__item').forEach(el => {
      el.classList.remove('rs__item--active');
      el.setAttribute('aria-selected', 'false');
    });
    if (this._activeIndex >= 0) {
      const el = this._list.querySelector(`[data-index="${this._activeIndex}"]`);
      el?.classList.add('rs__item--active');
      el?.setAttribute('aria-selected', 'true');
    }
  }

  #ensureInView() {
    const el = this._list.querySelector(`[data-index="${this._activeIndex}"]`);
    if (!el) return;
    const listRect = this._list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.top < listRect.top) this._list.scrollTop -= (listRect.top - elRect.top);
    else if (elRect.bottom > listRect.bottom) this._list.scrollTop += (elRect.bottom - listRect.bottom);
  }

  #commitByIndex(idx) {
    const it = this._filtered[idx];
    if (!it) return;
    this.value = it.value;
    this._input.value = it.label; // vis label i inputfeltet
    this.#close();
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: it.value, label: it.label, name: this.name },
      bubbles: true
    }));
  }

  #applyTypeahead(query) {
    if (!query) return;
    const first = this._filtered[0];
    if (!first) return;
    const label = first.label;
    if (!label.toLowerCase().startsWith(query.toLowerCase())) return;

    // inline completion: set input value to label and select the completion part
    this._input.value = label;
    const start = query.length;
    this._input.setSelectionRange(start, label.length);
  }

  #announce(text) { if (this._live) this._live.textContent = text; }

  #shouldSuppressTypeahead(inputType = '') {
    if (this._suppressTypeahead) { this._suppressTypeahead = false; return true; }
    if (!this._input) return false;
    const isDeletion = inputType.startsWith('delete');
    if (isDeletion) return true;
    const hasSelection = this._input.selectionStart !== this._input.selectionEnd;
    const caretAtEnd = this._input.selectionStart === this._input.value.length && this._input.selectionEnd === this._input.value.length;
    if (hasSelection) return true;
    if (!caretAtEnd) return true;
    return false;
  }

  // ----- placement: flip up if no space below (stay in shadow DOM)
  #positionPopup() {
    if (!this._popup) return;
    // Sørg for at .rs (wrapper) er positioneret relativt (det er den i din CSS via .rs { position: relative; })
    const ctrl = this.shadowRoot.querySelector('.rs__control');
    if (!ctrl) return;

    const gap = 4; // px afstand mellem control og popup
    const r = ctrl.getBoundingClientRect();
    const vh = window.innerHeight;

    // Hvor meget plads har vi?
    const spaceBelow = Math.max(0, vh - r.bottom - gap);
    const spaceAbove = Math.max(0, r.top - gap);

    // Hent listehøjde (naturlig) og sæt max-height inden vi flipper
    const list = this._popup.querySelector('.rs__list');
    const naturalMax = 14 * 16; // ~14rem som i CSS
    const desired = Math.min(list?.scrollHeight || 0, naturalMax);

    // Vælg position: nedenunder hvis pladsen er ok, ellers ovenover
    const placeAbove = spaceBelow < Math.min(desired, 200) && spaceAbove > spaceBelow;

    // Nulstil begge, sæt den ene
    this._popup.style.top = '';
    this._popup.style.bottom = '';
    if (placeAbove) {
      // popup over control
      this._popup.style.bottom = `calc(100% + ${gap}px)`;
      const maxH = Math.max(100, Math.min(spaceAbove, naturalMax)); // giv altid mindst ~100px
      if (list) list.style.maxHeight = `${Math.round(maxH)}px`;
    } else {
      // popup under control
      this._popup.style.top = `calc(100% + ${gap}px)`;
      const maxH = Math.max(120, Math.min(spaceBelow, naturalMax));
      if (list) list.style.maxHeight = `${Math.round(maxH)}px`;
    }
  }
}

customElements.define('app-rich-select', AppRichSelect);
