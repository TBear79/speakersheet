import { BaseComponent } from '/js/BaseComponent.js';

class AppText extends BaseComponent {
  static get observedAttributes() {
    return ['value', 'placeholder', 'max-length', 'name'];
  }

  async render() {
    const value = this.getAttribute('value') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const maxLength = this.getAttribute('max-length') || '';
    const name = this.getAttribute('name') || '';

    const query = new URLSearchParams({ value, placeholder, maxLength, name }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/text/text-markup?${query}`).then(res => res.text()),
      fetch('/components/atoms/text/text-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;
  }
}

customElements.define('app-text', AppText);
