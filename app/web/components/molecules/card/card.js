import { BaseComponent }  from '/js/BaseComponent.js'

class AppCard extends BaseComponent {
    async connectedCallback() {
      const [html, css] = await Promise.all([
        this.fetchWithCache('/components/molecules/card/card-markup'),
        this.fetchWithCache('/components/molecules/card/card-styles')
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-card', AppCard);