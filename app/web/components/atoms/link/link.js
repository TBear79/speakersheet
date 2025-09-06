import { BaseComponent }  from '/js/BaseComponent.js'

class AppLink extends BaseComponent {
  static get observedAttributes() {
    return ['href', 'target', 'rel'];
  }

  async render() {
    const [html, css] = await Promise.all([
      fetch(`/components/atoms/link/link-markup`).then(res => res.text()),
      fetch('/components/atoms/link/link-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#setAttributes();
    this.addClickHandler();
  }

  #setAttributes() {
    const href = this.getAttribute('href') || '#';
    const target = this.getAttribute('target') || '_self';
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');
    const onClickEventName = this.getAttribute('onclickeventname') || '';

    const anchor = this.shadowRoot.querySelector('a');

    anchor.setAttribute('href', href);
    anchor.setAttribute('target', target);
    anchor.setAttribute('rel', rel);
    anchor.setAttribute('onclickeventname', onClickEventName);
  }

  addClickHandler() {
    const anchor = this.shadowRoot.querySelector('a');
    if (!anchor) return;

    anchor.addEventListener('click', (e) => {
      const isSpa = this.hasAttribute('spa');

      if(isSpa) {
        e.preventDefault();
        e.stopPropagation();
      }

      const href = this.getAttribute('href');
      const onClickEventName = this.getAttribute('onclickeventname');
      
      if (href && onClickEventName) {
        this.dispatchNamedEvent(onClickEventName, { isSpa, href });
      }
    });
  }
}

customElements.define('app-link', AppLink);
