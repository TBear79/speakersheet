import { BaseComponent }  from '/js/BaseComponent.js'

class AppCard extends BaseComponent {
    async connectedCallback() {
      const [html, css] = await Promise.all([
        fetch('/components/organisms/footer/footer-markup').then(res => res.text()),
        fetch('/components/organisms/footer/footer-styles').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-footer', AppCard);