import { BaseComponent }  from '/js/BaseComponent.js'

class AppLinkButton extends BaseComponent {
  static get observedAttributes() {
    return ['href', 'target', 'rel', 'aria-label'];
  }

  async render() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');
    const ariaLabel = this.getAttribute('aria-label') || '';

    const query = new URLSearchParams({ href, target, rel, ariaLabel }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/link-button/link-button-markup?${query}`).then(res => res.text()),
      fetch('/components/atoms/link-button/link-button-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;
  }
}

customElements.define('app-link-button', AppLinkButton);
