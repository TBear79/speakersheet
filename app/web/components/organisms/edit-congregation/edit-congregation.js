import { BaseComponent }  from '/js/BaseComponent.js'

class AppEditCongregation extends BaseComponent {
  static get observedAttributes() {
    return ['status'];
  }

  // -----Elements-----
  #modal = null;
  #cancelBtn = null;
  #saveBtn = null;
  #officialNameElement = null;
  
  async render() {
    const status = this.getAttribute('status') || 'closed';

    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/organisms/edit-congregation/edit-congregation-markup'),
      this.fetchWithCache('/components/organisms/edit-congregation/edit-congregation-styles')
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;
 
    if (!this.hasAttribute('status')) this.setAttribute('status', status);

    this.#setElements();  
    this.#bindEvents();
  }

  #setElements() {
    this.#modal = this.shadowRoot?.querySelector('app-modal[name="edit-congregation"]');
    this.#cancelBtn = this.shadowRoot.querySelector('app-button[name=cancel-button]');
    this.#saveBtn = this.shadowRoot.querySelector('app-button[name=save-button]');
    this.#officialNameElement = this.shadowRoot.querySelector('#congregation-official-name')
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (!oldValue || oldValue === newValue) return;
  
    if (name === 'status') {
      if (newValue === 'open') this.#readStorageData();
  
      queueMicrotask(() => {
        // 2) Re-hent modal hvis den er null
        this.#modal ||= this.shadowRoot?.querySelector('app-modal[name="edit-congregation"]');
        if (!this.#modal) return;
  
        newValue === 'closed' ? this.#modal.closeModal() : this.#modal.openModal();
      });
    }
  }
  
  #readStorageData() {
    const sd = sessionStorage.getItem('speakersheetData')
    const partData = (sd && JSON.parse(sd).congregation) || {};

    this.#fillForm(
      partData.officialName      
    );
  }

  #fillForm(officialName) {
    if(officialName)
      this.#officialNameElement.setAttribute('value', officialName);
  }

  #bindEvents() {
    const cancelBtnEventName = this.#cancelBtn.getAttribute('onclickeventname');
    const saveBtnEventName = this.#saveBtn.getAttribute('onclickeventname');

    this.#cancelBtn.addEventListener(cancelBtnEventName, e => {
      console.log('CANCEL')
      this.setAttribute('status', 'closed');
    });

    this.#saveBtn.addEventListener(saveBtnEventName, e => {
      // here save form
      this.#officialNameElement.setAttribute('validation-text', 'Så det tror du?');
      this.setAttribute('status', 'closed');
    });
  }
}

customElements.define('app-edit-congregation', AppEditCongregation);
