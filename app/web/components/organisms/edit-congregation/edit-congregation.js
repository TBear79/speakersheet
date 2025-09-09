import { BaseComponent }  from '/js/BaseComponent.js'

class AppEditCongregation extends BaseComponent {
  static get observedAttributes() {
    return ['status'];
  }

  #modal = null;

  async render() {
    const status = this.getAttribute('status') || 'closed';

    const html = await fetch('/components/organisms/edit-congregation/edit-congregation-markup')
      .then(res => res.text());

    this.shadowRoot.innerHTML = html;

    if(!status)
      this.setAttribute('status', status);

    this.#bindEvents();

    this.#modal = this.shadowRoot?.querySelector('app-modal[name="edit-congregation"]');
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if(!oldValue || oldValue === newValue) return;
    if (name === 'status') {
      queueMicrotask(() => {
        newValue === 'closed' ? this.#modal.closeModal() : this.#modal.openModal();
      });
    }
  }

  #bindEvents() {
    const cancelBtn = this.shadowRoot.querySelector('app-button[name=cancel-button]');
    const saveBtn = this.shadowRoot.querySelector('app-button[name=save-button]');
    const cancelBtnEventName = cancelBtn.getAttribute('onclickeventname');
    const saveBtnEventName = saveBtn.getAttribute('onclickeventname');
    const modal = this.shadowRoot.querySelector('app-modal[name=edit-congregation]');

    cancelBtn.addEventListener(cancelBtnEventName, e => {
      console.log('CANCEL')
      this.setAttribute('status', 'closed');
    });

    saveBtn.addEventListener(saveBtnEventName, e => {
      // here save form
      console.log('SAVE')
      this.setAttribute('status', 'closed');
    });
  }
}

customElements.define('app-edit-congregation', AppEditCongregation);
