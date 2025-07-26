import { BaseComponent }  from '/js/BaseComponent.js'

class AppCard extends BaseComponent {
    async connectedCallback() {
      const [html, css] = await Promise.all([
        fetch('/components/molecules/card/card-markup').then(res => res.text()),
        fetch('/components/molecules/card/card-styles').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-card', AppCard);