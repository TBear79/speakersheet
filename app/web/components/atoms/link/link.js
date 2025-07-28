import { BaseComponent }  from '/js/BaseComponent.js'

class AppLink extends BaseComponent {
  static get observedAttributes() {
    return ['href', 'target', 'rel', 'spa'];
  }

  async render() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');

    const query = new URLSearchParams({ href, target, rel }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/link/link-markup?${query}`).then(res => res.text()),
      fetch('/components/atoms/link/link-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    if(this.hasAttribute('spa'))
    {
      this.addClickHandler();
    }
  }

  addClickHandler() {
    const anchor = this.shadowRoot.querySelector('a');
    if (!anchor) return;

    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const href = this.getAttribute('href');
      if (href) {
        window.dispatchEvent(
          new CustomEvent('spa-url-change', {
            detail: { href }
          })
        );
      }
    });
  }
}

customElements.define('app-link', AppLink);
