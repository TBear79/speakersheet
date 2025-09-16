import { BaseComponent } from '/js/BaseComponent.js';

// <time-picker name="startTime" value="08:30" format="24" step="5" use-native="auto"></time-picker>
// Attributter:
// - name: event-identifikator
// - value: HH:mm (24h) – kan også sættes via initial-value eller elementets tekstindhold (ved første render)
// - initial-value: HH:mm (fallback hvis value ikke er sat)
// - format: "24" | "12" (kun custom UI; native følger device/locale) – default "24"
// - step: minut-interval (default 1) – bruges i custom og som sekund-step i native (step * 60)
// - min / max: HH:mm (24h)
// - disabled, required, placeholder
// - use-native: "auto" | "always" | "never" (default: auto)
//
// Events:
// - 'change' (bubbles)
// - 'time-change' (bubbles) => detail { name, value, hours, minutes }

export class AppTimePicker extends BaseComponent {
  static get observedAttributes() {
    return [
      'name', 'value', 'initial-value', 'format', 'step', 'min', 'max',
      'disabled', 'required', 'placeholder', 'use-native'
    ];
  }

  // ----- public props
  get name() { return this.getAttribute('name') || ''; }
  set name(v) { this.setAttribute('name', v ?? ''); }

  get value() { return this.getAttribute('value') || ''; } // HH:mm (24h)
  set value(v) { v == null ? this.removeAttribute('value') : this.setAttribute('value', v); }

  get format() { return (this.getAttribute('format') || '24').toLowerCase(); }
  set format(v) { this.setAttribute('format', v === '12' ? '12' : '24'); }

  get step() { const s = parseInt(this.getAttribute('step') || '1', 10); return Number.isFinite(s) && s > 0 ? s : 1; }
  set step(v) { this.setAttribute('step', String(v ?? 1)); }

  get min() { return this.getAttribute('min') || ''; }
  set min(v) { v ? this.setAttribute('min', v) : this.removeAttribute('min'); }

  get max() { return this.getAttribute('max') || ''; }
  set max(v) { v ? this.setAttribute('max', v) : this.removeAttribute('max'); }

  get required() { return this.hasAttribute('required'); }
  set required(v) { this.toggleAttribute('required', !!v); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  get placeholder() { return this.getAttribute('placeholder') || 'Select time'; }
  set placeholder(v) { this.setAttribute('placeholder', v ?? ''); }

  get useNative() { return (this.getAttribute('use-native') || 'auto').toLowerCase(); }
  set useNative(v) { this.setAttribute('use-native', v || 'auto'); }

  // ----- internals
  #supportsNativeTime = false;
  #els = {};
  #nativeEditing = false;
  #editPrevDigitsLen = 0;

  async render() {
    this.#supportsNativeTime = AppTimePicker.detectNativeTimeSupport();

    // Hent markup og styles via endpoints (-markup / -styles)

    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/atoms/time-picker/time-picker-markup'),
      this.fetchWithCache('/components/atoms/time-picker/time-picker-styles')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#cacheRefs();
    this.#chooseUIMode();
    this.#applyInitialValue();
    this.#bind();
    this.#syncUIFromValue();
    this.#applyDisabledState();

    // Sørg for at :host har format-attribut (til CSS). Undgå recursion ved kun at sætte hvis den mangler.
    if (!this.hasAttribute('format')) this.setAttribute('format', this.format);
  }

  #cacheRefs() {
    const $ = (s) => this.shadowRoot.querySelector(s);
    this.#els.nativeWrap = $('[data-tp-native]');
    this.#els.nativeInput = this.shadowRoot.querySelector('input[type="time"]');
    this.#els.customWrap = $('[data-tp-custom]');
    this.#els.trigger = $('[data-tp-trigger]');
    this.#els.panel = $('[data-tp-panel]');
    this.#els.hours = $('[data-tp-hours]');
    this.#els.minutes = $('[data-tp-minutes]');
    this.#els.ampm = $('[data-tp-ampm]');
    this.#els.clear = $('[data-tp-clear]');
    this.#els.label = $('[data-tp-label]');
    this.#els.edit = $('[data-tp-edit]');
  }

  #chooseUIMode() {
    const useNative = this.#shouldUseNative();
    if (this.#els.nativeWrap) this.#els.nativeWrap.hidden = !useNative;
    if (this.#els.customWrap) this.#els.customWrap.hidden = useNative;

    if (useNative && this.#els.nativeInput) {
      const i = this.#els.nativeInput;
      i.step = (this.step * 60) || 60; // seconds
      i.required = this.required;
      i.disabled = this.disabled;
      if (this.min) i.min = this.min;
      if (this.max) i.max = this.max;
      if (this.name) i.name = this.name;
    }
  }

  #applyInitialValue() {
    if (this.hasAttribute('value')) return;
    const text = (this.textContent || '').trim();
    const init =
      this.getAttribute('initial-value') ||
      (text && this.#isValidTime(text) ? text : '') ||
      this.getAttribute('data-value') ||
      '';
    if (init && this.#isValidTime(init)) this.value = init;
  }

  #bind() {
    // Native input
    if (this.#els.nativeInput) {
      this.#els.nativeInput.addEventListener('input', () => {
        this.#nativeEditing = true; // skriv ikke tilbage til input.value via sync
        const raw = this.#els.nativeInput.value;
        const label = this.#formatDisplay(raw);
        if (this.#els.label) this.#els.label.textContent = raw ? label : this.placeholder;
      });
      this.#els.nativeInput.addEventListener('change', () => {
        this.#nativeEditing = false;
        const raw = this.#els.nativeInput.value; // 'HH:mm' i 24h
        this.#commitValue(raw);
      });
      this.#els.nativeInput.addEventListener('blur', () => {
        this.#nativeEditing = false;
      });
    }

    // Custom trigger/panel
    if (this.#els.trigger) {
      this.#els.trigger.addEventListener('click', () => this.#togglePanel());
      this.#els.trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.#togglePanel(true); }
      });
    }
    if (this.#els.panel) {
      this.#els.panel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { this.#closePanel(); this.#els.trigger?.focus(); }
      });
    }

    // Custom text edit (HH:MM mask)
    if (this.#els.edit) {
      this.#els.edit.addEventListener('input', (e) => this.#onEditInput(e));
      this.#els.edit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.#onEditCommit(); this.#closePanel(); }
      });
      this.#els.edit.addEventListener('blur', () => this.#onEditCommit());
    }

    // Custom dropdowns
    this.#els.hours?.addEventListener('change', () => this.#commitCustom());
    this.#els.minutes?.addEventListener('change', () => this.#commitCustom());
    this.#els.ampm?.addEventListener('change', () => this.#commitCustom());

    // Clear
    this.#els.clear?.addEventListener('click', (e) => {
      e.preventDefault();
      this.value = '';
      this.#syncUIFromValue();
      this.#emitChange();
    });

    // Outside close
    document.addEventListener('click', this.#onDocClick, true);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.#onDocClick, true);
  }

  #onDocClick = (e) => {
    if (!this.#els.panel || this.#els.panel.hidden) return;
    const path = e.composedPath();
    if (!path.includes(this.#els.panel) && !path.includes(this.#els.trigger)) {
      this.#closePanel();
    }
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || !this.shadowRoot || oldValue === newValue) return;

    switch (name) {
      case 'disabled':
        this.#applyDisabledState();
        break;

      case 'format':
        // Ingen setAttribute('format', ...) her – undgå recursion.
        if (this.#els.hours) { this.#els.hours.innerHTML = ''; this.#fillHourOptions(); }
        if (this.format === '12' && this.#els.ampm && !this.#els.ampm.options.length) this.#fillAmPmOptions();
        this.#syncUIFromValue();
        break;

      case 'step':
        if (this.#els.minutes) { this.#els.minutes.innerHTML = ''; this.#fillMinuteOptions(); }
        this.#chooseUIMode(); // opdatér native step
        this.#syncUIFromValue();
        break;

      case 'use-native':
        this.#chooseUIMode();
        this.#syncUIFromValue();
        break;

      case 'value':
      case 'min':
      case 'max':
      case 'placeholder':
      case 'name':
      case 'required':
        this.#chooseUIMode(); // sikrer native props
        this.#syncUIFromValue();
        break;
    }
  }

  // ----- custom edit logic (HH:MM mask)
  #onEditInput() {
    const is12 = this.format === '12';
    const el = this.#els.edit;
    const before = el.value;
    const digits = before.replace(/\D/g, '').slice(0, 4); // HHMM
    let formatted = '';

    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length <= 2) {
      formatted = digits.length === 2 ? `${digits}:` : digits;
    } else {
      formatted = `${digits.slice(0,2)}:${digits.slice(2)}`;
    }

    const prevLen = this.#editPrevDigitsLen;
    el.value = formatted;
    if (digits.length === 2 && prevLen < 2) {
      requestAnimationFrame(() => { el.setSelectionRange(3, 3); });
    }
    this.#editPrevDigitsLen = digits.length;

    const preview = this.#normalizeTimeFormatted(formatted, is12 ? (this.#els.ampm?.value || 'AM') : null);
    const lbl = preview && this.#isValidTime(preview) ? this.#formatDisplay(preview) : this.placeholder;
    if (this.#els.label) this.#els.label.textContent = lbl;
  }

  #onEditCommit() {
    const is12 = this.format === '12';
    const t = (this.#els.edit?.value || '').trim();
    if (!t) return;

    const ap = is12 ? (this.#els.ampm?.value || 'AM') : null;
    const normalized = this.#normalizeTimeFormatted(t, ap); // -> HH:mm (24h) eller ''

    if (normalized && this.#isValidTime(normalized) && !this.#violatesMinMax(normalized)) {
      this.#commitValue(normalized);
    } else {
      this.#syncUIFromValue(); // rollback
    }
  }

  #normalizeTimeFormatted(input, ampm /* 'AM'|'PM'|null */) {
    if (!input) return '';
    const digits = input.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 2) return '';
    const hh = digits.slice(0, 2);
    const mm = (digits.slice(2) || '').padEnd(2, '0');

    let H = parseInt(hh, 10);
    let M = parseInt(mm, 10);
    if (Number.isNaN(H) || Number.isNaN(M)) return '';

    const is12 = this.format === '12';
    if (is12) {
      if (H < 1 || H > 12) return '';
    } else {
      if (H < 0 || H > 23) return '';
    }
    if (M < 0 || M > 59) return '';

    if (is12) {
      const ap = (ampm || 'AM').toUpperCase();
      if (H === 12) H = 0;         // 12 AM -> 00
      if (ap === 'PM') H += 12;    // PM +12
      if (ap === 'PM' && parseInt(hh,10) === 12) H = 12; // 12 PM -> 12
    }

    return `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`;
  }

  // ----- helpers
  #shouldUseNative() {
    const pref = this.useNative; // auto | always | never
    if (pref === 'always') return this.#supportsNativeTime;
    if (pref === 'never') return false;
    return this.#supportsNativeTime; // auto
  }

  static detectNativeTimeSupport() {
    const input = document.createElement('input');
    input.setAttribute('type', 'time');
    return input.type === 'time';
  }

  #togglePanel(focusFirst = false) {
    if (!this.#els.panel) return;
    const isHidden = this.#els.panel.hidden;
    this.#els.panel.hidden = !isHidden;
    this.setAttribute('aria-expanded', String(!isHidden));
    this.#els.trigger?.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    if (isHidden) {
      const target = this.#els.edit || this.#els.hours;
      if (focusFirst && target) target.focus();
    }
  }

  #closePanel() {
    if (!this.#els.panel) return;
    this.#els.panel.hidden = true;
    this.setAttribute('aria-expanded', 'false');
    this.#els.trigger?.setAttribute('aria-pressed', 'false');
  }

  #applyDisabledState() {
    const dis = this.disabled;
    if (this.#els.nativeInput) this.#els.nativeInput.disabled = dis;
    if (this.#els.trigger) this.#els.trigger.ariaDisabled = String(dis);
  }

  #syncUIFromValue() {
    const v = this.value;

    // Native (skriv ikke mens bruger taster)
    if (this.#els.nativeInput && !this.#nativeEditing) {
      this.#els.nativeInput.value = v || '';
      if (this.min) this.#els.nativeInput.min = this.min;
      if (this.max) this.#els.nativeInput.max = this.max;
      this.#els.nativeInput.step = (this.step * 60) || 60;
      this.#els.nativeInput.required = this.required;
      if (this.name) this.#els.nativeInput.name = this.name;
    }

    // Label
    const labelText = v ? this.#formatDisplay(v) : this.placeholder;
    if (this.#els.label && !this.#nativeEditing) this.#els.label.textContent = labelText;

    // Custom selectors + text edit
    if (this.#els.hours && this.#els.minutes) {
      if (!this.#els.hours.options.length) this.#fillHourOptions();
      if (!this.#els.minutes.options.length) this.#fillMinuteOptions();
      if (this.#els.ampm && !this.#els.ampm.options.length) this.#fillAmPmOptions();

      const { h24, m, ap } = this.#parse(v || '');
      const hDisp = (this.format === '12') ? (h24 % 12 || 12) : h24;

      this.#els.hours.value = String(hDisp).padStart(2, '0');
      this.#els.minutes.value = String(m).padStart(2, '0');
      if (this.#els.ampm) this.#els.ampm.value = ap;
    }

    if (this.#els.edit) {
      this.#els.edit.value = this.value ? this.#formatDisplay(this.value).replace(/ (AM|PM)$/,'') : '';
      this.#editPrevDigitsLen = (this.#els.edit.value.replace(/\D/g,'').length);
    }
  }

  #fillHourOptions() {
    const is12 = this.format === '12';
    const start = is12 ? 1 : 0;
    const end = is12 ? 12 : 23;
    for (let h = start; h <= end; h++) {
      const opt = document.createElement('option');
      opt.value = String(h).padStart(2, '0');
      opt.textContent = opt.value;
      this.#els.hours.appendChild(opt);
    }
  }

  #fillMinuteOptions() {
    const step = this.step;
    for (let m = 0; m < 60; m += step) {
      const opt = document.createElement('option');
      opt.value = String(m).padStart(2, '0');
      opt.textContent = opt.value;
      this.#els.minutes.appendChild(opt);
    }
  }

  #fillAmPmOptions() {
    ['AM','PM'].forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      this.#els.ampm.appendChild(opt);
    });
  }

  #commitCustom() {
    const is12 = this.format === '12';
    let h = parseInt(this.#els.hours?.value || '0', 10);
    const m = parseInt(this.#els.minutes?.value || '0', 10);
    let h24 = h;

    if (is12) {
      const ap = (this.#els.ampm?.value || 'AM');
      if (h === 12) h24 = 0;          // 12 AM -> 00
      if (ap === 'PM') h24 += 12;     // PM +12
      if (ap === 'PM' && h === 12) h24 = 12; // 12 PM -> 12
    }

    const val = `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    if (!this.#violatesMinMax(val)) {
      this.#commitValue(val);
    } else {
      this.#syncUIFromValue(); // clamp visuelt tilbage
    }
  }

  #commitValue(v) {
    this.value = v;
    this.#syncUIFromValue();
    this.#emitChange();
  }

  #emitChange() {
    const { h24, m } = this.#parse(this.value || '');
    const detail = { name: this.name, value: this.value || '', hours: h24, minutes: m };
    this.dispatchEvent(new Event('change', { bubbles: true }));
    this.dispatchEvent(new CustomEvent('time-change', { bubbles: true, detail }));
  }

  #parse(v) {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(v);
    let h24 = 0, m = 0;
    if (match) { h24 = parseInt(match[1],10); m = parseInt(match[2],10); }
    const ap = h24 >= 12 ? 'PM' : 'AM';
    return { h24, m, ap };
  }

  #formatDisplay(v) {
    const { h24, m, ap } = this.#parse(v || '');
    if (!v) return this.placeholder;
    if (this.format === '12') {
      const h12 = (h24 % 12) || 12;
      return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ap}`;
    }
    return `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  #violatesMinMax(v) {
    if (!v) return false;
    const toNum = (s) => (s ? parseInt(s.replace(':',''),10) : null);
    const n = toNum(v);
    const min = toNum(this.min);
    const max = toNum(this.max);
    if (min != null && n < min) return true;
    if (max != null && n > max) return true;
    return false;
  }

  #isValidTime(v) {
    return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(v);
  }
}

customElements.define('time-picker', AppTimePicker);
