import { BaseComponent }  from '/js/BaseComponent.js'

class AppLinkButton extends BaseComponent {
  static get observedAttributes() {
    return ['href', 'target', 'rel', 'aria-label', 'spa'];
  }

  async render() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');
    const ariaLabel = this.getAttribute('aria-label') || '';
    const isSpa = this.hasAttribute('spa');
    const onClickEventName = this.getAttribute('onclickeventname');

    const query = new URLSearchParams({ href, target, rel, ariaLabel, isSpa, onClickEventName }).toString();

    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/atoms/link-button/link-button-markup'),
      this.fetchWithCache('/components/atoms/link-button/link-button-styles')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#setAttributes();
  }

  #setAttributes() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');
    const ariaLabel = this.getAttribute('aria-label') || '';
    const isSpa = this.hasAttribute('spa');
    const onClickEventName = this.getAttribute('onclickeventname') || '';

    const appLink = this.shadowRoot.querySelector('app-link');

    appLink.setAttribute('href', href);
    appLink.setAttribute('target', target);
    appLink.setAttribute('rel', rel);
    appLink.setAttribute('aria-label', ariaLabel);

    appLink.toggleAttribute('spa', isSpa);

    appLink.setAttribute('onclickeventname', onClickEventName);
  }
}

customElements.define('app-link-button', AppLinkButton);
