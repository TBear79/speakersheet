import { BaseComponent } from '/js/BaseComponent.js';

class AppFileButton extends BaseComponent {
  static get observedAttributes() {
    return [
      'accept',            // fx "image/*" eller "application/pdf"
      'multiple',          // presence = true
      'variant',           // "primary" | "warning" | "disabled"
      'disabled',          // optional: funktionelt disabled
      'aria-label',        // tilgængelighed på label
      'onfileeventname',   // eventnavn der dispatches ved filvalg
      'name'               // identifikation (dit mønster)
    ];
  }

  async render() {
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/atoms/file-button/file-button-markup'),
      this.fetchWithCache('/components/atoms/file-button/file-button-styles')
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;
    this.#cache();
    this.#syncAttributes();
    this.#wireEvents();
  }

  attributeChangedCallback() {
    if (!this.shadowRoot) return;
    this.#syncAttributes();
  }

  #cache() {
    this._label = this.shadowRoot.querySelector('label');
    this._input = this.shadowRoot.querySelector('input[type=file]');
  }

  #syncAttributes() {
    if (!this._label || !this._input) return;

    // aria-label på selve "knappen" (label)
    this._label.setAttribute('aria-label', this.getAttribute('aria-label') || '');

    // accept
    if (this.hasAttribute('accept')) {
      this._input.setAttribute('accept', this.getAttribute('accept'));
    } else {
      this._input.removeAttribute('accept');
    }

    // multiple
    if (this.hasAttribute('multiple')) {
      this._input.setAttribute('multiple', '');
    } else {
      this._input.removeAttribute('multiple');
    }

    // disabled (funktionelt) – gælder både [disabled] og variant="disabled"
    const isDisabled = this.hasAttribute('disabled') || this.getAttribute('variant') === 'disabled';
    if (isDisabled) {
      this._input.setAttribute('disabled', '');
      this._label.setAttribute('aria-disabled', 'true');
    } else {
      this._input.removeAttribute('disabled');
      this._label.removeAttribute('aria-disabled');
    }
  }

  #wireEvents() {
    if (!this._label || !this._input) return;

    // label åbner input automatisk (ingen klik-handler nødvendig)
    this._input.addEventListener('change', () => {
      const eventName = this.getAttribute('onfileeventname') || 'file-selected';
      this.dispatchNamedEvent(eventName, {
        files: this._input.files,
        name: this.getAttribute('name') || null
      });
      this._input.value = ''; // så samme fil kan vælges igen
    });
  }
}

customElements.define('app-file-button', AppFileButton);
export { AppFileButton };
