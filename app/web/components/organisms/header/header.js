import { BaseComponent }  from '/js/BaseComponent.js'

class AppCard extends BaseComponent {
    async connectedCallback() {
      const [html, css] = await Promise.all([
        this.fetchWithCache('/components/organisms/header/header-markup'),
        this.fetchWithCache('/components/organisms/header/header-styles')
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-header', AppCard);