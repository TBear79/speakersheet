import { BaseComponent } from '/js/BaseComponent.js';

class AppLabel extends BaseComponent {
  static get observedAttributes() {
    return ['for', 'text', 'variant', 'aria-label', 'required'];
  }

  async render() {
    const [html, css] = await Promise.all([
      fetch('/components/atoms/label/label-markup').then(r => r.text()),
      fetch('/components/atoms/label/label-styles').then(r => r.text())
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;
    this.#applyAttributes();
    this.#wireFocus();
  }

  attributeChangedCallback() {
    if (this.shadowRoot?.childElementCount) this.#applyAttributes();
  }

  #applyAttributes() {
    const el = this.shadowRoot.querySelector('label');
    if (!el) return;

    const forId = this.getAttribute('for') || '';
    if (forId) {
      el.setAttribute('for', forId);
      el.setAttribute('aria-controls', forId);
    } else {
      el.removeAttribute('for');
      el.removeAttribute('aria-controls');
    }

    this.toggleAttributeOn(el, 'required', this.hasAttribute('required'));

    const variant = this.getAttribute('variant');
    variant ? el.setAttribute('variant', variant) : el.removeAttribute('variant');

    const aria = this.getAttribute('aria-label');
    aria ? el.setAttribute('aria-label', aria) : el.removeAttribute('aria-label');

    if (this.hasAttribute('text')) {
      const text = this.getAttribute('text') || '';
      const indicator = el.querySelector('.required-indicator');
      el.textContent = text;
      if (indicator) el.appendChild(indicator);
    }
  }

  #wireFocus() {
    const el = this.shadowRoot.querySelector('label');
    if (!el) return;

    el.addEventListener('click', () => {
      const forId = this.getAttribute('for');
      if (!forId) return;
      // Forsøg at fokusere feltet i dokumentet
      const target = document.getElementById(forId);
      if (target && typeof target.focus === 'function') target.focus();
    }, { passive: true });
  }
}

customElements.define('app-label', AppLabel);
