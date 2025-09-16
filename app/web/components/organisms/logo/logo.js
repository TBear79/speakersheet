import { BaseComponent }  from '/js/BaseComponent.js'

class AppLogo extends BaseComponent {
    async connectedCallback() {
      const [html, css] = await Promise.all([
        this.fetchWithCache('/components/organisms/logo/logo-markup'),
        this.fetchWithCache('/components/organisms/logo/logo-styles')
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-logo', AppLogo);