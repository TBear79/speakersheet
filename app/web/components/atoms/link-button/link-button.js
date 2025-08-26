import { BaseComponent }  from '/js/BaseComponent.js'

class AppLinkButton extends BaseComponent {
  static get observedAttributes() {
    return ['href', 'target', 'rel', 'aria-label', 'spa'];
  }

  #onClickEventName = 'button-link:link:click';

  async render() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');
    const ariaLabel = this.getAttribute('aria-label') || '';
    const isSpa = this.hasAttribute('spa');
    
    if(this.hasAttribute('onclickeventname'))
      this.#onClickEventName = this.getAttribute('onclickeventname');

    const query = new URLSearchParams({ href, target, rel, ariaLabel, isSpa, onclickeventname: this.#onClickEventName }).toString();

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
