import { BaseComponent } from '/js/BaseComponent.js';

export class Select extends BaseComponent {
  static get observedAttributes() {
    return ['name','value','placeholder','disabled','required','autofocus'];
  }

  static formAssociated = true;

  #select = null;
  #internals = null;
  #pendingOptionsClone = false;

  get name() { return this.getAttribute('name') || ''; }
  set name(v) { this.setAttribute('name', v ?? ''); }

  get value() {
    if (this.#select) return this.#select.value;
    return this.getAttribute('value') ?? '';
  }
  set value(v) {
    if (v == null) v = '';
    this.setAttribute('value', String(v));
    if (this.#select && this.#select.value !== v) {
      this.#select.value = v;
      this.#syncFormValue();
      this.#reflectValidity();
    }
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  get required() { return this.hasAttribute('required'); }
  set required(v) { this.toggleAttribute('required', !!v); }

  get placeholder() { return this.getAttribute('placeholder') || ''; }
  set placeholder(v) { this.setAttribute('placeholder', v ?? ''); }

  async render() {
    const q = new URLSearchParams({
      placeholder: this.placeholder,
      disabled: String(this.disabled),
      required: String(this.required),
      name: this.name
    });

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/select/select-markup?${q}`).then(r => r.text()),
      fetch('/components/atoms/select/select-styles').then(r => r.text()),
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#select = this.shadowRoot.querySelector('select');

    this.#bindEvents();
    this.#populateOptionsFromLightDOM();

    this.#select.required = this.required;
    this.#select.disabled = this.disabled;

    if (this.hasAttribute('value')) {
      this.#select.value = this.getAttribute('value');
    } else if (this.placeholder) {
      this.#select.selectedIndex = 0;
    }

    if (this.hasAttribute('autofocus')) {
      queueMicrotask(() => this.#select?.focus());
    }

    this.#syncFormValue();
    this.#reflectValidity();
  }

  connectedCallback() {
    super.connectedCallback?.();
    const mo = new MutationObserver(() => {
      this.#pendingOptionsClone = true;
      queueMicrotask(() => {
        if (this.#pendingOptionsClone) {
          this.#populateOptionsFromLightDOM();
          this.#pendingOptionsClone = false;
        }
      });
    });
    mo.observe(this, { childList: true, subtree: false });
    this._optionsObserver = mo;
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this._optionsObserver?.disconnect();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.shadowRoot?.isConnected) return;

    switch (name) {
      case 'value':
        if (this.#select && this.#select.value !== newVal) {
          this.#select.value = newVal ?? '';
          this.#syncFormValue();
          this.#reflectValidity();
        }
        break;
      case 'disabled':
        if (this.#select) this.#select.disabled = this.disabled;
        break;
      case 'required':
        if (this.#select) this.#select.required = this.required;
        this.#reflectValidity();
        break;
      case 'placeholder':
        this.#injectOrUpdatePlaceholderOption();
        break;
    }
  }

  #bindEvents() {
    this.#select?.addEventListener('change', () => {
      this.setAttribute('value', this.#select.value);
      this.#syncFormValue();
      this.#reflectValidity();

      this.dispatchEvent(new Event('change', { bubbles: true }));

      const text = this.#select.selectedOptions?.[0]?.text ?? '';
      this.dispatchEvent(new CustomEvent('app-select:change', {
        bubbles: true,
        detail: { name: this.name, value: this.#select.value, text }
      }));
    });

    this.#select?.addEventListener('focus', () => this.setAttribute('data-focus', ''));
    this.#select?.addEventListener('blur',  () => this.removeAttribute('data-focus'));
  }

  #populateOptionsFromLightDOM() {
    if (!this.#select) return;

    const current = this.getAttribute('value') ?? '';
    const hadPlaceholder = !!this.placeholder;
    const placeholderHTML = hadPlaceholder ? this.#select.querySelector('option[data-placeholder]')?.outerHTML : '';
    this.#select.innerHTML = placeholderHTML || '';

    const options = Array.from(this.children).filter(ch => ch.tagName === 'OPTION');
    for (const opt of options) {
      this.#select.append(opt.cloneNode(true));
    }

    this.#injectOrUpdatePlaceholderOption();

    if (current) {
      this.#select.value = current;
    } else if (this.placeholder) {
      this.#select.selectedIndex = 0;
    }

    this.#syncFormValue();
  }

  #injectOrUpdatePlaceholderOption() {
    if (!this.#select) return;
    const has = this.placeholder && this.placeholder.trim().length > 0;
    let ph = this.#select.querySelector('option[data-placeholder]');

    if (has && !ph) {
      ph = document.createElement('option');
      ph.setAttribute('data-placeholder', '');
      ph.value = '';
      ph.textContent = this.placeholder;
      ph.disabled = true;
      ph.selected = !this.hasAttribute('value');
      this.#select.prepend(ph);
    } else if (has && ph) {
      ph.textContent = this.placeholder;
      ph.selected = !this.hasAttribute('value');
    } else if (!has && ph) {
      ph.remove();
    }
  }

  #syncFormValue() {
    const v = this.#select?.value ?? '';
    if (this.getAttribute('value') !== v) this.setAttribute('value', v);
    try {
      this.#internals?.setFormValue?.(v);
      this.#internals?.setValidity?.({}, '');
    } catch {}
  }

  #reflectValidity() {
    if (!this.required || !this.#select) return;
    const valid = this.#select.value !== '';
    try {
      if (valid) this.#internals?.setValidity?.({});
      else this.#internals?.setValidity?.({ valueMissing: true }, 'Vælg en værdi');
    } catch {}
  }
}

customElements.define('app-select', Select);
