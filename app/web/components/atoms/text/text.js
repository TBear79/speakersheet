import { BaseComponent } from '/js/BaseComponent.js';

class AppText extends BaseComponent {
  static get observedAttributes() {
    return ['id', 'value', 'placeholder', 'max-length', 'name'];
  }

  async render() {
    const [html, css] = await Promise.all([
      fetch(`/components/atoms/text/text-markup`).then(res => res.text()),
      fetch('/components/atoms/text/text-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#setAttributes();
  }

  #setAttributes() {
    const id = this.getAttribute('id') || '';
    const value = this.getAttribute('value') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const maxLength = this.getAttribute('max-length') || '';
    const name = this.getAttribute('name') || '';

    const input = this.shadowRoot.querySelector('input');

    input.setAttribute('id', id);
    input.setAttribute('value', value);
    input.setAttribute('placeholder', placeholder);
    input.setAttribute('max-length', maxLength);
    input.setAttribute('name', name);
  }
}

customElements.define('app-text', AppText);
