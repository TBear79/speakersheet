import { BaseComponent }  from '/js/BaseComponent.js'

class AppButton extends BaseComponent {
  static get observedAttributes() {
    return ['type', 'variant', 'aria-label'];
  }

  async render() {
    const type = this.getAttribute('type') || 'button';
    const ariaLabel = this.getAttribute('aria-label') || '';
    const variant = this.getAttribute('variant') || 'neutral';

    const query = new URLSearchParams({ type, ariaLabel, variant }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/atoms/button/button-markup?${query}`).then(res => res.text()),
      fetch('/components/atoms/button/button-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.addClickHandler();
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
