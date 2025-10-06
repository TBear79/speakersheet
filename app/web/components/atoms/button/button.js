import { BaseComponent }  from '/js/BaseComponent.js'

class AppButton extends BaseComponent {
  static get observedAttributes() {
    return ['type', 'variant', 'aria-label'];
  }

  async render() {
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/atoms/button/button-markup'),
      this.fetchWithCache('/components/atoms/button/button-styles')
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;

    this.#setAttributes();
    this.addClickHandler();
  }

  #setAttributes() {
    const btn = this.shadowRoot.querySelector('button');

    if (this.hasAttribute('type')) btn.setAttribute('type', this.getAttribute('type') || 'button');
    if (this.hasAttribute('aria-label')) btn.setAttribute('aria-label', this.getAttribute('aria-label') || '');
    if (this.hasAttribute('variant')) btn.setAttribute('variant', this.getAttribute('variant') || '');
  }

  addClickHandler() {
    const btn = this.shadowRoot.querySelector('button');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const onClickEventName = this.getAttribute('onclickeventname');

      if (onClickEventName) {
        this.dispatchNamedEvent(onClickEventName, {});
      }
    });
  }
}

customElements.define('app-button', AppButton);
