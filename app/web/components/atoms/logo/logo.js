import { BaseComponent }  from '/js/BaseComponent.js'

class AppLogo extends BaseComponent {
    async connectedCallback() {
      const [html, css] = await Promise.all([
        fetch('/components/atoms/logo/logo-markup').then(res => res.text()),
        fetch('/components/atoms/logo/logo-styles').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-logo', AppLogo);