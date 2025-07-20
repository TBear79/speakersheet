class AppLogo extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    async connectedCallback() {
      const [html, css] = await Promise.all([
        fetch('/components/atoms/logo').then(res => res.text()),
        fetch('/components/atoms/logo/css').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-logo', AppLogo);