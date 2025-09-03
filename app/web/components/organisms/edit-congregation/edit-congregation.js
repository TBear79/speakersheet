import { BaseComponent }  from '/js/BaseComponent.js'

class AppEditCongregation extends BaseComponent {
  static get observedAttributes() {
    return ['status'];
  }

  async render() {
    const status = this.getAttribute('status') || 'closed';
    const query = new URLSearchParams({ status }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/organisms/edit-congregation/edit-congregation-markup?${query}`).then(res => res.text()),
      fetch('/components/organisms/edit-congregation/edit-congregation-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    const div = this.shadowRoot.querySelector('div');
    div.classList.add('hidden');
  }

  attributeChangedCallback (name, oldValue, newValue) {
    
    const div = this.shadowRoot.querySelector('div');

    if(!div) return;

    if(newValue === 'closed') 
      div.classList.add('hidden');
    else
      div.classList.remove('hidden');
  }
}

customElements.define('app-edit-congregation', AppEditCongregation);
