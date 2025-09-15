// app-rich-select.js
// -----------------------------------------------------------------------------
// <app-rich-select name="country" placeholder="Vælg land" no-result-text="Ingen resultater" endpoint="/api/countries/search" min-chars="3"></app-rich-select>
//
// Slots:
// - default: (optional) static options as light-DOM <option value="...">Label</option> elements
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
// - change              : fires when a value is chosen; detail: { value, label }
// - input               : fires on each keystroke; detail: { query }
// - open/close          : when popup opens/closes
// - fetch-start/fetch-end/fetch-error : for remote endpoint searches
//
// Keyboard & A11y:
// - Implements ARIA Combobox pattern (input role=combobox, popup role=listbox, items role=option)
// - ArrowDown/ArrowUp to move, Enter to select, Esc to close, Tab to accept current typed value
// - Home/End jump in list, PageUp/PageDown move by 5
// - Announces results via aria-live region
//
// Notes:
// - Static options: place <option value="x">Label</option> children inside the element. They will be parsed.
// - Remote search: when "endpoint" is set and input length >= min-chars, a debounced GET is made to `${endpoint}?q=${encodeURIComponent(query)}`.
// - If both static options and endpoint exist, static options are used for short queries; remote results replace list once query >= min-chars.
// - The special no-result item is focusable=false and not selectable.
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

  get typeaheadEnabled() { return !this.hasAttribute("typeahead") || this.getAttribute("typeahead") !== "false"; }
  set typeaheadEnabled(v) { this.setAttribute("typeahead", v ? "true" : "false"); }

  // ----- internals
  _input = null;         // HTMLInputElement
  _button = null;        // toggle
  _list = null;          // role=listbox
  _live = null;          // aria-live region
  _wrapper = null;       // host container
  _open = false;
  _options = [];         // { value, label, el }
  _filtered = [];        // filtered options
  _activeIndex = -1;
  _debounceTimer = 0;
  _lastQuery = "";
  _isRemote = false;
  _suppressTypeahead = false; // <-- backspace/delete guard

  static _tplHtml = null;
  static _tplCss = null;

  connectedCallback() {
    super.connectedCallback?.();
    // Defer to render()
  }

  async render() {
    const html = AppRichSelect._tplHtml ||= await fetch('/components/atoms/rich-select/rich-select-markup').then(r => r.text());
    const css = AppRichSelect._tplCss ||= await fetch('/components/atoms/rich-select/rich-select-styles').then(r => r.text());

    this.shadowRoot.innerHTML = `<style>${css}</style>` + html;

    // refs
    this._wrapper = this.shadowRoot.querySelector('.rs');
    this._input = this.shadowRoot.querySelector('input[role="combobox"]');
    this._button = this.shadowRoot.querySelector('.rs__toggle');
    this._list = this.shadowRoot.querySelector('[role="listbox"]');
    this._live = this.shadowRoot.querySelector('.rs__live');

    // apply attrs
    this._input.placeholder = this.placeholder;
    this._input.autocomplete = this.autoComplete;
    this._input.disabled = this.disabled;
    this._input.value = this.value;

    // parse light-DOM <option> children
    this.#loadStaticOptions();
    this.#syncList(this._options);

    this.#bindEvents();
    this.#reflectOpen(false);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected || oldVal === newVal) return;
    switch (name) {
      case 'placeholder': if (this._input) this._input.placeholder = this.placeholder; break;
      case 'value': if (this._input && this._input.value !== this.value) this._input.value = this.value; break;
      case 'disabled': if (this._input) this._input.disabled = this.disabled; break;
      case 'autocomplete': if (this._input) this._input.autocomplete = this.autoComplete; break;
      case 'endpoint': this._isRemote = !!this.endpoint; break;
      case 'min-chars': /* no-op */ break;
      case 'no-result-text': /* no-op */ break;
      case 'typeahead': /* no-op */ break;
    }
  }

  // ----- private helpers
  #bindEvents() {
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
    document.addEventListener('mousedown', this.#onDocMouseDown, true);

    // option click (event delegation)
    this._list?.addEventListener('click', (e) => {
      const item = e.target?.closest('[role="option"]');
      if (!item || item.getAttribute('aria-disabled') === 'true') return;
      const idx = +item.dataset.index;
      this.#commitByIndex(idx);
    });
  }

  #onDocMouseDown = (e) => {
    if (!this._open) return;
    if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
      this.#close();
    }
  }

  #onKeyDown(e) {
    // mark delete/backspace so we don't immediately re-apply typeahead
    if (e.key === 'Backspace' || e.key === 'Delete') {
      this._suppressTypeahead = true;
    }

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

  #toggle() { this._open ? this.#close() : this.#open(); }
  #open() {
    if (this._open || this.disabled) return;
    this._open = true;
    this.#reflectOpen(true);
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
    if (this._input) {
      this._input.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  #loadStaticOptions() {
    const slot = this.shadowRoot.querySelector('slot');
    const lightOpts = (slot?.assignedElements?.({ flatten: true }) || [])
      .flatMap(el => el.tagName === 'OPTION' ? [el] : []);
    this._options = lightOpts.map((opt, i) => ({ value: opt.value ?? '', label: opt.textContent?.trim() ?? '', el: null }));
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
        this._filtered = Array.isArray(data) ? data.map(d => ({ value: String(d.value ?? ''), label: String(d.label ?? ''), el: null })) : [];
        this.#syncList(this._filtered, query);
        this.dispatchEvent(new CustomEvent('fetch-end', { detail: { query, count: this._filtered.length }, bubbles: true }));
      } catch (err) {
        console.error('[app-rich-select] fetch error', err);
        this.dispatchEvent(new CustomEvent('fetch-error', { detail: { query, error: String(err) }, bubbles: true }));
        this._filtered = [];
        this.#syncList(this._filtered, query);
      }
    }, 250);
  }

  #syncList(items, query = '') {
    // Clear list
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

    // pick first by default after filtering
    this.#setActive(items.length ? 0 : -1);

    // ARIA activedescendant wiring
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
    this._list.querySelectorAll('.rs__item').forEach(el => el.classList.remove('rs__item--active'));
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
    this._input.value = it.label; // display label in input
    this.#close();
    this.dispatchEvent(new CustomEvent('change', { detail: { value: it.value, label: it.label, name: this.name }, bubbles: true }));
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
    // Suppress when editing mid-string or when a range is selected
    if (hasSelection) return true;
    if (!caretAtEnd) return true;
    return false;
  }
}

customElements.define('app-rich-select', AppRichSelect);
