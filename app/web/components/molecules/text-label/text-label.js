import { BaseComponent } from '@/base-component.js';
import markup from './text-label-markup';
import styles from './text-label-styles';

export class TextLabel extends BaseComponent {
  static get observedAttributes() {
    return ['label', 'placeholder', 'error', 'name', 'value'];
  }

  get value() {
    return this.shadowRoot?.querySelector('input')?.value ?? '';
  }

  set value(val) {
    const input = this.shadowRoot?.querySelector('input');
    if (input) input.value = val;
  }

  render() {
    this.html = markup({
      label: this.getAttribute('label') || '',
      placeholder: this.getAttribute('placeholder') || '',
      error: this.getAttribute('error') || ''
    });
    this.css = styles;

    const input = this.shadowRoot.querySelector('input');
    const errorEl = this.shadowRoot.querySelector('.text-label-error');

    // apply name and value if set
    if (this.hasAttribute('name')) input.setAttribute('name', this.getAttribute('name'));
    if (this.hasAttribute('value')) input.value = this.getAttribute('value');

    if (this.getAttribute('error')) {
      errorEl.hidden = false;
    } else {
      errorEl.hidden = true;
    }

    input.addEventListener('input', (e) => {
      this.setAttribute('value', e.target.value);
      this.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}
