import { BaseComponent } from '/js/BaseComponent.js';

class AppFormText extends BaseComponent {
  static get observedAttributes() {
    return [
      'input-id',
      'label',
      'placeholder',
      'value',
      'max-length',
      'required',
      'aria-label',
      'validation-text',
      'validation-variant',
      'oninputeventname',
      'onchangeeventname'
    ];
  }

  async render() {
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/molecules/form-text/form-text-markup'),
      this.fetchWithCache('/components/molecules/form-text/form-text-styles')
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;

    this.#applyAttributes();
    this.#wireEvents();
  }

  attributeChangedCallback() {
    if (this.shadowRoot?.childElementCount) {
      this.#applyAttributes();
    }
  }

  get value() {
    return this.#input()?.getAttribute('value') || '';
  }
  set value(v) {
    const inp = this.#input();
    if (inp) inp.setAttribute('value', v ?? '');
  }

  #label() { return this.shadowRoot.querySelector('.label'); }
  #input() { return this.shadowRoot.querySelector('.input'); }
  #msg()   { return this.shadowRoot.querySelector('.message'); }

  #applyAttributes() {
    const lbl = this.#label();
    const inp = this.#input();
    const msg = this.#msg();
    if (!lbl || !inp || !msg) return;

    // --- id binding ---
    const forId = this.getAttribute('input-id') || this.#ensureId(inp);
    lbl.setAttribute('for', forId);
    lbl.setAttribute('text', this.getAttribute('label') || '');
    this.toggleAttributeOn(lbl, 'required');

    inp.setAttribute('id', forId);
    inp.setAttribute('name', forId);

    this.copyAttr('placeholder', inp);
    this.copyAttr('value', inp);
    this.copyAttr('max-length', inp);
    this.copyAttr('aria-label', inp);

    // --- validation ---
    const vText = this.getAttribute('validation-text');
    const vVar  = this.getAttribute('validation-variant');

    if (vVar) msg.setAttribute('variant', vVar); else msg.removeAttribute('variant');
    if (vText && vText.trim().length > 0) {
      msg.setAttribute('text', vText);
    } else {
      msg.removeAttribute('text');
    }
  }

  #wireEvents() {
    const inp = this.#input();
    if (!inp) return;

    const onInputName = this.getAttribute('oninputeventname');
    const onChangeName = this.getAttribute('onchangeeventname');

    const emit = (evtName) => {
      const detail = {
        id: this.getAttribute('id') || this.#input()?.getAttribute('id') || '',
        name: this.getAttribute('name') || '',
        value: this.value
      };
      this.dispatchNamedEvent(evtName, detail);
    };

    inp.replaceWith(inp.cloneNode(true));
    const fresh = this.#input();

    if (onInputName) {
      fresh.addEventListener('input', () => emit(onInputName));
    }
    if (onChangeName) {
      fresh.addEventListener('change', () => emit(onChangeName));
    }
  }

  #ensureId(el) {
    let id = el.getAttribute('id');
    if (!id) {
      id = `fi-${Math.random().toString(36).slice(2, 8)}`;
      el.setAttribute('id', id);
    }
    return id;
  }
}

customElements.define('app-form-text', AppFormText);
