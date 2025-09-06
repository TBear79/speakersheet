import { BaseComponent }  from '/js/BaseComponent.js'

class AppCardSection extends BaseComponent {
  static get observedAttributes() {
    return [];
  }

  async render() {
    if (!this.closest('app-card')) {
        console.warn('<app-card-section> should only be used inside <app-card>');
    }

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/card-section/card-section-markup`).then(res => res.text()),
      fetch('/components/atoms/card-section/card-section-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;
  }
}

customElements.define('app-card-section', AppCardSection);
