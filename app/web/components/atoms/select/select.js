/**
 * <app-select>
 * -----------------------------------------------------------------------------
 * Usage:
 *   <app-select name="country" placeholder="Vælg land" value="DK">
 *     <option value="DK">Danmark</option>
 *     <option value="SE">Sverige</option>
 *     <option value="NO" selected>Norge</option>
 *   </app-select>
 *
 * Attributes:
 * - name        : string; identifier included in events
 * - value       : string; selected value (reflects)
 * - placeholder : string; optional placeholder label (non-selectable)
 * - disabled    : boolean; disables control
 * - aria-label  : string; accessible name if no external label is present
 *
 * Methods:
 * - getValue(): string
 * - setValue(v: string): void
 *
 * Events:
 * - "change": bubbles, composed. detail = { name, value }
 *   (Fires when user picks an option or when value is set programmatically)
 *
 * A11y:
 * - Uses native <select> semantics.
 * - If you don’t pair with <app-label>, set [aria-label] on <app-select>.
 *
 * Notes:
 * - Options are authored in light DOM and cloned into the shadow select at render().
 * - Progressive enhancement: if (appearance: base-select) is supported,
 *   a <button><selectedcontent></selectedcontent></button> is honored by the UA
 *   for fully stylable popup & arrow (::picker(select), ::picker-icon, etc.).
 */

import { BaseComponent } from '/js/BaseComponent.js';

export class AppSelect extends BaseComponent {
  static get observedAttributes() {
    return ['name', 'value', 'disabled', 'placeholder', 'aria-label'];
  }

  /** Public API */
  get value() { return this.getAttribute('value') ?? ''; }
  set value(v) {
    if (v === null || v === undefined) this.removeAttribute('value');
    else this.setAttribute('value', String(v));
  }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  /** Private fields */
  #selectEl = null;

  async render() {
    // Hent markup + styles via dit nye mønster
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/atoms/select/select-markup'),
      this.fetchWithCache('/components/atoms/select/select-styles')
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;

    this.#selectEl = this.shadowRoot.getElementById('native');

    // A11y label fra host-attribut
    const ariaLabel = this.getAttribute('aria-label') || '';
    if (ariaLabel) this.#selectEl.setAttribute('aria-label', ariaLabel);

    // Disabled state
    this.#applyDisabled();

    // Sync options ind i den interne select
    this.#populateOptionsFromLightDom();

    // Sæt initial value (ordre: host [value] → selected option i light DOM → placeholder)
    this.#applyInitialValue();

    // Events
    this.#bindEvents();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected) return;

    switch (name) {
      case 'disabled':
        this.#applyDisabled();
        break;
      case 'value':
        this.#applyValueToSelect(newVal);
        break;
      case 'placeholder':
        // Rebuild options for placeholder changes
        this.#populateOptionsFromLightDom();
        this.#applyValueToSelect(this.getAttribute('value'));
        break;
      case 'aria-label':
        if (this.#selectEl) {
          if (newVal) this.#selectEl.setAttribute('aria-label', newVal);
          else this.#selectEl.removeAttribute('aria-label');
        }
        break;
    }
  }

  /** Public API */
  getValue() { return this.value; }
  setValue(v) {
    this.value = v ?? '';
    // ensure event for programmatic changes (aligning with native select change semantics is optional)
    this.#emitChange();
  }

  /** Internal */
  #bindEvents() {
    this.#selectEl.addEventListener('change', () => {
      const current = this.#selectEl.value ?? '';
      // Reflect til host
      if (this.getAttribute('value') !== current) {
        this.setAttribute('value', current);
      } else {
        // Hvis attribut allerede matcher, emitter vi stadig change (native gjorde det)
        this.#emitChange();
      }
    });
  }

  #emitChange() {
    const detail = { name: this.getAttribute('name') || '', value: this.value };
    this.dispatchEvent(new CustomEvent('change', {
      detail,
      bubbles: true,
      composed: true
    }));
  }

  #applyDisabled() {
    if (!this.#selectEl) return;
    this.#selectEl.disabled = this.disabled;
  }

  #applyInitialValue() {
    const hostVal = this.getAttribute('value');
    if (hostVal !== null && hostVal !== undefined) {
      this.#applyValueToSelect(hostVal);
      return;
    }
    // Find første selected i light DOM (allerede klonet), ellers placeholder
    const selectedInDom = this.#selectEl.querySelector('option[selected]');
    if (selectedInDom) {
      this.setAttribute('value', selectedInDom.value ?? '');
      return;
    }
    // Hvis der er placeholder, så sæt value=""
    const hasPlaceholder = !!this.getAttribute('placeholder');
    if (hasPlaceholder) {
      this.setAttribute('value', '');
    }
  }

  #applyValueToSelect(v) {
    if (!this.#selectEl) return;
    const target = v ?? '';
    // Sørg for at værdien findes; hvis ikke, falder vi tilbage til ""
    const opt = [...this.#selectEl.options].find(o => o.value === target);
    this.#selectEl.value = opt ? target : '';
  }

  #populateOptionsFromLightDom() {
    if (!this.#selectEl) return;

    // Gem evt. nuværende value, så vi bevarer valg efter rebuild
    const prev = this.getAttribute('value');

    // Ryd alle options (men behold første child, som er <button> til customizable-select)
    const children = Array.from(this.#selectEl.childNodes);
    for (const n of children) {
      if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BUTTON') continue;
      this.#selectEl.removeChild(n);
    }

    // Placeholder (disabled/hidden), hvis satt
    const placeholder = this.getAttribute('placeholder');
    if (placeholder) {
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = placeholder;
      ph.setAttribute('disabled', '');
      ph.setAttribute('hidden', '');
      ph.dataset.placeholder = 'true';
      this.#selectEl.appendChild(ph);
    }

    // Klon alle <option> børn fra light DOM
    const lightOptions = Array.from(this.querySelectorAll(':scope > option'));
    for (const opt of lightOptions) {
      this.#selectEl.appendChild(opt.cloneNode(true));
    }

    // Restore value hvis muligt
    if (prev !== null && prev !== undefined) {
      this.#applyValueToSelect(prev);
    }
  }
}

customElements.define('app-select', AppSelect);
