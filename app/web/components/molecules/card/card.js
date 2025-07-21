class AppCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    async connectedCallback() {
      const [html, css] = await Promise.all([
        fetch('/components/molecules/card').then(res => res.text()),
        fetch('/components/molecules/card/css').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-card', AppCard);