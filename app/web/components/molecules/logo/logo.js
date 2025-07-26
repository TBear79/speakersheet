import { BaseComponent }  from '/js/BaseComponent.js'

class AppLogo extends BaseComponent {
    async connectedCallback() {
      const [html, css] = await Promise.all([
        fetch('/components/molecules/logo').then(res => res.text()),
        fetch('/components/molecules/logo/styles').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-logo', AppLogo);