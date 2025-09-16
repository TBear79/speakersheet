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
      this.fetchWithCache('/components/atoms/card-section/card-section-markup'),
      this.fetchWithCache('/components/atoms/card-section/card-section-styles')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;
  }
}

customElements.define('app-card-section', AppCardSection);
