import { BaseComponent }  from '/js/BaseComponent.js'

class AppLink extends BaseComponent {
  static get observedAttributes() {
    return ['href', 'target', 'rel'];
  }

  async render() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');

    const query = new URLSearchParams({ href, target, rel }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/link?${query}`).then(res => res.text()),
      fetch('/components/atoms/link/link.css').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;
  }
}

customElements.define('app-link', AppLink);
