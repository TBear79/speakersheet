// components/atoms/text/text.js
// ============================================================================
// <app-text
//   id="username"
//   name="username"
//   value=""
//   placeholder="Skriv dit navn"
//   maxlength="50"
// ></app-text>
//
// ATTRIBUTES
// - id: id på det underliggende <input>. Bruges også til label[for] hvis wrapperen kobles til.
// - name: navn på feltet (bruges typisk ved form submission).
// - value: initialværdi for inputfeltet.
// - placeholder: placeholder-tekst der vises når feltet er tomt.
// - maxlength: maksimal længde på input. Matcher native attribut på <input>.
//
// EVENTS
// - Ingen custom events. Lyt til native <input> events som 'input' og 'change' direkte på <app-text>.
//
// SLOTS
// - Ingen slots. Denne komponent indeholder ét enkelt <input type="text">.
//
// A11Y NOTES
// - Komponenten er et standard tekst-input og kan kobles til et <label> vha. id/for.
// - Understøtter placeholder og maxlength som i native inputs.
// - Screenreaders opfører sig som ved et normalt tekstfelt.
//
// KEYBOARD
// - Standard tastaturinteraktion for tekstfelter: indtastning, navigation med piletaster osv.
//
// ----------------------------------------------------------------------------
import { BaseComponent } from '/js/BaseComponent.js';

class AppText extends BaseComponent {
  static get observedAttributes() {
    return ['id', 'value', 'placeholder', 'maxlength', 'name'];
  }

  async render() {
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/atoms/text/text-markup'),
      this.fetchWithCache('/components/atoms/text/text-styles')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#setAttributes();
  }

  #setAttributes() {
    const id = this.getAttribute('id') || '';
    const value = this.getAttribute('value') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const maxLength = this.getAttribute('maxlength') || '';
    const name = this.getAttribute('name') || '';

    const input = this.shadowRoot.querySelector('input');

    input.setAttribute('id', id);
    input.setAttribute('value', value);
    input.setAttribute('placeholder', placeholder);
    if (maxLength) input.setAttribute('maxlength', maxLength);
    input.setAttribute('name', name);
  }
}

customElements.define('app-text', AppText);