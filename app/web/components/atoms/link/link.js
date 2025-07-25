class AppLink extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');

    const query = new URLSearchParams({ href, target, rel }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/link?${query}`).then(res => res.text()),
      fetch('/components/atoms/link/css').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;
  }

  static get observedAttributes() {
    return ['href', 'target', 'rel'];
  }

  attributeChangedCallback() {
    this.connectedCallback(); // Re-render ved ændring af attribut
  }
}

customElements.define('app-link', AppLink);