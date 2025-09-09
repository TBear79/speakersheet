import { BaseComponent } from '/js/BaseComponent.js';

class AppValidationMessage extends BaseComponent {
  static get observedAttributes() {
    return ['text', 'variant'];
  }

  async render() {
    const [html, css] = await Promise.all([
      fetch('/components/atoms/validation-message/validation-message-markup').then(r => r.text()),
      fetch('/components/atoms/validation-message/validation-message-styles').then(r => r.text())
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;

    // observer slot-indhold
    const slot = this.shadowRoot.querySelector('slot');
    slot.addEventListener('slotchange', () => this.#applyAttributes());

    this.#applyAttributes();
  }

  attributeChangedCallback() {
    if (this.shadowRoot?.childElementCount) this.#applyAttributes();
  }

  #applyAttributes() {
    const el = this.shadowRoot.querySelector('.message');
    if (!el) return;

    const slot = this.shadowRoot.querySelector('slot');
    const hasSlotContent = slot && slot.assignedNodes().length > 0;

    if (hasSlotContent) {
      // ryd text-attribut hvis slot bruges
      if (this.hasAttribute('text')) {
        this.removeAttribute('text');
      }
      el.removeAttribute('hidden');
    } else if (this.hasAttribute('text')) {
      el.textContent = this.getAttribute('text') || '';
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }

    const variant = this.getAttribute('variant');
    variant ? el.setAttribute('variant', variant) : el.removeAttribute('variant');
  }
}

customElements.define('app-validation-message', AppValidationMessage);
